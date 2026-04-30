import { useState, useEffect } from 'react';
import { Check, Zap, Sparkles, X, Crown, Building2, Rocket, Loader2 } from 'lucide-react';
import { useCredits } from '../hooks/useCredits.js';

const PLAN_ICONS = {
  free: Zap,
  pro: Sparkles,
  business: Crown,
  enterprise: Building2,
};

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-[fadeSlideUp_0.2s_ease-out]">
    <Sparkles size={14} className="text-amber-300" />
    {message}
    <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white text-[11px]">×</button>
  </div>
);

// Subscriptions modal — large overlay so users can browse plans without
// committing to a route change. Click backdrop, X, or press Esc to dismiss
// without changing anything.
export const Subscriptions = ({ open, onClose }) => {
  const {
    plans, planId, billingCycle, setBillingCycle, checkoutPlan, balance, monthlyQuota,
  } = useCredits();
  const [toast, setToast] = useState(null);
  // Per-plan loading state — only one plan switch can be in flight at a
  // time. Used to (a) show a Loader2 spinner inside the clicked CTA and
  // (b) disable all OTHER plan CTAs so the user can't double-click into
  // a half-applied state. Stays for ~400ms after success so the spinner
  // is visible even when the network is fast.
  const [pendingPlanId, setPendingPlanId] = useState(null);

  // Esc to dismiss + lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = async (newPlanId) => {
    if (newPlanId === 'enterprise') {
      window.location.href = 'mailto:sales@example.com?subject=Enterprise%20plan%20inquiry';
      return;
    }
    if (pendingPlanId) return; // ignore clicks while another switch is in flight
    setPendingPlanId(newPlanId);
    const startedAt = Date.now();
    try {
      const res = await checkoutPlan(newPlanId, billingCycle);
      // Enforce a brief minimum spinner duration so the loading state is
      // perceptible even when the API responds in <50ms (localhost).
      const remaining = 400 - (Date.now() - startedAt);
      if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
      setToast(res.message);
      setTimeout(() => setToast(null), 3000);
    } finally {
      setPendingPlanId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl max-h-[92vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-[fadeSlideUp_0.2s_ease-out]"
      >
        {/* Close button — floats top-right, visible on both header and body */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white flex items-center justify-center transition-colors"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.22),transparent_60%)] pointer-events-none" />
          <div className="relative px-6 lg:px-10 py-7 pr-16">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight flex items-center gap-2.5">
                  <Rocket size={26} className="text-amber-400" />
                  Plans & Subscriptions
                </h1>
                <p className="text-[13px] text-slate-300 mt-1.5 max-w-xl">
                  Pick a plan that fits your team. All plans include AI agents, multi-platform ads, and priority updates.
                </p>
              </div>

              {/* Billing cycle toggle */}
              <div className="inline-flex items-center bg-slate-800/80 backdrop-blur-sm border border-slate-700/60 rounded-xl p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-1.5 text-[12px] font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                    billingCycle === 'yearly'
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Yearly
                  <span className="text-[9px] font-bold bg-emerald-400/90 text-emerald-950 px-1.5 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-7 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
          {/* Current status banner */}
          <div className="mb-6 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-200/50">
                <Sparkles size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[12px] text-slate-500 font-medium">Current plan</p>
                <p className="text-[15px] font-bold text-slate-800 capitalize">
                  {plans.find(p => p.id === planId)?.name || 'Free'}
                  <span className="ml-2 text-[12px] font-medium text-slate-400">
                    · {balance.toLocaleString()} / {monthlyQuota.toLocaleString()} credits remaining
                  </span>
                </p>
              </div>
            </div>
            {planId === 'free' && (
              <p className="text-[12px] text-slate-500">
                Upgrade for more credits, more accounts, and team features →
              </p>
            )}
          </div>

          {/* Plans grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map(plan => {
              const Icon = PLAN_ICONS[plan.id] || Zap;
              const isCurrent = plan.id === planId;
              const isPopular = plan.badge === 'Most Popular';
              const price = billingCycle === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-5 transition-all ${
                    isPopular
                      ? 'bg-gradient-to-b from-white to-orange-50/40 border-orange-300/80 shadow-xl shadow-orange-500/15 scale-[1.02]'
                      : 'bg-white/80 backdrop-blur-sm border-slate-200/60 hover:border-slate-300 hover:shadow-md'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-orange-500 to-amber-500 rounded-full shadow-md shadow-orange-500/40 whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isPopular ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Icon size={15} />
                    </div>
                    <h3 className="text-[16px] font-bold text-slate-800">{plan.name}</h3>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-4">{plan.tagline}</p>

                  {/* Price — fixed-height slot prevents card jitter when the
                      "billed yearly" caption appears/disappears on cycle toggle. */}
                  <div className="mb-5 h-[58px] flex flex-col justify-start">
                    {price === null ? (
                      <p className="text-[24px] font-bold text-slate-800 leading-none">Custom</p>
                    ) : price === 0 ? (
                      <p className="text-[28px] font-bold text-slate-800 leading-none">Free</p>
                    ) : (
                      <div className="flex items-baseline gap-1 transition-opacity duration-200">
                        <span className="text-[12px] font-semibold text-slate-400">$</span>
                        <span className="text-[28px] font-bold text-slate-800 leading-none tabular-nums">
                          {billingCycle === 'yearly' ? Math.round(price / 12) : price}
                        </span>
                        <span className="text-[12px] text-slate-500 font-medium">/ month</span>
                      </div>
                    )}
                    <p className={`text-[10px] text-slate-400 mt-1.5 transition-opacity duration-200 ${
                      billingCycle === 'yearly' && price > 0 ? 'opacity-100' : 'opacity-0'
                    }`}>
                      {price > 0 ? `$${price} billed yearly` : ' '}
                    </p>
                  </div>

                  {/* Features */}
                  <ul className="space-y-2 mb-5 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12px] text-slate-600">
                        <Check size={13} className={`mt-0.5 shrink-0 ${isPopular ? 'text-orange-500' : 'text-emerald-500'}`} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {(() => {
                    const isPending = pendingPlanId === plan.id;
                    const otherPending = pendingPlanId && !isPending;
                    return (
                      <button
                        onClick={() => handleSelect(plan.id)}
                        disabled={isCurrent || !!pendingPlanId}
                        className={`w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
                          isCurrent
                            ? 'bg-slate-100 text-slate-400 cursor-default'
                            : otherPending
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : isPopular
                                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        {isPending && <Loader2 size={13} className="animate-spin" />}
                        {isCurrent ? 'Current plan' : isPending ? 'Switching…' : plan.cta}
                      </button>
                    );
                  })()}
                </div>
              );
            })}
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-[11px] text-slate-400">
            All plans renew automatically. Cancel any time. Prices in USD.
            Need a custom plan? <a href="mailto:sales@example.com" className="text-orange-600 hover:underline">Talk to sales</a>.
          </p>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
};
