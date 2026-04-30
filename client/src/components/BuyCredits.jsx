import { useState, useEffect } from 'react';
import { X, Zap, Sparkles, ChevronDown, ArrowUpRight, ArrowDownRight, Calendar, ShoppingBag, Loader2 } from 'lucide-react';
import { useCredits } from '../hooks/useCredits.js';

const Toast = ({ message, onClose }) => (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-slate-900 text-white text-[13px] font-medium px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 animate-[fadeSlideUp_0.2s_ease-out]">
    <Sparkles size={14} className="text-amber-300" />
    {message}
    <button onClick={onClose} className="ml-2 text-slate-400 hover:text-white text-[11px]">×</button>
  </div>
);

const formatTimestamp = (ts) => {
  const diffMs = Date.now() - ts;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
};

const FAQS = [
  {
    q: 'How are credits used?',
    a: 'Each AI action — chat replies, audience generation, brand crawls, optimization runs — consumes credits based on the model and amount of work involved. Most chat replies cost 1–10 credits.',
  },
  {
    q: 'Do credits expire?',
    a: 'Subscription credits reset every month. One-time credit packs never expire and stack on top of your monthly allowance.',
  },
  {
    q: 'Can I get a refund?',
    a: 'Unused credit packs are refundable within 14 days of purchase. Subscription fees are non-refundable but you can cancel any time and keep access until the end of the billing period.',
  },
  {
    q: 'What happens when I run out?',
    a: 'AI features pause until you top up or your monthly allowance resets. Your data, campaigns, and chat history stay accessible.',
  },
];

