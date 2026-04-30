// Credits HTTP endpoints. Phase 2 — no real payment integration; the
// /grant and /subscribe routes simulate purchases by writing to the
// ledger directly. Phase 3 will replace the bodies with Stripe Checkout
// session creation + a webhook that calls into lib/credits.js.

import { Router } from 'express';
import { resolveAppUser } from '../middleware/resolveAppUser.js';
import {
  PLANS,
  getBalance,
  listTransactions,
  addCredits,
  setPlan,
  InsufficientCreditsError,
} from '../lib/credits.js';

const router = Router();
router.use(resolveAppUser);

const requireUser = (req, res, next) => {
  if (!req.appUserId) return res.status(401).json({ error: 'Sign in required' });
  next();
};

// Credit pack catalog — server-side authoritative. Mirrors client copy.
// Phase 3 will tie these to Stripe Price IDs.
const CREDIT_PACKS = {
  'pack-500':   { credits: 500,   priceUsd: 9   },
  'pack-2000':  { credits: 2000,  priceUsd: 29  },
  'pack-5000':  { credits: 5000,  priceUsd: 59  },
  'pack-15000': { credits: 15000, priceUsd: 149 },
};

// ── GET /api/credits/balance ──────────────────────────────────────────────
router.get('/balance', requireUser, async (req, res) => {
  try {
    const data = await getBalance(req.appUserId);
    if (!data) return res.status(503).json({ error: 'credits tables missing — run server/sql/credits.sql' });
    res.json(data);
  } catch (err) {
    console.error('[credits] balance error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/credits/transactions ─────────────────────────────────────────
router.get('/transactions', requireUser, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const txs = await listTransactions(req.appUserId, { limit });
    res.json({ transactions: txs });
  } catch (err) {
    console.error('[credits] transactions error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credits/grant ───────────────────────────────────────────────
// Phase 2 stub for "buy a credit pack". Body:
//   { packId } — picks credits/price from catalog
//   { credits, description? } — custom amount (mirrors the slider UI)
// In Phase 3 this endpoint disappears; replaced by Stripe Checkout +
// webhook calling addCredits() server-side after payment confirmation.
router.post('/grant', requireUser, async (req, res) => {
  try {
    const { packId, credits, description } = req.body || {};
    let amount, label, metadata = {};

    if (packId) {
      const pack = CREDIT_PACKS[packId];
      if (!pack) return res.status(400).json({ error: `Unknown packId: ${packId}` });
      amount = pack.credits;
      label = description || `Credit pack · ${pack.credits.toLocaleString()}`;
      metadata = { pack_id: packId, price_usd: pack.priceUsd, simulated: true };
    } else if (Number.isInteger(credits) && credits > 0) {
      amount = credits;
      label = description || `Custom credits · ${credits.toLocaleString()}`;
      metadata = { simulated: true };
    } else {
      return res.status(400).json({ error: 'Provide packId or positive integer credits' });
    }

    const newBalance = await addCredits(req.appUserId, amount, {
      type: 'purchase',
      description: label,
      metadata,
    });
    res.json({ ok: true, balance: newBalance, granted: amount });
  } catch (err) {
    console.error('[credits] grant error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credits/subscribe ───────────────────────────────────────────
// Phase 2 stub: switches plan + grants the upgrade delta immediately.
// Body: { planId, billingCycle? } — billingCycle defaults to 'monthly'.
router.post('/subscribe', requireUser, async (req, res) => {
  try {
    const { planId, billingCycle = 'monthly' } = req.body || {};
    if (!planId || !PLANS[planId]) {
      return res.status(400).json({ error: `Unknown planId: ${planId}` });
    }
    if (planId === 'enterprise') {
      return res.status(400).json({ error: 'Enterprise plans require sales contact' });
    }
    if (!['monthly', 'yearly'].includes(billingCycle)) {
      return res.status(400).json({ error: 'billingCycle must be monthly or yearly' });
    }
    const result = await setPlan(req.appUserId, planId, billingCycle);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('[credits] subscribe error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/credits/deduct ──────────────────────────────────────────────
// Internal/dev hook. Lets the chat handler (and future tools) deduct
// without re-implementing the supabase plumbing. Not exposed to anonymous
// callers — requires app session.
//
// Phase 3 should move this off the public API surface; chat will call
// the lib directly. Kept here for now so the same auth middleware applies.
router.post('/deduct', requireUser, async (req, res) => {
  try {
    const { credits, description, metadata } = req.body || {};
    if (!Number.isInteger(credits) || credits <= 0) {
      return res.status(400).json({ error: 'credits must be a positive integer' });
    }
    const newBalance = await import('../lib/credits.js').then(m =>
      m.deductCredits(req.appUserId, credits, { description, metadata })
    );
    res.json({ ok: true, balance: newBalance });
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      return res.status(402).json({ error: err.message, code: err.code, required: err.required, balance: err.balance });
    }
    console.error('[credits] deduct error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
