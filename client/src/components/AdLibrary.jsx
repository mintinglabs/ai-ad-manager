import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Loader2, X, Grid, List, Palette, Eye, Play, ChevronDown } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

// ── Helpers ──
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtCta = (cta) => cta ? cta.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '';

const AD_FORMATS = [
  { value: 'DESKTOP_FEED_STANDARD', label: 'Desktop Feed' },
  { value: 'MOBILE_FEED_STANDARD', label: 'Mobile Feed' },
  { value: 'INSTAGRAM_STANDARD', label: 'Instagram Feed' },
  { value: 'RIGHT_COLUMN_STANDARD', label: 'Right Column' },
];

// ── Status badge ──
const StatusBadge = ({ status }) => {
  const s = (status || '').toUpperCase();
  if (s === 'ACTIVE') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
    </span>
  );
  if (s === 'PAUSED') return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Paused
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> {status || 'Unknown'}
    </span>
  );
};

// ── Preview modal ──
const AdPreviewModal = ({ creative, onClose }) => {
  const [format, setFormat] = useState('DESKTOP_FEED_STANDARD');
  const [previewHtml, setPreviewHtml] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchPreview = useCallback(async (fmt) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/creatives/${creative.id}/previews`, { params: { ad_format: fmt } });
      const html = res.data?.[0]?.body || res.data?.body || '';
      setPreviewHtml(html);
    } catch (err) {
      setError(err.response?.data?.error || 'Preview unavailable');
      setPreviewHtml(null);
    } finally {
      setLoading(false);
    }
  }, [creative.id]);

  useEffect(() => { fetchPreview(format); }, [fetchPreview, format]);

  // Extract iframe src from Meta's HTML
  const iframeSrc = useMemo(() => {
    if (!previewHtml) return null;
    const match = previewHtml.match(/src="([^"]+)"/);
    return match ? match[1].replace(/&amp;/g, '&') : null;
  }, [previewHtml]);

  const isMobile = format === 'MOBILE_FEED_STANDARD' || format === 'INSTAGRAM_STANDARD';

  return (
    <>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed inset-8 z-50 flex items-center justify-center">
        <div className="relative bg-white rounded-2xl shadow-2xl overflow-hidden max-w-3xl w-full max-h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-slate-800 truncate max-w-md">{creative.name || 'Untitled Creative'}</h3>
              <div className="flex items-center gap-2 mt-1">
                <StatusBadge status={creative.status} />
                {creative.call_to_action_type && (
                  <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
                    {fmtCta(creative.call_to_action_type)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <select
                value={format}
                onChange={e => setFormat(e.target.value)}
                className="text-[11px] font-medium px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                {AD_FORMATS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Preview */}
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
              <div className={`${isMobile ? 'w-[320px]' : 'w-full max-w-[520px]'}`}>
                <iframe
                  src={iframeSrc}
                  className="w-full border-0 rounded-lg bg-white shadow-sm"
                  style={{ height: isMobile ? '560px' : '400px' }}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            ) : (
              <div className="text-center">
                <Eye size={32} className="text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Preview unavailable</p>
              </div>
            )}
          </div>

          {/* Creative details */}
          {(creative.body || creative.title) && (
            <div className="px-5 py-3 border-t border-slate-100 bg-white">
              {creative.title && (
                <p className="text-[12px] font-semibold text-slate-700">{creative.title}</p>
              )}
              {creative.body && (
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-3 whitespace-pre-line">{creative.body}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Creative card (grid) ──
const CreativeCard = ({ creative, onClick }) => {
  const thumbnail = creative.thumbnail_url || creative.image_url;
  const hasVideo = !!creative.video_id;

  return (
    <div
      onClick={() => onClick(creative)}
      className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden transition-all hover:shadow-md cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-slate-50 flex items-center justify-center relative overflow-hidden">
        {thumbnail ? (
          <img src={thumbnail} alt={creative.name} className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1 text-slate-300">
            <Palette size={28} />
          </div>
        )}
        {hasVideo && (
          <span className="absolute bottom-2 right-2 bg-black/70 text-white rounded-full w-7 h-7 flex items-center justify-center">
            <Play size={12} fill="white" />
          </span>
        )}
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <Eye size={20} className="text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
      </div>

      {/* Info */}
      <div className="px-3 py-2.5">
        <p className="text-[11px] font-medium text-slate-700 truncate">{creative.name || 'Untitled'}</p>
        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
          <StatusBadge status={creative.status} />
          {creative.call_to_action_type && (
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-600">
              {fmtCta(creative.call_to_action_type)}
            </span>
          )}
        </div>
        {creative.body && (
          <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2">{creative.body}</p>
        )}
      </div>
    </div>
  );
};

// ── Creative row (list) ──
const CreativeRow = ({ creative, onClick }) => {
  const thumbnail = creative.thumbnail_url || creative.image_url;

  return (
    <tr onClick={() => onClick(creative)} className="border-b border-slate-100 hover:bg-orange-50/30 transition-colors cursor-pointer">
      <td className="py-2.5 px-3">
        <div className="flex items-center gap-3">
          <div className="shrink-0 relative">
            {thumbnail ? (
              <img src={thumbnail} alt="" className="w-14 h-8 rounded-lg object-cover border border-slate-200" />
            ) : (
              <div className="w-14 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                <Palette size={14} className="text-slate-400" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-slate-700 truncate max-w-[250px]">{creative.name || 'Untitled'}</p>
            {creative.body && <p className="text-[10px] text-slate-400 truncate max-w-[300px]">{creative.body}</p>}
          </div>
        </div>
      </td>
      <td className="py-2.5 px-3"><StatusBadge status={creative.status} /></td>
      <td className="py-2.5 px-3">
        {creative.call_to_action_type && (
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 text-orange-600">
            {fmtCta(creative.call_to_action_type)}
          </span>
        )}
      </td>
      <td className="py-2.5 px-3 text-[11px] text-slate-400">{fmtDate(creative.created_time)}</td>
    </tr>
  );
};

// ── Main Component ──
export const AdLibrary = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onBack }) => {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedCreative, setSelectedCreative] = useState(null);

  const fetchCreatives = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/creatives', { params: { adAccountId } });
      setCreatives(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchCreatives(); }, [fetchCreatives]);

  const filtered = useMemo(() => {
    let list = [...creatives];
    if (statusFilter !== 'all') {
      list = list.filter(c => (c.status || '').toUpperCase() === statusFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(c => (c.name || '').toLowerCase().includes(q) || (c.body || '').toLowerCase().includes(q));
    }
    return list;
  }, [creatives, statusFilter, search]);

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
                {loading ? 'Loading...' : `${filtered.length} creative${filtered.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchCreatives} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white border-b border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creatives..."
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
        ) : loading && filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading creatives...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Palette size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">No creatives found</p>
            <p className="text-xs text-slate-400">Create ads in the chat to see their creatives here.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map(c => (
              <CreativeCard key={c.id} creative={c} onClick={setSelectedCreative} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Creative</th>
                  <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">CTA</th>
                  <th className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <CreativeRow key={c.id} creative={c} onClick={setSelectedCreative} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {selectedCreative && <AdPreviewModal creative={selectedCreative} onClose={() => setSelectedCreative(null)} />}
    </div>
  );
};
