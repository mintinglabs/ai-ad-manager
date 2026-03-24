import { useState } from 'react';
import { Plus, Sparkles, BarChart3, Palette, DollarSign, Users, Zap, Trash2, Save, Target, TrendingUp, FolderOpen, FolderPlus, ChevronLeft, ArrowLeft, MoreVertical, MessageSquare, X } from 'lucide-react';

const ICON_MAP = {
  funnel: BarChart3, chart: BarChart3, palette: Palette, dollar: DollarSign,
  users: Users, sparkles: Sparkles, zap: Zap, target: Target, trending: TrendingUp,
};

const ICON_COLORS = {
  funnel: 'from-blue-500 to-blue-600', chart: 'from-blue-500 to-blue-600',
  palette: 'from-pink-500 to-rose-500', dollar: 'from-emerald-500 to-green-600',
  users: 'from-violet-500 to-purple-600', sparkles: 'from-indigo-500 to-indigo-600',
  zap: 'from-amber-500 to-orange-500', target: 'from-cyan-500 to-teal-600',
  trending: 'from-blue-500 to-indigo-600',
};

// Default folder mapping for built-in skills
const SKILL_FOLDERS = {
  performance_analyst: 'Analysis',
  inception_funnel_audit: 'Analysis',
  creative_strategist: 'Creative',
  budget_optimizer: 'Strategy',
  audience_strategist: 'Targeting',
};

const FOLDER_COLORS = {
  Analysis: 'text-blue-500', Strategy: 'text-amber-500', Creative: 'text-pink-500', Targeting: 'text-violet-500',
};

const DEFAULT_FOLDERS = ['Analysis', 'Strategy', 'Creative', 'Targeting'];

