import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Sparkles, ChevronLeft, Upload, GitBranch, Trash2, Download, X, Check, Clock, Play, PenLine, RefreshCw } from 'lucide-react';

// ── Skill Card ─────────────────────────────────────────────────────────────
const SkillCard = ({ skill, isActive, onToggle, onMenuAction }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef(null);
  const isOfficial = skill.isOfficial;

  const openMenu = (e) => {
    e.stopPropagation();
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, left: rect.right });
    }
    setMenuOpen(!menuOpen);
  };

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 p-5 flex flex-col gap-3 group hover:border-indigo-200 hover:shadow-md transition-all">
      {/* Top row: name + toggle */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-bold text-slate-800 truncate">{skill.name}</h3>
            {(skill.featured || isOfficial) && <Sparkles size={12} className="text-indigo-400 shrink-0" />}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(skill.id); }}
          className={`relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200 ${isActive ? 'bg-blue-500' : 'bg-slate-200'}`}
        >
          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'left-[24px]' : 'left-1'}`} />
        </button>
      </div>

      {/* Description */}
      <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">{skill.description}</p>

      {/* Bottom: badge + date + menu */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex flex-col gap-0.5 min-w-0">
          {isOfficial && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
              <Check size={10} className="text-slate-400" />
              Official
            </span>
          )}
          {!isOfficial && skill.isPersonal && (
            <span className="text-[10px] text-violet-500 font-medium">Custom</span>
          )}
          {skill.updatedAt && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={9} className="shrink-0" />
              Updated on {new Date(skill.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Context menu trigger */}
        <button
          ref={menuBtnRef}
          onClick={openMenu}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        >
          <MoreHorizontal size={14} />
        </button>
      </div>

      {/* Fixed-position context menu (portaled outside card) */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-[70]" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed w-52 bg-white rounded-xl shadow-2xl border border-slate-200 z-[80] py-1.5"
            style={{ top: menuPos.top, left: menuPos.left - 208 }}
          >
            <button onClick={() => { setMenuOpen(false); onMenuAction('tryit', skill); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
              <Play size={14} className="text-slate-400" /> Try it out
            </button>
            <button onClick={() => { setMenuOpen(false); onMenuAction('download', skill); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
              <Download size={14} className="text-slate-400" /> Download
            </button>
            {/* Edit, Replace, Publish — only for private/team skills */}
            {!isOfficial && (
              <>
                <button onClick={() => { setMenuOpen(false); onMenuAction('edit', skill); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                  <PenLine size={14} className="text-slate-400" /> Edit with AI Ad Manager
                </button>
                <button onClick={() => { setMenuOpen(false); onMenuAction('replace', skill); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                  <RefreshCw size={14} className="text-slate-400" /> Replace
                </button>
              </>
            )}
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => { setMenuOpen(false); onMenuAction('delete', skill); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50">
              <Trash2 size={14} /> {isOfficial ? 'Remove' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

// ── Add Dropdown ───────────────────────────────────────────────────────────
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
    { id: 'build', icon: <Sparkles size={16} className="text-indigo-500" />, label: 'Build with AI Agent', desc: 'Build great skills through conversation' },
    { id: 'upload', icon: <Upload size={16} className="text-emerald-500" />, label: 'Upload a skill', desc: 'Upload .zip, .skill, or folder' },
    { id: 'official', icon: <Check size={16} className="text-slate-300" />, label: 'Add from official', desc: 'Pre-built skills maintained by team', soon: true },
    { id: 'github', icon: <GitBranch size={16} className="text-slate-300" />, label: 'Import from GitHub', desc: 'Paste a repository link to get started', soon: true },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-1.5">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => { if (!opt.soon) { onSelect(opt.id); onClose(); } }}
          disabled={opt.soon}
          className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${opt.soon ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
        >
          <div className="mt-0.5 shrink-0">{opt.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={`text-[13px] font-medium ${opt.soon ? 'text-slate-400' : 'text-slate-800'}`}>{opt.label}</p>
              {opt.soon && <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Soon</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── Delete Confirm ─────────────────────────────────────────────────────────
const DeleteConfirm = ({ skill, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Delete "{skill.name}"?</h3>
        <p className="text-xs text-slate-500">This skill will be permanently deleted. This cannot be undone.</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── GitHub Import Bar ──────────────────────────────────────────────────────
const GitHubImportBar = ({ onClose, onImport }) => {
  const [url, setUrl] = useState('');

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      <GitBranch size={16} className="text-slate-400 shrink-0" />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Paste a GitHub repository link..."
        className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && url.trim() && onImport(url.trim())}
      />
      <button onClick={() => url.trim() && onImport(url.trim())} disabled={!url.trim()}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
        Import
      </button>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  );
};

// ── Main Skills Library ────────────────────────────────────────────────────
export const SkillsLibrary = ({ skills, onCreate, onDelete, onBack, onBuildWithAI, onTrySkill, onRefresh, skillToggles, onToggleChange }) => {
  // Re-fetch skills on mount to pick up skills created by AI agent
  useEffect(() => { if (onRefresh) onRefresh(); }, [onRefresh]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'private' | 'team' | 'official'
  const [filterOpen, setFilterOpen] = useState(false);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showGitHubImport, setShowGitHubImport] = useState(false);
  const activeToggles = skillToggles || {};
  const setActiveToggles = (updater) => {
    if (onToggleChange) {
      onToggleChange(typeof updater === 'function' ? updater(activeToggles) : updater);
    }
  };
  const fileInputRef = useRef(null);

  const handleToggle = (id) => {
    setActiveToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMenuAction = (action, skill) => {
    switch (action) {
      case 'tryit':
        if (onTrySkill) { onTrySkill(skill); }
        break;
      case 'download': {
        const md = `---\nname: ${skill.name}\ndescription: ${skill.description || ''}\ntype: skill\n---\n\n${skill.content || ''}`;
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${skill.id || skill.name.toLowerCase().replace(/\s+/g, '-')}.skill`; a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'edit':
        // Navigate to chat with edit prompt
        if (onBuildWithAI) onBuildWithAI();
        break;
      case 'replace':
        // Open file picker to replace skill content
        fileInputRef.current?.click();
        break;
      case 'delete':
        setDeleteTarget(skill);
        break;
    }
  };

  const handleAddSelect = (type) => {
    switch (type) {
      case 'build':
        if (onBuildWithAI) onBuildWithAI();
        break;
      case 'upload':
        fileInputRef.current?.click();
        break;
      case 'official':
        // TODO: Add official templates later
        break;
      case 'github':
        setShowGitHubImport(true);
        break;
    }
  };

  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    console.log('[SkillUpload] file selected:', file?.name, file?.size);
    if (!file) return;
    setUploadError(null);
    try {
      const text = await file.text();
      console.log('[SkillUpload] file content length:', text.length, 'first 100 chars:', text.slice(0, 100));
      if (!text.trim()) { setUploadError('File is empty'); e.target.value = ''; return; }
      const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (match) {
        const meta = {};
        match[1].split('\n').forEach(line => {
          const [key, ...rest] = line.split(':');
          if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
        });
        if (meta.name && match[2].trim()) {
          console.log('[SkillUpload] Creating with frontmatter:', meta.name);
          const result = await onCreate({ name: meta.name, description: meta.description || '', content: match[2].trim(), type: 'strategy' });
          console.log('[SkillUpload] Created:', result);
          e.target.value = '';
          return;
        }
      }
      // No frontmatter — use filename as name, full content as body
      console.log('[SkillUpload] Creating without frontmatter:', file.name);
      const result = await onCreate({ name: file.name.replace(/\.(skill|md|zip|txt)$/, ''), description: '', content: text, type: 'strategy' });
      console.log('[SkillUpload] Created:', result);
    } catch (err) {
      console.error('Failed to import skill file:', err);
      setUploadError(err.response?.data?.error || err.message || 'Upload failed');
    }
    e.target.value = '';
  };

  const handleGitHubImport = async (url) => {
    console.log('Import from GitHub:', url);
    setShowGitHubImport(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await onDelete(deleteTarget.id); } catch (err) { console.error('Delete failed:', err); }
    setDeleteTarget(null);
  };

  // Show all skills: official + personal
  const filtered = skills
    .map(s => ({
      ...s,
      isOfficial: s.visibility === 'official' || s.isDefault,
      isPersonal: s.visibility === 'private' || s.visibility === 'custom',
      updatedAt: s.updatedAt || (s.isDefault ? '2026-04-09' : new Date().toISOString()),
    }))
    .filter(s => {
      // Apply type filter
      if (filterType === 'private' && !s.isPersonal) return false;
      if (filterType === 'official' && !s.isOfficial) return false;
      // Apply search
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
      }
      return true;
    });

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 flex flex-col">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".skill,.md,.zip,.txt" onChange={handleFileUpload} className="hidden" />

      {/* Upload error */}
      {uploadError && (
        <div className="mx-8 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {/* Header */}
      <div className="px-8 pt-8 pb-6 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <Sparkles size={24} className="text-indigo-500 shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Skills</h1>
            <p className="text-sm text-slate-400 mt-0.5">Prepackaged and repeatable best practices & tools for your agents</p>
          </div>
        </div>

        {/* Search + Add button */}
        <div className="flex items-center gap-3 mt-5">
          {/* Search bar */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search Skill"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm text-slate-700 placeholder-slate-400 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-colors shadow-sm"
            />
          </div>

          {/* + Add button */}
          <div className="relative">
            <button
              onClick={() => setAddDropdownOpen(!addDropdownOpen)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-600 hover:text-slate-800 hover:border-slate-300 transition-colors shadow-sm"
            >
              <Plus size={14} />
              Add
            </button>
            <AddDropdown
              open={addDropdownOpen}
              onClose={() => setAddDropdownOpen(false)}
              onSelect={handleAddSelect}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mt-4 bg-slate-100 rounded-lg p-0.5">
          {[
            { value: 'all', label: 'All Skills' },
            { value: 'official', label: 'Official Skills' },
            { value: 'private', label: 'Custom Skills' },
          ].map(tab => (
            <button key={tab.value} onClick={() => setFilterType(tab.value)}
              className={`flex-1 px-3 py-2 rounded-md text-[12px] font-medium transition-colors
                ${filterType === tab.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* GitHub import bar */}
        {showGitHubImport && (
          <div className="mt-4">
            <GitHubImportBar
              onClose={() => setShowGitHubImport(false)}
              onImport={handleGitHubImport}
            />
          </div>
        )}
      </div>

      {/* Skill Cards Grid */}
      <div className="flex-1 overflow-y-auto px-8 pb-8">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search ? 'No skills found' : 'No custom skills yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try adjusting your search' : 'Click "+ Add" to create or import your first skill'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isActive={!!activeToggles[skill.id]}
                onToggle={handleToggle}
                onMenuAction={handleMenuAction}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          skill={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
