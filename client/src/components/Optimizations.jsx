import { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, ArrowRight, ArrowUpRight, ArrowDownRight, Zap, DollarSign, Users, Target, Eye, BarChart3, ShieldCheck, Palette, Radio, ChevronDown, ChevronUp, Pause, Rocket, Wrench } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';

// ── Mock Data ──
const MOCK_KPI = [
  { label: 'Total Spend', value: '$12,450', change: +8.2, prefix: '', trend: [8200, 9100, 10300, 9800, 11200, 11800, 12450] },
  { label: 'Total Results', value: '342', change: -3.1, prefix: '', trend: [380, 365, 350, 370, 355, 348, 342] },
  { label: 'Avg CPA', value: '$36.40', change: +12.0, prefix: '', trend: [30, 31, 33, 32, 34, 35, 36.4], warning: true },
  { label: 'ROAS', value: '2.8x', change: -5.0, prefix: '', trend: [3.1, 3.0, 2.95, 2.9, 2.85, 2.82, 2.8] },
];

const MOCK_HEALTH = { overall: 72, breakdown: [
  { label: 'Budget Efficiency', score: 85, color: 'from-emerald-400 to-emerald-500' },
  { label: 'Audience Health', score: 68, color: 'from-blue-400 to-blue-500' },
  { label: 'Creative Freshness', score: 55, color: 'from-amber-400 to-amber-500' },
  { label: 'Tracking Accuracy', score: 92, color: 'from-violet-400 to-violet-500' },
]};

const MOCK_ALERTS = [
  { severity: 'critical', title: '3 campaigns overspending — CPA 40% above target', description: 'Campaigns "Retarget - Cart Abandon", "Broad - Lookalike 2%", and "MOFU Video Viewers" have CPAs significantly above the $25 target. Combined overspend of $1,840 in the last 7 days.', affected: ['Retarget - Cart Abandon', 'Broad - Lookalike 2%', 'MOFU Video Viewers'], action: 'Fix Now' },
  { severity: 'warning', title: 'Ad fatigue detected — 2 ad sets with frequency > 4.0', description: 'Ad sets "Summer Sale - Static" (freq 4.3) and "Evergreen - Carousel" (freq 4.8) are showing signs of creative fatigue. CTR has dropped 22% week-over-week.', affected: ['Summer Sale - Static', 'Evergreen - Carousel'], action: 'Review' },
  { severity: 'opportunity', title: 'Top performer found — scale opportunity', description: 'Campaign "Summer Sale TOFU" is delivering 3.5x ROAS with room in the auction. Budget utilization is only 60%. Consider increasing daily budget by 20-30%.', affected: ['Summer Sale TOFU'], action: 'Scale' },
];

const MOCK_CAMPAIGNS = [
  { name: 'Summer Sale TOFU', status: 'Active', spend: 3240, results: 142, cpa: 22.82, roas: 3.5, ctr: 2.8, change: +15 },
  { name: 'Retarget - Cart Abandon', status: 'Active', spend: 2890, results: 58, cpa: 49.83, roas: 1.8, ctr: 1.2, change: -22 },
  { name: 'Broad - Lookalike 2%', status: 'Active', spend: 2750, results: 68, cpa: 40.44, roas: 2.1, ctr: 1.9, change: -8 },
  { name: 'Evergreen - Testimonials', status: 'Active', spend: 1980, results: 52, cpa: 38.08, roas: 2.4, ctr: 2.1, change: +3 },
  { name: 'MOFU Video Viewers', status: 'Active', spend: 1590, results: 22, cpa: 72.27, roas: 1.2, ctr: 0.8, change: -31 },
];

// ── Sparkline SVG ──
const Sparkline = ({ data, color = '#f97316', warning = false }) => {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const h = 24, w = 56;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  const stroke = warning ? '#ef4444' : color;
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
};

// ── Circular Gauge ──
const HealthGauge = ({ score }) => {
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#f97316' : '#ef4444';
  return (
    <div className="relative w-36 h-36 shrink-0">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black text-slate-800">{score}</span>
        <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
      </div>
    </div>
  );
};

// ── Severity config ──
const SEVERITY = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', iconColor: 'text-red-500', badge: 'bg-red-100 text-red-700', btnClass: 'from-red-500 to-red-600 shadow-red-500/25' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700', btnClass: 'from-amber-500 to-amber-600 shadow-amber-500/25' },
  opportunity: { bg: 'bg-emerald-50', border: 'border-emerald-200', iconColor: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700', btnClass: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25' },
};
const SEVERITY_ICON = { critical: AlertTriangle, warning: AlertTriangle, opportunity: Rocket };

