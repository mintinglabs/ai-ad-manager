import { useState, useEffect, useCallback, useMemo } from 'react';
import { RefreshCw, Loader2, TrendingUp, TrendingDown, ArrowRight, Download, Calendar, Filter } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

const fmtCurrency = (v, currency = 'HKD') => {
  if (v == null) return '—';
  const num = typeof v === 'string' ? parseFloat(v) : v;
  if (num >= 1000000) return `${currency === 'HKD' ? 'HK$' : '$'}${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${currency === 'HKD' ? 'HK$' : '$'}${(num / 1000).toFixed(1)}K`;
  return `${currency === 'HKD' ? 'HK$' : '$'}${num.toFixed(2)}`;
};
const fmtNum = (v) => v != null ? Number(v).toLocaleString() : '—';
const fmtPct = (v) => v != null ? `${Number(v).toFixed(2)}%` : '—';
const fmtX = (v) => v != null ? `${Number(v).toFixed(2)}x` : '—';

const DATE_PRESETS = [
  { value: 'last_7d', label: 'Last 7 Days' },
  { value: 'last_14d', label: 'Last 14 Days' },
  { value: 'last_30d', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
];

const CHART_COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b'];

// ── KPI Card ──
const KpiCard = ({ label, value, change, trend, prefix }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
    <p className="text-[22px] font-extrabold text-slate-800 mt-1 tracking-tight">{prefix}{value}</p>
    {change != null && (
      <div className={`flex items-center gap-1 mt-1 text-[11px] font-semibold ${trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-slate-400'}`}>
        {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : null}
        {change} <span className="text-slate-400 font-normal">vs prev</span>
      </div>
    )}
  </div>
);

// ── Campaign Row ──
const CampaignRow = ({ campaign, currency }) => {
  const status = (campaign.effective_status || campaign.status || '').toUpperCase();
  const statusColor = status === 'ACTIVE' ? 'bg-emerald-500' : status === 'PAUSED' ? 'bg-slate-400' : 'bg-red-400';
  const insights = campaign.insights?.data?.[0] || {};
  const spend = parseFloat(insights.spend || 0);
  const impressions = parseInt(insights.impressions || 0);
  const clicks = parseInt(insights.clicks || 0);
  const ctr = parseFloat(insights.ctr || 0);
  const cpc = parseFloat(insights.cpc || 0);
  const cpm = parseFloat(insights.cpm || 0);
  const actions = insights.actions || [];
  const results = actions.reduce((sum, a) => sum + parseInt(a.value || 0), 0);
  const costPerResult = results > 0 ? spend / results : 0;
  const roas = insights.purchase_roas?.[0]?.value ? parseFloat(insights.purchase_roas[0].value) : null;

  return (
    <tr className="border-b border-slate-100 hover:bg-orange-50/30 transition-colors text-[11px]">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${statusColor} shrink-0`} />
          <span className="font-medium text-slate-700 truncate max-w-[200px]">{campaign.name}</span>
        </div>
      </td>
      <td className="py-3 px-3 text-right font-medium text-slate-700">{fmtCurrency(spend, currency)}</td>
      <td className="py-3 px-3 text-right text-slate-500">{fmtNum(impressions)}</td>
      <td className="py-3 px-3 text-right text-slate-500">{fmtNum(clicks)}</td>
      <td className="py-3 px-3 text-right text-slate-500">{fmtPct(ctr)}</td>
      <td className="py-3 px-3 text-right text-slate-500">{fmtCurrency(cpc, currency)}</td>
      <td className="py-3 px-3 text-right text-slate-500">{fmtCurrency(cpm, currency)}</td>
      <td className="py-3 px-3 text-right font-medium text-slate-700">{fmtNum(results)}</td>
      <td className="py-3 px-3 text-right text-slate-500">{costPerResult > 0 ? fmtCurrency(costPerResult, currency) : '—'}</td>
      <td className="py-3 px-3 text-right font-semibold">{roas ? <span className={roas >= 2 ? 'text-emerald-600' : roas >= 1 ? 'text-amber-600' : 'text-red-500'}>{fmtX(roas)}</span> : '—'}</td>
    </tr>
  );
};

// ── Main Report Dashboard ──
export const ReportDashboard = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datePreset, setDatePreset] = useState('last_7d');
  const [accountData, setAccountData] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');

  const currency = accountData?.currency || 'HKD';
  const currencySymbol = currency === 'HKD' ? 'HK$' : currency === 'USD' ? '$' : currency;

  const fetchReport = useCallback(async () => {
    if (!adAccountId || !token) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch account insights, campaign data (with insights), and daily breakdown in parallel
      const [insightsRes, campaignsRes, dailyRes] = await Promise.all([
        api.get('/insights', { params: { adAccountId, date_preset: datePreset } }),
        api.get('/campaigns', { params: { adAccountId } }),
        api.get(`/insights/${adAccountId}`, { params: { date_preset: datePreset, time_increment: 1, fields: 'spend,impressions,clicks,ctr,cpm,cpc,actions,purchase_roas' } }),
      ]);
      setAccountData(insightsRes.data);
      setCampaigns(campaignsRes.data?.data || campaignsRes.data || []);

      // Process daily data for charts — response might be { data: [...] } or [...]
      const rawDaily = Array.isArray(dailyRes.data) ? dailyRes.data : (dailyRes.data?.data || []);
      const daily = rawDaily.map(d => ({
        date: d.date_start?.slice(5) || '',
        spend: parseFloat(d.spend || 0),
        ctr: parseFloat(d.ctr || 0),
        cpc: parseFloat(d.cpc || 0),
        cpm: parseFloat(d.cpm || 0),
        impressions: parseInt(d.impressions || 0),
        clicks: parseInt(d.clicks || 0),
        roas: d.purchase_roas?.[0]?.value ? parseFloat(d.purchase_roas[0].value) : null,
      }));
      setDailyData(daily);

    } catch (err) {
      setError(err.response?.data?.error?.message || err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, token, datePreset]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // KPIs from account-level insights
  const kpis = useMemo(() => {
    if (!accountData) return null;
    const totalSpend = accountData.totalSpend || 0;
    const impressions = accountData.impressions || 0;
    const clicks = accountData.clicks || 0;
    const avgCtr = accountData.ctr || 0;
    const avgCpc = clicks > 0 ? totalSpend / clicks : 0;
    const avgCpm = impressions > 0 ? (totalSpend / impressions * 1000) : 0;
    const avgRoas = accountData.purchaseRoas || null;
    const totalResults = (accountData.leads || 0) + (accountData.purchases || 0) + (accountData.linkClicks || 0);
    const costPerResult = totalResults > 0 ? totalSpend / totalResults : 0;
    return { totalSpend, totalImpressions: impressions, totalClicks: clicks, avgCtr, avgCpc, avgCpm, avgRoas, totalResults, costPerResult };
  }, [accountData]);

  // Budget distribution by campaign
  const budgetData = useMemo(() => {
    return campaigns
      .filter(c => {
        const spend = parseFloat(c.insights?.data?.[0]?.spend || 0);
        return spend > 0;
      })
      .map(c => ({
        name: c.name?.length > 20 ? c.name.slice(0, 20) + '...' : c.name,
        value: parseFloat(c.insights?.data?.[0]?.spend || 0),
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    let list = [...campaigns];
    if (statusFilter !== 'all') {
      list = list.filter(c => (c.effective_status || c.status || '').toUpperCase() === statusFilter);
    }
    // Sort by spend descending
    list.sort((a, b) => parseFloat(b.insights?.data?.[0]?.spend || 0) - parseFloat(a.insights?.data?.[0]?.spend || 0));
    return list;
  }, [campaigns, statusFilter]);

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Reports</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${campaigns.length} campaigns · ${datePreset.replace(/_/g, ' ').replace('last ', 'Last ')}`}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchReport} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Date + Filters bar */}
      <div className="px-6 py-2.5 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shrink-0">
        <Calendar size={14} className="text-slate-400" />
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {DATE_PRESETS.map(p => (
            <button key={p.value} onClick={() => setDatePreset(p.value)}
              className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${datePreset === p.value ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
            {[['all', 'All'], ['ACTIVE', 'Active'], ['PAUSED', 'Paused']].map(([val, label]) => (
              <button key={val} onClick={() => setStatusFilter(val)}
                className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : loading && !kpis ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-5">
            {/* KPI Cards */}
            {kpis && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-3">
                <KpiCard label="Spend" value={fmtCurrency(kpis.totalSpend, currency)} />
                <KpiCard label="CTR" value={fmtPct(kpis.avgCtr)} />
                <KpiCard label="CPC" value={fmtCurrency(kpis.avgCpc, currency)} />
                <KpiCard label="CPM" value={fmtCurrency(kpis.avgCpm, currency)} />
                <KpiCard label="ROAS" value={kpis.avgRoas ? fmtX(kpis.avgRoas) : '—'} />
                <KpiCard label="Results" value={fmtNum(kpis.totalResults)} />
                <KpiCard label="Cost/Result" value={kpis.costPerResult > 0 ? fmtCurrency(kpis.costPerResult, currency) : '—'} />
              </div>
            )}

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Performance trend — takes 2 cols */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-[12px] font-bold text-slate-700 mb-4">Performance Trend</h3>
                {dailyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="spend" stroke="#f97316" strokeWidth={2} dot={false} name="Spend" />
                      <Line type="monotone" dataKey="cpc" stroke="#3b82f6" strokeWidth={2} dot={false} name="CPC" />
                      <Line type="monotone" dataKey="ctr" stroke="#10b981" strokeWidth={2} dot={false} name="CTR" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[240px] flex items-center justify-center text-sm text-slate-400">No data</div>
                )}
              </div>

              {/* Budget distribution — 1 col */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="text-[12px] font-bold text-slate-700 mb-4">Budget Distribution</h3>
                {budgetData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={budgetData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                          {budgetData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmtCurrency(v, currency)} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                      {budgetData.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-slate-600 truncate flex-1">{d.name}</span>
                          <span className="font-medium text-slate-700">{fmtCurrency(d.value, currency)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-sm text-slate-400">No data</div>
                )}
              </div>
            </div>

            {/* Campaign table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-[12px] font-bold text-slate-700">Campaigns ({filteredCampaigns.length})</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="py-2.5 px-4 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Campaign</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Spend</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Impr.</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Clicks</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CTR</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CPC</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">CPM</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Results</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cost/Result</th>
                      <th className="py-2.5 px-3 text-right text-[10px] font-semibold text-slate-400 uppercase tracking-wider">ROAS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map(c => (
                      <CampaignRow key={c.id} campaign={c} currency={currency} />
                    ))}
                    {filteredCampaigns.length === 0 && (
                      <tr><td colSpan={10} className="py-8 text-center text-sm text-slate-400">No campaigns found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