// ── Create/Edit Skill Modal ─────────────────────────────────────────────────
const SkillEditorModal = ({ skill, onSave, onCancel, saving, error }) => {
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [content, setContent] = useState(skill?.content || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), content: content.trim() });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{skill ? 'Edit Skill' : 'Create New Skill'}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Define how the AI should behave when this skill is active</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Creative A/B Test Planner"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Short summary of what this skill does"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Instructions <span className="text-red-400">*</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={8}
              placeholder="Tell the AI how to behave when this skill is active. Example:&#10;&#10;You are a [Role]. When analyzing data:&#10;1. Pull all relevant metrics&#10;2. Compare vs benchmarks&#10;3. Identify top 3 issues&#10;4. Recommend specific actions&#10;&#10;Output format: Executive Summary, Key Metrics Table, Action Plan."
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y font-mono bg-white" />
            {!content.trim() && name.trim() && (
              <p className="text-[10px] text-amber-500 mt-1.5">Instructions are required — tell the AI how this skill should work</p>
            )}
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100">
          {error && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
              title={!name.trim() ? 'Name is required' : !content.trim() ? 'Instructions are required' : ''}>
              <Save size={12} />
              {saving ? 'Saving...' : skill ? 'Update' : 'Create Skill'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Delete Confirm ──────────────────────────────────────────────────────────
const DeleteConfirm = ({ skill, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Delete "{skill.name}"?</h3>
        <p className="text-xs text-slate-500">This skill will be permanently deleted. This cannot be undone.</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── Skill Card (Google Drive style) ─────────────────────────────────────────
const SkillCard = ({ skill, onOpen, onUseInChat, onDelete, onContextMenu }) => {
  const Icon = ICON_MAP[skill.icon] || Sparkles;
  const gradient = ICON_COLORS[skill.icon] || 'from-indigo-500 to-indigo-600';
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="group relative">
      <button
        onClick={() => onOpen(skill)}
        className="w-full flex flex-col items-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all text-center cursor-pointer"
      >
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-md`}>
          <Icon size={24} className="text-white" />
        </div>
        {/* Name */}
        <h3 className="text-[13px] font-semibold text-slate-800 truncate w-full">{skill.name}</h3>
        {/* Badge */}
        {skill.isDefault ? (
          <span className="text-[9px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-semibold mt-1.5">Built-in</span>
        ) : (
          <span className="text-[9px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-semibold mt-1.5">Custom</span>
        )}
        {/* Description */}
        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">{skill.description}</p>
      </button>

      {/* Context menu button */}
      <div className="absolute top-2.5 right-2.5">
        <button
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all"
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-50 py-1">
              <button onClick={() => { setMenuOpen(false); onUseInChat(skill); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <MessageSquare size={12} className="text-blue-500" /> Use in chat
              </button>
              <button onClick={() => { setMenuOpen(false); onOpen(skill); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50">
                <Sparkles size={12} className="text-indigo-500" /> Configure
              </button>
              {!skill.isDefault && (
                <button onClick={() => { setMenuOpen(false); onDelete(skill); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50">
                  <Trash2 size={12} /> Delete
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Folder Card ─────────────────────────────────────────────────────────────
const FOLDER_BG = {
  Analysis: 'bg-blue-50', Strategy: 'bg-amber-50', Creative: 'bg-pink-50', Targeting: 'bg-violet-50', Custom: 'bg-slate-50',
};

const FolderCard = ({ name, count, onClick }) => {
  const colorClass = FOLDER_COLORS[name] || 'text-slate-400';
  const bgClass = FOLDER_BG[name] || 'bg-slate-50';

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all text-center cursor-pointer"
    >
      <div className={`w-14 h-14 rounded-2xl ${bgClass} flex items-center justify-center mb-3`}>
        <FolderOpen size={26} className={colorClass} />
      </div>
      <h3 className="text-[13px] font-semibold text-slate-800">{name}</h3>
      <p className="text-[10px] text-slate-400 mt-1">{count} {count === 1 ? 'skill' : 'skills'}</p>
    </button>
  );
};

// ── Create New Card ─────────────────────────────────────────────────────────
const CreateNewCard = ({ onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center cursor-pointer group min-h-[180px]"
  >
    <div className="w-14 h-14 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
      <Plus size={24} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
    </div>
    <h3 className="text-[13px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">Create Skill</h3>
    <p className="text-[10px] text-slate-400 mt-1">Build a custom AI expert</p>
  </button>
);

// ── Main Skills Library ─────────────────────────────────────────────────────
export const SkillsLibrary = ({ skills, onCreate, onUpdate, onDelete, onBack, onConfigure, onActivateSkill }) => {
  const [currentFolder, setCurrentFolder] = useState(null); // null = root, string = folder name
  const [creatingNew, setCreatingNew] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Group skills by folder
  const getSkillFolder = (skill) => {
    if (!skill.isDefault) return 'Custom';
    return SKILL_FOLDERS[skill.id] || 'Custom';
  };

  const grouped = {};
  skills.forEach(skill => {
    const folder = getSkillFolder(skill);
    if (!grouped[folder]) grouped[folder] = [];
    grouped[folder].push(skill);
  });

  // All folder names (defaults + any with skills)
  const allFolders = [...new Set([...DEFAULT_FOLDERS, ...Object.keys(grouped)])];
  const folderOrder = [...DEFAULT_FOLDERS, ...allFolders.filter(f => !DEFAULT_FOLDERS.includes(f))];

  // Skills in current view
  const currentSkills = currentFolder ? (grouped[currentFolder] || []) : [];

  const handleSave = async (data) => {
    setSaving(true);
    setError(null);
    try {
      if (editingSkill) {
        await onUpdate(editingSkill.id, data);
        setEditingSkill(null);
      } else {
        await onCreate(data);
        setCreatingNew(false);
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to save skill. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
    setDeleteTarget(null);
  };

  const handleOpenSkill = (skill) => {
    if (skill.isDefault && onConfigure) {
      onConfigure(skill);
    } else {
      setEditingSkill(skill);
    }
  };

  const handleUseInChat = (skill) => {
    if (onActivateSkill) {
      onActivateSkill(skill);
      onBack();
    }
  };

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 bg-white/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          {currentFolder ? (
            <button onClick={() => setCurrentFolder(null)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ArrowLeft size={18} />
            </button>
          ) : (
            <button onClick={onBack}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
              <ChevronLeft size={18} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-500" />
              <h1 className="text-lg font-bold text-slate-900">
                {currentFolder || 'Skills Library'}
              </h1>
            </div>
            {!currentFolder && (
              <p className="text-xs text-slate-400 mt-0.5 ml-7">Organize and manage your AI expert skills</p>
            )}
          </div>
        </div>
        <button onClick={() => setCreatingNew(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200">
          <Plus size={16} /> Create Skill
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {!currentFolder ? (
          /* ── Root view: Folders grid ── */
          <>
            {/* Info banner */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-6 max-w-4xl">
              <p className="text-xs font-semibold text-indigo-700 mb-1">How AI Skills work</p>
              <p className="text-[11px] text-indigo-600/80 leading-relaxed">
                Click a skill to configure its instructions and knowledge base.
                Activate skills from the chat bar to give the AI specialized expertise for your questions.
              </p>
            </div>

            {/* Folders */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-w-5xl">
              {folderOrder.map(folder => {
                const count = grouped[folder]?.length || 0;
                return (
                  <FolderCard
                    key={folder}
                    name={folder}
                    count={count}
                    onClick={() => setCurrentFolder(folder)}
                  />
                );
              })}
            </div>

            {/* All Skills flat grid below folders */}
            <div className="mt-8 max-w-5xl">
              <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">All Skills</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {skills.map(skill => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onOpen={handleOpenSkill}
                    onUseInChat={handleUseInChat}
                    onDelete={setDeleteTarget}
                  />
                ))}
                <CreateNewCard onClick={() => setCreatingNew(true)} />
              </div>
            </div>
          </>
        ) : (
          /* ── Folder view: Skills in this folder ── */
          <div className="max-w-5xl">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {currentSkills.map(skill => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onOpen={handleOpenSkill}
                  onUseInChat={handleUseInChat}
                  onDelete={setDeleteTarget}
                />
              ))}
              {currentFolder === 'Custom' && (
                <CreateNewCard onClick={() => setCreatingNew(true)} />
              )}
            </div>
            {currentSkills.length === 0 && currentFolder !== 'Custom' && (
              <div className="text-center py-16">
                <FolderOpen size={40} className="text-slate-200 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No skills in this folder</p>
              </div>
            )}
            {currentSkills.length === 0 && currentFolder === 'Custom' && (
              <div className="text-center py-8">
                <p className="text-sm text-slate-400">Create your first custom skill above</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(creatingNew || editingSkill) && (
        <SkillEditorModal
          skill={editingSkill}
          onSave={handleSave}
          onCancel={() => { setCreatingNew(false); setEditingSkill(null); setError(null); }}
          saving={saving}
          error={error}
        />
      )}

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
