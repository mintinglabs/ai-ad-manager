import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Loader2, X, Eye, Play, ChevronDown, Palette, ExternalLink, Megaphone, Layers, Calendar } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtCta = (cta) => cta ? cta.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';



const AD_FORMATS = [
  { value: 'MOBILE_FEED_STANDARD', label: 'Mobile Feed' },
  { value: 'DESKTOP_FEED_STANDARD', label: 'Desktop Feed' },
  { value: 'INSTAGRAM_STANDARD', label: 'Instagram Feed' },
  { value: 'RIGHT_COLUMN_STANDARD', label: 'Right Column' },
];

const STATUS_COLORS = {
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500', border: 'border-emerald-200' },
  PAUSED: { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', border: 'border-slate-200' },
  DELETED: { bg: 'bg-red-50', text: 'text-red-500', dot: 'bg-red-400', border: 'border-red-200' },
};
const getStatusColor = (s) => STATUS_COLORS[(s || '').toUpperCase()] || STATUS_COLORS.PAUSED;

// ── Preview modal (iframe from Meta) ──
const AdPreviewModal = ({ ad, onClose }) => {
  const [format, setFormat] = useState('MOBILE_FEED_STANDARD');
  const [previewHtml, setPreviewHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const creativeId = ad?.creative?.id;

  const fetchPreview = useCallback(async (fmt) => {
    if (!creativeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/creatives/${creativeId}/previews`, { params: { ad_format: fmt } });
      setPreviewHtml(res.data?.[0]?.body || res.data?.body || '');
    } catch (err) {
      setError(err.response?.data?.error || 'Preview unavailable');
      setPreviewHtml(null);
    } finally {
      setLoading(false);
    }
  }, [creativeId]);

  useEffect(() => { fetchPreview(format); }, [fetchPreview, format]);

  const iframeSrc = useMemo(() => {
    if (!previewHtml) return null;
    const match = previewHtml.match(/src="([^"]+)"/);
    return match ? match[1].replace(/&amp;/g, '&') : null;
  }, [previewHtml]);

  const isMobile = format === 'MOBILE_FEED_STANDARD' || format === 'INSTAGRAM_STANDARD';
  const creative = ad?.creative || {};

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-6 z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-full flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 shrink-0">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-800 truncate">{ad.name || 'Untitled Ad'}</h3>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                {ad.campaign?.name && <span className="flex items-center gap-1"><Megaphone size={10} /> {ad.campaign.name}</span>}
                {ad.adset?.name && <span className="flex items-center gap-1"><Layers size={10} /> {ad.adset.name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select value={format} onChange={e => setFormat(e.target.value)}
                className="text-[11px] font-medium px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                {AD_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={16} />
              </button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 overflow-auto min-h-[400px]">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading preview...</span>
              </div>
            ) : error ? (
              <div className="text-center">
                <Eye size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">{error}</p>
              </div>
            ) : iframeSrc ? (
              <div className={isMobile ? 'w-[360px]' : 'w-full max-w-[520px]'}>
                <iframe src={iframeSrc} className="w-full border-0 rounded-xl bg-white shadow-lg"
                  style={{ height: isMobile ? '640px' : '500px' }} sandbox="allow-scripts allow-same-origin" />
              </div>
            ) : (
              <div className="text-center">
                <Eye size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Preview unavailable</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Ad Card (FB Ad Library style — looks like a social media post) ──
const AdCard = ({ ad, onPreview }) => {
  const [expanded, setExpanded] = useState(false);
  const creative = ad.creative || {};
  const hasVideo = !!creative.video_id;
  const statusColor = getStatusColor(ad.effective_status || ad.status);
  const ctaLabel = fmtCta(creative.call_to_action_type);

  // Extract from object_story_spec
  const oss = creative.object_story_spec || {};
  const linkData = oss.link_data || oss.video_data || {};
  const displayBody = creative.body || linkData.message || '';
  const displayTitle = creative.title || linkData.name || linkData.title || '';
  const displayLink = linkData.link || creative.object_url || '';
  const displayCta = ctaLabel || fmtCta(linkData.call_to_action?.type) || '';
  const domain = displayLink ? displayLink.replace(/https?:\/\//, '').split('/')[0] : '';

  // Full-res image
  // Full-res: direct CDN > server-resolved redirect > FB redirect > thumbnail fallback
  const imageUrl = linkData.picture || creative.image_url || creative._resolved_image || linkData.image_url || creative.thumbnail_url;

  // Truncate body text
  const isLong = displayBody.length > 200;
  const bodyText = expanded ? displayBody : displayBody.slice(0, 200);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all w-full">
      {/* Status bar — like FB Ad Library header */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${statusColor.text}`}>
          <span className={`w-2 h-2 rounded-full ${statusColor.dot}`} />
          {ad.effective_status || ad.status || 'Unknown'}
        </span>
        <span className="text-[10px] text-slate-400">Started {fmtDate(ad.created_time)}</span>
      </div>

      {/* Campaign / Ad Set context */}
      {(ad.campaign?.name || ad.adset?.name) && (
        <div className="px-4 py-1.5 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
          {ad.campaign?.name && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={ad.campaign.name}>
              <Megaphone size={10} className="shrink-0 text-slate-300" /> {ad.campaign.name}
            </span>
          )}
          {ad.adset?.name && (
            <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate" title={ad.adset.name}>
              <Layers size={10} className="shrink-0 text-slate-300" /> {ad.adset.name}
            </span>
          )}
        </div>
      )}

      {/* Post header — page name + "Sponsored" */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-500 shrink-0">
            {(ad.name || 'A').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[12px] font-semibold text-slate-800 leading-tight">{ad.name || 'Untitled Ad'}</p>
            <p className="text-[10px] text-slate-400">Sponsored</p>
          </div>
        </div>
      </div>

      {/* Post body text */}
      {displayBody && (
        <div className="px-4 py-2">
          <p className="text-[12px] text-slate-700 leading-relaxed whitespace-pre-line">{bodyText}{isLong && !expanded ? '...' : ''}</p>
          {isLong && (
            <button onClick={() => setExpanded(!expanded)}
              className="text-[11px] font-medium text-slate-500 hover:text-slate-700 mt-0.5">
              {expanded ? 'See less' : 'See more'}
            </button>
          )}
        </div>
      )}

      {/* Creative image / video */}
      <button onClick={() => onPreview(ad)} className="w-full relative group">
        {imageUrl ? (
          <div className="w-full bg-slate-100 overflow-hidden">
            <img src={imageUrl} alt={ad.name} className="w-full object-cover max-h-[320px]" loading="lazy" />
          </div>
        ) : (
          <div className="w-full aspect-video bg-slate-100 flex items-center justify-center">
            <Palette size={32} className="text-slate-300" />
          </div>
        )}
        {hasVideo && (
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-14 h-14 flex items-center justify-center group-hover:bg-black/70 transition-colors shadow-lg">
            <Play size={22} fill="white" />
          </span>
        )}
      </button>

      {/* Link preview + CTA button (like FB post footer) */}
      {(displayTitle || domain || displayCta) && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {domain && <p className="text-[10px] text-slate-400 uppercase tracking-wide truncate">{domain}</p>}
            {displayTitle && <p className="text-[12px] font-semibold text-slate-800 line-clamp-1">{displayTitle}</p>}
          </div>
          {displayCta && (
            <span className="shrink-0 px-3 py-1.5 text-[11px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 rounded-lg">
              {displayCta}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Date filter (shared pattern from CampaignManager) ──
const DateFilter = ({ datePreset, setDatePreset, customFrom, setCustomFrom, customTo, setCustomTo }) => {
  const [showPicker, setShowPicker] = useState(false);
  return (
    <div className="relative">
      <select value={datePreset} onChange={e => {
        const v = e.target.value;
        if (v === 'custom') { setShowPicker(true); setDatePreset('custom'); }
        else { setDatePreset(v); setShowPicker(false); }
      }}
        className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
        <option value="last_7d">Last 7 Days</option>
        <option value="last_14d">Last 14 Days</option>
        <option value="last_30d">Last 30 Days</option>
        <option value="this_month">This Month</option>
        <option value="last_month">Last Month</option>
        <option value="maximum">Lifetime</option>
        <option value="custom">{customFrom && customTo ? `${customFrom} – ${customTo}` : 'Custom Range'}</option>
      </select>
      {showPicker && (
        <div className="absolute top-full right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64" onClick={e => e.stopPropagation()}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Date Range</p>
          <div className="space-y-2">
            <div>
              <label className="text-[10px] text-slate-500 font-medium">From</label>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-medium">To</label>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowPicker(false)} className="px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={() => setShowPicker(false)} disabled={!customFrom || !customTo}
              className="px-2.5 py-1.5 text-[11px] text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium disabled:opacity-50">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ──
export const AdLibrary = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat }) => {
  const [showAskAI, setShowAskAI] = useState(false);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [previewAd, setPreviewAd] = useState(null);
  const [paging, setPaging] = useState(null);
  const [datePreset, setDatePreset] = useState('maximum');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const fetchAds = useCallback(async (after) => {
    if (!adAccountId) return;
    if (after) setLoadingMore(true); else { setLoading(true); setError(null); }
    try {
      const params = { adAccountId, limit: 24 };
      if (after) params.after = after;
      const res = await api.get('/creatives/ad-library', { params });
      const items = res.data?.data || [];
      if (after) setAds(prev => [...prev, ...items]);
      else setAds(items);
      setPaging(res.data?.paging || null);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchAds(); }, [fetchAds]);

  const hasMore = !!paging?.next;

  const filtered = useMemo(() => {
    let list = [...ads];
    if (statusFilter !== 'all') {
      list = list.filter(a => (a.effective_status || a.status || '').toUpperCase() === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.creative?.body || '').toLowerCase().includes(q) ||
        (a.creative?.title || '').toLowerCase().includes(q) ||
        (a.campaign?.name || '').toLowerCase().includes(q) ||
        (a.adset?.name || '').toLowerCase().includes(q)
      );
    }
    // Date filter (client-side for created_time)
    if (datePreset !== 'maximum') {
      const now = new Date();
      let from, to;
      if (datePreset === 'custom' && customFrom && customTo) {
        from = new Date(customFrom);
        to = new Date(customTo + 'T23:59:59');
      } else {
        to = now;
        const d = new Date();
        if (datePreset === 'last_7d') d.setDate(d.getDate() - 7);
        else if (datePreset === 'last_14d') d.setDate(d.getDate() - 14);
        else if (datePreset === 'last_30d') d.setDate(d.getDate() - 30);
        else if (datePreset === 'this_month') { d.setDate(1); }
        else if (datePreset === 'last_month') { d.setMonth(d.getMonth() - 1); d.setDate(1); to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); }
        from = d;
      }
      if (from && to) {
        list = list.filter(a => {
          const ct = new Date(a.created_time);
          return ct >= from && ct <= to;
        });
      }
    }
    return list;
  }, [ads, statusFilter, search, datePreset, customFrom, customTo]);

  const activeCount = ads.filter(a => (a.effective_status || '').toUpperCase() === 'ACTIVE').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Palette size={20} className="text-orange-500" />
                Ad Library
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${ads.length} ads · ${activeCount} active`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchAds()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white border-b border-slate-100 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ads, campaigns, ad sets..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[['all', 'All'], ['ACTIVE', 'Active'], ['PAUSED', 'Paused']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3.5 py-2 text-[11px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <DateFilter datePreset={datePreset} setDatePreset={setDatePreset}
          customFrom={customFrom} setCustomFrom={setCustomFrom}
          customTo={customTo} setCustomTo={setCustomTo} />
      </div>

      {/* Error */}
      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : loading && ads.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading ads...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Palette size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No ads found</p>
            <p className="text-xs text-slate-400">Create ads in campaigns to see them here.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map(ad => (
                <AdCard key={ad.id} ad={ad} onPreview={setPreviewAd} />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center py-6">
                <button onClick={() => fetchAds(paging?.cursors?.after)} disabled={loadingMore}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
                  {loadingMore ? <><Loader2 size={13} className="animate-spin" /> Loading...</> : 'Load More Ads'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {previewAd && <AdPreviewModal ad={previewAd} onClose={() => setPreviewAd(null)} />}

    </div>
  );
};
