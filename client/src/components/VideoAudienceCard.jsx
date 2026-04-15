import React, { useState, useEffect, useRef } from 'react';
import { Search, Film, RefreshCw, ChevronDown, Check, Target } from 'lucide-react';
import api from '../services/api.js';

const VIDEOS_PER_PAGE = 10;
const fmtDuration = (s) => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '';
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ENGAGEMENT_OPTIONS = [
  { id: 'video_watched_3s', label: '睇咗至少 3 秒', desc: '最闊嘅受眾' },
  { id: 'video_watched_10s', label: '睇咗至少 10 秒', desc: '' },
  { id: 'video_watched_15s', label: 'ThruPlay (15 秒)', desc: '睇完或睇咗 15 秒以上' },
  { id: 'video_watched_25pct', label: '睇咗 25%', desc: '' },
  { id: 'video_watched_50pct', label: '睇咗 50%', desc: '有明顯興趣' },
  { id: 'video_watched_75pct', label: '睇咗 75%', desc: '高參與度' },
  { id: 'video_watched_95pct', label: '睇咗 95%', desc: '幾乎睇晒，最高意向' },
];

const ENGAGEMENT_LABELS = {
  video_watched_3s: 'viewed at least 3 seconds',
  video_watched_10s: 'viewed at least 10 seconds',
  video_watched_15s: 'completed or viewed at least 15 seconds (ThruPlay)',
  video_watched_25pct: 'viewed at least 25%',
  video_watched_50pct: 'viewed at least 50%',
  video_watched_75pct: 'viewed at least 75%',
  video_watched_95pct: 'viewed at least 95%',
};

const normalizeVideos = (raw, source) => {
  if (source === 'ig_account') {
    return raw.map(m => ({
      ...m,
      title: m.title || (m.description ? m.description.slice(0, 80) : (m.caption ? m.caption.slice(0, 80) : `Video ${m.id}`)),
      picture: m.picture || m.thumbnail_url || '',
      source: m.source || m.media_url,
      created_time: m.created_time || m.timestamp,
      is_ig: true,
    }));
  }
  return raw.map(v => ({ ...v, is_ig: !!v.source_instagram_media_id }));
};

