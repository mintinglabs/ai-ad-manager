import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, TrendingUp, TrendingDown, Download, Calendar, Filter, ChevronDown, Sparkles, Zap, ArrowRight } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';
import { PlatformAccountSelector } from './PlatformAccountSelector.jsx';
import { PlatformTabs } from './PlatformTabs.jsx';
import api from '../services/api.js';

// ── Formatting ──
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f59e0b', '#ef4444', '#14b8a6'];
const fmtCurrency = (v, sym = 'HK$') => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (n >= 1000000) return `${sym}${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${sym}${(n / 1000).toFixed(1)}K`;
  return `${sym}${n.toFixed(2)}`;
};
const fmtNum = (v) => v != null ? Number(v).toLocaleString() : '—';
const fmtPct = (v) => v != null ? `${Number(v).toFixed(2)}%` : '—';
const fmtX = (v) => v != null ? `${Number(v).toFixed(2)}x` : '—';
const pctChange = (curr, prev) => {
  if (!prev || prev === 0) return null;
  const change = ((curr - prev) / prev * 100).toFixed(1);
  return change > 0 ? `+${change}%` : `${change}%`;
};

const DATE_PRESETS = [
  { value: 'last_7d', label: '7D', full: 'Last 7 Days' },
  { value: 'last_14d', label: '14D', full: 'Last 14 Days' },
  { value: 'last_30d', label: '30D', full: 'Last 30 Days' },
  { value: 'this_month', label: 'MTD', full: 'This Month' },
  { value: 'last_month', label: 'Last Mo', full: 'Last Month' },
];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'demographics', label: 'Demographics' },
  { id: 'placements', label: 'Placements' },
];

// ── KPI Card with WoW comparison ──
const KpiCard = ({ label, value, prevValue, isCost, prefix = '' }) => {
  const change = pctChange(value, prevValue);
  const isPositive = change && change.startsWith('+');
  const isNegative = change && change.startsWith('-');
  const isGood = isCost ? isNegative : isPositive;

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-4 flex flex-col shadow-sm hover:shadow-md transition-shadow">
      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.12em]">{label}</p>
      <p className="text-[20px] font-extrabold text-slate-800 mt-1 tracking-tight">{prefix}{typeof value === 'number' ? (label.match(/CTR|Rate/i) ? fmtPct(value) : label.match(/ROAS/i) ? fmtX(value) : fmtCurrency(value)) : value}</p>
      {change && (
        <div className={`flex items-center gap-1 mt-1.5 text-[10px] font-bold ${isGood ? 'text-emerald-600' : (isPositive || isNegative) ? 'text-red-500' : 'text-slate-400'}`}>
          {(isPositive && !isCost) || (isNegative && isCost) ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          <span>{change}</span>
          <span className="text-slate-300 font-normal ml-0.5">vs prev</span>
        </div>
      )}
    </div>
  );
};

// ── Heatmap Row ──
const HeatmapCell = ({ value, max, label }) => {
  const intensity = max > 0 ? Math.min(value / max, 1) : 0;
  const bg = intensity > 0.7 ? 'bg-orange-500 text-white' : intensity > 0.4 ? 'bg-orange-200 text-orange-900' : intensity > 0.1 ? 'bg-orange-50 text-orange-700' : 'bg-slate-50 text-slate-400';
  return (
    <td className={`px-2 py-1.5 text-center text-[10px] font-medium ${bg} transition-colors`} title={`${label}: ${value}`}>
      {value > 0 ? fmtNum(value) : '—'}
    </td>
  );
};

