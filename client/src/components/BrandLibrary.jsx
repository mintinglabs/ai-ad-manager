import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, Plus, Loader2, X, FileText, Palette, MessageSquare, Sparkles, Globe, BookMarked, Trash2, ChevronDown, Edit3, Check, Upload, Link2, Users } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import { useBrandLibrary } from '../hooks/useBrandLibrary.js';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Type config ──
const ITEM_TYPES = {
  guidelines: { label: 'Guidelines', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: FileText },
  tone: { label: 'Tone', color: 'bg-violet-50 text-violet-600 border-violet-200', icon: MessageSquare },
  visual: { label: 'Visual', color: 'bg-pink-50 text-pink-600 border-pink-200', icon: Palette },
  content: { label: 'Content', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Sparkles },
  crawled: { label: 'Crawled', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: Globe },
};

const TypeBadge = ({ type }) => {
  const cfg = ITEM_TYPES[type] || ITEM_TYPES.guidelines;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
      <cfg.icon size={9} /> {cfg.label}
    </span>
  );
};

// ── Add Dropdown ──
const AddDropdown = ({ open, onClose, onSelect }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const options = [
    { id: 'write', icon: <FileText size={16} className="text-blue-500" />, label: 'Write Guidelines', desc: 'Type brand guidelines manually' },
    { id: 'upload', icon: <Upload size={16} className="text-emerald-500" />, label: 'Upload Document', desc: 'Upload PDF or TXT file' },
    { id: 'crawl-url', icon: <Globe size={16} className="text-amber-500" />, label: 'Crawl Website', desc: 'AI extracts brand info from URL' },
    { id: 'crawl-social', icon: <Users size={16} className="text-violet-500" />, label: 'Crawl Social Profile', desc: 'Analyze your Meta page posts' },
  ];
  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-1.5">
      {options.map(opt => (
        <button key={opt.id} onClick={() => { onSelect(opt.id); onClose(); }}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
          <div className="mt-0.5 shrink-0">{opt.icon}</div>
          <div>
            <p className="text-[13px] font-medium text-slate-800">{opt.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── Write/Edit Modal ──
const WriteModal = ({ item, onClose, onSave }) => {
  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState(item?.type || 'guidelines');
  const [content, setContent] = useState(item?.content || '');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, content: content.trim(), metadata: item?.metadata || {} });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <h3 className="text-sm font-bold text-white">{item?.id ? 'Edit Item' : 'Add Brand Guidelines'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. TopGlow Brand Voice"
              className="w-full text-sm text-slate-700 border border-slate-200/80 rounded-xl px-3 py-2.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Type</label>
            <div className="flex gap-2">
              {Object.entries(ITEM_TYPES).filter(([k]) => k !== 'crawled').map(([key, cfg]) => (
                <button key={key} onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                    ${type === key ? `${cfg.color} border-current` : 'text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                  <cfg.icon size={12} /> {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste or type your brand guidelines, tone of voice, key messages..."
              className="w-full h-[240px] text-[12px] text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-none font-mono" />
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}
            className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 transition-all">
            {saving ? 'Saving...' : item?.id ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Crawl URL Modal ──
const CrawlUrlModal = ({ onClose, onSave, crawlUrl }) => {
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCrawl = async () => {
    if (!url.trim()) return;
    setCrawling(true);
    setError(null);
    try {
      const data = await crawlUrl(url.trim());
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCrawling(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await onSave({ name: result.name, type: 'crawled', content: result.content, metadata: result.metadata || { source_url: url } });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Crawl Website</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourbrand.com/about"
              onKeyDown={e => e.key === 'Enter' && handleCrawl()}
              className="flex-1 text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 placeholder:text-slate-300" />
            <button onClick={handleCrawl} disabled={!url.trim() || crawling}
              className="px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-40 shrink-0">
              {crawling ? <Loader2 size={14} className="animate-spin" /> : 'Crawl'}
            </button>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
          {result && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span className="text-[12px] text-emerald-700 font-medium">AI extracted brand info from {url}</span>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Brand Name</label>
                <p className="text-sm font-semibold text-slate-800">{result.name}</p>
              </div>
              {result.description && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Summary</label>
                  <p className="text-[12px] text-slate-600">{result.description}</p>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Extracted Content</label>
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-h-[200px] overflow-auto whitespace-pre-wrap leading-relaxed">
                  {result.content}
                </div>
              </div>
              {result.metadata?.colors?.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Colors Found</label>
                  <div className="flex gap-1.5">
                    {result.metadata.colors.map((c, i) => (
                      <div key={i} className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {result && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 transition-all">
              {saving ? 'Saving...' : 'Save to Brand Library'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Crawl Social Modal ──
const CrawlSocialModal = ({ onClose, onSave, crawlSocial, token }) => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/meta/pages').then(({ data }) => {
      setPages(data || []);
      if (data?.length) setSelectedPage(data[0]);
    }).catch(() => {}).finally(() => setLoadingPages(false));
  }, []);

  const handleCrawl = async () => {
    if (!selectedPage) return;
    setCrawling(true);
    setError(null);
    try {
      const data = await crawlSocial(selectedPage.id);
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setCrawling(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await onSave({ name: result.name, type: 'crawled', content: result.content, metadata: result.metadata || {} });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white">Crawl Social Profile</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loadingPages ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : pages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No connected pages found</p>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Select Page</label>
                <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300">
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button onClick={handleCrawl} disabled={!selectedPage || crawling}
                className="w-full py-2.5 rounded-lg text-[12px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-40">
                {crawling ? <><Loader2 size={13} className="inline animate-spin mr-1" /> Analyzing posts...</> : 'Analyze Page'}
              </button>
            </>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
          {result && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span className="text-[12px] text-emerald-700 font-medium">Brand analysis complete for {result.name}</span>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Extracted Content</label>
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-h-[200px] overflow-auto whitespace-pre-wrap leading-relaxed">
                  {result.content}
                </div>
              </div>
            </div>
          )}
        </div>
        {result && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 transition-all">
              {saving ? 'Saving...' : 'Save to Brand Library'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Item Detail Panel ──
const ItemDetailPanel = ({ item, onClose, onUpdate, onDelete, onToggle }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setContent(item.content || ''); setEditing(false); }, [item.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, { content });
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  const cfg = ITEM_TYPES[item.type] || ITEM_TYPES.guidelines;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-bold text-slate-800">{item.name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <TypeBadge type={item.type} />
            <span className="text-[11px] text-slate-400">{fmtDate(item.created_at)}</span>
            {item.metadata?.source_url && (
              <a href={item.metadata.source_url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-blue-500 hover:underline truncate max-w-[200px]">
                {item.metadata.source_url}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggle(item.id, !item.enabled)}
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${item.enabled ? 'bg-orange-500' : 'bg-slate-200'}`}>
            <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${item.enabled ? 'translate-x-[18px]' : ''}`} />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Color swatches */}
      {item.metadata?.colors?.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 mb-4">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Brand Colors</h3>
          <div className="flex gap-2">
            {item.metadata.colors.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: c }} />
                <span className="text-[9px] font-mono text-slate-400">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Content</h3>
          <button onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-600">
            {editing ? (saving ? <><Loader2 size={10} className="animate-spin" /> Saving...</> : <><Check size={10} /> Save</>) : <><Edit3 size={10} /> Edit</>}
          </button>
        </div>
        <div className="p-4">
          {editing ? (
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="w-full h-[300px] text-[12px] text-slate-700 font-mono border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          ) : (
            <div className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">
              {item.content || <span className="text-slate-300 italic">No content</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──
export const BrandLibrary = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat }) => {
  const { items, loading, error, enabledCount, fetchItems, createItem, updateItem, deleteItem, toggleItem, crawlUrl, crawlSocial } = useBrandLibrary(adAccountId);
  const [showAskAI, setShowAskAI] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [showCrawlUrl, setShowCrawlUrl] = useState(false);
  const [showCrawlSocial, setShowCrawlSocial] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const fileRef = useRef(null);

  const filtered = items.filter(item => {
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleAddSelect = (type) => {
    switch (type) {
      case 'write': setShowWrite(true); break;
      case 'upload': fileRef.current?.click(); break;
      case 'crawl-url': setShowCrawlUrl(true); break;
      case 'crawl-social': setShowCrawlSocial(true); break;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) return;
      await createItem({
        name: file.name.replace(/\.(pdf|txt|md|doc|docx)$/i, ''),
        type: 'guidelines',
        content: text.slice(0, 50000),
        metadata: { source_file: file.name },
      });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand item?')) return;
    await deleteItem(id);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />

      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Brand Library
                {enabledCount > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {enabledCount} active in AI memory
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : 'Long-term brand memory for AI \u2014 auto-applied to all conversations'}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onPrefillChat?.('Help me set up my brand library — add brand voice, target audience, and key messaging guidelines.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50">
              <Sparkles size={13} /> Create with AI
            </button>
            <div className="relative">
              <button onClick={() => setAddOpen(!addOpen)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 transition-all shadow-lg shadow-orange-500/30">
                <Plus size={13} /> Add
              </button>
              <AddDropdown open={addOpen} onClose={() => setAddOpen(false)} onSelect={handleAddSelect} />
            </div>
            <button onClick={fetchItems} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 shrink-0 bg-white border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search brand items..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content — master-detail */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Item list */}
        <div className="w-[280px] shrink-0 border-r border-slate-200 overflow-auto bg-white/80 backdrop-blur-sm">
          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <BookMarked size={22} className="text-slate-300" />
              </div>
              <p className="text-[12px] font-semibold text-slate-700 mb-1">{search ? 'No matches' : 'No brand memory yet'}</p>
              <p className="text-[10px] text-slate-400 mb-3 text-center">Add brand knowledge so AI always stays on-brand in every conversation.</p>
            </div>
          ) : (
            filtered.map(item => (
              <div key={item.id}
                className={`flex items-center gap-3 px-4 py-3 border-b border-slate-100 transition-colors cursor-pointer
                  ${selectedItem?.id === item.id ? 'bg-orange-50/60 border-l-2 border-l-orange-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}>
                <div className="flex-1 min-w-0" onClick={() => setSelectedItem(item)}>
                  <p className={`text-[12px] font-semibold truncate ${item.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{item.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <TypeBadge type={item.type} />
                    {item.enabled
                      ? <span className="text-[9px] text-emerald-500 font-medium">In AI memory</span>
                      : <span className="text-[9px] text-slate-300">Disabled</span>
                    }
                  </div>
                </div>
                {/* Inline toggle */}
                <button onClick={(e) => { e.stopPropagation(); toggleItem(item.id, !item.enabled); }}
                  className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 shrink-0 ${item.enabled ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  <span className={`absolute top-[2px] left-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${item.enabled ? 'translate-x-[14px]' : ''}`} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Right: Detail panel or empty */}
        {selectedItem ? (
          <ItemDetailPanel
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onUpdate={async (id, updates) => { await updateItem(id, updates); setSelectedItem(prev => ({ ...prev, ...updates })); }}
            onDelete={handleDelete}
            onToggle={async (id, enabled) => { await toggleItem(id, enabled); setSelectedItem(prev => ({ ...prev, enabled })); }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
            <div className="text-center max-w-xs">
              <BookMarked size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-500 mb-1">Brand Long-Term Memory</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Everything you add here becomes permanent AI memory. Enabled items are automatically referenced in every chat conversation to keep content on-brand.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showWrite && <WriteModal onClose={() => setShowWrite(false)} onSave={createItem} />}
      {editingItem && <WriteModal item={editingItem} onClose={() => setEditingItem(null)} onSave={(data) => updateItem(editingItem.id, data)} />}
      {showCrawlUrl && <CrawlUrlModal onClose={() => setShowCrawlUrl(false)} onSave={createItem} crawlUrl={crawlUrl} />}
      {showCrawlSocial && <CrawlSocialModal onClose={() => setShowCrawlSocial(false)} onSave={createItem} crawlSocial={crawlSocial} token={token} />}
    </div>
  );
};
