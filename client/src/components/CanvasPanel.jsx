import { useState, useMemo } from 'react';
import { X, BarChart3, Maximize2, Minimize2, Download, Filter, ChevronDown, ChevronRight, AlertTriangle, TrendingUp, Pause, Play, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#ef4444', '#14b8a6'];

const fmtNum = (n) => {
  if (n == null) return '—';
  if (typeof n === 'string') return n;
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtCurrency = (n, currency = '$') => {
  if (n == null) return '—';
  return `${currency}${fmtNum(n)}`;
};

// ── KPI Card ────────────────────────────────────────────────────────────────
const KpiCard = ({ label, value, change, trend }) => {
  const isUp = trend === 'up' || (typeof change === 'string' && change.startsWith('+'));
  const isDown = trend === 'down' || (typeof change === 'string' && change.startsWith('-'));
  // For cost metrics, down is good. For volume metrics, up is good.
  const isCost = /cost|cpa|cpl|cpm|cpc|spend/i.test(label);
  const isGood = isCost ? isDown : isUp;

  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex-1 min-w-[140px]">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-lg font-bold text-slate-800 mt-0.5">{value}</p>
      {change && (
        <div className={`flex items-center gap-1 mt-1 text-[11px] font-medium ${isGood ? 'text-emerald-600' : isDown || isUp ? 'text-red-500' : 'text-slate-400'}`}>
          {isUp ? <ArrowUpRight size={12} /> : isDown ? <ArrowDownRight size={12} /> : null}
          <span>{change} vs prev period</span>
        </div>
      )}
    </div>
  );
};

// ── Recommendation Card ─────────────────────────────────────────────────────
const RecommendationCard = ({ rec, onApply }) => {
  const [applied, setApplied] = useState(false);
  const severityStyles = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', icon: '🚨', text: 'text-red-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: '⚠️', text: 'text-amber-700' },
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: '🚀', text: 'text-emerald-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', icon: '💡', text: 'text-blue-700' },
  };
  const s = severityStyles[rec.severity] || severityStyles.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
      <span className="text-base">{s.icon}</span>
      <p className={`flex-1 text-[13px] font-medium ${s.text}`}>{rec.text}</p>
      {rec.action && !applied && (
        <button onClick={() => { setApplied(true); onApply?.(rec); }}
          className="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition-colors whitespace-nowrap">
          Apply
        </button>
      )}
      {applied && <span className="text-[11px] text-emerald-600 font-medium">Applied ✓</span>}
    </div>
  );
};

