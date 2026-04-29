import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Upload, X, FileText, Sparkles, Save, History, RotateCcw, Eye, Zap } from 'lucide-react';
import { uploadToGcs } from '../hooks/useGcsUpload.js';
import { useRequireAuth } from '../lib/authGate.jsx';
import { MarkdownEditor } from './MarkdownEditor.jsx';

// Pretty timestamp — "5 min ago", "2 hr ago", "3 days ago", or full date.
const fmtTime = (iso) => {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  const diff = Date.now() - t;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return new Date(iso).toLocaleDateString();
};

const sourceLabel = (r) => {
  if (r.source === 'create') return 'Created';
  if (r.source === 'revert') return `Reverted from v${r.revertedFrom}`;
  return 'Edited';
};

export const StrategistConfig = ({
  strategist,
  onUpdate,
  onAddDoc,
  onRemoveDoc,
  onBack,
  // History API — optional. When omitted (e.g. for built-in skills) the
  // History button stays hidden, since revisions only exist for custom skills.
  fetchRevisions,
  fetchRevision,
  revertSkill,
}) => {
  const [name, setName] = useState(strategist.name);
  const [description, setDescription] = useState(strategist.description || '');
  const [instructions, setInstructions] = useState(strategist.content || strategist.instructions || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  // ── History drawer ────────────────────────────────────────────────────────
  const historyEnabled = !!(fetchRevisions && revertSkill) && strategist.visibility !== 'official' && strategist.visibility !== 'system';
  const [showHistory, setShowHistory] = useState(false);
  const [revisions, setRevisions] = useState([]);
  const [revLoading, setRevLoading] = useState(false);
  const [previewRev, setPreviewRev] = useState(null); // full revision shown in modal
  const [reverting, setReverting] = useState(null);    // version currently being restored

  const loadRevisions = useCallback(async () => {
    if (!fetchRevisions) return;
    setRevLoading(true);
    try {
      const list = await fetchRevisions(strategist.id);
      setRevisions(list);
    } finally {
      setRevLoading(false);
    }
  }, [fetchRevisions, strategist.id]);

  // Refresh the list whenever the drawer opens or the skill is saved.
  useEffect(() => {
    if (showHistory) loadRevisions();
  }, [showHistory, loadRevisions]);

  const handlePreviewRev = async (version) => {
    if (!fetchRevision) return;
    try {
      const rev = await fetchRevision(strategist.id, version);
      setPreviewRev(rev);
    } catch (e) {
      console.error('Preview revision failed:', e);
    }
  };

  const requireAuthForRestore = useRequireAuth();
  const handleRestore = requireAuthForRestore(async (version) => {
    if (!revertSkill) return;
    if (!window.confirm(`Restore v${version}? Your current content will be saved as a new revision first, so this is undoable.`)) return;
    setReverting(version);
    try {
      const restored = await revertSkill(strategist.id, version);
      // Sync local form state so the editor reflects the restored values
      // immediately — otherwise the user would see stale text and have to
      // close + reopen the skill.
      setName(restored.name || '');
      setDescription(restored.description || '');
      setInstructions(restored.content || '');
      setPreviewRev(null);
      await loadRevisions();
    } catch (e) {
      console.error('Restore failed:', e);
      alert(`Restore failed: ${e?.response?.data?.error || e.message}`);
    } finally {
      setReverting(null);
    }
  });

  // Auth gate for save — uploads (uploadToGcs) flow through this same
  // handler indirectly via gcsPromise.catch, so a single gate at handleSave
  // covers both "Save" button and the file upload happy path.
  const requireAuth = useRequireAuth();
  const handleSave = requireAuth(async () => {
    setSaving(true);
    try {
      await onUpdate(strategist.id, { name, description, content: instructions, icon: strategist.icon });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // If the history drawer is open, refresh it — the save just minted a new revision.
      if (showHistory) loadRevisions();
    } catch (err) {
      console.error('Failed to save skill:', err);
    } finally {
      setSaving(false);
    }
  });

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const file of files) {
      try {
        // A2 fix: side-car original to GCS (kind='skills') so we persist raw
        // bytes alongside the extracted text the skill references. Non-fatal.
        const gcsPromise = uploadToGcs(file, { kind: 'skills' }).catch(err => {
          console.warn('[strategist-config] GCS side-car failed:', err?.message || err);
          return null;
        });

        let text = '';
        const needsServerParse = file.name.endsWith('.pdf') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv');
        if (needsServerParse) {
          // Parse PDF/Excel/CSV via server
          const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          // Auth via cookie session.
          const res = await fetch('/api/chat/parse-doc', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64, type: file.type, name: file.name }),
          });
          const data = await res.json();
          text = data.text || '';
        } else {
          // TXT/DOC — read as text
          text = await file.text();
        }

        const gcs = await gcsPromise;
        onAddDoc(strategist.id, {
          name: file.name,
          text,
          charCount: text.length,
          gcs_object_key: gcs?.objectKey || null,
          gcs_public_url: gcs?.publicUrl || null,
        });
      } catch (err) {
        console.error('Failed to parse document:', err);
      }
    }
    e.target.value = '';
  };

  const isReadOnly = strategist.visibility === 'official' || strategist.visibility === 'system';

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 via-white to-indigo-50/30">
      {/* Header — sleek toolbar with back button on the left and primary
          actions on the right. Sticky so toolbar stays visible while user
          scrolls a long instructions block. */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-slate-200/70 shrink-0 bg-white/70 backdrop-blur-md sticky top-0 z-20">
        <button onClick={onBack} className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <span>Skills</span>
            <span>›</span>
            <span className="truncate">{name || 'Untitled skill'}</span>
            {strategist.version != null && (
              <span className="shrink-0 inline-flex items-center text-[10px] font-bold tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md font-mono">
                v{strategist.version}
              </span>
            )}
          </div>
          <p className="text-sm font-bold text-slate-800 truncate">Configure skill</p>
        </div>
        {historyEnabled && (
          <button
            onClick={() => setShowHistory(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${showHistory ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/15' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'}`}
            title="View edit history"
          >
            <History size={14} />
            History
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || isReadOnly}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
            saved
              ? 'bg-emerald-500 text-white shadow-emerald-500/25'
              : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25'
          } disabled:opacity-50 disabled:cursor-not-allowed`}>
          <Save size={14} />
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save changes'}
        </button>
      </div>

      {/* Content — splits into editor + history drawer when history is open */}
      <div className="flex-1 flex min-h-0">
      <div className="flex-1 overflow-y-auto px-6 py-8 min-w-0">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Hero card — name, description, icon in a single visual block.
              Gives the page a real "identity" instead of a stack of inputs. */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent pointer-events-none" />
            <div className="relative p-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
                  <Sparkles size={24} className="text-white" />
                </div>
                <div className="flex-1 min-w-0 space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Skill name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full text-xl font-bold text-slate-900 bg-transparent border-0 px-0 focus:outline-none focus:ring-0 placeholder:text-slate-300 disabled:opacity-60"
                      placeholder="Untitled skill"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Short description</label>
                    <input
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full text-sm text-slate-600 bg-transparent border-0 px-0 focus:outline-none focus:ring-0 placeholder:text-slate-300 disabled:opacity-60"
                      placeholder="One sentence shown in the library list"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instructions card — the main editor. Rich-text toolbar +
              Edit/Preview tabs come from <MarkdownEditor />. */}
          <section>
            <header className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800">Instructions</h2>
              </div>
              <span className="text-[11px] text-slate-400">Markdown supported</span>
            </header>
            <p className="text-[12px] text-slate-500 mb-3 leading-relaxed">
              Tell the AI exactly how to behave when this skill is active. Use headings to break up sections, lists for steps,
              and <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-blue-700">code</code> for tool names or field names.
            </p>
            <MarkdownEditor
              value={instructions}
              onChange={setInstructions}
              placeholder="e.g.,&#10;## Goal&#10;Always analyze campaigns through the TOFU / MOFU / BOFU funnel framework.&#10;&#10;## Steps&#10;1. Pull the last 30 days of `get_campaigns` data&#10;2. Score each funnel stage&#10;3. Recommend budget shifts with reasoning"
              rows={14}
              helperText="Tip: select text and press Cmd/Ctrl+B to bold, Cmd/Ctrl+K to insert a link"
            />
          </section>

          {/* Knowledge Base card */}
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-indigo-500" />
                <h2 className="text-sm font-bold text-slate-800">Knowledge base</h2>
              </div>
              <span className="text-[11px] text-slate-400">PDF · TXT · DOC · Excel · CSV</span>
            </header>
            <div className="p-5">
              {strategist.documents?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {strategist.documents.map((doc, i) => (
                    <div key={i} className="flex items-center gap-3 bg-slate-50 hover:bg-slate-100/70 rounded-xl px-3 py-2.5 group transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                        <FileText size={16} className="text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{doc.name}</p>
                        <p className="text-[11px] text-slate-400">{doc.charCount?.toLocaleString() || '?'} characters</p>
                      </div>
                      <button onClick={() => onRemoveDoc(strategist.id, i)}
                        className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-md hover:bg-red-50">
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => fileRef.current?.click()}
                disabled={isReadOnly}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                <Upload size={16} />
                Upload a document
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.doc,.docx,.xlsx,.xls,.csv" multiple className="hidden" onChange={handleFileUpload} />
            </div>
          </section>
        </div>
      </div>

      {/* History drawer — slides in beside the editor (not over it) so the
          user can scan revisions while still seeing what's currently in the
          form. Width is fixed; on narrow viewports it'll squeeze the editor
          but everything stays scrollable. */}
      {historyEnabled && showHistory && (
        <aside className="w-[360px] shrink-0 border-l border-slate-200 bg-slate-50/60 overflow-y-auto">
          <div className="sticky top-0 bg-slate-50/95 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between z-10">
            <div className="flex items-center gap-2">
              <History size={14} className="text-slate-500" />
              <h3 className="text-sm font-semibold text-slate-700">Edit history</h3>
            </div>
            <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded">
              <X size={14} />
            </button>
          </div>

          {revLoading && revisions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading…</div>
          ) : revisions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No history yet. Edits you make will be tracked here.
            </div>
          ) : (
            <ul className="p-3 space-y-2">
              {revisions.map((r, idx) => {
                const isCurrent = idx === 0; // newest = current state
                return (
                  <li key={r.id} className={`bg-white rounded-xl border ${isCurrent ? 'border-indigo-300 ring-1 ring-indigo-100' : 'border-slate-200'} p-3`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-700">v{r.version}</span>
                        {isCurrent && <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">current</span>}
                        <span className="text-[10px] text-slate-400">{sourceLabel(r)}</span>
                      </div>
                      <span className="text-[10px] text-slate-400">{fmtTime(r.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-700 font-medium truncate mb-1">{r.name}</p>
                    {r.contentPreview && (
                      <p className="text-[11px] text-slate-500 line-clamp-2 mb-2 whitespace-pre-wrap">
                        {r.contentPreview}{r.contentLength > 240 ? '…' : ''}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handlePreviewRev(r.version)}
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-slate-600 hover:bg-slate-100"
                      >
                        <Eye size={11} /> View
                      </button>
                      {!isCurrent && (
                        <button
                          onClick={() => handleRestore(r.version)}
                          disabled={reverting === r.version}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          <RotateCcw size={11} />
                          {reverting === r.version ? 'Restoring…' : 'Restore'}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      )}
      </div>

      {/* Full-content preview modal — opened from "View" in the history list */}
      {previewRev && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setPreviewRev(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col pointer-events-auto">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                <div>
                  <p className="text-sm font-bold text-slate-800">v{previewRev.version} · {previewRev.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{sourceLabel(previewRev)} · {fmtTime(previewRev.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRestore(previewRev.version)}
                    disabled={reverting === previewRev.version}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                  >
                    <RotateCcw size={12} />
                    {reverting === previewRev.version ? 'Restoring…' : 'Restore this version'}
                  </button>
                  <button onClick={() => setPreviewRev(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
                    <X size={16} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                {previewRev.description && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-slate-700">{previewRev.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Instructions</p>
                  <pre className="text-xs text-slate-700 font-mono whitespace-pre-wrap bg-slate-50 rounded-lg p-3 border border-slate-200">
                    {previewRev.content || '(empty)'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