// Buy Credits modal — same overlay pattern as Subscriptions. Click backdrop,
// X, or press Esc to dismiss without changing anything.
export const BuyCredits = ({ open, onClose, onOpenSubscriptions }) => {
  const {
    balance, monthlyQuota, used, usedPct, plan, creditPacks, transactions, checkoutPack, checkoutCustomCredits,
  } = useCredits();
  const [customAmount, setCustomAmount] = useState(1000);
  const [openFaq, setOpenFaq] = useState(null);
  const [toast, setToast] = useState(null);
  // Loading flags for purchase actions. `pendingPackId` covers the 4 preset
  // packs; `customLoading` covers the slider's Buy now button. Either being
  // set blocks the others to prevent double-spend on rapid clicks.
  const [pendingPackId, setPendingPackId] = useState(null);
  const [customLoading, setCustomLoading] = useState(false);

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

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Both handlers enforce a 400ms minimum spinner duration so the loading
  // state is perceptible on fast localhost responses.
  const withMinSpinner = async (fn) => {
    const startedAt = Date.now();
    const res = await fn();
    const remaining = 400 - (Date.now() - startedAt);
    if (remaining > 0) await new Promise(r => setTimeout(r, remaining));
    return res;
  };

  const handleBuyPack = async (packId) => {
    if (pendingPackId || customLoading) return;
    setPendingPackId(packId);
    try {
      const res = await withMinSpinner(() => checkoutPack(packId));
      showToast(res.message);
    } finally {
      setPendingPackId(null);
    }
  };

  const handleBuyCustom = async () => {
    if (pendingPackId || customLoading) return;
    setCustomLoading(true);
    try {
      const res = await withMinSpinner(() => checkoutCustomCredits(customAmount));
      showToast(res.message);
    } finally {
      setCustomLoading(false);
    }
  };

  const customPrice = (customAmount * 0.012).toFixed(2);

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 lg:p-8 animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-6xl max-h-[85vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-[fadeSlideUp_0.2s_ease-out]"
      >
        {/* Close button */}
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
          <div className="relative px-6 lg:px-10 py-5 pr-16">
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <ShoppingBag size={22} className="text-amber-400" />
              Buy Credits
            </h1>
            <p className="text-[12px] text-slate-300 mt-1">
              Top up your balance — credits never expire and stack on top of your monthly allowance.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-5 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Left: balance + packs (2 cols) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Current balance card */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-4 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-gradient-to-br from-orange-200/40 to-amber-200/20 rounded-full blur-3xl pointer-events-none" />
              <div className="relative">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Current balance</p>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <Zap size={22} className="text-amber-500 fill-amber-200" />
                      <span className="text-3xl lg:text-4xl font-bold text-slate-800 tabular-nums leading-none">{balance.toLocaleString()}</span>
                      <span className="text-[13px] text-slate-500 font-medium">credits</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {plan.name} plan · {monthlyQuota.toLocaleString()} credits / month
                    </p>
                  </div>
                  <button
                    onClick={onOpenSubscriptions}
                    className="text-[11px] font-semibold text-orange-700 hover:underline flex items-center gap-1"
                  >
                    Manage subscription
                    <ArrowUpRight size={12} />
                  </button>
                </div>

                {/* Usage bar */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>Used this month</span>
                    <span className="font-semibold text-slate-700">{used.toLocaleString()} / {monthlyQuota.toLocaleString()} ({usedPct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
                      style={{ width: `${usedPct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Credit packs */}
            <div>
              <h2 className="text-[13px] font-bold text-slate-800 mb-2">One-time credit packs</h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {creditPacks.map(pack => {
                  const isHighlight = pack.badge === 'Best Value' || pack.badge === 'Popular';
                  const isPending = pendingPackId === pack.id;
                  const otherBusy = (pendingPackId && !isPending) || customLoading;
                  return (
                    <button
                      key={pack.id}
                      onClick={() => handleBuyPack(pack.id)}
                      disabled={otherBusy || isPending}
                      className={`relative flex flex-col items-start text-left p-3 rounded-2xl border transition-all ${
                        otherBusy
                          ? 'bg-slate-50 border-slate-200/60 cursor-not-allowed opacity-60'
                          : isHighlight
                            ? 'bg-gradient-to-b from-white to-orange-50/40 border-orange-300 shadow-md shadow-orange-500/10 hover:shadow-lg hover:shadow-orange-500/20'
                            : 'bg-white/80 backdrop-blur-sm border-slate-200/60 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      {/* Loading overlay — covers the card while purchasing
                          this specific pack so the user has a clear visual
                          confirmation that THIS button is the one being acted on. */}
                      {isPending && (
                        <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                          <Loader2 size={20} className="text-orange-500 animate-spin" />
                        </div>
                      )}
                      {pack.badge && (
                        <span className={`absolute -top-2 right-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full shadow-sm ${
                          pack.badge === 'Best Value'
                            ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/40'
                            : 'bg-emerald-500 text-white shadow-emerald-500/30'
                        }`}>
                          {pack.badge}
                        </span>
                      )}
                      <Zap size={14} className={`mb-1 ${isHighlight ? 'text-orange-500 fill-orange-200' : 'text-amber-500'}`} />
                      <p className="text-[18px] font-bold text-slate-800 tabular-nums leading-none">
                        {pack.credits.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">credits</p>
                      <div className="mt-2 pt-2 border-t border-slate-100 w-full">
                        <p className="text-[14px] font-bold text-slate-800 leading-none">${pack.price}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">${pack.perCredit.toFixed(4)} / credit</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom amount */}
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm p-3.5">
              <h3 className="text-[12px] font-bold text-slate-800 mb-2">Custom amount</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="range"
                  min={500}
                  max={50000}
                  step={500}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(Number(e.target.value))}
                  className="range-orange flex-1 min-w-[200px]"
                  style={{ '--val': `${((customAmount - 500) / (50000 - 500)) * 100}%` }}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={500}
                    max={50000}
                    step={500}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(Math.max(500, Math.min(50000, Number(e.target.value) || 0)))}
                    className="w-24 px-3 py-1.5 text-[13px] font-semibold text-slate-800 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 tabular-nums"
                  />
                  <span className="text-[12px] text-slate-500">credits</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[16px] font-bold text-slate-800">${customPrice}</span>
                  <button
                    onClick={handleBuyCustom}
                    disabled={customLoading || !!pendingPackId}
                    className={`px-4 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
                      customLoading || pendingPackId
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/30 hover:shadow-lg hover:shadow-orange-500/40'
                    }`}
                  >
                    {customLoading && <Loader2 size={13} className="animate-spin" />}
                    {customLoading ? 'Processing…' : 'Buy now'}
                  </button>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div>
              <h2 className="text-[13px] font-bold text-slate-800 mb-2">FAQ</h2>
              <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm overflow-hidden divide-y divide-slate-100">
                {FAQS.map((faq, i) => (
                  <div key={i}>
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 transition-colors"
                    >
                      <span className="text-[12px] font-semibold text-slate-700">{faq.q}</span>
                      <ChevronDown size={13} className={`text-slate-400 transition-transform shrink-0 ${openFaq === i ? 'rotate-180' : ''}`} />
                    </button>
                    {openFaq === i && (
                      <div className="px-3.5 pb-2.5 text-[11px] text-slate-600 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: transactions */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm overflow-hidden sticky top-0">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Calendar size={13} className="text-slate-400" />
                <h3 className="text-[12px] font-bold text-slate-800">Recent activity</h3>
              </div>
              <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <p className="p-6 text-center text-[11px] text-slate-400">No activity yet</p>
                ) : transactions.map(tx => {
                  const isCredit = tx.credits > 0;
                  return (
                    <div key={tx.id} className="px-3.5 py-2.5 flex items-start gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'
                      }`}>
                        {isCredit ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-700 truncate">{tx.description}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatTimestamp(tx.timestamp)}</p>
                      </div>
                      <span className={`text-[12px] font-bold tabular-nums shrink-0 ${
                        isCredit ? 'text-emerald-600' : 'text-slate-500'
                      }`}>
                        {isCredit ? '+' : ''}{tx.credits.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <button className="w-full px-4 py-2.5 text-[11px] font-medium text-slate-500 hover:bg-slate-50 border-t border-slate-100 transition-colors">
                View full history →
              </button>
            </div>
          </div>
        </div>
      </div>

      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </div>
    </div>
  );
};