const SEL = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-[13px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 appearance-none';

export default function VideoAudienceCard({ data, onSend, isAnswered, adAccountId, token }) {
  // Config state
  const [videoSource, setVideoSource] = useState('fb_page');
  const [selectedPageId, setSelectedPageId] = useState('');
  const [selectedIgId, setSelectedIgId] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [videoIdInput, setVideoIdInput] = useState('');
  const [engagement, setEngagement] = useState('video_watched_3s');
  const [retention, setRetention] = useState(365);

  // Data state
  const [pages, setPages] = useState(data?.pages || []);
  const [igAccounts, setIgAccounts] = useState(data?.igAccounts || []);
  const [campaigns, setCampaigns] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Video list UI
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('updated_time');
  const [page, setPage] = useState(0);
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const fetchRef = useRef(0);

  // Fetch pages + IG accounts on mount if not provided via data
  useEffect(() => {
    if (!adAccountId) return;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!data?.pages?.length) {
      api.get('/meta/pages', { headers }).then(r => {
        const p = r.data?.data || r.data || [];
        setPages(p);
        if (p.length > 0 && !selectedPageId) setSelectedPageId(p[0].id);
      }).catch(() => {});
    } else if (pages.length > 0 && !selectedPageId) {
      setSelectedPageId(pages[0].id);
    }
    if (!data?.igAccounts?.length) {
      api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`, { headers }).then(r => {
        setIgAccounts(r.data?.data || r.data || []);
      }).catch(() => {});
    }
    // Fetch campaigns for campaign source
    api.get(`/meta/adaccounts/${adAccountId}/campaigns-list`, { headers }).then(r => {
      setCampaigns(r.data?.data || r.data || []);
    }).catch(() => {});
  }, [adAccountId]);

  // Set default page when pages load
  useEffect(() => {
    if (pages.length > 0 && !selectedPageId) setSelectedPageId(pages[0].id);
  }, [pages]);

  // Set default IG when accounts load
  useEffect(() => {
    if (igAccounts.length > 0 && !selectedIgId) setSelectedIgId(igAccounts[0].id);
  }, [igAccounts]);

  // Fetch videos when source/page/ig/campaign changes
  useEffect(() => {
    if (!adAccountId) return;
    if (videoSource === 'fb_page' && !selectedPageId) return;
    if (videoSource === 'ig_account' && !selectedIgId) return;
    if (videoSource === 'campaign' && !selectedCampaignId) return;
    if (videoSource === 'video_id') { setVideos([]); setLoading(false); return; }

    const id = ++fetchRef.current;
    setLoading(true);
    setVideos([]);
    setError(null);
    setSelectedIds(new Set());
    setPage(0);
    setNextCursor(null);

    let url;
    if (videoSource === 'fb_page') {
      url = `/meta/pages/${selectedPageId}/videos?adAccountId=${adAccountId}`;
    } else if (videoSource === 'ig_account') {
      const igAcct = igAccounts.find(a => a.id === selectedIgId);
      const params = [igAcct?.pageId ? `pageId=${igAcct.pageId}` : '', `adAccountId=${adAccountId}`].filter(Boolean).join('&');
      url = `/meta/instagram/${selectedIgId}/media?${params}`;
    } else if (videoSource === 'campaign') {
      url = `/campaigns/${selectedCampaignId}/ads`;
    }

    if (!url) { setLoading(false); return; }

    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    api.get(url, { headers }).then(r => {
      if (id !== fetchRef.current) return;
      const res = r.data || {};
      let raw = Array.isArray(res) ? res : (res.videos || res.media || res.data || []);
      // For campaign ads, filter to only video ads and normalize
      if (videoSource === 'campaign') {
        raw = raw.filter(a => a.creative?.video_id).map(a => ({
          id: a.creative.video_id,
          title: a.name || 'Ad Video',
          picture: a.creative.thumbnail_url || '',
          created_time: a.created_time,
          updated_time: a.updated_time,
          three_second_views: 0,
        }));
      } else {
        raw = normalizeVideos(raw, videoSource);
      }
      setVideos(raw);
      setNextCursor(res.nextCursor || null);
      setLoading(false);
    }).catch(err => {
      if (id !== fetchRef.current) return;
      { const e = err.response?.data?.error; setError(typeof e === 'string' ? e : e?.message || err.message || 'Failed to load videos'); }
      setLoading(false);
    });
  }, [videoSource, selectedPageId, selectedIgId, selectedCampaignId, adAccountId]);

  // Load more videos
  const loadMore = () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    const base = videoSource === 'fb_page'
      ? `/meta/pages/${selectedPageId}/videos?adAccountId=${adAccountId}`
      : `/meta/instagram/${selectedIgId}/media?adAccountId=${adAccountId}`;
    const url = `${base}&after=${nextCursor}`;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    api.get(url, { headers }).then(r => {
      const res = r.data || {};
      const raw = Array.isArray(res) ? res : (res.videos || res.media || []);
      setVideos(prev => [...prev, ...normalizeVideos(raw, videoSource)]);
      setNextCursor(res.nextCursor || null);
      setLoadingMore(false);
      setPage(p => p + 1);
    }).catch(() => setLoadingMore(false));
  };

  const toggleVideo = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Filter + sort
  const filtered = videos
    .filter(v => !search || (v.title || v.name || v.description || v.id || '').toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const field = sortBy === 'created_time' ? 'created_time' : 'updated_time';
      return (b[field] || b.created_time || '').localeCompare(a[field] || a.created_time || '');
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / VIDEOS_PER_PAGE));
  const safePage = Math.min(page, totalPages - 1);
  const pageVideos = filtered.slice(safePage * VIDEOS_PER_PAGE, (safePage + 1) * VIDEOS_PER_PAGE);

  const handleConfirm = () => {
    if (confirmed || isAnswered) return;
    const engDesc = ENGAGEMENT_LABELS[engagement] || engagement;

    // Video ID source: use text input
    if (videoSource === 'video_id') {
      const ids = videoIdInput.split(/[,\s]+/).filter(Boolean);
      if (ids.length === 0) return;
      setConfirmed(true);
      onSend?.(`Create video audience: source=Manual Video IDs, engagement=${engDesc}, retention=${retention} days, videos=(IDs: ${ids.join(', ')})`);
      return;
    }

    if (selectedIds.size === 0) return;
    setConfirmed(true);
    const selVideos = videos.filter(v => selectedIds.has(v.id));
    const names = selVideos.map(v => v.title || v.id).slice(0, 3);
    const label = names.join(', ') + (selVideos.length > 3 ? ` +${selVideos.length - 3} more` : '');
    const ids = selVideos.map(v => v.id).join(', ');
    let sourceLabel;
    if (videoSource === 'fb_page') sourceLabel = `Facebook Page: ${pages.find(p => p.id === selectedPageId)?.name || selectedPageId}`;
    else if (videoSource === 'ig_account') sourceLabel = `Instagram: ${igAccounts.find(a => a.id === selectedIgId)?.username || selectedIgId}`;
    else if (videoSource === 'campaign') sourceLabel = `Campaign: ${campaigns.find(c => c.id === selectedCampaignId)?.name || selectedCampaignId}`;
    onSend?.(`Create video audience: source=${sourceLabel}, engagement=${engDesc}, retention=${retention} days, videos=${label} (IDs: ${ids})`);
  };

  if (confirmed || isAnswered) {
    return (
      <div className="my-2 border border-emerald-200 bg-emerald-50/30 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border border-emerald-400 bg-emerald-50 text-emerald-600">✓</div>
          <p className="text-[13px] font-semibold text-emerald-700">影片受眾設定已確認</p>
          <span className="ml-auto text-[11px] text-emerald-500">{selectedIds.size} videos selected</span>
        </div>
      </div>
    );
  }

  return (
    <div className="my-2 border border-blue-200 bg-white rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
        <Target size={14} className="text-blue-500" />
        <span className="text-[13px] font-semibold text-slate-800">建立影片受眾</span>
      </div>

      {/* Dropdowns */}
      <div className="px-4 py-3 space-y-3 border-b border-slate-100">
        {/* Row 1: Source + Page/Account/Campaign */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">影片來源</label>
            <select value={videoSource} onChange={e => setVideoSource(e.target.value)} className={SEL}>
              <option value="fb_page">Facebook Page</option>
              <option value="ig_account">Instagram Account</option>
              <option value="campaign">Campaign</option>
              <option value="video_id">Video ID (手動輸入)</option>
            </select>
          </div>
          {videoSource !== 'video_id' && (
            <div className="flex-1">
              <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">
                {videoSource === 'fb_page' ? '專頁' : videoSource === 'ig_account' ? 'IG 帳號' : 'Campaign'}
              </label>
              {videoSource === 'fb_page' && (
                <select value={selectedPageId} onChange={e => setSelectedPageId(e.target.value)} className={SEL}>
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {videoSource === 'ig_account' && (
                <select value={selectedIgId} onChange={e => setSelectedIgId(e.target.value)} className={SEL}>
                  {igAccounts.map(a => <option key={a.id} value={a.id}>{a.username ? `@${a.username}` : a.id}</option>)}
                </select>
              )}
              {videoSource === 'campaign' && (
                <select value={selectedCampaignId} onChange={e => setSelectedCampaignId(e.target.value)} className={SEL}>
                  <option value="">Select campaign...</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        {/* Video ID manual input */}
        {videoSource === 'video_id' && (
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Video IDs</label>
            <input value={videoIdInput} onChange={e => setVideoIdInput(e.target.value)}
              placeholder="Paste video IDs, comma separated"
              className={SEL} />
            <p className="text-[10px] text-slate-400 mt-1">Enter one or more video IDs separated by commas</p>
          </div>
        )}

        {/* Row 2: Engagement + Retention */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">互動程度</label>
            <select value={engagement} onChange={e => setEngagement(e.target.value)} className={SEL}>
              {ENGAGEMENT_OPTIONS.map(o => (
                <option key={o.id} value={o.id}>{o.label}{o.desc ? ` — ${o.desc}` : ''}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">保留期</label>
            <input type="number" value={retention} onChange={e => setRetention(Math.min(365, Math.max(1, Number(e.target.value))))}
              className={SEL} min={1} max={365} />
          </div>
        </div>
      </div>

      {/* Video List */}
      <div className="px-4 py-3">
        <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">
          Select Videos <span className="normal-case font-normal">({selectedIds.size} selected)</span>
        </label>

        {loading ? (
          <div className="flex flex-col items-center gap-2 py-8 text-xs text-slate-400">
            <RefreshCw size={16} className="animate-spin text-blue-400" />
            <span>Loading videos...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-xs text-red-500">{error}</p>
            <button onClick={() => { setError(null); setLoading(true); }}
              className="px-3 py-1.5 rounded-md text-[11px] font-medium border border-blue-200 text-blue-600 hover:bg-blue-50 flex items-center gap-1.5">
              <RefreshCw size={12} /> Retry
            </button>
          </div>
        ) : videos.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-4 text-center">No videos found</p>
        ) : (
          <>
            {/* Search + Sort */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                  placeholder="Search videos..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
              </div>
              <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(0); }}
                className="px-2 py-1.5 rounded-md border border-slate-200 text-[11px] text-slate-600 focus:outline-none">
                <option value="updated_time">Last used</option>
                <option value="created_time">Upload date</option>
              </select>
            </div>

            {/* Table header */}
            <div className="flex items-center gap-3 px-2 py-1.5 border-b-2 border-blue-600 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
              <span className="w-16 shrink-0">Thumbnail</span>
              <span className="flex-1">Video details</span>
              <span className="w-24 text-center shrink-0">Views</span>
              <span className="w-20 text-right shrink-0">Date</span>
              <span className="w-4 shrink-0" />
            </div>

            {/* Video rows */}
            <div className="border border-slate-200 rounded-b-lg divide-y divide-slate-100 max-h-[340px] overflow-y-auto">
              {pageVideos.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">No videos match the filter</p>
              ) : pageVideos.map(v => (
                <button key={v.id} onClick={() => toggleVideo(v.id)}
                  className={`w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors
                    ${selectedIds.has(v.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                  {/* Thumbnail */}
                  <div className="w-16 h-10 rounded-md bg-slate-100 overflow-hidden shrink-0 relative">
                    {v.picture ? (
                      <img src={v.picture} alt="" loading="lazy" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Film size={14} className="text-slate-300" /></div>
                    )}
                    {v.length && (
                      <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">{fmtDuration(v.length)}</span>
                    )}
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium text-slate-700 truncate">{v.title || v.name || v.description?.slice(0, 60) || `Video ${v.id}`}</p>
                    <p className="text-[10px] text-slate-400">{v.length ? `${fmtDuration(v.length)} · ` : ''}Uploaded: {fmtDate(v.created_time)}</p>
                  </div>
                  {/* Views + Source */}
                  <div className="w-24 text-center shrink-0 flex items-center justify-center gap-1">
                    <span className="text-[11px] text-slate-600 font-medium">
                      {(v.three_second_views || v.views || 0) > 0 ? (v.three_second_views || v.views || 0).toLocaleString() : '—'}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {!v.is_ig && <span className="w-3.5 h-3.5 rounded-full bg-blue-600 flex items-center justify-center text-[7px] text-white font-bold">f</span>}
                      {v.is_ig && <span className="w-3.5 h-3.5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[7px] text-white font-bold">ig</span>}
                    </div>
                  </div>
                  {/* Date */}
                  <span className="w-20 text-[10px] text-slate-400 text-right shrink-0">{fmtDate(v.updated_time || v.created_time)}</span>
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                    ${selectedIds.has(v.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                    {selectedIds.has(v.id) && <Check size={9} className="text-white" />}
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {(totalPages > 1 || nextCursor) && (
              <div className="flex items-center justify-between mt-2 px-1">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${safePage === 0 ? 'border-slate-100 text-slate-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  ◀ Prev
                </button>
                <span className="text-[10px] text-slate-400">Page {safePage + 1} of {nextCursor ? `${totalPages}+` : totalPages}</span>
                <button onClick={() => {
                  if (safePage >= totalPages - 1 && nextCursor) loadMore();
                  else setPage(p => Math.min(totalPages - 1, p + 1));
                }} disabled={(safePage >= totalPages - 1 && !nextCursor) || loadingMore}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${(safePage >= totalPages - 1 && !nextCursor) || loadingMore ? 'border-slate-100 text-slate-300' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  {loadingMore ? <><RefreshCw size={11} className="inline animate-spin mr-1" />Loading...</> : 'Next ▶'}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm bar */}
      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[12px] text-slate-500">
          {selectedIds.size > 0
            ? <><span className="font-semibold text-blue-600">{selectedIds.size}</span> of {filtered.length} selected</>
            : `${filtered.length} videos available`}
        </span>
        <button onClick={handleConfirm} disabled={selectedIds.size === 0}
          className="px-5 py-2 text-[13px] font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors shadow-sm">
          {selectedIds.size > 0 ? `✅ Confirm (${selectedIds.size})` : 'Select videos'}
        </button>
      </div>
    </div>
  );
}