// ── Campaign Row ────────────────────────────────────────────────────────────
const CampaignRow = ({ campaign, isExpanded, onToggle }) => {
  const statusEmoji = {
    '🚨': 'text-red-500', '⚠️': 'text-amber-500', '⚔️': 'text-orange-500',
    '⚖️': 'text-slate-500', '🚀': 'text-emerald-500', '📊': 'text-blue-500',
  };

  return (
    <>
      <tr onClick={onToggle}
        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
        <td className="px-3 py-2.5 text-center">
          <span className={statusEmoji[campaign.status] || 'text-slate-400'}>{campaign.status || '—'}</span>
        </td>
        <td className="px-3 py-2.5">
          <p className="text-[12px] font-medium text-slate-800 truncate max-w-[200px]">{campaign.name}</p>
        </td>
        <td className="px-3 py-2.5 text-right text-[12px] text-slate-600">{fmtCurrency(campaign.spend)}</td>
        <td className="px-3 py-2.5 text-right text-[12px] text-slate-600">{fmtCurrency(campaign.cpa)}</td>
        <td className="px-3 py-2.5 text-right text-[12px] text-slate-600">{campaign.ctr ? `${campaign.ctr}%` : '—'}</td>
        <td className="px-3 py-2.5 text-right">
          <span className={`text-[11px] font-medium ${campaign.wow?.startsWith('+') ? 'text-red-500' : campaign.wow?.startsWith('-') ? 'text-emerald-600' : 'text-slate-400'}`}>
            {campaign.wow || '—'}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <ChevronRight size={12} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-4 py-3 bg-blue-50/30 border-b border-blue-100">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <span className="font-semibold text-slate-500">Diagnosis:</span>
                <span className="ml-2 text-slate-700">{campaign.diagnosis || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Action:</span>
                <span className="ml-2 text-slate-700">{campaign.action || 'N/A'}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main Canvas Panel ───────────────────────────────────────────────────────
export const CanvasPanel = ({ data, onClose, onSend }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('spend');
  const [sortDir, setSortDir] = useState('desc');

  if (!data) return null;

  // Parse dashboard data — support both old format (content string) and new format (structured)
  const dashboard = useMemo(() => {
    if (data.dashboard) return data.dashboard;
    // Try to extract dashboard block from content
    if (data.content) {
      const match = data.content.match(/```dashboard\n([\s\S]*?)```/);
      if (match) {
        try { return JSON.parse(match[1]); } catch { /* fall through */ }
      }
    }
    return null;
  }, [data]);

  // If no dashboard data, fall back to simple content display
  if (!dashboard) {
    // Legacy fallback — import RichContent dynamically to avoid circular dependency
    return (
      <div className={`flex flex-col bg-white/95 backdrop-blur-xl border-l border-slate-200 shadow-2xl transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50' : 'relative h-full'}`}>
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
              <BarChart3 size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{data.title || 'Performance Dashboard'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsFullScreen(f => !f)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-slate-500 whitespace-pre-wrap">{data.content || 'No data available'}</p>
        </div>
      </div>
    );
  }

  // Filtered + sorted campaigns
  const campaigns = useMemo(() => {
    let list = dashboard.campaigns || [];
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    list.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return list;
  }, [dashboard.campaigns, statusFilter, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleApply = (rec) => {
    if (rec.action && onSend) {
      const params = rec.params ? Object.entries(rec.params).map(([k, v]) => `${k}=${v}`).join(', ') : '';
      onSend(`Execute: ${rec.action}${params ? ` (${params})` : ''}`);
    }
  };

  const handleExport = () => {
    if (!dashboard.campaigns?.length) return;
    const headers = ['Status', 'Campaign', 'Spend', 'CPA', 'CTR', 'WoW', 'Diagnosis', 'Action'];
    const rows = dashboard.campaigns.map(c => [c.status, c.name, c.spend, c.cpa, c.ctr, c.wow, c.diagnosis, c.action]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `performance-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Extract chart data
  const budgetChart = dashboard.charts?.find(c => c.type === 'budget');
  const comparisonChart = dashboard.charts?.find(c => c.type === 'comparison');
  const trendChart = dashboard.charts?.find(c => c.type === 'trend');

  return (
    <div className={`flex flex-col bg-gradient-to-b from-slate-50 to-white border-l border-slate-200 shadow-2xl transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50' : 'relative h-full'}`}>
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center">
            <BarChart3 size={14} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">{dashboard.title || 'Performance Dashboard'}</p>
            {dashboard.dateRange && <p className="text-[10px] text-slate-400">{dashboard.dateRange}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors">
            <Download size={12} /> Export CSV
          </button>
          <button onClick={() => setIsFullScreen(f => !f)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable dashboard content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* KPI Cards */}
        {dashboard.kpis?.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {dashboard.kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
          </div>
        )}

        {/* Charts Grid */}
        {(budgetChart || comparisonChart || trendChart) && (
          <div className="grid grid-cols-2 gap-4">
            {budgetChart?.data?.items && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">{budgetChart.data.title || 'Budget Allocation'}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={budgetChart.data.items} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35}>
                      {budgetChart.data.items.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => fmtCurrency(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            {comparisonChart?.data?.items && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">{comparisonChart.data.title || 'CPA Comparison'}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={comparisonChart.data.items} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Bar dataKey="current" fill="#3b82f6" radius={[4, 4, 0, 0]} name="This Period" />
                    <Bar dataKey="previous" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Previous" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {trendChart?.data?.series && (
              <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-3">{trendChart.data.title || '7-Day Trend'}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={trendChart.data.series}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} />
                    <YAxis tick={{ fontSize: 9 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="spend" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} name="Spend" />
                    {trendChart.data.series[0]?.conversions != null && (
                      <Area type="monotone" dataKey="conversions" stroke="#10b981" fill="#10b981" fillOpacity={0.1} name="Conversions" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {/* Campaign Table */}
        {campaigns.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Campaigns ({campaigns.length})</p>
              <div className="flex items-center gap-2">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none">
                  <option value="all">All Status</option>
                  <option value="🚨">🚨 Budget Leak</option>
                  <option value="⚠️">⚠️ Creative Decay</option>
                  <option value="⚔️">⚔️ Auction Pressure</option>
                  <option value="🚀">🚀 Growth</option>
                  <option value="⚖️">⚖️ Stable</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase w-10">Status</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase">Campaign</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right cursor-pointer hover:text-blue-500" onClick={() => handleSort('spend')}>
                      Spend {sortBy === 'spend' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right cursor-pointer hover:text-blue-500" onClick={() => handleSort('cpa')}>
                      CPA {sortBy === 'cpa' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right cursor-pointer hover:text-blue-500" onClick={() => handleSort('ctr')}>
                      CTR {sortBy === 'ctr' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right">WoW</th>
                    <th className="px-3 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {campaigns.map((c, i) => (
                    <CampaignRow key={c.id || i} campaign={c}
                      isExpanded={expandedCampaign === (c.id || i)}
                      onToggle={() => setExpandedCampaign(expandedCampaign === (c.id || i) ? null : (c.id || i))} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {dashboard.recommendations?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Recommendations</p>
            {dashboard.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} onApply={handleApply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