// ── Campaign Row ──
const CampaignRow = ({ c, currency }) => {
  const insights = c.insights?.data?.[0] || {};
  const spend = parseFloat(insights.spend || 0);
  const impr = parseInt(insights.impressions || 0);
  const clicks = parseInt(insights.clicks || 0);
  const ctr = parseFloat(insights.ctr || 0);
  const cpc = parseFloat(insights.cpc || 0);
  const cpm = parseFloat(insights.cpm || 0);
  const reach = parseInt(insights.reach || 0);
  const freq = parseFloat(insights.frequency || 0);
  const actions = insights.actions || [];
  const results = actions.reduce((s, a) => s + parseInt(a.value || 0), 0);
  const cpr = results > 0 ? spend / results : 0;
  const roas = insights.purchase_roas?.[0]?.value ? parseFloat(insights.purchase_roas[0].value) : null;
  const qr = insights.quality_ranking || '—';
  const er = insights.engagement_rate_ranking || '—';
  const status = (c.effective_status || c.status || '').toUpperCase();
  const statusColor = status === 'ACTIVE' ? 'bg-emerald-500' : status === 'PAUSED' ? 'bg-slate-400' : 'bg-red-400';

  return (
    <tr className="border-b border-slate-100/80 hover:bg-orange-50/30 transition-colors text-[11px]">
      <td className="py-3 px-3"><span className={`w-2 h-2 rounded-full ${statusColor} inline-block mr-2`} /><span className="font-medium text-slate-700 truncate">{c.name?.slice(0, 30)}</span></td>
      <td className="py-3 px-2 text-right font-semibold text-slate-800">{fmtCurrency(spend, currency)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{fmtNum(impr)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{fmtNum(reach)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{fmtNum(clicks)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{fmtPct(ctr)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{fmtCurrency(cpc, currency)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{fmtCurrency(cpm, currency)}</td>
      <td className="py-3 px-2 text-right font-semibold text-slate-800">{fmtNum(results)}</td>
      <td className="py-3 px-2 text-right text-slate-500">{cpr > 0 ? fmtCurrency(cpr, currency) : '—'}</td>
      <td className="py-3 px-2 text-right">{roas ? <span className={roas >= 2 ? 'text-emerald-600 font-bold' : roas >= 1 ? 'text-amber-600' : 'text-red-500'}>{fmtX(roas)}</span> : '—'}</td>
      <td className="py-3 px-2 text-right text-[10px] text-slate-400">{freq.toFixed(1)}</td>
    </tr>
  );
};

// ── Chart Card ──
const ChartCard = ({ title, children, className = '', colSpan = 1 }) => (
  <div className={`bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 p-5 shadow-sm ${colSpan === 2 ? 'lg:col-span-2' : ''} ${className}`}>
    <p className="text-[11px] font-bold text-slate-500 mb-4">{title}</p>
    {children}
  </div>
);

// ── Tooltip ──
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl text-[10px]">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          {p.name}: <span className="font-bold ml-auto">{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Google Reports Panel ──
const GOOGLE_DATE_MAP = { last_7d: 'LAST_7_DAYS', last_14d: 'LAST_14_DAYS', last_30d: 'LAST_30_DAYS', this_month: 'THIS_MONTH', last_month: 'LAST_MONTH' };

const GoogleReportsPanel = ({ googleConnected, googleCustomerId, googleLoginCustomerId, onGoogleConnect }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datePreset, setDatePreset] = useState('last_30d');

  useEffect(() => {
    if (!googleCustomerId) return;
    setLoading(true);
    const range = GOOGLE_DATE_MAP[datePreset] || 'LAST_30_DAYS';
    const login = googleLoginCustomerId ? `&loginCustomerId=${googleLoginCustomerId}` : '';
    fetch(`/api/google/reports?accountId=${googleCustomerId}${login}&dateRange=${range}`)
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [googleCustomerId, googleLoginCustomerId, datePreset]);

  if (!googleConnected) return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-xl font-bold text-red-500">G</div>
      <p className="text-sm font-semibold text-slate-700">Connect Google Ads</p>
      <p className="text-xs text-slate-400">Sign in with Google to view performance reports.</p>
      <button onClick={onGoogleConnect} className="text-xs font-medium px-4 py-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">Connect Google Ads</button>
    </div>
  );
  if (!googleCustomerId) return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <p className="text-sm font-semibold text-slate-700">Select a Google Ads account</p>
      <p className="text-xs text-slate-400">Pick an account from the selector above.</p>
    </div>
  );

  if (loading) return <div className="flex-1 flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>;
  if (error) {
    const isManagerErr = /manager account/i.test(error);
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-3 px-6 text-center">
        <p className="text-sm font-semibold text-slate-700">{isManagerErr ? 'This is a manager (MCC) account' : 'Could not load reports'}</p>
        <p className="text-xs text-slate-400 max-w-md">{isManagerErr ? 'Google Ads API doesn\u2019t return metrics for manager accounts. Pick a child account from the selector above.' : error}</p>
      </div>
    );
  }
  if (!data) return null;

  const { metrics, account } = data;
  const kpis = [
    { label: 'Spend', value: `$${(metrics?.spend || 0).toFixed(2)}` },
    { label: 'Clicks', value: (metrics?.clicks || 0).toLocaleString() },
    { label: 'Impressions', value: (metrics?.impressions || 0).toLocaleString() },
    { label: 'Conversions', value: (metrics?.conversions || 0).toFixed(1) },
    { label: 'ROAS', value: (metrics?.roas || 0).toFixed(2) },
    { label: 'CPA', value: metrics?.cpa ? `$${metrics.cpa.toFixed(2)}` : '—' },
    { label: 'CTR', value: metrics?.avgCtr ? `${(metrics.avgCtr * 100).toFixed(2)}%` : '—' },
    { label: 'Avg CPC', value: metrics?.avgCpc ? `$${metrics.avgCpc.toFixed(2)}` : '—' },
  ];

  return (
    <div className="flex-1 overflow-auto px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-slate-700">{account?.name || `Account ${googleCustomerId}`}</p>
          <p className="text-xs text-slate-400">Optimization Score: {account?.optimizationScore ? `${(account.optimizationScore * 100).toFixed(0)}%` : '—'}</p>
        </div>
        <select value={datePreset} onChange={e => setDatePreset(e.target.value)} className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-600">
          {DATE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-slate-800">{k.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main Report Dashboard ──
export const ReportDashboard = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onNavigateToOptimizations, googleConnected, googleCustomerId, googleLoginCustomerId, onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount }) => {
  const [platform, setPlatform] = useState('meta');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datePreset, setDatePreset] = useState('last_7d');
  const [activeTab, setActiveTab] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('all');

  // Data
  const [currentInsights, setCurrentInsights] = useState(null);
  const [prevInsights, setPrevInsights] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [ageGenderData, setAgeGenderData] = useState([]);
  const [placementData, setPlacementData] = useState([]);

  const currency = 'HK$';

  // Map date preset to previous period
  const prevPreset = useMemo(() => {
    const map = { last_7d: 'last_14d', last_14d: 'last_30d', last_30d: 'last_30d', this_month: 'last_month', last_month: 'last_month' };
    return map[datePreset] || 'last_14d';
  }, [datePreset]);

  const fetchReport = useCallback(async () => {
    if (!adAccountId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [currRes, prevRes, campaignsRes, dailyRes, ageRes, placeRes] = await Promise.all([
        api.get('/insights', { params: { adAccountId, date_preset: datePreset } }).catch(() => ({ data: null })),
        api.get('/insights', { params: { adAccountId, date_preset: prevPreset } }).catch(() => ({ data: null })),
        api.get('/campaigns', { params: { adAccountId } }).catch(() => ({ data: [] })),
        api.get(`/insights/${adAccountId}`, { params: { date_preset: datePreset, time_increment: 1, fields: 'spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions,purchase_roas' } }).catch(() => ({ data: [] })),
        api.get(`/insights/${adAccountId}`, { params: { date_preset: datePreset, breakdowns: 'age,gender', fields: 'spend,impressions,clicks,actions', level: 'account' } }).catch(() => ({ data: [] })),
        api.get(`/insights/${adAccountId}`, { params: { date_preset: datePreset, breakdowns: 'publisher_platform', fields: 'spend,impressions,clicks,actions,cpm,ctr', level: 'account' } }).catch(() => ({ data: [] })),
      ]);

      if (currRes.data) setCurrentInsights(currRes.data);
      setPrevInsights(prevRes.data);
      setCampaigns(campaignsRes.data?.data || campaignsRes.data || []);

      const rawDaily = Array.isArray(dailyRes.data) ? dailyRes.data : (dailyRes.data?.data || []);
      setDailyData(rawDaily.map(d => ({
        date: d.date_start?.slice(5) || '',
        spend: parseFloat(d.spend || 0),
        impressions: parseInt(d.impressions || 0),
        clicks: parseInt(d.clicks || 0),
        ctr: parseFloat(d.ctr || 0),
        cpc: parseFloat(d.cpc || 0),
        cpm: parseFloat(d.cpm || 0),
        reach: parseInt(d.reach || 0),
        roas: d.purchase_roas?.[0]?.value ? parseFloat(d.purchase_roas[0].value) : null,
      })));

      const rawAge = Array.isArray(ageRes.data) ? ageRes.data : (ageRes.data?.data || []);
      setAgeGenderData(rawAge);

      const rawPlace = Array.isArray(placeRes.data) ? placeRes.data : (placeRes.data?.data || []);
      setPlacementData(rawPlace);

    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, token, datePreset, prevPreset]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // KPIs with WoW
  const kpis = useMemo(() => {
    if (!currentInsights) return null;
    const c = currentInsights;
    const p = prevInsights || {};
    return {
      spend: { curr: c.totalSpend, prev: p.totalSpend },
      impressions: { curr: c.impressions, prev: p.impressions },
      clicks: { curr: c.clicks, prev: p.clicks },
      ctr: { curr: c.ctr, prev: p.ctr },
      reach: { curr: c.reach, prev: p.reach },
      frequency: { curr: c.frequency, prev: p.frequency },
      roas: { curr: c.purchaseRoas, prev: p.purchaseRoas },
      leads: { curr: c.leads, prev: p.leads },
      linkClicks: { curr: c.linkClicks, prev: p.linkClicks },
    };
  }, [currentInsights, prevInsights]);

  // Budget by campaign
  const budgetData = useMemo(() => {
    return campaigns
      .filter(c => parseFloat(c.insights?.data?.[0]?.spend || 0) > 0)
      .map(c => ({ name: c.name?.length > 18 ? c.name.slice(0, 18) + '...' : c.name, value: parseFloat(c.insights?.data?.[0]?.spend || 0) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [campaigns]);

  // Age breakdown for chart
  const ageBreakdown = useMemo(() => {
    const grouped = {};
    ageGenderData.forEach(row => {
      const age = row.age || 'Unknown';
      if (!grouped[age]) grouped[age] = { age, male: 0, female: 0, total: 0 };
      const spend = parseFloat(row.spend || 0);
      if (row.gender === 'male') grouped[age].male += spend;
      else if (row.gender === 'female') grouped[age].female += spend;
      grouped[age].total += spend;
    });
    return Object.values(grouped).sort((a, b) => {
      const order = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      return order.indexOf(a.age) - order.indexOf(b.age);
    });
  }, [ageGenderData]);

  // Placement breakdown
  const placementBreakdown = useMemo(() => {
    return placementData.map(row => ({
      platform: row.publisher_platform || 'Unknown',
      spend: parseFloat(row.spend || 0),
      impressions: parseInt(row.impressions || 0),
      clicks: parseInt(row.clicks || 0),
      ctr: parseFloat(row.ctr || 0),
      cpm: parseFloat(row.cpm || 0),
    })).sort((a, b) => b.spend - a.spend);
  }, [placementData]);

  const filteredCampaigns = useMemo(() => {
    let list = [...campaigns];
    if (statusFilter !== 'all') list = list.filter(c => (c.effective_status || c.status || '').toUpperCase() === statusFilter);
    list.sort((a, b) => parseFloat(b.insights?.data?.[0]?.spend || 0) - parseFloat(a.insights?.data?.[0]?.spend || 0));
    return list;
  }, [campaigns, statusFilter]);

  // Daily heatmap data
  const heatmapMax = useMemo(() => ({
    spend: Math.max(...dailyData.map(d => d.spend), 1),
    clicks: Math.max(...dailyData.map(d => d.clicks), 1),
    impressions: Math.max(...dailyData.map(d => d.impressions), 1),
  }), [dailyData]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
      {/* Dark Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Reports</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${campaigns.length} campaigns · ${DATE_PRESETS.find(p => p.value === datePreset)?.full || datePreset}`}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
            <PlatformAccountSelector
              platform={platform}
              token={token} onLoginMeta={onLogin} onLogoutMeta={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectMetaAccount={onSelectAccount}
              googleConnected={googleConnected} googleCustomerId={googleCustomerId}
              onGoogleConnect={onGoogleConnect} onGoogleDisconnect={onGoogleDisconnect} onSelectGoogleAccount={onSelectGoogleAccount}
              variant="header"
            />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchReport} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700">
        <PlatformTabs platform={platform} onChange={setPlatform} enabled={['meta', 'google']} variant="dark" />
      </div>

      {/* Tabs + Date + Filters */}
      <div className="px-6 py-2.5 flex items-center gap-4 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shrink-0">
        {/* Tabs */}
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${activeTab === tab.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date presets */}
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {DATE_PRESETS.map(p => (
            <button key={p.value} onClick={() => setDatePreset(p.value)}
              className={`px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${datePreset === p.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Status filter */}
        <div className="ml-auto flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[['all', 'All'], ['ACTIVE', 'Active'], ['PAUSED', 'Paused']].map(([v, l]) => (
            <button key={v} onClick={() => setStatusFilter(v)}
              className={`px-2.5 py-1.5 text-[10px] font-semibold transition-colors ${statusFilter === v ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {error && platform === 'meta' && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Google Reports Panel */}
      {platform === 'google' && (
        <GoogleReportsPanel googleConnected={googleConnected} googleCustomerId={googleCustomerId} googleLoginCustomerId={googleLoginCustomerId} onGoogleConnect={onGoogleConnect} />
      )}

      {/* Content */}
      {platform === 'meta' && <div className="flex-1 overflow-auto px-6 py-5">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
          </div>
        ) : loading && !kpis ? (
          <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
        ) : (
          <div className="space-y-5">

            {/* ── OVERVIEW TAB ── */}
            {activeTab === 'overview' && kpis && (
              <>
                {/* AI Summary Insights */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)] pointer-events-none" />
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <h3 className="text-[13px] font-bold text-white">AI Summary</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-[10px] font-bold text-orange-400 uppercase mb-1">Top Insight</p>
                        <p className="text-[12px] text-slate-200 leading-relaxed">
                          {kpis.ctr.curr > (kpis.ctr.prev || 0)
                            ? `CTR improved ${pctChange(kpis.ctr.curr, kpis.ctr.prev) || ''} — your creatives are resonating better this period.`
                            : kpis.spend.curr > (kpis.spend.prev || 0) * 1.2
                            ? `Spend increased significantly. Monitor ROAS closely to ensure efficiency.`
                            : `Performance is stable. Look for scaling opportunities in top campaigns.`}
                        </p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-[10px] font-bold text-amber-400 uppercase mb-1">Watch Out</p>
                        <p className="text-[12px] text-slate-200 leading-relaxed">
                          {(kpis.frequency?.curr || 0) > 3
                            ? `Frequency is ${Number(kpis.frequency.curr).toFixed(1)} — audiences may be fatigued. Consider refreshing creatives.`
                            : kpis.ctr.curr < (kpis.ctr.prev || 0)
                            ? `CTR dropped ${pctChange(kpis.ctr.curr, kpis.ctr.prev) || ''}. Review underperforming ad sets for creative fatigue.`
                            : `No major alerts. Keep monitoring daily trends for early signals.`}
                        </p>
                      </div>
                      <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                        <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Key Observation</p>
                        <p className="text-[12px] text-slate-200 leading-relaxed">
                          {kpis.roas?.curr >= 2
                            ? `ROAS is strong at ${fmtX(kpis.roas.curr)}. Your best-performing campaigns are delivering efficiently.`
                            : kpis.roas?.curr > 0
                            ? `ROAS is at ${fmtX(kpis.roas.curr)}. Some campaigns may need budget reallocation for better efficiency.`
                            : `Conversion tracking data is limited. Ensure your pixel events are configured correctly.`}
                        </p>
                      </div>
                    </div>
                  </div>
                  {onNavigateToOptimizations && (
                    <button onClick={onNavigateToOptimizations}
                      className="mt-3 flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50">
                      <Zap size={12} /> View Optimizations <ArrowRight size={12} />
                    </button>
                  )}
                </div>


                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  <KpiCard label="Total Spend" value={kpis.spend.curr} prevValue={kpis.spend.prev} isCost prefix={currency} />
                  <KpiCard label="Impressions" value={kpis.impressions.curr} prevValue={kpis.impressions.prev} />
                  <KpiCard label="Reach" value={kpis.reach.curr} prevValue={kpis.reach.prev} />
                  <KpiCard label="Clicks" value={kpis.clicks.curr} prevValue={kpis.clicks.prev} />
                  <KpiCard label="CTR" value={kpis.ctr.curr} prevValue={kpis.ctr.prev} />
                </div>

                {/* Charts row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <ChartCard title="Performance Trend" colSpan={2}>
                    {dailyData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <AreaChart data={dailyData}>
                          <defs>
                            <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#f97316" stopOpacity={0.15}/>
                              <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Area type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={2} fill="url(#spendGrad)" name="Spend" />
                          <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} dot={false} name="Clicks" />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No data</div>}
                  </ChartCard>

                  <ChartCard title="Budget Distribution">
                    {budgetData.length > 0 ? (
                      <>
                        <ResponsiveContainer width="100%" height={160}>
                          <PieChart>
                            <Pie data={budgetData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2}>
                              {budgetData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="space-y-1 mt-2">
                          {budgetData.map((d, i) => (
                            <div key={i} className="flex items-center gap-2 text-[10px]">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                              <span className="text-slate-600 truncate flex-1">{d.name}</span>
                              <span className="font-semibold text-slate-700">{fmtCurrency(d.value, currency)}</span>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : <div className="h-[160px] flex items-center justify-center text-sm text-slate-400">No data</div>}
                  </ChartCard>
                </div>

                {/* Daily Heatmap */}
                {dailyData.length > 0 && (
                  <ChartCard title={`Daily Heatmap — ${DATE_PRESETS.find(p => p.value === datePreset)?.full || ''}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="py-2 px-2 text-left font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">Spend</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">Impr.</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">Clicks</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">CTR</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">CPC</th>
                            <th className="py-2 px-2 text-center font-semibold text-slate-400 uppercase tracking-wider">CPM</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dailyData.map((d, i) => (
                            <tr key={i} className="border-b border-slate-50">
                              <td className="py-1.5 px-2 font-medium text-slate-600">{d.date}</td>
                              <HeatmapCell value={d.spend} max={heatmapMax.spend} label="Spend" />
                              <HeatmapCell value={d.impressions} max={heatmapMax.impressions} label="Impressions" />
                              <HeatmapCell value={d.clicks} max={heatmapMax.clicks} label="Clicks" />
                              <td className="py-1.5 px-2 text-center text-slate-500">{fmtPct(d.ctr)}</td>
                              <td className="py-1.5 px-2 text-center text-slate-500">{fmtCurrency(d.cpc, currency)}</td>
                              <td className="py-1.5 px-2 text-center text-slate-500">{fmtCurrency(d.cpm, currency)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </ChartCard>
                )}
              </>
            )}

            {/* ── CAMPAIGNS TAB ── */}
            {activeTab === 'campaigns' && (
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-[12px] font-bold text-slate-700">Campaigns ({filteredCampaigns.length})</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50/50">
                        {['Campaign', 'Spend', 'Impr.', 'Reach', 'Clicks', 'CTR', 'CPC', 'CPM', 'Results', 'CPR', 'ROAS', 'Freq.'].map(h => (
                          <th key={h} className="py-2.5 px-2 text-[9px] font-bold text-slate-400 uppercase tracking-wider text-right first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCampaigns.map(c => <CampaignRow key={c.id} c={c} currency={currency} />)}
                      {filteredCampaigns.length === 0 && <tr><td colSpan={12} className="py-8 text-center text-sm text-slate-400">No campaigns</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── DEMOGRAPHICS TAB ── */}
            {activeTab === 'demographics' && (
              <>
                <ChartCard title="Spend by Age & Gender">
                  {ageBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={ageBreakdown} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="age" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Bar dataKey="female" fill="#ec4899" radius={[4, 4, 0, 0]} name="Female" />
                        <Bar dataKey="male" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Male" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[260px] flex items-center justify-center text-sm text-slate-400">No demographic data available</div>}
                </ChartCard>
              </>
            )}

            {/* ── PLACEMENTS TAB ── */}
            {activeTab === 'placements' && (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard title="Spend by Platform">
                    {placementBreakdown.length > 0 ? (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={placementBreakdown} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                          <YAxis dataKey="platform" type="category" tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="spend" fill="#f97316" radius={[0, 4, 4, 0]} name="Spend" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No placement data</div>}
                  </ChartCard>

                  <ChartCard title="Platform Performance">
                    {placementBreakdown.length > 0 ? (
                      <div className="space-y-3">
                        {placementBreakdown.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80">
                            <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: COLORS[i % COLORS.length] }}>
                              {p.platform.slice(0, 2).toUpperCase()}
                            </span>
                            <div className="flex-1">
                              <p className="text-[12px] font-semibold text-slate-700 capitalize">{p.platform}</p>
                              <div className="flex gap-4 text-[10px] text-slate-400 mt-0.5">
                                <span>Spend: {fmtCurrency(p.spend, currency)}</span>
                                <span>CTR: {fmtPct(p.ctr)}</span>
                                <span>CPM: {fmtCurrency(p.cpm, currency)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : <div className="h-[220px] flex items-center justify-center text-sm text-slate-400">No placement data</div>}
                  </ChartCard>
                </div>
              </>
            )}
          </div>
        )}
      </div>}
    </div>
  );
};
