import { Zap, Sparkles } from 'lucide-react';

const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n);

// Sidebar credits pill — two visual modes mirror SidebarUserMenu:
//   collapsed=true  → square 36×36 icon button with hover tooltip
//   collapsed=false → full pill: ⚡ balance + slim "Upgrade" CTA
// Click on balance area → /buy-credits. Click on Upgrade → /subscriptions.
export const CreditsBadge = ({
  collapsed = false,
  balance = 0,
  monthlyQuota = 0,
  usedPct = 0,
  planName = 'Free',
  isLoading = false,
  onOpenBuyCredits,
  onOpenSubscriptions,
}) => {
  if (collapsed) {
    return (
      <button
        onClick={onOpenBuyCredits}
        className="group relative w-full h-[36px] rounded-xl flex items-center justify-center text-amber-600 hover:bg-amber-50 transition-colors"
        aria-label="Credits"
      >
        <Zap size={15} className={isLoading ? 'fill-amber-400/30 animate-pulse' : 'fill-amber-400/30'} />
        <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">
          {isLoading ? 'Loading…' : `${fmt(balance)} credits · ${planName}`}
        </span>
      </button>
    );
  }

  // Used-progress bar: fills LEFT→RIGHT as the user spends. Empty bar
  // means fresh quota; full bar means all credits consumed this cycle.
  const fillPct = Math.min(100, Math.max(0, usedPct));

  return (
    <div className="rounded-xl border border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50/40 overflow-hidden">
      <button
        onClick={onOpenBuyCredits}
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-amber-100/40 transition-colors"
      >
        <div className={`w-6 h-6 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm shadow-orange-200/50 shrink-0 ${isLoading ? 'animate-pulse' : ''}`}>
          <Zap size={12} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          {isLoading ? (
            // Skeleton: keeps the same vertical footprint as the loaded
            // state so the pill doesn't jump when data arrives.
            <>
              <div className="h-3 w-16 rounded bg-orange-300/70 animate-pulse" />
              <div className="mt-1 h-1 rounded-full bg-orange-200 overflow-hidden">
                <div className="h-full w-1/3 bg-orange-500 animate-pulse" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-bold text-slate-800 tabular-nums">{balance.toLocaleString()}</span>
                <span className="text-[10px] text-slate-500 font-medium">credits</span>
              </div>
              {monthlyQuota > 0 && (
                <div className="mt-0.5 h-1 rounded-full bg-amber-200/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all"
                    style={{ width: `${fillPct}%` }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </button>
      <button
        onClick={onOpenSubscriptions}
        className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-orange-700 hover:bg-orange-100/60 border-t border-amber-200/60 transition-colors"
      >
        <Sparkles size={11} />
        {planName === 'Free' ? 'Upgrade' : `Manage · ${planName}`}
      </button>
    </div>
  );
};
