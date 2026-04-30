// Credits service — primitives shared by HTTP routes and the chat handler.
//
// All balance mutations go through `applyDelta`, which calls the
// `apply_credit_delta` Postgres function. That function locks the user
// row, validates non-negative balance, and inserts a ledger transaction
// — all in one atomic SQL statement so concurrent deductions can't race.
//
// This module is the ONLY file that should write to user_credits or
// credit_transactions directly. Routes / chat middleware should call
// the higher-level helpers (deduct / grant / subscribe) defined below.

import { getSupabase } from './supabase.js';

// Plan catalog — mirrors client/src/hooks/useCredits.js. Server-side is
// authoritative; the client copy is for display only. Update both when
// pricing changes.
export const PLANS = {
  free:       { monthlyCredits: 200,   priceMonthly: 0,    priceYearly: 0    },
  pro:        { monthlyCredits: 3000,  priceMonthly: 29,   priceYearly: 279  },
  business:   { monthlyCredits: 12000, priceMonthly: 99,   priceYearly: 949  },
  enterprise: { monthlyCredits: null,  priceMonthly: null, priceYearly: null }, // custom
};

// Default cost when chat doesn't supply a more specific value. Phase 2
// uses a flat fee per chat turn; Phase 3 will switch to token-based.
export const DEFAULT_CHAT_COST = 5;

export class InsufficientCreditsError extends Error {
  constructor(required, balance) {
    super(`Insufficient credits: need ${required}, have ${balance}`);
    this.code = 'INSUFFICIENT_CREDITS';
    this.required = required;
    this.balance = balance;
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────
const supa = () => {
  const s = getSupabase();
  if (!s) throw new Error('Supabase not configured');
  return s;
};

const isTableMissing = (err) =>
  err?.code === 'PGRST205' ||
  err?.code === '42883' || // function does not exist
  err?.code === '42P01' || // relation does not exist
  /schema cache|does not exist/i.test(err?.message || '');

// Read or lazily create the user's credit row. Returns the row.
async function getOrCreate(appUserId) {
  if (!appUserId) throw new Error('appUserId required');
  const s = supa();
  const { data, error } = await s
    .from('user_credits')
    .select('*')
    .eq('app_user_id', appUserId)
    .maybeSingle();
  if (error && !isTableMissing(error)) throw error;
  if (data) return data;

  // First touch — create the row with ZERO balance, then route the
  // initial 200-credit grant through applyDelta so ledger and balance
  // stay in sync. Seeding the row with balance=200 directly AND then
  // calling applyDelta(+200) used to double-credit (200 + 200 = 400).
  const seed = {
    app_user_id: appUserId,
    balance: 0,
    monthly_quota: PLANS.free.monthlyCredits,
    plan_id: 'free',
    billing_cycle: 'monthly',
  };
  const { error: insErr } = await s
    .from('user_credits')
    .upsert(seed, { onConflict: 'app_user_id' });
  if (insErr) throw insErr;

  // Atomic grant + ledger write. After this the row has balance=200
  // and credit_transactions has one matching 'monthly' row.
  await applyDelta(appUserId, PLANS.free.monthlyCredits, 'monthly', 'Initial free credits', { plan_id: 'free' })
    .catch(() => {}); // best-effort — row exists with 0 balance if ledger fails

  // Re-read so we return the post-grant state to the caller.
  const { data: created } = await s
    .from('user_credits')
    .select('*')
    .eq('app_user_id', appUserId)
    .single();
  return created;
}

// Atomic balance change. `credits` is signed (positive = grant, negative
// = consumption). Returns the new balance, or throws InsufficientCredits
// if a deduction would drive balance < 0.
async function applyDelta(appUserId, credits, type, description, metadata = {}) {
  const s = supa();
  const { data, error } = await s.rpc('apply_credit_delta', {
    p_user: appUserId,
    p_credits: credits,
    p_type: type,
    p_desc: description || null,
    p_metadata: metadata,
  });
  if (error) throw error;
  if (data === null) {
    // Function returned NULL = insufficient balance.
    const { balance = 0 } = (await getBalance(appUserId)) || {};
    throw new InsufficientCreditsError(Math.abs(credits), balance);
  }
  return data; // new balance
}

// ── Public API ────────────────────────────────────────────────────────────

// Returns { balance, monthlyQuota, used, plan, billingCycle, cycleStartedAt }
// or null if Supabase is unconfigured / table missing.
export async function getBalance(appUserId) {
  try {
    const row = await getOrCreate(appUserId);
    return {
      balance: row.balance,
      monthlyQuota: row.monthly_quota,
      used: row.used_this_cycle,
      plan: row.plan_id,
      billingCycle: row.billing_cycle,
      cycleStartedAt: row.cycle_started_at,
    };
  } catch (err) {
    if (isTableMissing(err)) return null;
    throw err;
  }
}

export async function listTransactions(appUserId, { limit = 50 } = {}) {
  const s = supa();
  const { data, error } = await s
    .from('credit_transactions')
    .select('id, type, description, credits, balance_after, metadata, created_at')
    .eq('app_user_id', appUserId)
    .order('created_at', { ascending: false })
    .limit(Math.min(limit, 200));
  if (error) {
    if (isTableMissing(error)) return [];
    throw error;
  }
  return data || [];
}

// Add credits (purchase, refund, adjustment, monthly refill).
export async function addCredits(appUserId, amount, { type = 'adjustment', description, metadata } = {}) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('amount must be a positive integer');
  await getOrCreate(appUserId); // ensure row exists
  return applyDelta(appUserId, amount, type, description, metadata);
}

// Deduct credits (chat usage, tool call). Throws InsufficientCreditsError
// when the user can't afford the call — caller should map to HTTP 402.
export async function deductCredits(appUserId, amount, { type = 'usage', description, metadata } = {}) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('amount must be a positive integer');
  await getOrCreate(appUserId);
  return applyDelta(appUserId, -amount, type, description, metadata);
}

