import { TrendingUp, Eye, MousePointer, DollarSign, Wifi } from 'lucide-react';

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`bg-slate-200 animate-pulse rounded ${className}`} />
);

// ── Metric Card ───────────────────────────────────────────────────────────────
const MetricCard = ({ icon: Icon, label, value, sub, color, loading }) => (
  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-4 flex flex-col gap-1 flex-1 min-w-0">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={14} className="text-white" />
      </div>
    </div>
    {loading ? (
      <Skeleton className="h-7 w-24 mt-1" />
    ) : (
      <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
    )}
    <p className="text-xs text-slate-400">{sub}</p>
  </div>
);

// ── Source label ──────────────────────────────────────────────────────────────
const SourceLabel = ({ endpoint, permission }) => (
  <div className="flex items-center gap-1.5 mt-1.5 mb-4">
    <span className="text-slate-300">📡</span>
    <code className="text-xs text-slate-400 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded font-mono">{endpoint}</code>
    <span className="text-slate-300">·</span>
    <code className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">{permission}</code>
  </div>
);

// ── Section heading ───────────────────────────────────────────────────────────
const SectionHeading = ({ title }) => (
  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{title}</h3>
);

// ── Status badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) =>
  status === 'ACTIVE'
    ? <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">🟢 Active</span>
    : <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">⏸ Paused</span>;

