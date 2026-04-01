import { useState, useRef } from 'react';
import { Plus, Sparkles, BarChart3, Palette, DollarSign, Users, Zap, Trash2, Save, Target, TrendingUp, FolderOpen, ChevronLeft, ArrowLeft, MoreVertical, MessageSquare, X, Upload, Wand2, FileText, RotateCcw, PenLine } from 'lucide-react';

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

// ── Skill Builder Modal (AI-powered) ───────────────────────────────────────
const SkillBuilderModal = ({ onSave, onCancel, onGenerate, saving, error }) => {
  const [step, setStep] = useState(1); // 1 = input, 2 = review
  const [rawText, setRawText] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [uploadedFileName, setUploadedFileName] = useState(null);
  const fileInputRef = useRef(null);

  // Generated skill fields (editable in step 2)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [preview, setPreview] = useState('');
  const [content, setContent] = useState('');

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result.split(',')[1];
        const res = await fetch('/api/chat/parse-doc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ base64, type: file.type, name: file.name }),
        });
        const data = await res.json();
        if (data.text) {
          setRawText(data.text);
        } else {
          setGenError('Could not extract text from file');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setGenError('Failed to read file: ' + err.message);
    }
  };

  const handleGenerate = async () => {
    if (!rawText.trim()) return;
    setGenerating(true);
    setGenError(null);
    try {
      const result = await onGenerate(rawText);
      setName(result.name || '');
      setDescription(result.description || '');
      setPreview(result.preview || '');
      setContent(result.content || '');
      setStep(2);
    } catch (err) {
      setGenError(err?.response?.data?.error || err?.message || 'Failed to generate skill');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    if (!name.trim() || !content.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), content: content.trim(), preview: preview.trim(), type: 'strategy' });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Wand2 size={16} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {step === 1 ? 'Create Analysis Strategy' : 'Review & Edit'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {step === 1 ? 'Upload a file or describe your analysis approach' : 'Tweak the AI-generated strategy before saving'}
              </p>
            </div>
          </div>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-3">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-indigo-500' : 'bg-slate-200'}`} />
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {step === 1 ? (
            /* ── Step 1: Input ── */
            <div className="space-y-4">
              {/* File upload */}
              <div>
                <input ref={fileInputRef} type="file" accept=".txt,.md,.pdf,.csv,.xlsx,.xls,.doc,.docx" onChange={handleFileUpload} className="hidden" />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-sm text-slate-500 hover:text-indigo-600"
                >
                  <Upload size={16} />
                  {uploadedFileName ? `Uploaded: ${uploadedFileName}` : 'Upload a file (PDF, TXT, CSV, Excel, Word)'}
                </button>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-slate-200" />
                <span className="text-[10px] font-semibold text-slate-400 uppercase">or type below</span>
                <div className="flex-1 border-t border-slate-200" />
              </div>

              {/* Raw text input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Your Analysis Approach</label>
                <textarea
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  rows={10}
                  placeholder={"Describe how you want the AI to analyze your ad data. For example:\n\n\"I want to focus on ROAS first. Rank all campaigns by ROAS, flag anything below 1.5x. For high-spend campaigns, check if CPA is within target. Always compare to last 30 days, not 7. Group by campaign objective, not funnel stage. Output a priority action list.\""}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y font-mono bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {rawText.length > 0 ? `${rawText.length} / 8,000 characters` : 'Paste your strategy, upload a doc, or describe your approach in plain language'}
                </p>
              </div>
            </div>
          ) : (
            /* ── Step 2: Review & Edit ── */
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Strategy Name <span className="text-red-400">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Output Preview</label>
                <textarea value={preview} onChange={e => setPreview(e.target.value)} rows={3}
                  placeholder="2-3 lines showing sample analysis output"
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y bg-white" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Analysis Instructions <span className="text-red-400">*</span></label>
                <textarea value={content} onChange={e => setContent(e.target.value)} rows={10}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y font-mono bg-white" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 shrink-0">
          {(genError || error) && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600 font-medium">
              {genError || error}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div>
              {step === 2 && (
                <button onClick={() => setStep(1)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700">
                  <RotateCcw size={12} /> Back to input
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCancel} className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
              {step === 1 ? (
                <button onClick={handleGenerate} disabled={!rawText.trim() || generating}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
                  <Wand2 size={12} />
                  {generating ? 'Generating...' : 'Generate Strategy'}
                </button>
              ) : (
                <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
                  <Save size={12} />
                  {saving ? 'Saving...' : 'Save Strategy'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Create/Edit Skill Modal (manual) ───────────────────────────────────────
const SkillEditorModal = ({ skill, onSave, onCancel, saving, error }) => {
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [content, setContent] = useState(skill?.content || '');
  const [preview, setPreview] = useState(skill?.preview || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), content: content.trim(), preview: preview.trim(), type: 'strategy' });
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-6" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">{skill ? 'Edit Strategy' : 'Create Strategy (Manual)'}</h3>
          <p className="text-xs text-slate-400 mt-0.5">Define how the AI should analyze data when this strategy is active</p>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., ROAS-First Analysis"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Short summary of this analysis approach"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Output Preview</label>
            <textarea value={preview} onChange={e => setPreview(e.target.value)} rows={2}
              placeholder="2-3 lines showing sample analysis output"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y bg-white" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">Instructions <span className="text-red-400">*</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={8}
              placeholder={"Tell the AI how to analyze data. Example:\n\nYou are a ROAS-focused analyst. When analyzing:\n1. Rank campaigns by ROAS\n2. Flag below 1.0x immediately\n3. Check CPA vs target for high-spend\n4. Output: Priority Action List"}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y font-mono bg-white" />
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors">
              <Save size={12} />
              {saving ? 'Saving...' : skill ? 'Update' : 'Create'}
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
        <p className="text-xs text-slate-500">This strategy will be permanently deleted. This cannot be undone.</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── Workflow Skill Card (read-only built-in) ───────────────────────────────
const WorkflowCard = ({ skill, onOpen }) => {
  const Icon = ICON_MAP[skill.icon] || Sparkles;
  const gradient = ICON_COLORS[skill.icon] || 'from-indigo-500 to-indigo-600';

  return (
    <button
      onClick={() => onOpen(skill)}
      className="flex flex-col items-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-md transition-all text-center cursor-pointer"
    >
      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 shadow-sm`}>
        <Icon size={20} className="text-white" />
      </div>
      <h3 className="text-[13px] font-semibold text-slate-800 truncate w-full">{skill.name}</h3>
      <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-semibold mt-1.5">Workflow</span>
      <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">{skill.description}</p>
    </button>
  );
};

// ── Strategy Skill Card (with preview & context menu) ──────────────────────
const StrategyCard = ({ skill, onOpen, onUseInChat, onDelete }) => {
  const Icon = ICON_MAP[skill.icon] || BarChart3;
  const [menuOpen, setMenuOpen] = useState(false);
  const isCustom = !skill.isDefault;

  return (
    <div className="group relative">
      <button
        onClick={() => onOpen(skill)}
        className="w-full flex flex-col items-center p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100/50 transition-all text-center cursor-pointer"
      >
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${isCustom ? 'from-violet-500 to-indigo-600' : 'from-blue-500 to-blue-600'} flex items-center justify-center mb-3 shadow-sm`}>
          <Icon size={20} className="text-white" />
        </div>
        <h3 className="text-[13px] font-semibold text-slate-800 truncate w-full">{skill.name}</h3>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold mt-1.5 ${isCustom ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-500'}`}>
          {isCustom ? 'Custom Strategy' : 'Default Strategy'}
        </span>
        <p className="text-[10px] text-slate-400 mt-2 line-clamp-2 leading-relaxed">{skill.description}</p>

        {/* Preview */}
        {skill.preview && (
          <div className="w-full mt-3 px-2.5 py-2 rounded-lg bg-slate-50 border border-slate-100 text-left">
            <p className="text-[10px] text-slate-500 leading-relaxed line-clamp-3 whitespace-pre-line">{skill.preview}</p>
          </div>
        )}
      </button>

      {/* Context menu */}
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
              {isCustom && (
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

// ── Create Strategy Card ───────────────────────────────────────────────────
const CreateStrategyCard = ({ onClick, onManualClick }) => (
  <div className="flex flex-col items-center justify-center p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all text-center cursor-pointer group min-h-[200px]"
    onClick={onClick}>
    <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition-colors">
      <Wand2 size={20} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
    </div>
    <h3 className="text-[13px] font-semibold text-slate-500 group-hover:text-indigo-600 transition-colors">Create with AI</h3>
    <p className="text-[10px] text-slate-400 mt-1">Upload a file or describe your approach</p>
    <button
      onClick={(e) => { e.stopPropagation(); onManualClick(); }}
      className="mt-2 flex items-center gap-1 text-[10px] text-slate-400 hover:text-indigo-500 transition-colors"
    >
      <PenLine size={10} /> or create manually
    </button>
  </div>
);

// ── Main Skills Library ─────────────────────────────────────────────────────
export const SkillsLibrary = ({ skills, onCreate, onUpdate, onDelete, onGenerate, onBack, onConfigure, onActivateSkill }) => {
  const [builderOpen, setBuilderOpen] = useState(false);
  const [creatingManual, setCreatingManual] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Separate skills into workflows (built-in non-analysis) and strategies (analysis)
  const ANALYSIS_IDS = ['performance_analyst', 'inception_funnel_audit', 'insights-reporting'];
  const workflowSkills = skills.filter(s => s.isDefault && !ANALYSIS_IDS.includes(s.id) && s.type !== 'strategy');
  const strategySkills = [
    ...skills.filter(s => s.isDefault && (ANALYSIS_IDS.includes(s.id) || s.type === 'strategy')),
    ...skills.filter(s => !s.isDefault),
  ];

  const handleSave = async (data) => {
    setSaving(true);
    setError(null);
    try {
      if (editingSkill) {
        await onUpdate(editingSkill.id, data);
        setEditingSkill(null);
      } else {
        await onCreate(data);
        setBuilderOpen(false);
        setCreatingManual(false);
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await onDelete(deleteTarget.id); } catch (err) { console.error('Failed to delete:', err); }
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
          <button onClick={onBack}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-500" />
              <h1 className="text-lg font-bold text-slate-900">Skills Library</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 ml-7">Workflows are fixed. Analysis strategies are customizable.</p>
          </div>
        </div>
        <button onClick={() => setBuilderOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm shadow-indigo-200">
          <Wand2 size={16} /> Create Strategy
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="max-w-5xl space-y-8">

          {/* ── Analysis Strategies Section ── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 size={14} className="text-indigo-500" />
              <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Analysis Strategies</h2>
            </div>
            <p className="text-[11px] text-slate-400 mb-4 ml-5">
              Custom strategies change how the AI analyzes your ad data. Activate one from the chat bar to override the default analysis.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {strategySkills.map(skill => (
                <StrategyCard
                  key={skill.id}
                  skill={skill}
                  onOpen={handleOpenSkill}
                  onUseInChat={handleUseInChat}
                  onDelete={setDeleteTarget}
                />
              ))}
              <CreateStrategyCard
                onClick={() => setBuilderOpen(true)}
                onManualClick={() => setCreatingManual(true)}
              />
            </div>
          </div>

          {/* ── Built-in Workflows Section ── */}
          {workflowSkills.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-1">
                <FolderOpen size={14} className="text-slate-400" />
                <h2 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Built-in Workflows</h2>
              </div>
              <p className="text-[11px] text-slate-400 mb-4 ml-5">
                Fixed step-by-step flows for campaign creation, audience building, and more. These cannot be customized.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {workflowSkills.map(skill => (
                  <WorkflowCard key={skill.id} skill={skill} onOpen={handleOpenSkill} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Builder Modal (AI-powered) */}
      {builderOpen && (
        <SkillBuilderModal
          onSave={handleSave}
          onCancel={() => { setBuilderOpen(false); setError(null); }}
          onGenerate={onGenerate}
          saving={saving}
          error={error}
        />
      )}

      {/* Manual Editor Modal */}
      {(creatingManual || editingSkill) && (
        <SkillEditorModal
          skill={editingSkill}
          onSave={handleSave}
          onCancel={() => { setCreatingManual(false); setEditingSkill(null); setError(null); }}
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
