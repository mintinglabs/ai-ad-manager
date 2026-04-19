import { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Sparkles, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Zap, DollarSign, Users, Shield, Palette, MessageSquare } from 'lucide-react';
import { PlatformAccountSelector } from './PlatformAccountSelector.jsx';

// ── Config ──
const SEVERITY = {
  critical: { accent: 'border-l-red-500', dot: 'bg-red-500', badge: 'bg-red-500/15 text-red-400 border-red-500/30', icon: AlertTriangle, iconColor: 'text-red-400' },
  warning: { accent: 'border-l-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: AlertTriangle, iconColor: 'text-amber-400' },
  opportunity: { accent: 'border-l-blue-500', dot: 'bg-blue-500', badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', icon: TrendingUp, iconColor: 'text-blue-400' },
  success: { accent: 'border-l-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: CheckCircle, iconColor: 'text-emerald-400' },
};

const CATEGORY_ICON = {
  Budget: { icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
  Creative: { icon: Palette, color: 'text-pink-400', bg: 'bg-pink-500/15' },
  Audience: { icon: Users, color: 'text-violet-400', bg: 'bg-violet-500/15' },
  Scaling: { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/15' },
  Tracking: { icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/15' },
};

// ── Demo data ──
const DEMO = [
  { severity: 'critical', category: 'Budget', title: '"Summer Sale" overspending — ROAS at 0.8x', description: 'Spent $1,240 in 7 days, cost per purchase up 65% WoW. Below your 2x ROAS target.', impact: 'Save ~$600/wk', affected: ['Summer Sale - Broad', 'Summer Sale - Retargeting'], action_prompt: 'Reduce budget on my "Summer Sale" campaigns, ROAS dropped to 0.8x' },
  { severity: 'critical', category: 'Creative', title: '3 ad sets with creative fatigue', description: 'Frequency above 4.2, CTR dropped 45% in 14 days. Audiences are saturated.', impact: 'CTR +30%', affected: ['Prospecting - Interest', 'LAL - Purchasers', 'Retargeting - Visitors'], action_prompt: 'My ad sets have creative fatigue with frequency above 4.2, help me refresh creatives' },
  { severity: 'warning', category: 'Audience', title: '38% audience overlap — self-competition', description: '"Interest - Fitness" and "LAL - Purchasers 1%" competing, inflating CPMs.', impact: 'CPM -20%', affected: ['Interest - Fitness', 'LAL - Purchasers 1%'], action_prompt: 'Fix audience overlap between "Interest - Fitness" and "LAL - Purchasers 1%", they have 38% overlap' },
  { severity: 'warning', category: 'Budget', title: 'Audience Network at 3x CPA, eating 40% budget', description: 'Audience Network placements have CPA 3x higher than Feed/Stories.', impact: 'Save ~$320/wk', affected: ['All Campaigns'], action_prompt: 'Remove Audience Network placements from my campaigns, CPA is 3x higher there' },
  { severity: 'opportunity', category: 'Scaling', title: 'Top performer ready to scale — 4.2x ROAS', description: '"Brand Awareness - Video" consistent 4.2x ROAS, low frequency 1.3.', impact: '+$2,400/wk', affected: ['Brand Awareness - Video'], action_prompt: 'Scale my "Brand Awareness - Video" campaign budget by 25%, it has consistent 4.2x ROAS' },
  { severity: 'opportunity', category: 'Creative', title: 'Video outperforming static by 2.1x', description: 'Video creatives have 2.1x better CTR and 1.6x better ROAS.', impact: 'ROAS +0.5x', affected: ['Static ad sets'], action_prompt: 'Help me create video ad variants for my campaigns, video outperforms static by 2.1x' },
  { severity: 'success', category: 'Tracking', title: 'Pixel health: all events firing', description: 'PageView, AddToCart, Purchase, Lead — all active, no issues.', impact: null, affected: ['Meta Pixel'], action_prompt: null },
  { severity: 'success', category: 'Budget', title: 'Budget pacing on track', description: 'All campaigns pacing within 5% of daily budgets.', impact: null, affected: ['All campaigns'], action_prompt: null },
];

// ── Health Ring SVG ──
const HealthRing = ({ score }) => {
  const r = 38, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const glow = score >= 80 ? 'shadow-emerald-500/20' : score >= 50 ? 'shadow-amber-500/20' : 'shadow-red-500/20';
  return (
    <div className={`relative w-[96px] h-[96px] shrink-0 rounded-full shadow-lg ${glow}`}>
      <svg width="96" height="96" className="-rotate-90">
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          className="transition-all duration-1000 ease-out" style={{ filter: `drop-shadow(0 0 6px ${color}40)` }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[24px] font-extrabold text-white">{score}</span>
        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Score</span>
      </div>
    </div>
  );
};

// ── Dark Bento Card ──
const BentoCard = ({ rec, size = 'sm', onAction }) => {
  const sev = SEVERITY[rec.severity] || SEVERITY.warning;
  const catCfg = CATEGORY_ICON[rec.category] || CATEGORY_ICON.Budget;
  const CatIcon = catCfg.icon;
  const isLarge = size === 'lg';

  return (
    <div className={`bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700/40 overflow-hidden transition-all hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 border-l-4 ${sev.accent} flex flex-col`}>
      <div className={`${isLarge ? 'px-5 py-4' : 'px-4 py-3'} flex-1`}>
        {/* Top row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-md ${catCfg.bg} flex items-center justify-center`}>
              <CatIcon size={10} className={catCfg.color} />
            </div>
            <span className="text-[9px] font-bold text-slate-500 uppercase">{rec.category}</span>
          </div>
          {rec.impact && (
            <span className="text-[9px] font-bold text-orange-400 bg-slate-700/80 rounded-full px-2 py-0.5 flex items-center gap-0.5">
              <Zap size={8} className="text-orange-400" /> {rec.impact}
            </span>
          )}
        </div>

        <h3 className={`${isLarge ? 'text-[13px]' : 'text-[12px]'} font-bold text-white leading-snug`}>{rec.title}</h3>

        {isLarge && (
          <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed line-clamp-2">{rec.description}</p>
        )}

        {isLarge && rec.affected?.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {rec.affected.slice(0, 2).map((a, i) => (
              <span key={i} className="text-[9px] bg-slate-700/60 border border-slate-600/40 rounded px-1.5 py-0.5 text-slate-300 truncate max-w-[140px]">{a}</span>
            ))}
            {rec.affected.length > 2 && <span className="text-[9px] text-slate-500">+{rec.affected.length - 2}</span>}
          </div>
        )}
      </div>

      {rec.action_prompt && (
        <div className={`${isLarge ? 'px-5 py-3' : 'px-4 py-2.5'} border-t border-slate-700/40 bg-slate-900/30`}>
          <button onClick={() => onAction(rec)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-[10px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all shadow-sm shadow-orange-500/20 hover:shadow-md hover:shadow-orange-500/30">
            <MessageSquare size={11} /> Ask AI to Fix <ArrowRight size={11} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Main Component ──
export const Optimizations = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat, activeSkills = [] }) => {
  const [recommendations] = useState(DEMO);

  const criticalCount = recommendations.filter(r => r.severity === 'critical').length;
  const warningCount = recommendations.filter(r => r.severity === 'warning').length;
  const opportunityCount = recommendations.filter(r => r.severity === 'opportunity').length;
  const successCount = recommendations.filter(r => r.severity === 'success').length;
  const healthScore = Math.max(0, Math.min(100, 100 - criticalCount * 15 - warningCount * 8 + successCount * 3));

  const totalSavings = useMemo(() => {
    return recommendations.filter(r => r.impact).reduce((sum, r) => {
      const m = r.impact.match(/[\$]?([\d,]+)/);
      return sum + (m ? parseInt(m[1].replace(/,/g, '')) : 0);
    }, 0);
  }, [recommendations]);

  const criticals = recommendations.filter(r => r.severity === 'critical');
  const warnings = recommendations.filter(r => r.severity === 'warning');
  const opportunities = recommendations.filter(r => r.severity === 'opportunity');
  const successes = recommendations.filter(r => r.severity === 'success');

  const handleAction = useCallback((rec) => {
    if (rec.action_prompt && onPrefillChat) {
      onPrefillChat(rec.action_prompt, 'Campaign');
    }
  }, [onPrefillChat]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header — seamless with dark bg */}
      <div className="relative shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.08),transparent_60%)]" />
        </div>
        <div className="relative flex items-center justify-between px-6 py-4 border-b border-slate-800/60">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Optimizations</h1>
              <p className="text-xs text-slate-500 mt-0.5">{recommendations.length} recommendations · Last scan: just now</p>
            </div>
            <span className="text-xs text-slate-500 font-medium">Ad Account:</span>
            <PlatformAccountSelector platform="meta"
              token={token} onLoginMeta={onLogin} onLogoutMeta={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectMetaAccount={onSelectAccount}
              variant="header" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 border border-slate-700/60 transition-colors">
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* Active skills bar */}
      {activeSkills.length > 0 && (
        <div className="px-6 py-2.5 bg-amber-500/5 border-b border-amber-500/10 flex items-center gap-2 shrink-0">
          <Sparkles size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-400 font-medium">Active skills:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeSkills.map(s => (
              <span key={s.id} className="text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-full px-2.5 py-0.5 text-amber-400 font-medium">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dashboard — dark bento grid */}
      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-12 gap-4 auto-rows-min">

          {/* ── Health Score ── */}
          <div className="col-span-4 bg-slate-800/60 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/30 relative overflow-hidden shadow-lg shadow-orange-500/5">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(249,115,22,0.06),transparent_60%)] pointer-events-none" />
            <div className="relative flex items-center gap-5">
              <HealthRing score={healthScore} />
              <div className="flex-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Health</p>
                <p className="text-[13px] font-bold text-white leading-snug">
                  {criticalCount > 0 ? `${criticalCount} critical issue${criticalCount > 1 ? 's' : ''}` : 'Looking good'}
                </p>
                {totalSavings > 0 && (
                  <p className="text-[11px] text-orange-400 font-semibold mt-1 flex items-center gap-1">
                    <DollarSign size={10} /> ~${totalSavings.toLocaleString()}/wk potential
                  </p>
                )}
                <div className="flex items-center gap-2.5 mt-3">
                  {[
                    { c: criticalCount, dot: 'bg-red-500', label: 'Crit' },
                    { c: warningCount, dot: 'bg-amber-500', label: 'Warn' },
                    { c: opportunityCount, dot: 'bg-blue-500', label: 'Opp' },
                    { c: successCount, dot: 'bg-emerald-500', label: 'OK' },
                  ].map(m => (
                    <div key={m.label} className="flex items-center gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
                      <span className="text-[10px] text-slate-500"><span className="font-bold text-slate-300">{m.c}</span> {m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Critical — large cards ── */}
          {criticals.length > 0 && (
            <div className="col-span-8 grid grid-cols-2 gap-4">
              {criticals.map((rec, i) => (
                <BentoCard key={`c-${i}`} rec={rec} size="lg" onAction={handleAction} />
              ))}
            </div>
          )}

          {/* ── Warnings ── */}
          {warnings.length > 0 && (
            <div className={`${criticals.length > 0 ? 'col-span-6' : 'col-span-8'} grid grid-cols-2 gap-4`}>
              {warnings.map((rec, i) => (
                <BentoCard key={`w-${i}`} rec={rec} size="lg" onAction={handleAction} />
              ))}
            </div>
          )}

          {/* ── Opportunities ── */}
          {opportunities.length > 0 && (
            <div className={`${criticals.length > 0 && warnings.length > 0 ? 'col-span-6' : 'col-span-12'} grid grid-cols-2 gap-3`}>
              {opportunities.map((rec, i) => (
                <BentoCard key={`o-${i}`} rec={rec} size="sm" onAction={handleAction} />
              ))}
            </div>
          )}

          {/* ── Healthy — slim dark-emerald row ── */}
          {successes.length > 0 && (
            <div className="col-span-12 flex gap-3">
              {successes.map((rec, i) => (
                <div key={`s-${i}`} className="flex-1 bg-slate-800/60 backdrop-blur-xl rounded-xl border border-emerald-500/20 px-4 py-3 flex items-center gap-3 transition-all hover:border-emerald-500/40">
                  <CheckCircle size={16} className="text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{rec.title}</p>
                    <p className="text-[10px] text-slate-500 truncate">{rec.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