// ── Campaign Table ────────────────────────────────────────────────────────────
const CampaignTable = ({ campaigns, loading, onSend, adAccountId }) => {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-5 w-16 ml-auto" />
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl px-6 py-10 text-center">
        <p className="text-sm text-slate-400">No campaigns found for this ad account.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Campaign</th>
            <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Status</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Budget/day</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Spend</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600">ROAS</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Impressions</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Clicks</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600">CTR</th>
            <th className="px-3 py-2.5 text-right font-semibold text-slate-600"></th>
          </tr>
        </thead>
        <tbody>
          {campaigns.map((c, i) => (
            <tr key={c.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
              <td className="px-4 py-3 font-medium text-slate-800 max-w-[200px]">
                <p className="truncate">{c.name}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">{c.id}</p>
              </td>
              <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
              <td className="px-3 py-3 text-right text-slate-600">${(c.daily_budget / 100).toFixed(0)}</td>
              <td className="px-3 py-3 text-right text-slate-700 font-medium">{c.spend > 0 ? `$${c.spend.toFixed(2)}` : '$0.00'}</td>
              <td className="px-3 py-3 text-right">
                {c.roas > 0
                  ? <span className={`font-semibold ${c.roas >= 3 ? 'text-emerald-600' : c.roas >= 2 ? 'text-amber-600' : 'text-red-500'}`}>{c.roas}x</span>
                  : <span className="text-slate-300">—</span>}
              </td>
              <td className="px-3 py-3 text-right text-slate-600">{c.impressions > 0 ? c.impressions.toLocaleString() : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-600">{c.clicks > 0 ? c.clicks.toLocaleString() : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-600">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : '—'}</td>
              <td className="px-3 py-3 text-right">
                <button
                  onClick={() => onSend('manage')}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
                >
                  Manage →
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Pages Table ───────────────────────────────────────────────────────────────
const PagesTable = ({ pages, onViewPageAds, pageAdsMap }) => (
  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
    <table className="w-full text-xs">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          <th className="px-4 py-2.5 text-left font-semibold text-slate-600">Page</th>
          <th className="px-3 py-2.5 text-left font-semibold text-slate-600">Category</th>
          <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Followers</th>
          <th className="px-3 py-2.5 text-right font-semibold text-slate-600">Engagement</th>
          <th className="px-3 py-2.5 text-right font-semibold text-slate-600"></th>
        </tr>
      </thead>
      <tbody>
        {pages.map((p, i) => {
          const ads = pageAdsMap?.[p.id];
          return (
            <tr key={p.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
              <td className="px-4 py-3">
                <p className="font-medium text-slate-800 truncate">{p.name}</p>
                <p className="text-slate-400 font-mono text-[10px] truncate">{p.id}</p>
                {ads !== undefined && (
                  <p className="text-[10px] text-violet-600 mt-0.5 font-mono">
                    {ads.length === 0 ? 'No ads found' : `${ads.length} ad${ads.length !== 1 ? 's' : ''} · GET /${p.id}/ads · pages_manage_ads`}
                  </p>
                )}
              </td>
              <td className="px-3 py-3 text-slate-500">{p.category || '—'}</td>
              <td className="px-3 py-3 text-right font-medium text-slate-700">{p.fan_count ? p.fan_count.toLocaleString() : '—'}</td>
              <td className="px-3 py-3 text-right text-slate-600">{p.engagement?.count ? p.engagement.count.toLocaleString() : '—'}</td>
              <td className="px-3 py-3 text-right">
                <button
                  onClick={() => onViewPageAds(p.id)}
                  className="text-xs font-medium text-violet-600 hover:text-violet-800 hover:underline whitespace-nowrap"
                >
                  View Ads →
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

// ── Main DataPanel ────────────────────────────────────────────────────────────
export const DataPanel = ({ adAccountId, selectedAccount, campaigns, insights, pages, pageAdsMap, isLoadingCampaigns, onSend, onViewPageAds }) => {
  const totalSpend = insights?.totalSpend ?? null;
  const impressions = insights?.impressions ?? null;
  const clicks = insights?.clicks ?? null;
  const roas = insights?.roas ?? null;
  const insightsLoading = insights === null;

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 px-6 py-5">

      {/* Account connection banner */}
      <div className="flex items-center gap-2.5 mb-5 bg-white border border-slate-200 rounded-2xl px-4 py-3">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800 truncate">{selectedAccount?.name || 'Ad Account'}</p>
          <p className="text-xs text-slate-400 font-mono">{adAccountId} · Meta Graph API v25.0</p>
        </div>
        <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end">
          {['ads_read', 'ads_management', 'business_management', 'instagram_basic', 'instagram_manage_insights', 'leads_retrieval', 'pages_manage_ads', 'pages_read_engagement', 'pages_show_list'].map(p => (
            <span key={p} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded font-mono whitespace-nowrap">
              <span className="w-1 h-1 rounded-full bg-emerald-400" />{p}
            </span>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <SectionHeading title="Account Performance — Last 7 Days" />
      <div className="flex gap-3 mb-1">
        <MetricCard icon={DollarSign}   label="Total Spend"   value={insightsLoading ? '' : `$${(totalSpend || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} sub="Last 7 days"          color="bg-blue-500"    loading={insightsLoading} />
        <MetricCard icon={Eye}          label="Impressions"   value={insightsLoading ? '' : (impressions || 0).toLocaleString()}                                                                                     sub="Last 7 days"          color="bg-violet-500"  loading={insightsLoading} />
        <MetricCard icon={MousePointer} label="Clicks"        value={insightsLoading ? '' : (clicks || 0).toLocaleString()}                                                                                         sub="Last 7 days"          color="bg-emerald-500" loading={insightsLoading} />
        <MetricCard icon={TrendingUp}   label="ROAS"          value={insightsLoading ? '' : roas > 0 ? `${roas.toFixed(1)}x` : '—'}                                                                                sub="Avg across campaigns" color="bg-orange-500"  loading={insightsLoading} />
      </div>
      <SourceLabel endpoint={`GET /${adAccountId}/insights`} permission="ads_read" />

      {/* Campaign Table */}
      <SectionHeading title="Campaigns" />
      <CampaignTable
        campaigns={campaigns}
        loading={isLoadingCampaigns}
        onSend={onSend}
        adAccountId={adAccountId}
      />
      <SourceLabel endpoint={`GET /${adAccountId}/campaigns`} permission="ads_management" />

      {/* Pages Section */}
      {pages.length > 0 && (
        <>
          <SectionHeading title="Facebook Pages" />
          <PagesTable pages={pages} pageAdsMap={pageAdsMap} onViewPageAds={onViewPageAds} />
          <SourceLabel endpoint="GET /me/accounts · GET /{pageId}/ads" permission="pages_read_engagement · pages_manage_ads" />
        </>
      )}
    </div>
  );
};
