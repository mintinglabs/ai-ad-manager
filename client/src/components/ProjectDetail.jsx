import { useState, useCallback } from 'react';
import { FolderOpen, Plus, ChevronRight, Check, Trash2, X, FileText, Upload, Sparkles, Settings, MoreHorizontal, Pencil, CheckCircle, Circle, Clock, Link2, Building2, ChevronDown } from 'lucide-react';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';

const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const fmtSize = (bytes) => bytes < 1024 ? `${bytes}B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)}KB` : `${(bytes / (1024 * 1024)).toFixed(1)}MB`;

// ── Section Header ──
const SectionHeader = ({ icon: Icon, title, action, actionLabel }) => (
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-[13px] font-semibold text-slate-700 flex items-center gap-2">
      {Icon && <Icon size={15} className="text-slate-400" />}
      {title}
      <ChevronRight size={14} className="text-slate-300" />
    </h3>
    {action && (
      <button onClick={action} className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors">
        <Plus size={12} /> {actionLabel || 'Add'}
      </button>
    )}
  </div>
);

// ── Tasks Section ──
const TasksSection = ({ tasks, onAdd, onToggle, onDelete }) => {
  const [newTask, setNewTask] = useState('');
  const completed = tasks.filter(t => t.completed).length;

  const handleAdd = () => {
    if (!newTask.trim()) return;
    onAdd(newTask.trim());
    setNewTask('');
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14px] font-bold text-slate-800">Tasks</h3>
        <span className="text-[11px] text-slate-400">
          {completed}/{tasks.length} completed
        </span>
      </div>

      {tasks.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={24} className="text-slate-300" />
          </div>
          <p className="text-[12px] text-slate-400 mb-1">Create a new task to get started</p>
          <p className="text-[11px] text-slate-300">Your tasks stay private unless shared</p>
        </div>
      ) : (
        <div className="space-y-1 mb-3">
          {tasks.map(task => (
            <div key={task.id} className="group flex items-start gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
              <button onClick={() => onToggle(task.id)} className="mt-0.5 shrink-0">
                {task.completed ? (
                  <CheckCircle size={16} className="text-emerald-500" />
                ) : (
                  <Circle size={16} className="text-slate-300 hover:text-blue-400 transition-colors" />
                )}
              </button>
              <span className={`flex-1 text-[13px] leading-snug ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                {task.title}
              </span>
              <span className="text-[10px] text-slate-300 shrink-0">{fmtDate(task.createdAt)}</span>
              <button onClick={() => onDelete(task.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add task input */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <input value={newTask} onChange={e => setNewTask(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="Add a task..."
          className="flex-1 text-[13px] py-2 px-0 bg-transparent placeholder:text-slate-300 focus:outline-none" />
        <button onClick={handleAdd} disabled={!newTask.trim()}
          className="px-3 py-1.5 text-[11px] font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-30">
          Add
        </button>
      </div>
    </div>
  );
};

// ── Instructions Section ──
const InstructionsSection = ({ instructions, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(instructions);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader icon={Settings} title="Instructions" action={() => setEditing(true)} actionLabel={instructions ? 'Edit' : 'Add'} />
      <p className="text-[11px] text-slate-400 mb-3">Add instructions to tailor the agent's responses</p>
      {editing ? (
        <div>
          <textarea value={draft} onChange={e => setDraft(e.target.value)}
            placeholder="e.g. Always respond in Traditional Chinese. Focus on Hong Kong market..."
            className="w-full text-[12px] text-slate-700 border border-slate-200 rounded-lg p-3 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 placeholder:text-slate-300" />
          <div className="flex justify-end gap-2 mt-2">
            <button onClick={() => { setEditing(false); setDraft(instructions); }} className="px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
            <button onClick={() => { onUpdate(draft); setEditing(false); }} className="px-3 py-1.5 text-[11px] font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">Save</button>
          </div>
        </div>
      ) : instructions ? (
        <p className="text-[12px] text-slate-600 whitespace-pre-line bg-slate-50 rounded-lg p-3">{instructions}</p>
      ) : null}
    </div>
  );
};

// ── Files Section ──
const FilesSection = ({ files, onAdd, onDelete }) => {
  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      for (const file of e.target.files) {
        onAdd(file);
      }
    };
    input.click();
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader icon={FileText} title="Files" action={handleUpload} actionLabel="Upload" />
      <p className="text-[11px] text-slate-400 mb-3">Start by attaching files to your project</p>
      {files.length === 0 ? (
        <button onClick={handleUpload}
          className="w-full py-6 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center gap-2 text-slate-400 hover:border-blue-300 hover:text-blue-500 transition-colors">
          <Upload size={20} />
          <span className="text-[11px] font-medium">Upload files</span>
        </button>
      ) : (
        <div className="space-y-1">
          {files.map(f => (
            <div key={f.id} className="group flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
              <FileText size={14} className="text-slate-400 shrink-0" />
              <span className="flex-1 text-[12px] text-slate-700 truncate">{f.name}</span>
              <span className="text-[10px] text-slate-300">{fmtSize(f.size)}</span>
              <button onClick={() => onDelete(f.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Skills Section ──
const SkillsSection = ({ skillIds, skills, onToggle }) => {
  const [showPicker, setShowPicker] = useState(false);
  const linkedSkills = skills.filter(s => skillIds.includes(s.id));

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader icon={Sparkles} title="Skills" action={() => setShowPicker(!showPicker)} actionLabel="Add" />
      <p className="text-[11px] text-slate-400 mb-3">Add skills to enhance the agent's know-how</p>
      {linkedSkills.length > 0 && (
        <div className="space-y-1 mb-3">
          {linkedSkills.map(s => (
            <div key={s.id} className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
              <Sparkles size={14} className="text-indigo-400 shrink-0" />
              <span className="flex-1 text-[12px] text-slate-700">{s.name}</span>
              <button onClick={() => onToggle(s.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
      {showPicker && (
        <div className="border border-slate-200 rounded-lg p-2 max-h-[200px] overflow-auto">
          {skills.filter(s => !skillIds.includes(s.id)).map(s => (
            <button key={s.id} onClick={() => onToggle(s.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-indigo-50 transition-colors">
              <Plus size={12} className="text-indigo-400" />
              <span className="text-[12px] text-slate-600">{s.name}</span>
            </button>
          ))}
          {skills.filter(s => !skillIds.includes(s.id)).length === 0 && (
            <p className="text-[11px] text-slate-400 text-center py-3">No more skills to add</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Connectors Section ──
const ConnectorsSection = ({ connectors, onAdd, onRemove }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerLevel, setPickerLevel] = useState('business'); // 'business' | 'accounts'
  const [activeBiz, setActiveBiz] = useState(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts, isLoading: accLoading } = useAdAccounts(pickerLevel === 'accounts' ? activeBiz?.id : null);

  const handleSelectAccount = (account) => {
    onAdd({
      type: 'meta',
      accountId: account.id,
      accountName: account.name,
      businessId: activeBiz?.id,
      businessName: activeBiz?.name,
    });
    setShowPicker(false);
    setPickerLevel('business');
    setActiveBiz(null);
  };

  const MetaIcon = () => (
    <img src="/meta-icon.svg" alt="Meta" className="w-4 h-4 shrink-0" />
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <SectionHeader icon={Link2} title="Connectors" action={() => { setShowPicker(!showPicker); setPickerLevel('business'); }} actionLabel="Add" />
      <p className="text-[11px] text-slate-400 mb-3">Link ad platform accounts to this project</p>

      {/* Connected accounts */}
      {(connectors || []).length > 0 && (
        <div className="space-y-1 mb-3">
          {connectors.map(c => (
            <div key={c.id} className="group flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-lg hover:bg-slate-50 transition-colors">
              <MetaIcon />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-slate-700 truncate">{c.accountName}</p>
                <p className="text-[10px] text-slate-400">{c.businessName}</p>
              </div>
              <button onClick={() => onRemove(c.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Account picker */}
      {showPicker && (
        <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[250px] flex flex-col">
          {pickerLevel === 'business' ? (
            <>
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Business</p>
              </div>
              <div className="flex-1 overflow-auto">
                {bizLoading ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">Loading...</p>
                ) : businesses.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No businesses found</p>
                ) : businesses.map(biz => (
                  <button key={biz.id} onClick={() => { setActiveBiz(biz); setPickerLevel('accounts'); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-50 transition-colors">
                    <Building2 size={13} className="text-slate-400 shrink-0" />
                    <span className="text-[12px] text-slate-600 truncate flex-1">{biz.name}</span>
                    <ChevronRight size={12} className="text-slate-300" />
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
                <button onClick={() => setPickerLevel('business')} className="text-slate-400 hover:text-slate-600">
                  <ChevronDown size={14} className="rotate-90" />
                </button>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{activeBiz?.name}</p>
              </div>
              <div className="flex-1 overflow-auto">
                {accLoading ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">Loading accounts...</p>
                ) : (Array.isArray(adAccounts) ? adAccounts : []).length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-4">No ad accounts found</p>
                ) : (Array.isArray(adAccounts) ? adAccounts : []).map(acc => {
                  const alreadyConnected = (connectors || []).some(c => c.accountId === acc.id);
                  return (
                    <button key={acc.id} onClick={() => !alreadyConnected && handleSelectAccount(acc)}
                      disabled={alreadyConnected}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${alreadyConnected ? 'opacity-40' : 'hover:bg-blue-50'}`}>
                      <MetaIcon />
                      <span className="text-[12px] text-slate-600 truncate flex-1">{acc.name}</span>
                      {alreadyConnected && <Check size={12} className="text-emerald-500" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Main Component ──
export const ProjectDetail = ({ project, skills = [], onUpdate, onDelete, onAddTask, onToggleTask, onDeleteTask, onUpdateInstructions, onAddFile, onDeleteFile, onToggleSkill, onAddConnector, onRemoveConnector, onOpenChat }) => {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [showMenu, setShowMenu] = useState(false);
  const [chatInput, setChatInput] = useState('');

  const handleSaveName = () => {
    if (nameValue.trim() && nameValue !== project.name) {
      onUpdate({ name: nameValue.trim() });
    }
    setEditingName(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 shrink-0">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <FolderOpen size={24} className="text-slate-400" />
            </div>
            <div>
              {editingName ? (
                <input value={nameValue} onChange={e => setNameValue(e.target.value)}
                  onBlur={handleSaveName}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
                  className="text-xl font-bold text-slate-900 bg-transparent border-b-2 border-blue-400 focus:outline-none px-0"
                  autoFocus />
              ) : (
                <h1 className="text-xl font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors"
                  onClick={() => { setEditingName(true); setNameValue(project.name); }}>
                  {project.name}
                </h1>
              )}
              <p className="text-[12px] text-slate-400 mt-1 flex items-center gap-2">
                <Clock size={12} />
                Updated {fmtDate(project.updatedAt)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onOpenChat}
              className="px-4 py-2 text-[12px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors">
              Open Chat
            </button>
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1">
                    <button onClick={() => { setEditingName(true); setNameValue(project.name); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-slate-600 hover:bg-slate-50">
                      <Pencil size={13} /> Rename
                    </button>
                    <button onClick={() => { onDelete(); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-red-500 hover:bg-red-50">
                      <Trash2 size={13} /> Delete Project
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Project chat input — matches main chat input style */}
      <div className="px-8 py-4 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl shadow-lg transition-all
            ${chatInput ? 'border-orange-300 ring-2 ring-orange-100 shadow-orange-100/50' : 'border-slate-200 shadow-slate-200/50 animate-[pulse-orange_3s_ease-in-out_infinite]'}`}>
            <div className="px-4 pt-4 pb-3">
              <textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && chatInput.trim()) { e.preventDefault(); onAddTask(chatInput.trim()); setChatInput(''); } }}
                placeholder="Manage ads, create skills, analyze performance... (type / for skills)"
                rows={1}
                className="w-full resize-none text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none overflow-y-auto"
                style={{ lineHeight: '1.5', maxHeight: '120px' }}
              />
            </div>
            <div className="px-4 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                  <Plus size={16} />
                </button>
                {(project.connectors || []).length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200 text-[11px] font-medium text-emerald-700 bg-emerald-50">
                    <Link2 size={11} />
                    {project.connectors[0].accountName}
                  </span>
                )}
              </div>
              <button onClick={() => { if (chatInput.trim()) { onAddTask(chatInput.trim()); setChatInput(''); } }}
                disabled={!chatInput.trim()}
                className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content — two column layout like Manus */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto px-8 py-6 flex gap-6">
          {/* Left: Tasks */}
          <div className="flex-1 min-w-0">
            <TasksSection
              tasks={project.tasks || []}
              onAdd={(title) => onAddTask(title)}
              onToggle={(taskId) => onToggleTask(taskId)}
              onDelete={(taskId) => onDeleteTask(taskId)}
            />
          </div>

          {/* Right: Instructions, Connectors, Files, Skills */}
          <div className="w-[300px] shrink-0 space-y-4">
            <InstructionsSection
              instructions={project.instructions || ''}
              onUpdate={(text) => onUpdateInstructions(text)}
            />
            <ConnectorsSection
              connectors={project.connectors || []}
              onAdd={onAddConnector}
              onRemove={onRemoveConnector}
            />
            <FilesSection
              files={project.files || []}
              onAdd={(file) => onAddFile(file)}
              onDelete={(fileId) => onDeleteFile(fileId)}
            />
            <SkillsSection
              skillIds={project.skillIds || []}
              skills={skills}
              onToggle={(skillId) => onToggleSkill(skillId)}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
