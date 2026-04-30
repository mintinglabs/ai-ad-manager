import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import api from '../services/api.js';
import { supabase } from '../lib/supabaseClient.js';

// Phase 2: real backend wired up.
//   - balance / used / plan / quota come from GET /api/credits/balance
//   - transactions come from GET /api/credits/transactions
//   - checkoutPack / checkoutCustomCredits hit POST /api/credits/grant
//     (simulated — no Stripe yet)
//   - checkoutPlan hits POST /api/credits/subscribe
//
// Plan + pack catalogs are still kept client-side for display (price,
// features, badges). Server-side authoritative copies live in
// server/src/lib/credits.js (PLANS) and server/src/api/credits.js (CREDIT_PACKS).
// Update both when changing pricing/limits.

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Try it out',
    monthlyPrice: 0,
    yearlyPrice: 0,
    monthlyCredits: 200,
    badge: null,
    cta: 'Current plan',
    features: [
      '200 credits / month',
      '1 ad account',
      'Meta Ads only',
      'Basic AI skills',
      'Community support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    tagline: 'For solo marketers',
    monthlyPrice: 29,
    yearlyPrice: 279,
    monthlyCredits: 3000,
    badge: 'Most Popular',
    cta: 'Upgrade to Pro',
    features: [
      '3,000 credits / month',
      'Up to 5 ad accounts',
      'Meta + Google Ads',
      'All AI skills + custom skills',
      'Brand Memory + Creative Hub',
      'Email support',
    ],
  },
  {
    id: 'business',
    name: 'Business',
    tagline: 'For growing teams',
    monthlyPrice: 99,
    yearlyPrice: 949,
    monthlyCredits: 12000,
    badge: null,
    cta: 'Upgrade to Business',
    features: [
      '12,000 credits / month',
      'Unlimited ad accounts',
      'Multi-platform + automations',
      'Team workspaces (5 seats)',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Custom for agencies',
    monthlyPrice: null,
    yearlyPrice: null,
    monthlyCredits: null,
    badge: null,
    cta: 'Contact sales',
    features: [
      'Custom credit volumes',
      'Unlimited seats',
      'SSO + audit logs',
      'Dedicated account manager',
      'SLA + white-glove onboarding',
      'Custom integrations',
    ],
  },
];

const CREDIT_PACKS = [
  { id: 'pack-500',    credits: 500,    price: 9,    perCredit: 0.018,  badge: null },
  { id: 'pack-2000',   credits: 2000,   price: 29,   perCredit: 0.0145, badge: 'Popular' },
  { id: 'pack-5000',   credits: 5000,   price: 59,   perCredit: 0.0118, badge: 'Best Value' },
  { id: 'pack-15000',  credits: 15000,  price: 149,  perCredit: 0.0099, badge: null },
];

// Map server transaction rows into the shape the UI already renders.
// Server: { id, type, description, credits, balance_after, metadata, created_at }
// UI:     { id, type, description, credits, timestamp }
const mapTx = (t) => ({
  id: t.id,
  type: t.type,
  description: t.description || '',
  credits: t.credits,
  timestamp: new Date(t.created_at).getTime(),
});

