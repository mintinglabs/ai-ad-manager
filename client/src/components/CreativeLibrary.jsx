import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, RefreshCw, Image as ImageIcon, Film, Loader2, Trash2, X, Download, Clock, Maximize2, Grid, List, Plus, Layers, Edit3, Check, Upload, Sparkles } from 'lucide-react';
import { PlatformAccountSelector } from './PlatformAccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import { useCreativeSets } from '../hooks/useCreativeSets.js';
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed inset-8 z-50 flex items-center justify-center">
        <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full max-h-full flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
          <div className="relative flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
            <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
            <div className="relative">
              <h3 className="text-sm font-bold text-white truncate max-w-md">{asset.name || asset.title || 'Untitled'}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {isVideo ? `${fmtDuration(asset.length)} · ` : ''}{fmtSize(asset.width, asset.height)} · {fmtDate(asset.created_time)}
              </p>
            </div>
            <button onClick={onClose} className="relative w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 bg-white/95 backdrop-blur-xl overflow-auto">
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
const getUsageStatus = (usage = []) => {
  const activeAds = usage.filter(u => u.status === 'ACTIVE');
  if (activeAds.length > 0) return { key: 'active', label: `${activeAds.length} active`, bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' };
  if (usage.length > 0) return { key: 'used', label: 'Used', bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-400' };
  return { key: 'unused', label: 'New Material', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' };
};

const AssetCard = ({ asset, isVideo, selected, onSelect, onPreview, onDelete, viewMode, usage = [] }) => {
  const usageStatus = getUsageStatus(usage);
  const thumbnail = isVideo ? asset.picture : (asset.url || asset.url_128);
  const name = isVideo ? (asset.title || `Video ${asset.id}`) : (asset.name || `Image ${asset.hash}`);
  const meta = isVideo
    ? `${fmtDuration(asset.length)}${asset.three_second_views ? ` · ${Number(asset.three_second_views).toLocaleString()} views` : ''}`
    : fmtSize(asset.width, asset.height);

  if (viewMode === 'list') {
    return (
      <tr className={`border-b border-slate-100 hover:bg-orange-50/30 transition-colors ${selected ? 'bg-gradient-to-r from-orange-50/80 to-amber-50/40 border-l-2 border-l-orange-500' : ''}`}>
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
          <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${usageStatus.bg} ${usageStatus.text} ${usageStatus.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${usageStatus.dot}`} />{usageStatus.label}
          </span>
        </td>
        <td className="py-2.5 px-3">
          <button onClick={() => onDelete(asset)} className="text-slate-300 hover:text-red-500 transition-colors">
            <Trash2 size={14} />
          </button>
        </td>
      </tr>
    );
  }

  return (
    <div className={`group relative bg-white/80 backdrop-blur-sm rounded-xl border overflow-hidden transition-all hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 hover:border-orange-200/60 ${selected ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
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
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[9px] text-slate-300 flex items-center gap-1">
            <Clock size={9} /> {fmtDate(asset.created_time)}
          </p>
          <span className={`inline-flex items-center gap-1 text-[8px] font-bold px-1.5 py-0.5 rounded-full border whitespace-nowrap ${usageStatus.bg} ${usageStatus.text} ${usageStatus.border}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${usageStatus.dot}`} />{usageStatus.label}
          </span>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──
// ── Create Set Modal (inline) ──
const CreateSetModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try { await onSave({ name: name.trim(), description: description.trim() }); } catch {} finally { setSaving(false); }
  };
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="relative flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
          <h3 className="relative text-sm font-bold text-white">New Folder</h3>
          <button onClick={onClose} className="relative w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"><X size={15} /></button>
        </div>
        <div className="px-5 py-4 space-y-3 bg-white/95 backdrop-blur-xl">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Sale Creatives" onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full text-sm text-slate-700 border border-slate-200/80 rounded-xl px-3 py-2 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-300" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What are these materials for?"
              className="w-full text-sm text-slate-700 border border-slate-200/80 rounded-xl px-3 py-2 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-300" />
          </div>
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 rounded-lg font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-40 transition-all">
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Browse Creatives for Set Modal ──
const BrowseForSetModal = ({ adAccountId, existingIds, onClose, onAdd }) => {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  useEffect(() => {
    if (!adAccountId) return;
    setLoading(true);
    api.get('/creatives', { params: { adAccountId, limit: 50 } })
      .then(({ data }) => setCreatives(data?.data || data || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, [adAccountId]);
  const existingSet = new Set(existingIds || []);
  const filtered = creatives.filter(c => !search || (c.name || c.title || '').toLowerCase().includes(search.toLowerCase()));
  const handleAdd = () => {
    const items = creatives.filter(c => selected.has(c.id)).map(c => ({
      creative_id: c.id, image_hash: c.image_hash || '', image_url: c.image_url || c.thumbnail_url || '',
      video_id: c.video_id || '', thumbnail: c.thumbnail_url || c.image_url || '',
      name: c.name || c.title || `Creative ${c.id}`, type: c.video_id ? 'video' : 'image',
    }));
    onAdd(items);
  };
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[600px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="relative flex items-center justify-between px-5 py-3 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
          <h3 className="relative text-sm font-bold text-white">Browse Creatives</h3>
          <button onClick={onClose} className="relative w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white"><X size={15} /></button>
        </div>
        <div className="px-5 py-2 border-b border-slate-100 shrink-0 bg-white/95 backdrop-blur-xl">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400/60" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 placeholder:text-slate-300" />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 bg-white/95 backdrop-blur-xl">
          {loading ? <div className="flex items-center justify-center py-16"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          : filtered.length === 0 ? <p className="text-center text-sm text-slate-400 py-16">No creatives found</p>
          : (
            <div className="grid grid-cols-4 gap-2">
              {filtered.map(c => {
                const thumb = c.thumbnail_url || c.image_url || '';
                const alreadyAdded = existingSet.has(c.id);
                const isSel = selected.has(c.id);
                return (
                  <button key={c.id} onClick={() => !alreadyAdded && setSelected(prev => { const n = new Set(prev); n.has(c.id) ? n.delete(c.id) : n.add(c.id); return n; })} disabled={alreadyAdded}
                    className={`relative rounded-lg border overflow-hidden text-left transition-all ${alreadyAdded ? 'opacity-40 cursor-not-allowed border-slate-200' : isSel ? 'border-blue-500 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}>
                    <div className="aspect-square bg-slate-100 flex items-center justify-center">
                      {thumb ? <img src={thumb} alt="" className="w-full h-full object-cover" /> : <ImageIcon size={20} className="text-slate-300" />}
                    </div>
                    {isSel && <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center"><Check size={9} className="text-white" /></div>}
                    {alreadyAdded && <div className="absolute top-1.5 right-1.5 text-[7px] font-bold bg-slate-500 text-white px-1 rounded">Added</div>}
                    <p className="text-[9px] text-slate-600 truncate px-1.5 py-1">{c.name || c.title || `Creative ${c.id}`}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">{selected.size} selected</span>
          <button onClick={handleAdd} disabled={selected.size === 0}
            className="px-4 py-1.5 text-[11px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 rounded-lg font-semibold shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 disabled:opacity-40 transition-all">
            Add Selected
          </button>
        </div>
      </div>
    </>
  );
};

export const CreativeLibrary = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onBack, onSendToChat, onPrefillChat }) => {
  const [showAskAI, setShowAskAI] = useState(false);
  // Creative Sets
  const { sets, loading: setsLoading, fetchSets, createSet, updateSet, deleteSet, addItems: addSetItems, removeItem: removeSetItem } = useCreativeSets(adAccountId);
  const [selectedSet, setSelectedSet] = useState(null);
  const [showCreateSet, setShowCreateSet] = useState(false);
  const [showBrowseForSet, setShowBrowseForSet] = useState(false);
  const [addToSetOpen, setAddToSetOpen] = useState(false);
  const [setUploading, setSetUploading] = useState(false);
  const setFileRef = useRef(null);
  // Folder features
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const renameRef = useRef(null);
  const [folderSelectedItems, setFolderSelectedItems] = useState(new Set()); // indices selected in folder view
  const [showMoveToFolder, setShowMoveToFolder] = useState(false);
  const [dragItem, setDragItem] = useState(null); // { fromSetId, itemIndex, item }
  const [dragOverFolderId, setDragOverFolderId] = useState(null);

  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'images' | 'videos' (applies to right panel)
  const [usageFilter, setUsageFilter] = useState('all'); // 'all' | 'active' | 'unused' | 'used'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [previewAsset, setPreviewAsset] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // asset pending delete confirmation
  const [deleteError, setDeleteError] = useState(null);
  const [datePreset, setDatePreset] = useState('maximum');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Asset usage data: which assets are used in which ads
  const [usageData, setUsageData] = useState({ imageUsage: {}, videoUsage: {} });

  const fetchAssets = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const [imgRes, vidRes, usageRes] = await Promise.all([
        api.get('/assets/images', { params: { adAccountId } }),
        api.get('/assets/videos', { params: { adAccountId } }),
        api.get('/assets/usage', { params: { adAccountId } }).catch(() => ({ data: { imageUsage: {}, videoUsage: {} } })),
      ]);
      setImages((imgRes.data || []).map(img => ({ ...img, _type: 'image' })));
      setVideos((vidRes.data || []).map(vid => ({ ...vid, _type: 'video' })));
      setUsageData(usageRes.data || { imageUsage: {}, videoUsage: {} });
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // Helper: get usage info for an asset
  const getAssetUsage = useCallback((asset) => {
    if (asset._type === 'video') return usageData.videoUsage?.[asset.id] || [];
    return usageData.imageUsage?.[asset.hash] || [];
  }, [usageData]);

  // Reset visible count when filter/search changes

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
    // Usage filter
    if (usageFilter !== 'all') {
      list = list.filter(a => {
        const u = a._type === 'video' ? (usageData.videoUsage?.[a.id] || []) : (usageData.imageUsage?.[a.hash] || []);
        const status = getUsageStatus(u).key;
        return status === usageFilter;
      });
    }
    list.sort((a, b) => new Date(b.created_time || 0) - new Date(a.created_time || 0));
    return list;
  }, [images, videos, filter, search, datePreset, customDateFrom, customDateTo, usageFilter, usageData]);



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

  // ── Folder rename ──
  const startRename = (set) => {
    setRenamingFolderId(set.id);
    setRenameValue(set.name);
    setTimeout(() => renameRef.current?.focus(), 50);
  };
  const commitRename = async () => {
    if (renamingFolderId && renameValue.trim()) {
      await updateSet(renamingFolderId, { name: renameValue.trim() });
    }
    setRenamingFolderId(null);
  };

  // ── Folder bulk operations ──
  const toggleFolderItem = (idx) => {
    setFolderSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };
  const clearFolderSelection = () => setFolderSelectedItems(new Set());

  const handleBulkRemoveFromFolder = async () => {
    if (!selectedSet || folderSelectedItems.size === 0) return;
    // Remove from highest index first to avoid shifting
    const indices = [...folderSelectedItems].sort((a, b) => b - a);
    for (const idx of indices) {
      await removeSetItem(selectedSet.id, idx);
    }
    clearFolderSelection();
  };

  const handleMoveToFolder = async (targetSetId) => {
    if (!selectedSet || folderSelectedItems.size === 0) return;
    const currentSet = sets.find(s => s.id === selectedSet.id) || selectedSet;
    const currentItems = currentSet.items || [];
    const itemsToMove = [...folderSelectedItems].map(idx => currentItems[idx]).filter(Boolean);
    // Add to target folder
    await addSetItems(targetSetId, itemsToMove);
    // Remove from current (highest index first)
    const indices = [...folderSelectedItems].sort((a, b) => b - a);
    for (const idx of indices) {
      await removeSetItem(selectedSet.id, idx);
    }
    clearFolderSelection();
    setShowMoveToFolder(false);
  };

  // ── Drag and drop ──
  const handleDragStart = (fromSetId, itemIndex, item) => {
    setDragItem({ fromSetId, itemIndex, item });
  };
  const handleDragOver = (e, folderId) => {
    e.preventDefault();
    setDragOverFolderId(folderId);
  };
  const handleDragLeave = () => setDragOverFolderId(null);
  const handleDrop = async (e, targetSetId) => {
    e.preventDefault();
    setDragOverFolderId(null);
    if (!dragItem || dragItem.fromSetId === targetSetId) { setDragItem(null); return; }
    // Add to target, remove from source
    await addSetItems(targetSetId, [dragItem.item]);
    await removeSetItem(dragItem.fromSetId, dragItem.itemIndex);
    setDragItem(null);
  };

  const imageCount = images.length;
  const videoCount = videos.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">
                Creative Hub
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${imageCount} images · ${videoCount} videos · showing ${allAssets.length}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
              <PlatformAccountSelector platform="meta"
                token={token} onLoginMeta={onLogin} onLogoutMeta={onLogout}
                selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectMetaAccount={onSelectAccount}
                variant="header" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onPrefillChat?.('I want to upload new creative assets for my ad campaigns. Help me manage my images and videos.')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50">
              <Sparkles size={13} /> Create with AI
            </button>
            <button onClick={fetchAssets} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
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
          {sets.length > 0 && !selectedSet && (
            <div className="relative">
              <button onClick={() => setAddToSetOpen(!addToSetOpen)}
                className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <Layers size={12} /> Add to Folder
              </button>
              {addToSetOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setAddToSetOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-40 py-1">
                    {sets.map(s => (
                      <button key={s.id} onClick={async () => {
                        const items = allAssets.filter(a => selectedIds.has(a.id || a.hash)).map(a => ({
                          creative_id: a.id || '',
                          image_hash: a.hash || '',
                          image_url: a.url || a.url_128 || '',
                          video_id: a._type === 'video' ? a.id : '',
                          thumbnail: a._type === 'video' ? a.picture : (a.url || a.url_128 || ''),
                          name: a.name || a.title || 'Untitled',
                          type: a._type || 'image',
                        }));
                        await addSetItems(s.id, items);
                        setAddToSetOpen(false);
                        setSelectedIds(new Set());
                      }}
                        className="w-full text-left px-3 py-2 text-[11px] font-medium text-slate-700 hover:bg-blue-50 truncate">
                        {s.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Hidden file input for folder uploads */}
      <input ref={setFileRef} type="file" accept="image/*,video/*" multiple onChange={async (e) => {
        if (!selectedSet || !adAccountId) return;
        const files = Array.from(e.target.files || []);
        setSetUploading(true);
        try {
          for (const file of files) {
            const reader = new FileReader();
            const base64 = await new Promise((resolve) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file); });
            const isVideo = file.type.startsWith('video/');
            let item;
            if (isVideo) {
              const { data } = await api.post('/assets/videos', { adAccountId, bytes: base64, name: file.name });
              item = { video_id: data?.id || '', thumbnail: '', name: file.name, type: 'video' };
            } else {
              const { data } = await api.post('/assets/images', { adAccountId, bytes: base64, name: file.name });
              const img = data?.images ? Object.values(data.images)[0] : data;
              item = { image_hash: img?.hash || '', image_url: img?.url || '', name: file.name, type: 'image' };
            }
            await addSetItems(selectedSet.id, [item]);
          }
        } catch (err) { console.error('Upload failed:', err); }
        finally { setSetUploading(false); e.target.value = ''; }
      }} className="hidden" />

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Main layout: folder sidebar + content panel */}
      <div className="flex-1 flex min-h-0">

        {/* ── Left: Folder sidebar ── */}
        <div className="w-[240px] shrink-0 border-r border-slate-200 flex flex-col bg-white">
          <div className="p-3 border-b border-slate-100">
            <button onClick={() => setShowCreateSet(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors">
              <Plus size={12} /> New Folder
            </button>
          </div>
          {/* All Assets button */}
          <button onClick={() => setSelectedSet(null)}
            className={`flex items-center gap-2.5 px-3 py-2.5 text-left border-b border-slate-100 transition-colors ${
              !selectedSet ? 'bg-orange-50 border-l-2 border-l-orange-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'
            }`}>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <Layers size={14} className="text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-slate-800">All Assets</p>
              <p className="text-[9px] text-slate-400">{images.length + videos.length} items</p>
            </div>
          </button>
          {/* Folder list */}
          <div className="flex-1 overflow-auto">
            {setsLoading && sets.length === 0 ? (
              <div className="flex items-center justify-center py-12"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
            ) : sets.length === 0 ? (
              <div className="px-3 py-4">
                <div className="rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/50 p-3">
                  <p className="text-[11px] font-semibold text-slate-700 mb-1">Organize your creatives</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">Create folders to group assets by campaign, theme, or format. Drag and drop assets to sort them.</p>
                </div>
              </div>
            ) : (
              sets.map(set => {
                const items = set.items || [];
                const thumbs = items.slice(0, 4).map(i => i.image_url || i.thumbnail).filter(Boolean);
                const isRenaming = renamingFolderId === set.id;
                const isDragOver = dragOverFolderId === set.id;
                return (
                  <div key={set.id}
                    onDragOver={(e) => handleDragOver(e, set.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, set.id)}
                    onClick={() => { if (!isRenaming) { setSelectedSet(set); clearFolderSelection(); } }}
                    onDoubleClick={() => startRename(set)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left border-b border-slate-100 transition-all cursor-pointer ${
                      isDragOver ? 'bg-orange-100 border-l-2 border-l-orange-500' :
                      selectedSet?.id === set.id ? 'bg-orange-50 border-l-2 border-l-orange-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'
                    }`}>
                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden grid grid-cols-2 shrink-0">
                      {thumbs.length > 0 ? thumbs.map((t, ti) => (
                        <img key={ti} src={t} alt="" className="w-full h-full object-cover" />
                      )) : (
                        <div className="col-span-2 row-span-2 flex items-center justify-center"><Layers size={10} className="text-slate-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <input ref={renameRef} value={renameValue} onChange={e => setRenameValue(e.target.value)}
                          onBlur={commitRename} onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenamingFolderId(null); }}
                          onClick={e => e.stopPropagation()}
                          className="text-[11px] font-semibold text-slate-800 w-full bg-white border border-orange-300 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-orange-300" />
                      ) : (
                        <p className="text-[11px] font-semibold text-slate-800 truncate">{set.name}</p>
                      )}
                      <p className="text-[9px] text-slate-400 truncate">
                        {items.length} item{items.length !== 1 ? 's' : ''}
                        {set.description ? ` · ${set.description}` : ''}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right: Content panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Filter bar */}
          <div className="px-4 py-2.5 flex items-center gap-2 shrink-0 border-b border-slate-100 bg-white/80">
            {selectedSet ? (() => {
              const cs = sets.find(s => s.id === selectedSet.id) || selectedSet;
              return folderSelectedItems.size > 0 ? (
                /* Bulk selection bar */
                <>
                  <span className="text-[11px] font-semibold text-slate-700">{folderSelectedItems.size} selected</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <div className="relative">
                      <button onClick={() => setShowMoveToFolder(!showMoveToFolder)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-slate-600 border border-slate-200 hover:border-slate-300 transition-colors">
                        <Layers size={10} /> Move to...
                      </button>
                      {showMoveToFolder && (
                        <>
                          <div className="fixed inset-0 z-20" onClick={() => setShowMoveToFolder(false)} />
                          <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-slate-200 z-30 py-1">
                            {sets.filter(s => s.id !== selectedSet.id).map(s => (
                              <button key={s.id} onClick={() => handleMoveToFolder(s.id)}
                                className="w-full text-left px-3 py-2 text-[11px] text-slate-700 hover:bg-slate-50 truncate">
                                {s.name}
                              </button>
                            ))}
                            {sets.filter(s => s.id !== selectedSet.id).length === 0 && (
                              <p className="px-3 py-2 text-[10px] text-slate-400">No other folders</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <button onClick={handleBulkRemoveFromFolder}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors">
                      <Trash2 size={10} /> Remove
                    </button>
                    <button onClick={clearFolderSelection}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </>
              ) : (
                /* Normal folder header */
                <>
                  <h2 className="text-[13px] font-bold text-slate-800 mr-1">{cs.name}</h2>
                  <button onClick={() => startRename(cs)} title="Rename folder"
                    className="w-6 h-6 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-colors">
                    <Edit3 size={10} />
                  </button>
                  <span className="text-[10px] text-slate-400 tabular-nums">{(cs.items || []).length} items</span>
                  <div className="ml-auto flex items-center gap-1.5">
                    <button onClick={() => setShowBrowseForSet(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-slate-600 border border-slate-200 hover:border-slate-300 transition-colors">
                      <Search size={10} /> Browse
                    </button>
                    <button onClick={() => setFileRef.current?.click()} disabled={setUploading}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors disabled:opacity-50">
                      {setUploading ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />} Upload
                    </button>
                    <button onClick={() => { if (confirm('Delete this folder and its contents?')) { deleteSet(selectedSet.id); setSelectedSet(null); } }}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                      <Trash2 size={12} />
                    </button>
                  </div>
                </>
              );
            })() : (
              <>
                <div className="relative flex-1 max-w-xs">
                  <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..."
                    className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-300 focus:border-slate-300 focus:bg-white transition-all" />
                </div>
                <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden">
                  {[['all', 'All'], ['images', 'Images'], ['videos', 'Videos']].map(([val, label]) => (
                    <button key={val} onClick={() => setFilter(val)}
                      className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${filter === val ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden">
                  {[['all', 'All'], ['active', 'Active'], ['unused', 'New Materials'], ['used', 'Used Before']].map(([val, label]) => (
                    <button key={val} onClick={() => setUsageFilter(val)}
                      className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${usageFilter === val ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <select value={datePreset} onChange={e => {
                    const v = e.target.value;
                    if (v === 'custom') { setShowDatePicker(true); setDatePreset('custom'); }
                    else { setDatePreset(v); setShowDatePicker(false); }
                  }}
                    className="px-2 py-1.5 rounded-md border border-slate-200 bg-white text-[10px] font-medium text-slate-600 focus:outline-none focus:ring-1 focus:ring-slate-300">
                    <option value="last_7d">Last 7 Days</option>
                    <option value="last_14d">Last 14 Days</option>
                    <option value="last_30d">Last 30 Days</option>
                    <option value="this_month">This Month</option>
                    <option value="last_month">Last Month</option>
                    <option value="maximum">Lifetime</option>
                    <option value="custom">{customDateFrom && customDateTo ? `${customDateFrom} – ${customDateTo}` : 'Custom Range'}</option>
                  </select>
                  {showDatePicker && (
                    <div className="absolute top-full right-0 mt-1 z-30 bg-white rounded-lg shadow-lg border border-slate-200 p-3 w-56" onClick={e => e.stopPropagation()}>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Date Range</p>
                      <div className="space-y-2">
                        <div><label className="text-[9px] text-slate-500 font-medium">From</label>
                          <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)} className="w-full mt-0.5 px-2 py-1 rounded-md border border-slate-200 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300" /></div>
                        <div><label className="text-[9px] text-slate-500 font-medium">To</label>
                          <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)} className="w-full mt-0.5 px-2 py-1 rounded-md border border-slate-200 text-[10px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300" /></div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button onClick={() => setShowDatePicker(false)} className="px-2 py-1 text-[10px] text-slate-500 hover:bg-slate-50 rounded-md">Cancel</button>
                        <button onClick={() => setShowDatePicker(false)} disabled={!customDateFrom || !customDateTo}
                          className="px-2 py-1 text-[10px] text-white bg-slate-900 hover:bg-slate-800 rounded-md font-medium disabled:opacity-50">Apply</button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden ml-auto">
                  <button onClick={() => setViewMode('grid')}
                    className={`px-2 py-1.5 transition-colors ${viewMode === 'grid' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <Grid size={12} />
                  </button>
                  <button onClick={() => setViewMode('list')}
                    className={`px-2 py-1.5 transition-colors ${viewMode === 'list' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}>
                    <List size={12} />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-auto p-4">
            {selectedSet ? (() => {
              /* ── Folder contents ── */
              const currentSet = sets.find(s => s.id === selectedSet.id) || selectedSet;
              const setItems = currentSet.items || [];
              return setItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <Upload size={22} className="text-slate-300" />
                  </div>
                  <p className="text-[12px] font-medium text-slate-500 mb-1">This folder is empty</p>
                  <p className="text-[10px] text-slate-400 mb-3">Upload creatives or browse existing assets</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setFileRef.current?.click()}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-slate-900 hover:bg-slate-800 transition-colors">
                      <Upload size={10} /> Upload Files
                    </button>
                    <button onClick={() => setShowBrowseForSet(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium text-slate-600 border border-slate-200 hover:border-slate-300 transition-colors">
                      <Search size={10} /> Browse Assets
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {setItems.map((item, idx) => {
                    const isItemSelected = folderSelectedItems.has(idx);
                    return (
                      <div key={idx} draggable
                        onDragStart={() => handleDragStart(currentSet.id, idx, item)}
                        onDragEnd={() => setDragItem(null)}
                        className={`bg-white rounded-lg border overflow-hidden group hover:shadow-md transition-all relative cursor-grab active:cursor-grabbing ${
                          isItemSelected ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200 hover:border-slate-300'
                        }`}>
                        {/* Select checkbox */}
                        <div className={`absolute top-1.5 right-1.5 z-10 ${isItemSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                          <button onClick={(e) => { e.stopPropagation(); toggleFolderItem(idx); }}
                            className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isItemSelected ? 'bg-orange-500 text-white' : 'bg-black/40 text-white hover:bg-black/60'
                            }`}>
                            {isItemSelected && <Check size={10} />}
                          </button>
                        </div>
                        <div className="aspect-square bg-slate-50 flex items-center justify-center" onClick={() => toggleFolderItem(idx)}>
                          {(item.image_url || item.thumbnail) ? (
                            <img src={item.image_url || item.thumbnail} alt="" className="w-full h-full object-cover" draggable={false} />
                          ) : item.type === 'video' ? <Film size={24} className="text-slate-300" /> : <ImageIcon size={24} className="text-slate-300" />}
                        </div>
                        <div className={`absolute top-1.5 left-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                          item.type === 'video' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {item.type === 'video' ? <><Film size={8} /> Video</> : <><ImageIcon size={8} /> Image</>}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-[10px] font-medium text-slate-700 truncate">{item.name || 'Untitled'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })() : (
              /* ── All Assets view ── */
              !token || !adAccountId ? (
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
                  <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                    <ImageIcon size={24} className="text-slate-300" />
                  </div>
                  <p className="text-[12px] font-medium text-slate-500 mb-1">No assets found</p>
                  <p className="text-[10px] text-slate-400">Upload images or videos in the chat to see them here.</p>
                </div>
              ) : viewMode === 'grid' ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {allAssets.map(asset => (
                      <AssetCard key={asset.id || asset.hash} asset={asset} isVideo={asset._type === 'video'}
                        selected={selectedIds.has(asset.id || asset.hash)} onSelect={toggleSelect}
                        onPreview={setPreviewAsset} onDelete={handleDelete} viewMode="grid"
                        usage={getAssetUsage(asset)} />
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="bg-white rounded-lg border border-slate-200 overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="py-2 px-3 w-10">
                            <input type="checkbox" checked={selectedIds.size === allAssets.length && allAssets.length > 0}
                              onChange={toggleSelectAll}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                          </th>
                          <th className="py-2 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Asset</th>
                          <th className="py-2 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                          <th className="py-2 px-3 text-left text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                          <th className="py-2 px-3 w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {allAssets.map(asset => (
                          <AssetCard key={asset.id || asset.hash} asset={asset} isVideo={asset._type === 'video'}
                            selected={selectedIds.has(asset.id || asset.hash)} onSelect={toggleSelect}
                            onPreview={setPreviewAsset} onDelete={handleDelete} viewMode="list"
                            usage={getAssetUsage(asset)} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Browse Creatives Modal for Folders */}
      {showBrowseForSet && selectedSet && (
        <BrowseForSetModal
          adAccountId={adAccountId}
          existingIds={(selectedSet.items || []).map(i => i.creative_id).filter(Boolean)}
          onClose={() => setShowBrowseForSet(false)}
          onAdd={async (items) => { await addSetItems(selectedSet.id, items); setShowBrowseForSet(false); }}
        />
      )}

      {/* Create Folder Modal */}
      {showCreateSet && (
        <CreateSetModal onClose={() => setShowCreateSet(false)} onSave={async ({ name, description }) => {
          const newSet = await createSet({ name, description });
          setSelectedSet(newSet);
          setShowCreateSet(false);
        }} />
      )}

      {/* Preview modal */}
      {previewAsset && <PreviewModal asset={previewAsset} onClose={() => setPreviewAsset(null)} />}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={() => setDeleteTarget(null)} />
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-[fadeSlideUp_0.3s_ease-out]">
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

    </div>
  );
};
