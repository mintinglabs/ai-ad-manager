import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, RefreshCw, Loader2, X, Eye, ChevronDown, Palette, Sparkles } from 'lucide-react';
import { PlatformAccountSelector } from './PlatformAccountSelector.jsx';
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

// Detect ad format: image, video, carousel, dynamic
const getAdType = (ad) => {
  const c = ad.creative || {};
  const oss = c.object_story_spec || {};
  const ld = oss.link_data || {};
  const vd = oss.video_data || {};
  const afs = c.asset_feed_spec;
  // Carousel = has child_attachments with multiple slides
  if (ld.child_attachments?.length > 1) return 'carousel';
  // Dynamic creative = asset_feed_spec with multiple assets
  if (afs && ((afs.images?.length > 1) || (afs.videos?.length > 1) || (afs.videos?.length > 0 && afs.images?.length > 0))) return 'dynamic';
  // Video = has video_id on creative, or video_data in object_story_spec, or video in asset_feed_spec
  if (c.video_id || vd.video_id || afs?.videos?.length === 1) return 'video';
  return 'image';
};

const AD_TYPE_LABELS = { image: 'Image', video: 'Video', carousel: 'Carousel', dynamic: 'Dynamic' };

// ── Single Ad Preview modal (iframe from Meta) ──
const AdPreviewModal = ({ ad, onClose }) => {
  const [format, setFormat] = useState('MOBILE_FEED_STANDARD');
  const [previewHtml, setPreviewHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const creativeId = ad?.creative?.id;

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const fetchPreview = useCallback(async (fmt) => {
    if (!creativeId) return;
    setLoading(true); setError(null);
    try {
      const res = await api.get(`/creatives/${creativeId}/previews`, { params: { ad_format: fmt } });
      setPreviewHtml(res.data?.[0]?.body || res.data?.body || '');
    } catch (err) {
      { const e = err.response?.data?.error; setError(typeof e === 'string' ? e : e?.message || 'Preview unavailable'); }
      setPreviewHtml(null);
    } finally { setLoading(false); }
  }, [creativeId]);

  useEffect(() => { fetchPreview(format); }, [fetchPreview, format]);

  const iframeSrc = useMemo(() => {
    if (!previewHtml) return null;
    const match = previewHtml.match(/src="([^"]+)"/);
    return match ? match[1].replace(/&amp;/g, '&') : null;
  }, [previewHtml]);

  const isMobile = format === 'MOBILE_FEED_STANDARD' || format === 'INSTAGRAM_STANDARD';

  const handleShare = () => {
    const link = ad.preview_shareable_link;
    if (link) { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-3 z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full h-full flex flex-col animate-[fadeSlideUp_0.2s_ease-out]">
          {/* Header */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-[12px] font-bold text-white truncate flex-1 min-w-0">{ad.name || 'Untitled Ad'}</h3>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                <select value={format} onChange={e => setFormat(e.target.value)}
                  className="text-[10px] font-medium px-2 py-1 rounded-lg border border-slate-700 bg-white/10 text-slate-300 focus:outline-none">
                  {AD_FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={14} /></button>
              </div>
            </div>
            {/* Campaign & Ad Set — only show if different from ad name */}
            {((ad.campaign?.name && ad.campaign.name !== ad.name) || (ad.adset?.name && ad.adset.name !== ad.name)) && (
              <div className="flex items-center gap-1.5 mt-1 text-[9px]">
                {ad.campaign?.name && ad.campaign.name !== ad.name && (
                  <span className="text-orange-300/80 truncate max-w-[250px]">{ad.campaign.name}</span>
                )}
                {ad.campaign?.name && ad.campaign.name !== ad.name && ad.adset?.name && ad.adset.name !== ad.name && ad.adset.name !== ad.campaign?.name && (
                  <span className="text-slate-600">›</span>
                )}
                {ad.adset?.name && ad.adset.name !== ad.name && ad.adset.name !== ad.campaign?.name && (
                  <span className="text-slate-400 truncate max-w-[250px]">{ad.adset.name}</span>
                )}
              </div>
            )}
          </div>
          {/* Preview — fills remaining space */}
          <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 overflow-auto">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-400"><Loader2 size={20} className="animate-spin" /><span className="text-sm">Loading preview...</span></div>
            ) : error ? (
              <div className="text-center"><Eye size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">{error}</p></div>
            ) : iframeSrc ? (
              <div className={`${isMobile ? 'w-[380px]' : 'w-full max-w-[520px]'} h-full`}>
                <iframe src={iframeSrc} className="w-full h-full border-0 rounded-xl bg-white shadow-lg" sandbox="allow-scripts allow-same-origin" />
              </div>
            ) : (
              <div className="text-center"><Eye size={32} className="text-slate-300 mx-auto mb-2" /><p className="text-sm text-slate-500">Preview unavailable</p></div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Present Mode — fullscreen slideshow for showing ads to stakeholders ──
// ── Resolve best available image for an ad ──
const getAdImage = (ad) => {
  const c = ad.creative || {};
  const oss = c.object_story_spec || {};
  const ld = oss.link_data || {};
  const vd = oss.video_data || {};
  // Prefer: resolved high-res > creative.image_url > child_attachments first image > link_data.picture > video thumbnail > thumbnail fallback
  // Avoid FB redirect URLs (blurry) — _resolved_image is the server-resolved CDN version
  if (c._resolved_image) return c._resolved_image;
  if (c.image_url && !c.image_url.includes('facebook.com/ads/image')) return c.image_url;
  // Carousel: child_attachments have per-slide images
  if (ld.child_attachments?.length) {
    const first = ld.child_attachments[0];
    if (first.image_url) return first.image_url;
    if (first.picture) return first.picture;
  }
  // link_data.picture — only use if not a blurry FB redirect
  if (ld.picture && !ld.picture.includes('facebook.com/ads/image')) return ld.picture;
  // Video data image
  if (vd.image_url && !vd.image_url.includes('facebook.com/ads/image')) return vd.image_url;
  // Fallbacks
  return ld.picture || ld.image_url || vd.image_url || c.thumbnail_url || null;
};

// ── Ad Card — shows actual Meta ad preview iframe directly ──
const AdCard = ({ ad, previewHtml, previewLoading, onPreview, onRetryPreview }) => {
  const statusColor = getStatusColor(ad.effective_status || ad.status);
  const statusLabel = (ad.effective_status || ad.status || '').charAt(0) + (ad.effective_status || ad.status || '').slice(1).toLowerCase();
  const adType = getAdType(ad);
  const campaignName = ad.campaign?.name || '';
  const adSetName = ad.adset?.name || '';
  const pageName = ad._page?.name || '';
  const pagePicture = ad._page?.picture || '';
  const containerRef = useRef(null);

  const iframeSrc = useMemo(() => {
    if (!previewHtml) return null;
    const match = previewHtml.match(/src="([^"]+)"/);
    return match ? match[1].replace(/&amp;/g, '&') : null;
  }, [previewHtml]);

  return (
    <div className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer flex flex-col"
      onClick={() => onPreview(ad)}>
      {/* Top bar — status + type + campaign › adset + date */}
      <div className="px-3 py-2 flex flex-col gap-1.5 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${statusColor.bg} ${statusColor.text} border ${statusColor.border} shrink-0`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusColor.dot}`} /> {statusLabel}
          </span>
          {adType !== 'image' && (
            <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white shrink-0 ${
              adType === 'video' ? 'bg-purple-500' : adType === 'carousel' ? 'bg-blue-500' : 'bg-amber-500'
            }`}>{AD_TYPE_LABELS[adType]}</span>
          )}
          <span className="text-[9px] text-slate-300 ml-auto shrink-0">{fmtDate(ad.created_time)}</span>
        </div>
        {pageName && (
          <div className="flex items-center gap-1.5 text-[9px]">
            {pagePicture && <img src={pagePicture} alt="" className="w-4 h-4 rounded-full shrink-0" />}
            <span className="font-medium text-slate-600 truncate">{pageName}</span>
          </div>
        )}
        {(campaignName || adSetName) && (
          <div className="flex items-center gap-1 text-[9px] text-slate-400 truncate">
            {campaignName && <span className="truncate max-w-[45%]" title={campaignName}>{campaignName}</span>}
            {campaignName && adSetName && <span className="text-slate-300">›</span>}
            {adSetName && <span className="truncate max-w-[45%]" title={adSetName}>{adSetName}</span>}
          </div>
        )}
      </div>
      {/* Meta ad preview iframe — fills card width naturally */}
      <div className="flex-1 bg-white relative overflow-hidden" ref={containerRef}>
        {previewLoading && (
          <div className="flex items-center justify-center" style={{ height: '400px' }}>
            <Loader2 size={18} className="animate-spin text-slate-300" />
          </div>
        )}
        {iframeSrc ? (
          <iframe src={iframeSrc} className="w-full border-0"
            style={{ height: '520px', pointerEvents: 'none' }}
            sandbox="allow-scripts allow-same-origin" loading="lazy" />
        ) : !previewLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Eye size={24} className="text-slate-200 mb-2" />
            <p className="text-[11px] text-slate-400 mb-2">Preview unavailable</p>
            <button onClick={(e) => { e.stopPropagation(); onRetryPreview?.(ad.id, ad.creative?.id); }}
              className="px-3 py-1.5 text-[10px] font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Retry
            </button>
          </div>
        ) : null}
      </div>
      {/* Footer — ad ID */}
      <div className="px-3 py-1.5 border-t border-slate-100 shrink-0">
        <p className="text-[8px] text-slate-300 font-mono" title={`Ad ID: ${ad.id}`}>ID: {ad.id}</p>
      </div>
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
  const [selectedPage, setSelectedPage] = useState(null);       // null = all pages
  const [filterCampaigns, setFilterCampaigns] = useState([]);   // selected campaign names
  const [filterAdSets, setFilterAdSets] = useState([]);         // selected ad set names
  const [filterAdType, setFilterAdType] = useState('all');      // 'all'|'image'|'video'|'carousel'|'dynamic'
  const [openDropdown, setOpenDropdown] = useState(null);
  const filterBarRef = useRef(null);
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
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [adAccountId]);

  // Batch preview cache: creativeId → html
  const [previewMap, setPreviewMap] = useState({});
  const [previewsLoading, setPreviewsLoading] = useState(false);

  // Reset ads when ad account changes, then fetch
  useEffect(() => { setAds([]); setPaging(null); setPreviewMap({}); setSelectedPage(null); fetchAds(); }, [fetchAds]);

  // Batch-fetch previews whenever ads list changes (keyed by ad ID)
  useEffect(() => {
    const entries = ads.filter(a => a.id && !previewMap[a.id]).map(a => ({ adId: a.id, creativeId: a.creative?.id }));
    if (entries.length === 0) return;
    setPreviewsLoading(true);
    api.post('/creatives/batch-previews', { ids: entries, ad_format: 'MOBILE_FEED_STANDARD' })
      .then(res => {
        setPreviewMap(prev => ({ ...prev, ...res.data }));
      })
      .catch(() => {})
      .finally(() => setPreviewsLoading(false));
  }, [ads]);

  // Retry a single preview fetch
  const retryPreview = useCallback((adId, creativeId) => {
    if (!adId) return;
    api.post('/creatives/batch-previews', { ids: [{ adId, creativeId }], ad_format: 'MOBILE_FEED_STANDARD' })
      .then(res => { setPreviewMap(prev => ({ ...prev, ...res.data })); })
      .catch(() => {});
  }, []);

  const hasMore = !!paging?.next;

  // Close filter dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target)) setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleInArray = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  // Unique pages from loaded ads (for cross-post page pills)
  const pageOptions = useMemo(() => {
    const map = {};
    for (const a of ads) {
      const p = a._page;
      if (p?.name && !map[p.name]) map[p.name] = p;
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [ads]);
  const showPagePills = pageOptions.length > 1;

  // Unique statuses from loaded ads
  const statusOptions = useMemo(() => {
    const statuses = [...new Set(ads.map(a => (a.effective_status || a.status || '').toUpperCase()).filter(Boolean))];
    // Sort with ACTIVE first, PAUSED second, rest alphabetical
    const order = { ACTIVE: 0, PAUSED: 1 };
    return statuses.sort((a, b) => (order[a] ?? 99) - (order[b] ?? 99) || a.localeCompare(b));
  }, [ads]);

  // Unique campaign & ad set names from loaded ads
  const campaignNames = useMemo(() => [...new Set(ads.map(a => a.campaign?.name).filter(Boolean))].sort(), [ads]);
  const adSetNames = useMemo(() => {
    // If campaigns are filtered, only show ad sets from those campaigns
    const pool = filterCampaigns.length > 0 ? ads.filter(a => filterCampaigns.includes(a.campaign?.name)) : ads;
    return [...new Set(pool.map(a => a.adset?.name).filter(Boolean))].sort();
  }, [ads, filterCampaigns]);

  // Ad type options from loaded ads
  const adTypeOptions = useMemo(() => {
    const types = new Set(ads.map(a => getAdType(a)));
    return ['image', 'video', 'carousel', 'dynamic'].filter(t => types.has(t));
  }, [ads]);

  // Campaign objectives
  const objectiveOptions = useMemo(() => {
    const objs = new Set(ads.map(a => a.campaign?.objective).filter(Boolean));
    return [...objs].sort();
  }, [ads]);
  const OBJECTIVE_LABELS = {
    OUTCOME_AWARENESS: 'Awareness',
    OUTCOME_ENGAGEMENT: 'Engagement',
    OUTCOME_LEADS: 'Leads',
    OUTCOME_SALES: 'Sales',
    OUTCOME_TRAFFIC: 'Traffic',
    OUTCOME_APP_PROMOTION: 'App Promotion',
    LINK_CLICKS: 'Traffic',
    POST_ENGAGEMENT: 'Engagement',
    VIDEO_VIEWS: 'Video Views',
    LEAD_GENERATION: 'Lead Generation',
    CONVERSIONS: 'Conversions',
    REACH: 'Reach',
    BRAND_AWARENESS: 'Brand Awareness',
    MESSAGES: 'Messages',
    PRODUCT_CATALOG_SALES: 'Catalog Sales',
    STORE_VISITS: 'Store Visits',
  };
  const fmtObjective = (o) => OBJECTIVE_LABELS[o] || (o ? o.replace(/^OUTCOME_/i, '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : o);

  const activeFilterCount = filterCampaigns.length + filterAdSets.length + (filterAdType !== 'all' ? 1 : 0);

  const filtered = useMemo(() => {
    let list = [...ads];
    if (selectedPage) {
      list = list.filter(a => a._page?.name === selectedPage);
    }
    if (statusFilter !== 'all') {
      list = list.filter(a => (a.effective_status || a.status || '').toUpperCase() === statusFilter);
    }
    if (filterCampaigns.length > 0) {
      list = list.filter(a => filterCampaigns.includes(a.campaign?.name));
    }
    if (filterAdSets.length > 0) {
      list = list.filter(a => filterAdSets.includes(a.adset?.name));
    }
if (filterAdType !== 'all') {
      list = list.filter(a => getAdType(a) === filterAdType);
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
  }, [ads, selectedPage, statusFilter, filterCampaigns, filterAdSets, filterAdType, search, datePreset, customFrom, customTo]);

  const activeCount = ads.filter(a => (a.effective_status || '').toUpperCase() === 'ACTIVE').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Ads Gallery
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${ads.length} ads · ${activeCount} active`}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
            <PlatformAccountSelector platform="meta"
              token={token} onLoginMeta={onLogin} onLogoutMeta={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectMetaAccount={onSelectAccount}
              variant="header" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchAds()} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => onPrefillChat?.('I want to analyze and optimize my ads.', 'Performance')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-orange-500/50 transition-all shadow-lg shadow-orange-500/30">
              <Sparkles size={13} /> Ask AI Agent
            </button>
          </div>
        </div>
      </div>

      {/* Page pills — only show when multiple pages exist (cross-posting) */}
      {showPagePills && (
        <div className="px-6 py-2 flex items-center gap-2 shrink-0 bg-white/80 border-b border-slate-200/40">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Page:</span>
          <button onClick={() => setSelectedPage(null)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
              !selectedPage ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}>
            All Pages
          </button>
          {pageOptions.map(p => (
            <button key={p.name} onClick={() => setSelectedPage(selectedPage === p.name ? null : p.name)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all ${
                selectedPage === p.name ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {p.picture && <img src={p.picture} alt="" className="w-4 h-4 rounded-full shrink-0" />}
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div ref={filterBarRef} className="relative z-20 px-6 py-2.5 flex items-center gap-2 shrink-0 bg-white/90 backdrop-blur-md border-b border-slate-200/60 flex-wrap">
        <span className="text-[11px] font-semibold text-slate-400 tabular-nums mr-1">{filtered.length} of {ads.length}</span>

        {/* Status — dynamic based on actual statuses in data */}
        <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden">
          {[['all', 'All'], ...statusOptions.map(s => [s, s.charAt(0) + s.slice(1).toLowerCase()])].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* All multi-select dropdown filters */}
        {[
          { key: 'type', label: 'Type', state: filterAdType === 'all' ? [] : [filterAdType],
            toggle: (val) => setFilterAdType(prev => prev === val ? 'all' : val),
            clear: () => setFilterAdType('all'),
            options: adTypeOptions.map(t => ({ id: t, label: AD_TYPE_LABELS[t] || t })),
            isSingle: true },
          { key: 'campaign', label: 'Campaign', state: filterCampaigns, setState: setFilterCampaigns,
            options: campaignNames.map(n => ({ id: n, label: n })) },
          { key: 'adset', label: 'Ad Set', state: filterAdSets, setState: setFilterAdSets,
            options: adSetNames.map(n => ({ id: n, label: n })) },
        ].map(dim => {
          const hasSelection = dim.isSingle ? filterAdType !== 'all' : dim.state.length > 0;
          const selCount = dim.isSingle ? (filterAdType !== 'all' ? 1 : 0) : dim.state.length;
          return (
            <div key={dim.key} className="relative">
              <button onClick={() => setOpenDropdown(openDropdown === dim.key ? null : dim.key)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all duration-150 ${
                  hasSelection
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : openDropdown === dim.key
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}>
                {dim.label}
                {selCount > 0 && (
                  <span className="bg-white/20 text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center">{selCount}</span>
                )}
                <ChevronDown size={11} className={`transition-transform duration-150 ${openDropdown === dim.key ? 'rotate-180' : ''}`} />
              </button>
              {openDropdown === dim.key && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-slate-200 z-30 animate-[fadeSlideUp_0.15s_ease-out] max-h-64 flex flex-col">
                  {dim.options.length > 8 && (
                    <div className="px-2 pt-2 pb-1 shrink-0">
                      <input placeholder={`Search...`} autoFocus
                        className="w-full px-2 py-1 text-[10px] rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-300 placeholder:text-slate-300"
                        onChange={e => {
                          const input = e.target;
                          const items = input.closest('[data-dropdown]')?.querySelectorAll('[data-option]');
                          items?.forEach(el => { el.style.display = el.dataset.option.toLowerCase().includes(input.value.toLowerCase()) ? '' : 'none'; });
                        }} />
                    </div>
                  )}
                  <div className="overflow-auto py-1 flex-1" data-dropdown>
                    {dim.options.length === 0 ? (
                      <p className="px-3 py-2 text-[10px] text-slate-400">No options</p>
                    ) : dim.options.map(opt => {
                      const isChecked = dim.isSingle ? filterAdType === opt.id : dim.state.includes(opt.id);
                      return (
                        <button key={opt.id} data-option={opt.label} onClick={() => dim.isSingle ? dim.toggle(opt.id) : toggleInArray(dim.state, dim.setState, opt.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] text-left transition-colors ${
                            isChecked ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                          }`}>
                          <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                            isChecked ? 'bg-slate-900 border-slate-900' : 'border-slate-300'
                          }`}>
                            {isChecked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.2 5.7L6.5 2.3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </span>
                          <span className="truncate">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                  {hasSelection && (
                    <div className="border-t border-slate-100 py-1 shrink-0">
                      <button onClick={() => dim.isSingle ? dim.clear() : dim.setState([])}
                        className="w-full px-3 py-1.5 text-[10px] font-medium text-slate-400 hover:text-slate-600 text-left transition-colors">
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        <DateFilter datePreset={datePreset} setDatePreset={setDatePreset}
          customFrom={customFrom} setCustomFrom={setCustomFrom}
          customTo={customTo} setCustomTo={setCustomTo} />

        {/* Clear all + chips */}
        {activeFilterCount > 0 && (
          <>
            <button onClick={() => { setFilterCampaigns([]); setFilterAdSets([]); setFilterAdType('all'); }}
              className="text-[10px] font-medium text-slate-400 hover:text-slate-600 transition-colors">
              Clear all
            </button>
            {filterAdType !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                {AD_TYPE_LABELS[filterAdType]}
                <button onClick={() => setFilterAdType('all')} className="text-slate-400 hover:text-slate-700"><X size={9} /></button>
              </span>
            )}
            {[...filterCampaigns.map(v => ({ dim: 'campaign', val: v, label: v, setState: setFilterCampaigns, state: filterCampaigns })),
              ...filterAdSets.map(v => ({ dim: 'adset', val: v, label: v, setState: setFilterAdSets, state: filterAdSets })),
            ].map(chip => (
              <span key={`${chip.dim}-${chip.val}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600 max-w-[140px]">
                <span className="truncate">{chip.label || chip.val}</span>
                <button onClick={() => toggleInArray(chip.state, chip.setState, chip.val)} className="text-slate-400 hover:text-slate-700 shrink-0"><X size={9} /></button>
              </span>
            ))}
          </>
        )}

        {/* Search */}
        <div className="relative ml-auto max-w-[180px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search ads..."
            className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:bg-white transition-all" />
        </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(ad => (
                <AdCard key={ad.id} ad={ad} previewHtml={previewMap[ad.id]} previewLoading={previewsLoading && !previewMap[ad.id]} onPreview={setPreviewAd} onRetryPreview={retryPreview} />
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
