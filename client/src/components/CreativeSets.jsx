import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, Plus, Loader2, X, Layers, Trash2, Edit3, Check, Upload, Image as ImageIcon, Film, Tag, Link2, ChevronDown } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import { useCreativeSets } from '../hooks/useCreativeSets.js';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Create Set Modal ──
const CreateSetModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), description: description.trim() });
      onClose();
    } catch {} finally { setSaving(false); }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">New Creative Set</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Set Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Q2 Product Launch Creatives"
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Description (optional)</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this set for?"
              className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || saving}
            className="px-5 py-2 text-[12px] text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold shadow-sm disabled:opacity-40 transition-colors">
            {saving ? 'Creating...' : 'Create Set'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Browse Existing Creatives Modal ──
const BrowseCreativesModal = ({ onClose, onAdd, adAccountId, existingIds }) => {
  const [creatives, setCreatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    if (!adAccountId) return;
    setLoading(true);
    api.get('/creatives', { params: { adAccountId, limit: 50 } })
      .then(({ data }) => setCreatives(data?.data || data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [adAccountId]);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const items = creatives
      .filter(c => selected.has(c.id))
      .map(c => ({
        creative_id: c.id,
        image_hash: c.image_hash || '',
        image_url: c.image_url || c.thumbnail_url || '',
        video_id: c.video_id || '',
        thumbnail: c.thumbnail_url || c.image_url || '',
        name: c.name || c.title || `Creative ${c.id}`,
        type: c.video_id ? 'video' : 'image',
      }));
    onAdd(items);
    onClose();
  };

  const existingSet = new Set(existingIds || []);
  const filtered = creatives.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      return (c.name || '').toLowerCase().includes(q) || (c.title || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[640px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Browse Existing Creatives</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="px-5 py-3 border-b border-slate-100 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search creatives..."
              className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300" />
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-slate-400 py-16">No creatives found</p>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              {filtered.map(c => {
                const thumb = c.thumbnail_url || c.image_url || '';
                const isVideo = !!c.video_id;
                const alreadyAdded = existingSet.has(c.id);
                const isSelected = selected.has(c.id);
                return (
                  <button key={c.id} onClick={() => !alreadyAdded && toggleSelect(c.id)} disabled={alreadyAdded}
                    className={`relative rounded-xl border overflow-hidden text-left transition-all
                      ${alreadyAdded ? 'opacity-40 cursor-not-allowed border-slate-200' :
                        isSelected ? 'border-blue-500 ring-2 ring-blue-200 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
                    <div className="aspect-square bg-slate-100 flex items-center justify-center">
                      {thumb ? (
                        <img src={thumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        isVideo ? <Film size={24} className="text-slate-300" /> : <ImageIcon size={24} className="text-slate-300" />
                      )}
                    </div>
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check size={11} className="text-white" />
                      </div>
                    )}
                    {alreadyAdded && (
                      <div className="absolute top-2 right-2 text-[8px] font-bold bg-slate-500 text-white px-1.5 py-0.5 rounded">Added</div>
                    )}
                    {isVideo && (
                      <div className="absolute bottom-1 left-1 text-[8px] font-bold bg-black/60 text-white px-1 py-0.5 rounded flex items-center gap-0.5">
                        <Film size={8} /> Video
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600 truncate px-2 py-1.5">{c.name || c.title || `Creative ${c.id}`}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400">{selected.size} selected</span>
          <button onClick={handleAdd} disabled={selected.size === 0}
            className="px-5 py-2 text-[12px] text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold shadow-sm disabled:opacity-40 transition-colors">
            Add Selected
          </button>
        </div>
      </div>
    </>
  );
};

// ── Set Detail Panel ──
const SetDetailPanel = ({ set, onClose, onUpdate, onDelete, onAddItems, onRemoveItem, adAccountId }) => {
  const [showBrowse, setShowBrowse] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(set.name);
  const [description, setDescription] = useState(set.description || '');
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setName(set.name); setDescription(set.description || ''); setEditing(false); }, [set.id]);

  const items = set.items || [];
  const existingIds = items.map(i => i.creative_id).filter(Boolean);

  const handleSaveMeta = async () => {
    await onUpdate(set.id, { name, description });
    setEditing(false);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !adAccountId) return;
    setUploading(true);
    try {
      for (const file of files) {
        const reader = new FileReader();
        const base64 = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.readAsDataURL(file);
        });
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
        await onAddItems(set.id, [item]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50/50 p-6">
      <input ref={fileRef} type="file" accept="image/*,video/*" multiple onChange={handleUpload} className="hidden" />

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="space-y-2">
              <input value={name} onChange={e => setName(e.target.value)}
                className="text-[16px] font-bold text-slate-800 border border-slate-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description..."
                className="text-[12px] text-slate-500 border border-slate-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
              <div className="flex gap-2">
                <button onClick={handleSaveMeta} className="text-[11px] font-medium text-blue-600 hover:text-blue-700">Save</button>
                <button onClick={() => { setName(set.name); setDescription(set.description || ''); setEditing(false); }} className="text-[11px] text-slate-400">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-[16px] font-bold text-slate-800">{set.name}</h2>
              {set.description && <p className="text-[12px] text-slate-400 mt-0.5">{set.description}</p>}
              <div className="flex items-center gap-3 mt-1.5">
                <span className="text-[11px] text-slate-400">{items.length} creative{items.length !== 1 ? 's' : ''}</span>
                <span className="text-[11px] text-slate-300">{fmtDate(set.created_at)}</span>
                {set.tags?.length > 0 && set.tags.map((tag, i) => (
                  <span key={i} className="text-[9px] font-medium text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={() => setEditing(!editing)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors">
            <Edit3 size={14} />
          </button>
          <button onClick={() => { if (confirm('Delete this set?')) onDelete(set.id); }}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Add actions */}
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setShowBrowse(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors">
          <Search size={12} /> Browse Existing
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-medium text-slate-600 bg-white border border-slate-200 hover:border-emerald-300 hover:text-emerald-600 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} Upload New
        </button>
      </div>

      {/* Creative grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-slate-200">
          <Layers size={32} className="text-slate-200 mb-3" />
          <p className="text-sm text-slate-400 mb-1">No creatives in this set</p>
          <p className="text-[11px] text-slate-300">Browse existing creatives or upload new ones</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((item, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden group hover:shadow-md transition-all relative">
              <div className="aspect-square bg-slate-100 flex items-center justify-center">
                {(item.image_url || item.thumbnail) ? (
                  <img src={item.image_url || item.thumbnail} alt="" className="w-full h-full object-cover" />
                ) : item.type === 'video' ? (
                  <Film size={28} className="text-slate-300" />
                ) : (
                  <ImageIcon size={28} className="text-slate-300" />
                )}
              </div>
              {/* Type badge */}
              <div className={`absolute top-2 left-2 text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5
                ${item.type === 'video' ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'}`}>
                {item.type === 'video' ? <Film size={8} /> : <ImageIcon size={8} />}
                {item.type === 'video' ? 'Video' : 'Image'}
              </div>
              {/* Remove button */}
              <button onClick={() => onRemoveItem(set.id, idx)}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all">
                <X size={11} />
              </button>
              <div className="px-2.5 py-2">
                <p className="text-[11px] font-medium text-slate-700 truncate">{item.name || 'Untitled'}</p>
                <p className="text-[9px] text-slate-300 mt-0.5">{fmtDate(item.added_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Browse modal */}
      {showBrowse && (
        <BrowseCreativesModal
          adAccountId={adAccountId}
          existingIds={existingIds}
          onClose={() => setShowBrowse(false)}
          onAdd={(newItems) => onAddItems(set.id, newItems)}
        />
      )}
    </div>
  );
};

// ── Main Component ──
export const CreativeSets = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat }) => {
  const { sets, loading, error, fetchSets, createSet, updateSet, deleteSet, addItems, removeItem } = useCreativeSets(adAccountId);
  const [showAskAI, setShowAskAI] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedSet, setSelectedSet] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const filtered = sets.filter(s => {
    if (search && !s.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Keep selectedSet in sync with sets state
  useEffect(() => {
    if (selectedSet) {
      const updated = sets.find(s => s.id === selectedSet.id);
      if (updated) setSelectedSet(updated);
      else setSelectedSet(null);
    }
  }, [sets]);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers size={20} className="text-cyan-500" />
                Creative Sets
                {sets.length > 0 && (
                  <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full">{sets.length}</span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${sets.length} set${sets.length !== 1 ? 's' : ''}`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <AskAIButton onClick={() => setShowAskAI(true)} />
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-cyan-600 text-white hover:bg-cyan-500 transition-colors shadow-sm">
              <Plus size={13} /> New Set
            </button>
            <button onClick={fetchSets} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 shrink-0 bg-white border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sets..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content — master-detail */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Set list */}
        <div className="w-[280px] shrink-0 border-r border-slate-200 overflow-auto bg-white">
          {loading && sets.length === 0 ? (
            <div className="flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <Layers size={22} className="text-slate-300" />
              </div>
              <p className="text-[12px] font-semibold text-slate-700 mb-1">{search ? 'No matches' : 'No creative sets yet'}</p>
              <p className="text-[10px] text-slate-400 mb-3 text-center">Group creatives for campaign boosting.</p>
              {!search && (
                <button onClick={() => setShowCreate(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors">
                  <Plus size={11} /> Create First Set
                </button>
              )}
            </div>
          ) : (
            filtered.map(set => {
              const items = set.items || [];
              const thumbs = items.slice(0, 4).map(i => i.image_url || i.thumbnail).filter(Boolean);
              return (
                <button key={set.id} onClick={() => setSelectedSet(set)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-slate-100 transition-colors
                    ${selectedSet?.id === set.id ? 'bg-blue-50/60 border-l-2 border-l-blue-500' : 'hover:bg-slate-50 border-l-2 border-l-transparent'}`}>
                  {/* Thumbnail grid */}
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden grid grid-cols-2 shrink-0">
                    {thumbs.length > 0 ? thumbs.map((t, i) => (
                      <img key={i} src={t} alt="" className="w-full h-full object-cover" />
                    )) : (
                      <div className="col-span-2 row-span-2 flex items-center justify-center">
                        <Layers size={14} className="text-slate-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-slate-800 truncate">{set.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                      <span className="text-[9px] text-slate-300">{fmtDate(set.updated_at)}</span>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Right: Detail or empty */}
        {selectedSet ? (
          <SetDetailPanel
            set={selectedSet}
            adAccountId={adAccountId}
            onClose={() => setSelectedSet(null)}
            onUpdate={updateSet}
            onDelete={(id) => { deleteSet(id); setSelectedSet(null); }}
            onAddItems={addItems}
            onRemoveItem={removeItem}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-50/50">
            <div className="text-center">
              <Layers size={40} className="text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Select a set or create a new one</p>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && <CreateSetModal onClose={() => setShowCreate(false)} onSave={createSet} />}
      {showAskAI && <AskAIPopup onSubmit={onSendToChat} onClose={() => setShowAskAI(false)} context="Creative Sets" />}
    </div>
  );
};