export const useCredits = () => {
  const [balance, setBalance] = useState(0);
  const [monthlyQuota, setMonthlyQuota] = useState(0);
  const [used, setUsed] = useState(0);
  const [planId, setPlanId] = useState('free');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // StrictMode (dev) double-invokes effects: mount → cleanup → mount again.
  // The previous form only set mountedRef.current=false in cleanup and
  // never reset it back to true on the second mount, so any in-flight
  // refresh's setState was silently dropped — pill stuck at 0 forever.
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // First-paint protection: enforce a minimum visible loading duration on
  // the very first refresh. On localhost the API responds in <50ms so the
  // skeleton would otherwise flash imperceptibly. Subsequent refreshes
  // (after window event, auth change, etc.) skip the delay so the pill
  // updates feel snappy after a purchase / chat settlement.
  const firstLoadDoneRef = useRef(false);
  const FIRST_LOAD_MIN_MS = 400;

  const refresh = useCallback(async () => {
    const startedAt = Date.now();
    try {
      const [balRes, txRes] = await Promise.all([
        api.get('/credits/balance'),
        api.get('/credits/transactions', { params: { limit: 50 } }),
      ]);
      if (!mountedRef.current) return;
      const bal = balRes.data;
      setBalance(bal.balance ?? 0);
      setMonthlyQuota(bal.monthlyQuota ?? 0);
      setUsed(bal.used ?? 0);
      setPlanId(bal.plan ?? 'free');
      setBillingCycle(bal.billingCycle ?? 'monthly');
      setTransactions((txRes.data?.transactions || []).map(mapTx));
      setError(null);

      // Only flip out of loading on a successful response. 401 means the
      // Supabase JWT hasn't reached the server yet (auth still booting);
      // keeping loading=true lets the pill show its skeleton instead of
      // briefly flashing "0 credits" before the real value arrives.
      if (!firstLoadDoneRef.current) {
        const elapsed = Date.now() - startedAt;
        const remaining = FIRST_LOAD_MIN_MS - elapsed;
        if (remaining > 0) {
          await new Promise(r => setTimeout(r, remaining));
        }
        firstLoadDoneRef.current = true;
      }
      if (!mountedRef.current) return;
      setIsLoading(false);
    } catch (err) {
      if (err?.response?.status !== 401) {
        console.warn('[credits] refresh FAILED', err?.response?.status, err?.response?.data || err.message);
        setError(err.message);
        if (mountedRef.current) setIsLoading(false);
      }
      // On 401: stay in loading. The next auth-state-change refresh call
      // will retry once the JWT is ready.
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Re-fetch whenever the Supabase auth session settles or changes. Fixes
  // the race where useCredits mounts BEFORE supabase has restored the
  // session from localStorage — first /balance call goes without a JWT,
  // returns 401, and the hook would otherwise be stuck at zeros until a
  // page reload. Also covers sign-in / sign-out within the SPA lifecycle.
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        refresh();
      } else if (event === 'SIGNED_OUT') {
        // Reset to defaults so the pill doesn't show a previous user's balance.
        setBalance(0); setMonthlyQuota(0); setUsed(0); setPlanId('free'); setTransactions([]);
      }
    });
    return () => sub?.subscription?.unsubscribe?.();
  }, [refresh]);

  // Cross-instance sync: each hook caller (Sidebar, Subscriptions modal,
  // BuyCredits modal) holds its own state. After a successful mutation in
  // any of them, broadcast on window so siblings re-fetch. Cheap and avoids
  // a context provider for phase 2.
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('credits:changed', handler);
    return () => window.removeEventListener('credits:changed', handler);
  }, [refresh]);

  const plan = useMemo(() => PLANS.find(p => p.id === planId) || PLANS[0], [planId]);
  const usedPct = monthlyQuota > 0 ? Math.min(100, Math.round((used / monthlyQuota) * 100)) : 0;

  const broadcast = () => window.dispatchEvent(new CustomEvent('credits:changed'));

  const checkoutPlan = useCallback(async (newPlanId, cycle = 'monthly') => {
    try {
      await api.post('/credits/subscribe', { planId: newPlanId, billingCycle: cycle });
      await refresh();
      broadcast();
      return { ok: true, message: `Switched to ${newPlanId} (${cycle})` };
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      return { ok: false, message: msg };
    }
  }, [refresh]);

  const checkoutPack = useCallback(async (packId) => {
    try {
      await api.post('/credits/grant', { packId });
      await refresh();
      broadcast();
      const pack = CREDIT_PACKS.find(p => p.id === packId);
      return { ok: true, message: `+${pack?.credits.toLocaleString()} credits added` };
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      return { ok: false, message: msg };
    }
  }, [refresh]);

  const checkoutCustomCredits = useCallback(async (credits) => {
    try {
      await api.post('/credits/grant', { credits });
      await refresh();
      broadcast();
      return { ok: true, message: `+${credits.toLocaleString()} credits added` };
    } catch (err) {
      const msg = err?.response?.data?.error || err.message;
      return { ok: false, message: msg };
    }
  }, [refresh]);

  return {
    balance,
    monthlyQuota,
    used,
    usedPct,
    plan,
    planId,
    plans: PLANS,
    creditPacks: CREDIT_PACKS,
    transactions,
    billingCycle,
    setBillingCycle,
    checkoutPlan,
    checkoutPack,
    checkoutCustomCredits,
    refresh,
    isLoading,
    error,
  };
};