// ── Main Component ──
export const Optimizations = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat, activeSkills = [] }) => {
  const [loading, setLoading] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [lastScanned, setLastScanned] = useState(null);
  const [sortCol, setSortCol] = useState('spend');
  const [sortDir, setSortDir] = useState('desc');

  const runScan = useCallback(async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setScanned(true);
    setLastScanned(new Date());
    setLoading(false);
  }, []);

  const sortedCampaigns = useMemo(() => {
    const data = [...MOCK_CAMPAIGNS];
    data.sort((a, b) => {
      const av = a[sortCol], bv = b[sortCol];
      return sortDir === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });
    return data;
  }, [sortCol, sortDir]);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const SortIcon = ({ col }) => sortCol === col ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : null;

  const hasAccount = token && adAccountId;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Optimizations</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {lastScanned ? `Last scanned: ${lastScanned.toLocaleTimeString()}` : 'Performance insights & recommendations'}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <button onClick={runScan} disabled={loading || !hasAccount}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-colors shadow-lg shadow-orange-500/30 disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!hasAccount ? (
          /* No account connected */
          <div className="flex flex-col items-center justify-center py-20 animate-[fadeSlideUp_0.4s_ease-out_both]">
            <div className="w-20 h-20 rounded-2xl bg-orange-50 flex items-center justify-center mb-5">
              <Zap size={36} className="text-orange-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : !scanned && !loading ? (
          /* Before scan state */
          <div className="px-6 py-6 space-y-5 animate-[fadeSlideUp_0.4s_ease-out_both]">
            {/* Empty KPI cards */}
            <div className="grid grid-cols-4 gap-4">
              {['Total Spend', 'Total Results', 'Avg CPA', 'ROAS'].map((label) => (
                <div key={label} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 hover:shadow-md transition-all">
                  <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
                  <p className="text-2xl font-bold text-slate-200 mt-2">--</p>
                  <div className="mt-2 h-6 bg-slate-50 rounded" />
                </div>
              ))}
            </div>

            {/* Empty health + alerts row */}
            <div className="grid grid-cols-5 gap-4">
              <div className="col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center min-h-[220px]">
                <div className="w-36 h-36 rounded-full border-8 border-slate-100 flex items-center justify-center">
                  <span className="text-3xl font-black text-slate-200">--</span>
                </div>
                <p className="text-xs text-slate-300 mt-3 font-medium">Health Score</p>
              </div>
              <div className="col-span-3 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 flex flex-col items-center justify-center min-h-[220px]">
                <AlertTriangle size={32} className="text-slate-200 mb-3" />
                <p className="text-sm font-semibold text-slate-300">No alerts yet</p>
                <p className="text-xs text-slate-300 mt-1">Run a scan to surface insights</p>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col items-center py-6">
              <button onClick={runScan}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-colors shadow-lg shadow-orange-500/30">
                <Zap size={16} /> Connect & Scan
              </button>
              <p className="text-[11px] text-slate-400 mt-2">Analyzes your last 30 days of campaign data</p>
            </div>
          </div>
        ) : loading ? (
          /* Loading state */
          <div className="flex flex-col items-center justify-center py-20 animate-[fadeSlideUp_0.4s_ease-out_both]">
            <Loader2 size={40} className="text-orange-400 animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-700">Analyzing your campaigns...</p>
            <p className="text-xs text-slate-400 mt-1">Crunching 30 days of performance data</p>
          </div>
        ) : (
          /* Dashboard with data */
          <div className="px-6 py-5 space-y-5">
            {/* KPI Cards */}
            <div className="grid grid-cols-4 gap-4" style={{ animationDelay: '0.05s' }}>
              {MOCK_KPI.map((kpi, i) => {
                const up = kpi.change > 0;
                const isGood = kpi.label === 'ROAS' || kpi.label === 'Total Results' ? up : !up;
                const changeColor = kpi.warning ? 'text-red-500' : isGood ? 'text-emerald-500' : 'text-red-500';
                return (
                  <div key={i} className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all animate-[fadeSlideUp_0.4s_ease-out_both]"
                    style={{ animationDelay: `${i * 0.08}s` }}>
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{kpi.label}</p>
                      {kpi.warning && <AlertTriangle size={13} className="text-red-400" />}
                    </div>
                    <p className="text-2xl font-bold text-slate-800 mt-2">{kpi.value}</p>
                    <div className="flex items-center justify-between mt-2">
                      <div className={`flex items-center gap-1 text-[11px] font-semibold ${changeColor}`}>
                        {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                        {up ? '+' : ''}{kpi.change}% WoW
                      </div>
                      <Sparkline data={kpi.trend} warning={kpi.warning} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Health Score + Alerts */}
            <div className="grid grid-cols-5 gap-4">
              {/* Health Score */}
              <div className="col-span-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-6 animate-[fadeSlideUp_0.4s_ease-out_both]" style={{ animationDelay: '0.2s' }}>
                <h2 className="text-sm font-bold text-slate-800 mb-4">Account Health</h2>
                <div className="flex items-center gap-6">
                  <HealthGauge score={MOCK_HEALTH.overall} />
                  <div className="flex-1 space-y-3">
                    {MOCK_HEALTH.breakdown.map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-slate-600">{item.label}</span>
                          <span className="text-[11px] font-bold text-slate-700">{item.score}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-1000 ease-out`}
                            style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Active Alerts */}
              <div className="col-span-3 space-y-3 animate-[fadeSlideUp_0.4s_ease-out_both]" style={{ animationDelay: '0.3s' }}>
                <h2 className="text-sm font-bold text-slate-800">Active Alerts</h2>
                {MOCK_ALERTS.map((alert, i) => {
                  const sev = SEVERITY[alert.severity];
                  const Icon = SEVERITY_ICON[alert.severity];
                  return (
                    <div key={i} className={`${sev.bg} border ${sev.border} rounded-2xl p-4 hover:shadow-md transition-all`}>
                      <div className="flex items-start gap-3">
                        <Icon size={16} className={`${sev.iconColor} mt-0.5 shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${sev.badge}`}>{alert.severity}</span>
                          </div>
                          <h3 className="text-[13px] font-bold text-slate-800">{alert.title}</h3>
                          <p className="text-[11px] text-slate-600 mt-1 leading-relaxed line-clamp-2">{alert.description}</p>
                          {alert.affected?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {alert.affected.map((name, j) => (
                                <span key={j} className="text-[10px] bg-white/60 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600">{name}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => onPrefillChat?.(`${alert.title} — ${alert.description}`)}
                          className={`shrink-0 flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-r ${sev.btnClass} rounded-lg shadow-lg transition-colors`}>
                          {alert.action} <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top Campaigns Table */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 overflow-hidden animate-[fadeSlideUp_0.4s_ease-out_both]" style={{ animationDelay: '0.4s' }}>
              <div className="px-5 py-4 border-b border-slate-100">
                <h2 className="text-sm font-bold text-slate-800">Top Campaigns</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-slate-100">
                      {[
                        { key: 'name', label: 'Campaign' },
                        { key: 'status', label: 'Status' },
                        { key: 'spend', label: 'Spend' },
                        { key: 'results', label: 'Results' },
                        { key: 'cpa', label: 'CPA' },
                        { key: 'roas', label: 'ROAS' },
                        { key: 'ctr', label: 'CTR' },
                        { key: 'change', label: 'WoW' },
                      ].map(col => (
                        <th key={col.key} onClick={() => handleSort(col.key)}
                          className="px-5 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none">
                          <span className="flex items-center gap-1">{col.label} <SortIcon col={col.key} /></span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCampaigns.map((c, i) => {
                      const roasColor = c.roas >= 3 ? 'text-emerald-600 bg-emerald-50' : c.roas >= 2 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';
                      const changeColor = c.change > 0 ? 'text-emerald-600' : 'text-red-600';
                      return (
                        <tr key={i} className="border-b border-slate-50 hover:bg-orange-50/30 transition-colors">
                          <td className="px-5 py-3 text-[12px] font-semibold text-slate-800 max-w-[200px] truncate">{c.name}</td>
                          <td className="px-5 py-3"><span className="text-[10px] font-medium bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">{c.status}</span></td>
                          <td className="px-5 py-3 text-[12px] font-medium text-slate-700">${c.spend.toLocaleString()}</td>
                          <td className="px-5 py-3 text-[12px] font-medium text-slate-700">{c.results}</td>
                          <td className="px-5 py-3 text-[12px] font-medium text-slate-700">${c.cpa.toFixed(2)}</td>
                          <td className="px-5 py-3"><span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${roasColor}`}>{c.roas}x</span></td>
                          <td className="px-5 py-3 text-[12px] font-medium text-slate-700">{c.ctr}%</td>
                          <td className="px-5 py-3">
                            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${changeColor}`}>
                              {c.change > 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
                              {c.change > 0 ? '+' : ''}{c.change}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="flex items-center gap-3 animate-[fadeSlideUp_0.4s_ease-out_both]" style={{ animationDelay: '0.5s' }}>
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide shrink-0">Quick Actions</span>
              <div className="h-px flex-1 bg-slate-200/60" />
              <button onClick={() => onPrefillChat?.('Pause my underperforming campaigns — any campaign with CPA more than 40% above target or ROAS below 1.5x.')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-md transition-all">
                <Pause size={13} /> Pause Underperformers
              </button>
              <button onClick={() => onPrefillChat?.('Scale my winning campaigns — increase budget by 20% on campaigns with ROAS above 3x and CPA below target.')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-md transition-all">
                <Rocket size={13} /> Scale Winners
              </button>
              <button onClick={() => onPrefillChat?.('Check my tracking setup — audit my Meta Pixel, Conversions API, and event match quality for any issues.')}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 hover:border-orange-300 hover:text-orange-600 hover:shadow-md transition-all">
                <Wrench size={13} /> Fix Tracking Issues
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