// End-of-turn settlement — like deductCredits but never throws on
// insufficient balance. If the requested amount exceeds available, deducts
// whatever remains and logs a partial-charge warning. Used by the chat
// handler after the agent has already produced output: we owe ourselves
// the spend regardless of whether the user can fully cover it.
//
// Returns { deducted, balance, partial } so callers can surface the
// outcome to the UI / logs.
export async function deductCreditsClamped(appUserId, amount, opts = {}) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('amount must be a positive integer');
  try {
    const balance = await deductCredits(appUserId, amount, opts);
    return { deducted: amount, balance, partial: false };
  } catch (err) {
    if (!(err instanceof InsufficientCreditsError)) throw err;
    if (err.balance <= 0) {
      // Already at zero — nothing to clamp to. Skip the deduction; the
      // next turn's pre-check will hard-block the user.
      console.warn(`[credits] skipped clamp deduction (balance=0) for ${appUserId}: wanted ${amount}`);
      return { deducted: 0, balance: 0, partial: true };
    }
    const balance = await deductCredits(appUserId, err.balance, {
      ...opts,
      description: `${opts.description || 'Usage'} (partial — capped at balance)`,
      metadata: { ...(opts.metadata || {}), wanted: amount, capped_to: err.balance },
    });
    console.warn(`[credits] partial deduction for ${appUserId}: wanted ${amount}, deducted ${err.balance}`);
    return { deducted: err.balance, balance, partial: true };
  }
}

// Switch a user's plan. Top-up logic:
//   - Records a "subscribe" ledger row (zero credits, just for audit).
//   - If new plan grants more monthly credits than the old, immediately
//     grants the delta so the user sees the upgrade reflected in balance
//     without waiting for next cycle.
//   - Resets used_this_cycle counter so the UI's "used this month" bar
//     starts fresh after upgrade.
export async function setPlan(appUserId, planId, billingCycle = 'monthly') {
  const plan = PLANS[planId];
  if (!plan) throw new Error(`Unknown plan: ${planId}`);
  const s = supa();
  const current = await getOrCreate(appUserId);

  const newQuota = plan.monthlyCredits ?? current.monthly_quota;
  const grantDelta = Math.max(0, newQuota - (current.monthly_quota || 0));

  const { error } = await s
    .from('user_credits')
    .update({
      plan_id: planId,
      billing_cycle: billingCycle,
      monthly_quota: newQuota,
      used_this_cycle: 0,
      cycle_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('app_user_id', appUserId);
  if (error) throw error;

  // Audit-only ledger entry.
  await applyDelta(appUserId, 0, 'subscribe', `Switched to ${planId} (${billingCycle})`, { plan_id: planId, billing_cycle: billingCycle });

  if (grantDelta > 0) {
    await applyDelta(appUserId, grantDelta, 'monthly', `${planId} plan credits`, { plan_id: planId });
  }
  return getBalance(appUserId);
}

// Cron-style monthly reset. Idempotent per cycle: if the user's
// cycle_started_at is older than 30 days, refill to monthly_quota. Safe
// to call on every chat turn as a lazy alternative to a scheduled job.
export async function maybeResetMonthly(appUserId) {
  const row = await getOrCreate(appUserId);
  const ageMs = Date.now() - new Date(row.cycle_started_at).getTime();
  if (ageMs < 30 * 24 * 60 * 60 * 1000) return null;
  if (!row.monthly_quota) return null;

  const s = supa();
  await s
    .from('user_credits')
    .update({
      used_this_cycle: 0,
      cycle_started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('app_user_id', appUserId);
  return applyDelta(appUserId, row.monthly_quota, 'monthly', `${row.plan_id} monthly credits`, { plan_id: row.plan_id });
}
