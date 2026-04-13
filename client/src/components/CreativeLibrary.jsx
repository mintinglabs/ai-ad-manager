import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Image as ImageIcon, Film, Loader2, Trash2, X, Download, Clock, Maximize2, Grid, List } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import api from '../services/api.js';

// ── Helpers ──
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDuration = (s) => {
  if (!s) return '';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`;
};
const fmtSize = (w, h) => w && h ? `${w}×${h}` : '';

// ── Preview modal ──
const PreviewModal = ({ asset, onClose }) => {
  if (!asset) return null;
  const isVideo = !!asset.source;
  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-8 z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-full flex flex-col">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800 truncate max-w-md">{asset.name || asset.title || 'Untitled'}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isVideo ? `${fmtDuration(asset.length)} · ` : ''}{fmtSize(asset.width, asset.height)} · {fmtDate(asset.created_time)}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-slate-50 overflow-auto">
            {isVideo ? (
              <video src={asset.source} controls className="max-w-full max-h-[70vh] rounded-lg" />
            ) : (
              <img src={asset.url || asset.url_128} alt={asset.name} className="max-w-full max-h-[70vh] rounded-lg object-contain" />
            )}
          </div>
        </div>
      </div>
    </>
  );
};

// ── Asset card ──
const AssetCard = ({ asset, isVideo, selected, onSelect, onPreview, onDelete, viewMode }) => {
  const thumbnail = isVideo ? asset.picture : (asset.url || asset.url_128);
  const name = isVideo ? (asset.title || `Video ${asset.id}`) : (asset.name || `Image ${asset.hash}`);
  const meta = isVideo
    ? `${fmtDuration(asset.length)}${asset.three_second_views ? ` · ${Number(asset.three_second_views).toLocaleString()} views` : ''}`
    : fmtSize(asset.width, asset.height);

  if (viewMode === 'list') {
    return (
      <tr className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors ${selected ? 'bg-blue-50/50' : ''}`}>
        <td className="py-2.5 px-3" onClick={e => e.stopPropagation()}>
          <input type="checkbox" checked={selected} onChange={() => onSelect(asset.id || asset.hash)}
            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
        </td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-3">
            <button onClick={() => onPreview(asset)} className="shrink-0 relative">
              {thumbnail ? (
                <img src={thumbnail} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-200" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                  {isVideo ? <Film size={16} className="text-slate-400" /> : <ImageIcon size={16} className="text-slate-400" />}
                </div>
              )}
              {isVideo && (
                <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[8px] px-1 rounded font-medium">
                  {fmtDuration(asset.length)}
                </span>
              )}
            </button>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate-700 truncate max-w-[250px]">{name}</p>
              <p className="text-[10px] text-slate-400">{meta}</p>
            </div>
          </div>
        </td>
        <td className="py-2.5 px-3">
          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${isVideo ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
            {isVideo ? <Film size={10} /> : <ImageIcon size={10} />}
            {isVideo ? 'Video' : 'Image'}
          </span>
        </td>
        <td className="py-2.5 px-3 text-[11px] text-slate-400">{fmtDate(asset.created_time)}</td>
        <td className="py-2.5 px-3">
          <button onClick={() => onDelete(asset)} className="text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className={`group relative bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md ${selected ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
      {/* Checkbox */}
      <div className="absolute top-2 left-2 z-10" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onSelect(asset.id || asset.hash)}
          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30 bg-white/80 shadow-sm" />
      </div>
      {/* Thumbnail */}
      <button onClick={() => onPreview(asset)} className="w-full aspect-square bg-slate-50 flex items-center justify-center relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            {isVideo ? <Film size={32} /> : <ImageIcon size={32} />}
          </div>
        )}
        {isVideo && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-medium">
            {fmtDuration(asset.length)}
          </span>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Maximize2 size={20} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
      </button>
      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-medium text-slate-700 truncate">{name}</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[10px] text-slate-400">{meta}</p>
          <div className="flex items-center gap-1">
            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${isVideo ? 'bg-purple-50 text-purple-500' : 'bg-blue-50 text-blue-500'}`}>
              {isVideo ? 'Video' : 'Image'}
            </span>
          </div>
        </div>
        <p className="text-[9px] text-slate-300 mt-1 flex items-center gap-1">
          <Clock size={9} /> {fmtDate(asset.created_time)}
        </p>
      </div>
    </div>
  );
};

// ── Main Component ──
export const CreativeLibrary = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onBack, onSendToChat }) => {
  const [showAskAI, setShowAskAI] = useState(false);
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'images' | 'videos'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewAsset, setPreviewAsset] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [visibleCount, setVisibleCount] = useState(18);
  const [deleteTarget, setDeleteTarget] = useState(null); // asset pending delete confirmation
  const [deleteError, setDeleteError] = useState(null);
  const [datePreset, setDatePreset] = useState('maximum');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const fetchAssets = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const [imgRes, vidRes] = await Promise.all([
        api.get('/assets/images', { params: { adAccountId } }),
        api.get('/assets/videos', { params: { adAccountId } }),
      ]);
      setImages((imgRes.data || []).map(img => ({ ...img, _type: 'image' })));
      setVideos((vidRes.data || []).map(vid => ({ ...vid, _type: 'video' })));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // Reset visible count when filter/search changes
  useEffect(() => { setVisibleCount(18); }, [filter, search]);

  // Combined & filtered list
  const allAssets = useMemo(() => {
    let list = [];
    if (filter !== 'videos') list.push(...images);
    if (filter !== 'images') list.push(...videos);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => (a.name || a.title || '').toLowerCase().includes(q));
    }
    // Date filter
    if (datePreset !== 'maximum') {
      const now = new Date();
      let from, to;
      if (datePreset === 'custom' && customDateFrom && customDateTo) {
        from = new Date(customDateFrom);
        to = new Date(customDateTo + 'T23:59:59');
      } else {
        to = now;
        const d = new Date();
        if (datePreset === 'last_7d') d.setDate(d.getDate() - 7);
        else if (datePreset === 'last_14d') d.setDate(d.getDate() - 14);
        else if (datePreset === 'last_30d') d.setDate(d.getDate() - 30);
        else if (datePreset === 'this_month') d.setDate(1);
        else if (datePreset === 'last_month') { d.setMonth(d.getMonth() - 1); d.setDate(1); to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59); }
        from = d;
      }
      if (from && to) list = list.filter(a => { const ct = new Date(a.created_time); return ct >= from && ct <= to; });
    }
    list.sort((a, b) => new Date(b.created_time || 0) - new Date(a.created_time || 0));
    return list;
  }, [images, videos, filter, search, datePreset, customDateFrom, customDateTo]);

  const visibleAssets = useMemo(() => allAssets.slice(0, visibleCount), [allAssets, visibleCount]);
  const hasMore = visibleCount < allAssets.length;

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === allAssets.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(allAssets.map(a => a.id || a.hash)));
  }, [allAssets, selectedIds]);

  // Step 1: user clicks delete → set target. Step 2: confirm dialog → execute.
  const handleDelete = useCallback((asset) => {
    setDeleteTarget(asset);
    setDeleteError(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const asset = deleteTarget;
    setDeleting(true);
    setDeleteError(null);
    try {
      if (asset._type === 'image') {
        await api.delete('/assets/images', { params: { adAccountId, hash: asset.hash } });
        setImages(prev => prev.filter(i => i.hash !== asset.hash));
      } else {
        await api.delete(`/assets/videos/${asset.id}`, { params: { adAccountId } });
        setVideos(prev => prev.filter(v => v.id !== asset.id));
      }
      setSelectedIds(prev => { const n = new Set(prev); n.delete(asset.id || asset.hash); return n; });
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleteError(err.response?.data?.error || err.message || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, adAccountId]);

  const handleBulkDelete = useCallback(() => {
    // Set a special bulk target
    setDeleteTarget({ _bulk: true, count: selectedIds.size });
    setDeleteError(null);
  }, [selectedIds]);

  const confirmBulkDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    const errors = [];
    const deletedIds = new Set();
    for (const id of selectedIds) {
      try {
        const img = images.find(i => i.id === id || i.hash === id);
        if (img) {
          await api.delete('/assets/images', { params: { adAccountId, hash: img.hash } });
        } else {
          await api.delete(`/assets/videos/${id}`, { params: { adAccountId } });
        }
        deletedIds.add(id);
      } catch (err) {
        errors.push(err.response?.data?.error || err.message);
      }
    }
    if (deletedIds.size > 0) {
      setImages(prev => prev.filter(i => !deletedIds.has(i.id) && !deletedIds.has(i.hash)));
      setVideos(prev => prev.filter(v => !deletedIds.has(v.id)));
      setSelectedIds(prev => { const n = new Set(prev); deletedIds.forEach(id => n.delete(id)); return n; });
    }
    if (errors.length > 0) {
      setDeleteError(`${deletedIds.size} deleted, ${errors.length} failed: ${errors[0]}`);
    } else {
      setDeleteTarget(null);
    }
    setDeleting(false);
  }, [selectedIds, images, adAccountId]);

  const imageCount = images.length;
  const videoCount = videos.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <ImageIcon size={20} className="text-pink-500" />
                Asset Library
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${imageCount} images · ${videoCount} videos${allAssets.length > visibleCount ? ` · showing ${visibleCount}` : ''}`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <AskAIButton onClick={() => setShowAskAI(true)} />
            <button onClick={fetchAssets} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-6 py-2.5 bg-pink-600 text-white shrink-0">
          <span className="text-[12px] font-semibold">{selectedIds.size} selected</span>
          <button onClick={handleBulkDelete} disabled={deleting}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white/20 hover:bg-red-500/60 rounded-lg transition-colors ml-4">
            <Trash2 size={12} /> Delete
          </button>
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white border-b border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[['all', 'All'], ['images', 'Images'], ['videos', 'Videos']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)}
              className={`px-3.5 py-2 text-[11px] font-medium transition-colors ${filter === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        {/* Date filter */}
        <div className="relative">
          <select value={datePreset} onChange={e => {
            const v = e.target.value;
            if (v === 'custom') { setShowDatePicker(true); setDatePreset('custom'); }
            else { setDatePreset(v); setShowDatePicker(false); }
          }}
            className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="last_7d">Last 7 Days</option>
            <option value="last_14d">Last 14 Days</option>
            <option value="last_30d">Last 30 Days</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="maximum">Lifetime</option>
            <option value="custom">{customDateFrom && customDateTo ? `${customDateFrom} – ${customDateTo}` : 'Custom Range'}</option>
          </select>
          {showDatePicker && (
            <div className="absolute top-full right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-4 w-64" onClick={e => e.stopPropagation()}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Date Range</p>
              <div className="space-y-2">
                <div><label className="text-[10px] text-slate-500 font-medium">From</label>
                  <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
                <div><label className="text-[10px] text-slate-500 font-medium">To</label>
                  <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" /></div>
              </div>
              <div className="flex justify-end gap-2 mt-3">
                <button onClick={() => setShowDatePicker(false)} className="px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                <button onClick={() => setShowDatePicker(false)} disabled={!customDateFrom || !customDateTo}
                  className="px-2.5 py-1.5 text-[11px] text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium disabled:opacity-50">Apply</button>
              </div>
            </div>
          )}
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button onClick={() => setViewMode('grid')}
            className={`px-2.5 py-2 transition-colors ${viewMode === 'grid' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Grid size={14} />
          </button>
          <button onClick={() => setViewMode('list')}
            className={`px-2.5 py-2 transition-colors ${viewMode === 'list' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
            <List size={14} />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : loading && allAssets.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading assets...</span>
          </div>
        ) : allAssets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <ImageIcon size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No assets found</p>
            <p className="text-xs text-slate-400">Upload images or videos in the chat to see them here.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {visibleAssets.map(asset => (
                <AssetCard
                  key={asset.id || asset.hash}
                  asset={asset}
                  isVideo={asset._type === 'video'}
                  selected={selectedIds.has(asset.id || asset.hash)}
                  onSelect={toggleSelect}
                  onPreview={setPreviewAsset}
                  onDelete={handleDelete}
                  viewMode="grid"
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center py-4">
                <button onClick={() => setVisibleCount(v => v + 18)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors">
                  Load More ({allAssets.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80">
                    <th className="py-2.5 px-3 w-10">
                      <input type="checkbox" checked={selectedIds.size === allAssets.length && allAssets.length > 0}
                        onChange={toggleSelectAll}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                    </th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset</th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                    <th className="py-2.5 px-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleAssets.map(asset => (
                    <AssetCard
                      key={asset.id || asset.hash}
                      asset={asset}
                      isVideo={asset._type === 'video'}
                      selected={selectedIds.has(asset.id || asset.hash)}
                      onSelect={toggleSelect}
                      onPreview={setPreviewAsset}
                      onDelete={handleDelete}
                      viewMode="list"
                    />
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="flex justify-center py-4">
                <button onClick={() => setVisibleCount(v => v + 18)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors">
                  Load More ({allAssets.length - visibleCount} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview modal */}
      {previewAsset && <PreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setDeleteTarget(null)} />
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                {deleteTarget._bulk ? `Delete ${deleteTarget.count} assets?` : `Delete "${deleteTarget.name || deleteTarget.title || 'asset'}"?`}
              </h3>
              <p className="text-xs text-slate-500">This cannot be undone.</p>
              {deleteError && (
                <div className="mt-2 bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{deleteError}</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => { setDeleteTarget(null); setDeleteError(null); }}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={deleteTarget._bulk ? confirmBulkDelete : confirmDelete} disabled={deleting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </>
      )}

      {showAskAI && <AskAIPopup onSubmit={onSendToChat} onClose={() => setShowAskAI(false)} context="Asset Library" />}
    </div>
  );
};
