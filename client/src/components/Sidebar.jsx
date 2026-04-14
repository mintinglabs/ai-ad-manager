import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Plus, MessageSquare, Trash2, ChevronDown, ChevronLeft, ChevronRight, LogOut, FileText, Lightbulb, FolderOpen, Building2, Check, Globe, GripVertical, FolderPlus, X, Users, Sparkles, MoreVertical, Pin, Pencil, Menu, BarChart3, Image, Calendar, TrendingUp, ClipboardList, Settings, Palette, LayoutGrid, ListTodo, BookMarked } from 'lucide-react';
import { groupSessionsByDate } from '../hooks/useChatSessions.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useBusinesses } from '../hooks/useBusinesses.js';

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

// ── Platform logos ───────────────────────────────────────────────────────────
const MetaIcon = () => (
  <img src="/meta-icon.svg" alt="Meta" className="w-4 h-4 shrink-0" />
);

// ── Meta Ads Account Picker (direct flow: click → business → account) ────────
const RECENT_ACCOUNTS_KEY = 'aam_recent_accounts';

const getRecentAccounts = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_ACCOUNTS_KEY) || '[]'); } catch { return []; }
};

const saveRecentAccount = (business, account) => {
  const recent = getRecentAccounts().filter(r => r.account.id !== account.id);
  recent.unshift({ business: { id: business.id, name: business.name }, account: { id: account.id, name: account.name, account_id: account.account_id } });
  localStorage.setItem(RECENT_ACCOUNTS_KEY, JSON.stringify(recent.slice(0, 3)));
};

const SidebarAccountPicker = ({ selectedAccount, selectedBusiness, onSelect, token, onLogin }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('business');
  const [activeBiz, setActiveBiz] = useState(null);
  const [confirmSwitch, setConfirmSwitch] = useState(null); // { business, account }
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading, error: bizError, refetch: refetchBiz } = useBusinesses();
  const { adAccounts, isLoading: accLoading } = useAdAccounts(level === 'accounts' ? activeBiz?.id : null);
  const accounts = Array.isArray(adAccounts) ? adAccounts : [];
  const recentAccounts = getRecentAccounts();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!token && onLogin) { onLogin(); return; }
    if (!open) {
      setLevel(selectedBusiness ? 'accounts' : 'business');
      setActiveBiz(selectedBusiness || null);
    }
    setOpen(!open);
  };

  const handleBizClick = (biz) => { setActiveBiz(biz); setLevel('accounts'); };

  const handleAccClick = (account, biz) => {
    const business = biz || activeBiz;
    // If switching away from current account, show confirmation
    if (selectedAccount && account.id !== selectedAccount.id) {
      setConfirmSwitch({ business, account });
      return;
    }
    saveRecentAccount(business, account);
    onSelect(business, account);
    setOpen(false);
  };

  const confirmAccountSwitch = () => {
    if (!confirmSwitch) return;
    saveRecentAccount(confirmSwitch.business, confirmSwitch.account);
    onSelect(confirmSwitch.business, confirmSwitch.account);
    setConfirmSwitch(null);
    setOpen(false);
  };

  const hasSelection = selectedBusiness && selectedAccount;

  return (
    <div className="px-3 mb-2 space-y-1" ref={ref}>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 py-0.5">Ad Platforms</p>

      {/* Meta Ads — click directly opens business/account picker */}
      <div className="relative">
        <button onClick={toggle}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${hasSelection
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : !token
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse-subtle'
            }`}>
          <MetaIcon />
          <span className="flex-1 text-left truncate">
            {hasSelection ? `${selectedAccount.name}` : !token ? 'Connect Meta Ads' : 'Meta Ads'}
          </span>
          {token && <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />}
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 z-50 overflow-hidden">
            {level === 'business' && (
              <>
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {bizLoading ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">Loading...</div>
                  ) : businesses.length === 0 ? (
                    <div className="px-3 py-6 text-center">
                      <p className="text-xs text-slate-400">{bizError || 'No businesses found'}</p>
                      <button onClick={(e) => { e.stopPropagation(); refetchBiz(); }}
                        className="mt-2 text-[10px] text-blue-500 hover:underline">Retry</button>
                    </div>
                  ) : businesses.map((biz) => (
                    <button key={biz.id} onClick={() => handleBizClick(biz)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                        ${biz.id === selectedBusiness?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <Building2 size={12} className="text-emerald-600 shrink-0" />
                      <span className="text-xs font-medium text-slate-700 truncate flex-1">{biz.name}</span>
                      <ChevronRight size={14} className="text-slate-300 shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}
            {level === 'accounts' && (
              <>
                <button onClick={() => setLevel('business')}
                  className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={14} className="text-slate-400" />
                  <Building2 size={12} className="text-emerald-600" />
                  <span className="text-xs font-medium text-slate-500 truncate">{activeBiz?.name}</span>
                </button>
                <div className="max-h-56 overflow-y-auto">
                  {accLoading ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">Loading...</div>
                  ) : accounts.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">No accounts found</div>
                  ) : accounts.map((account) => (
                    <button key={account.id} onClick={() => handleAccClick(account, activeBiz)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                        ${account.id === selectedAccount?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                      <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                        {account.name?.[0]?.toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${account.id === selectedAccount?.id ? 'text-blue-600' : 'text-slate-700'}`}>{account.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">act_{account.account_id}</p>
                      </div>
                      {account.id === selectedAccount?.id && <Check size={14} className="text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recent accounts quick-switch */}
      {token && !open && recentAccounts.length > 1 && (
        <div className="mt-1 space-y-0.5">
          {recentAccounts.filter(r => r.account.id !== selectedAccount?.id).slice(0, 2).map(r => (
            <button key={r.account.id} onClick={() => handleAccClick(r.account, r.business)}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
              <span className="w-4 h-4 rounded bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-500 shrink-0">{r.account.name?.[0]?.toUpperCase()}</span>
              <span className="truncate">{r.account.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Confirmation dialog for account switching */}
      {confirmSwitch && (
        <div className="absolute inset-0 z-[80] bg-black/20 backdrop-blur-sm flex items-center justify-center" onClick={() => setConfirmSwitch(null)}>
          <div className="bg-white rounded-xl shadow-xl w-56 mx-3" onClick={e => e.stopPropagation()}>
            <div className="px-4 pt-4 pb-2">
              <p className="text-xs font-bold text-slate-800 mb-1">Switch Account?</p>
              <p className="text-[11px] text-slate-500">Switching to <strong>{confirmSwitch.account.name}</strong> will start a new chat.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-4 py-3">
              <button onClick={() => setConfirmSwitch(null)} className="px-3 py-1.5 rounded-lg text-[11px] font-medium text-slate-400 hover:bg-slate-50">Cancel</button>
              <button onClick={confirmAccountSwitch} className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">Switch</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export const Sidebar = ({
  open,
  onToggle,
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
  onRenameSession,
  onPinSession,
  savedItems,
  onViewSavedItem,
  onDeleteSavedItem,
  onOpenSkillsLibrary,
  activeView,
  onLogout,
  selectedAccount,
  selectedBusiness,
  onSelectAccount,
  language,
  onLanguageChange,
  folders = [],
  skills = [],
  activeSkill = null,
  onToggleSkill,
  onCreateFolder,
  onDeleteFolder,
  onRenameFolder,
  onReorderFolders,
  projects = [],
  onCreateProject,
  onOpenProject,
  onOpenAudiences,
  onOpenCampaigns,
  onOpenCreativeLibrary,
  onOpenAutomationRules,
  onOpenInstantForms,
  onOpenEventsManager,
  onOpenOptimizations,
  onOpenAdLibrary,
  onOpenBrandLibrary,
  token,
  onLogin,
}) => {
  const [openFolders, setOpenFolders] = useState({});
  const [hoveredSession, setHoveredSession] = useState(null);
  const [contextMenu, setContextMenu] = useState(null); // { sessionId, x, y }
  const [renamingSession, setRenamingSession] = useState(null); // sessionId
  const [renameValue, setRenameValue] = useState('');
  const contextRef = useRef(null);
  const [addingFolder, setAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [dragFolderId, setDragFolderId] = useState(null);
  const [dragOverFolderId, setDragOverFolderId] = useState(null);
  const [collapsedHistoryOpen, setCollapsedHistoryOpen] = useState(false);
  const [addingProject, setAddingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [collapsedProjectsOpen, setCollapsedProjectsOpen] = useState(false);
  const [collapsedModulesOpen, setCollapsedModulesOpen] = useState(false);
  const [manageAdsOpen, setManageAdsOpen] = useState(true);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const newFolderRef = useRef(null);

  // Close context menu / collapsed flyouts on outside click
  const sidebarRef = useRef(null);
  useEffect(() => {
    if (!contextMenu && !collapsedHistoryOpen && !collapsedProjectsOpen && !collapsedModulesOpen) return;
    const handler = (e) => {
      // Don't close if click is inside sidebar (flyout buttons live there)
      if (sidebarRef.current?.contains(e.target)) return;
      if (contextMenu && contextRef.current && !contextRef.current.contains(e.target)) setContextMenu(null);
      setCollapsedHistoryOpen(false);
      setCollapsedProjectsOpen(false);
      setCollapsedModulesOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu, collapsedHistoryOpen, collapsedProjectsOpen, collapsedModulesOpen]);

  const grouped = groupSessionsByDate(sessions);
  const sortedFolders = [...folders].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const handleAddFolder = () => {
    setAddingFolder(true);
    setTimeout(() => newFolderRef.current?.focus(), 50);
  };
  const handleCreateFolder = () => {
    if (newFolderName.trim() && onCreateFolder) onCreateFolder(newFolderName.trim());
    setAddingFolder(false);
    setNewFolderName('');
  };
  const handleFolderDragStart = (e, folderId) => {
    setDragFolderId(folderId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleFolderDragOver = (e, folderId) => {
    e.preventDefault();
    if (folderId !== dragFolderId) setDragOverFolderId(folderId);
  };
  const handleFolderDrop = (e, targetFolderId) => {
    e.preventDefault();
    if (dragFolderId && dragFolderId !== targetFolderId && onReorderFolders) {
      const ids = sortedFolders.map(f => f.id);
      const fromIdx = ids.indexOf(dragFolderId);
      const toIdx = ids.indexOf(targetFolderId);
      if (fromIdx !== -1 && toIdx !== -1) {
        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, dragFolderId);
        onReorderFolders(ids);
      }
    }
    setDragFolderId(null);
    setDragOverFolderId(null);
  };
  const handleFolderDragEnd = () => { setDragFolderId(null); setDragOverFolderId(null); };
  const startRenaming = (folder) => { setEditingFolderId(folder.id); setEditFolderName(folder.name); };
  const finishRenaming = () => {
    if (editFolderName.trim() && onRenameFolder) onRenameFolder(editingFolderId, editFolderName.trim());
    setEditingFolderId(null);
    setEditFolderName('');
  };

  const modules = [
    { icon: BarChart3, type: 'campaigns', action: onOpenCampaigns, label: 'Campaigns' },
    { icon: Users, type: 'audiences', action: onOpenAudiences, label: 'Audiences' },
    { icon: Image, type: 'creativeLibrary', action: onOpenCreativeLibrary, label: 'Asset Library' },
    { icon: Palette, type: 'adLibrary', action: onOpenAdLibrary, label: 'Ad Library' },
    { icon: BookMarked, type: 'brandLibrary', action: onOpenBrandLibrary, label: 'Brand Library' },
    { icon: ClipboardList, type: 'instantForms', action: onOpenInstantForms, label: 'Instant Forms' },
    { icon: TrendingUp, type: 'eventsManager', action: onOpenEventsManager, label: 'Events Manager' },
    { icon: Settings, type: 'automationRules', action: onOpenAutomationRules, label: 'Automation Rules' },
    { icon: Zap, type: 'optimizations', action: () => {}, label: 'Optimizations' },
    { icon: FileText, type: 'report', action: () => {}, label: 'Report' },
  ];

  return (
    <aside ref={sidebarRef} style={{ width: open ? 260 : 52 }}
      className={`shrink-0 bg-white/70 backdrop-blur-xl border-r border-slate-200 flex flex-col h-screen transition-all duration-200 ease-in-out z-20 relative ${open ? 'overflow-hidden' : 'overflow-visible'}`}>

      {/* Collapsed overlay — icon rail */}
      <div className={`absolute inset-0 flex flex-col items-center transition-opacity duration-150 ${open ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Header */}
        <div className="h-[64px] w-full flex items-center justify-center shrink-0">
          <button onClick={onToggle}
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <Menu size={18} />
          </button>
        </div>
        {/* New Task */}
        <div className="w-full px-1.5 mb-1.5 shrink-0">
          <button onClick={onNewChat}
            className="group relative w-full h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors border border-slate-200">
            <Plus size={16} />
            <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">New Task</span>
          </button>
        </div>
        {/* Skills */}
        <div className="w-full px-1.5 shrink-0">
          <button onClick={onOpenSkillsLibrary}
            className={`group relative w-full h-[36px] rounded-xl flex items-center justify-center transition-colors
              ${activeView?.type === 'skillsLibrary' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <Sparkles size={16} />
            <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">Skills</span>
          </button>
        </div>



        {/* Manage Ads — single icon with flyout for all modules */}
        <div className="relative w-full px-1.5 shrink-0">
          <button onClick={() => { setCollapsedModulesOpen(v => !v); setCollapsedProjectsOpen(false); setCollapsedHistoryOpen(false); }}
            className={`group w-full h-[36px] rounded-xl flex items-center justify-center transition-colors
              ${collapsedModulesOpen || modules.some(m => m.type && activeView?.type === m.type) ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <LayoutGrid size={16} />
            {!collapsedModulesOpen && (
              <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">Manage Ads</span>
            )}
          </button>
          {collapsedModulesOpen && (
            <div className="absolute left-full top-0 ml-2 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden flex flex-col">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Manage Ads</p>
              </div>
              <div className="py-1">
                {modules.map(({ icon: Icon, type, action, label }) => {
                  const isActive = type && activeView?.type === type;
                  return (
                    <button key={label} onClick={() => { action(); setCollapsedModulesOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors
                        ${isActive ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                      <Icon size={14} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                      <span className="text-[12px] font-medium">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Projects flyout */}
        <div className="relative w-full px-1.5 shrink-0">
          <button onClick={() => { setCollapsedProjectsOpen(v => !v); setCollapsedHistoryOpen(false); }}
            className={`group w-full h-[36px] rounded-xl flex items-center justify-center transition-colors
              ${collapsedProjectsOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <FolderOpen size={16} />
            {!collapsedProjectsOpen && (
              <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">Projects</span>
            )}
          </button>
          {collapsedProjectsOpen && (
            <div className="absolute left-full top-0 ml-2 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden max-h-[350px] flex flex-col">
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Projects</p>
                <button onClick={() => { setCollapsedProjectsOpen(false); onToggle(); setTimeout(() => setAddingProject(true), 200); }}
                  className="text-slate-300 hover:text-blue-500 transition-colors"><Plus size={12} /></button>
              </div>
              <div className="flex-1 overflow-auto">
                {projects.length === 0 ? (
                  <p className="text-[10px] text-slate-400 px-3 py-4 text-center">No projects yet</p>
                ) : projects.map(proj => (
                  <button key={proj.id} onClick={() => { setCollapsedProjectsOpen(false); onOpenProject(proj.id); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
                      ${activeView?.type === 'projectDetail' && activeView?.projectId === proj.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                    <FolderOpen size={13} className="text-slate-400 shrink-0" />
                    <span className="text-[11px] truncate flex-1">{proj.name}</span>
                    {(proj.tasks || []).length > 0 && (
                      <span className="text-[9px] text-slate-300">{(proj.tasks || []).filter(t => t.completed).length}/{(proj.tasks || []).length}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* All Tasks flyout */}
        <div className="relative w-full px-1.5 shrink-0">
          <button onClick={() => { setCollapsedHistoryOpen(v => !v); setCollapsedProjectsOpen(false); }}
            className={`group w-full h-[36px] rounded-xl flex items-center justify-center transition-colors
              ${collapsedHistoryOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <ListTodo size={16} />
            {!collapsedHistoryOpen && (
              <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">All Tasks</span>
            )}
          </button>
          {collapsedHistoryOpen && (
            <div className="absolute left-full top-0 ml-2 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-[60] overflow-hidden max-h-[350px] flex flex-col">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">All Tasks</p>
              </div>
              <div className="flex-1 overflow-auto">
                {sessions.slice(0, 15).map(s => (
                  <button key={s.id} onClick={() => { onSwitchSession(s.id); setCollapsedHistoryOpen(false); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors
                      ${s.id === activeSessionId ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                    <ListTodo size={12} className="shrink-0 text-slate-400" />
                    <span className="text-[11px] truncate">{s.title || 'Untitled'}</span>
                  </button>
                ))}
                {sessions.length === 0 && <p className="text-[10px] text-slate-400 px-3 py-4 text-center">No tasks yet</p>}
              </div>
            </div>
          )}
        </div>
        <div className="flex-1" />
        <div className="pb-4">
          <div className="group relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-[10px] font-bold">A</span>
            <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-[60] shadow-lg">Andy Wong</span>
          </div>
        </div>
      </div>

      {/* Expanded content — fades in/out */}
      <div className={`flex flex-col h-full transition-opacity duration-150 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200/50">
            <Zap size={18} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-800 tracking-tight">AI Ad Manager</span>
        </div>
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 transition-colors">
          <Menu size={18} />
        </button>
      </div>

      {/* New Task */}
      <div className="px-3 mb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all hover:shadow-sm"
        >
          <Plus size={16} className="text-slate-400" />
          New Task
        </button>
      </div>

      {/* Navigation */}
      <div className="px-3 mb-2">
        {/* Skills */}
        <button
          onClick={onOpenSkillsLibrary}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'skillsLibrary' || activeView?.type === 'skillConfig'
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Sparkles size={14} className={activeView?.type === 'skillsLibrary' || activeView?.type === 'skillConfig' ? 'text-indigo-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Skills</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Manage Ads — collapsible group */}
        <button
          onClick={() => setManageAdsOpen(v => !v)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border mt-1
            ${modules.some(m => m.type && activeView?.type === m.type)
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <LayoutGrid size={14} className={modules.some(m => m.type && activeView?.type === m.type) ? 'text-blue-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Manage Ads</span>
          <ChevronDown size={12} className={`text-slate-300 transition-transform ${manageAdsOpen ? '' : '-rotate-90'}`} />
        </button>

        {manageAdsOpen && (
          <div className="ml-3 pl-3 border-l border-slate-100 mt-0.5">
            {modules.map(({ icon: Icon, type, action, label }) => {
              const isActive = type && activeView?.type === type;
              return (
                <button key={label} onClick={action}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all
                    ${isActive ? 'bg-blue-50 text-blue-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                  <Icon size={13} className={isActive ? 'text-blue-500' : 'text-slate-400'} />
                  <span className="flex-1 text-left">{label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scrollable area: Projects first, then All Tasks */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">

        {/* Projects Section (Manus-style) */}
        <div className="mb-3">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Projects</p>
            <button onClick={() => setAddingProject(true)} className="text-slate-300 hover:text-blue-500 transition-colors" title="New project">
              <Plus size={13} />
            </button>
          </div>

          {/* Inline new project input */}
          {addingProject && (
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <FolderOpen size={13} className="text-blue-400 shrink-0" />
              <input
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onBlur={() => { if (newProjectName.trim()) { const p = onCreateProject(newProjectName.trim()); onOpenProject(p.id); } setAddingProject(false); setNewProjectName(''); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newProjectName.trim()) { const p = onCreateProject(newProjectName.trim()); onOpenProject(p.id); setAddingProject(false); setNewProjectName(''); }
                  if (e.key === 'Escape') { setAddingProject(false); setNewProjectName(''); }
                }}
                placeholder="Project name..."
                className="text-[12px] font-medium bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
                autoFocus
              />
            </div>
          )}

          {projects.length === 0 && !addingProject ? (
            <p className="px-3 py-2 text-[11px] text-slate-300 italic">No projects yet</p>
          ) : (
            projects.map(project => (
              <button key={project.id} onClick={() => onOpenProject(project.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors
                  ${activeView?.type === 'projectDetail' && activeView?.projectId === project.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-700'}`}>
                <FolderOpen size={14} className={`shrink-0 ${activeView?.type === 'projectDetail' && activeView?.projectId === project.id ? 'text-blue-500' : 'text-slate-400'}`} />
                <span className="flex-1 text-[12px] font-medium truncate">{project.name}</span>
                {(project.tasks || []).length > 0 && (
                  <span className="text-[9px] text-slate-300 shrink-0">{(project.tasks || []).filter(t => t.completed).length}/{(project.tasks || []).length}</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* All Tasks */}
        <div className="border-t border-slate-100 pt-2">
          <div className="flex items-center justify-between px-3 py-1.5 mb-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">All Tasks</p>
          </div>
          {sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <ListTodo size={20} className="text-slate-200 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">No tasks yet</p>
            </div>
          ) : (
            DATE_GROUP_ORDER.map(group => {
              const items = grouped[group];
              if (!items?.length) return null;
              return (
                <div key={group} className="mb-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">{group}</p>
                  {items.map(session => {
                    const isActive = session.id === activeSessionId && activeView?.type === 'chat';
                    const isPinned = session.pinned;
                    return (
                      <div key={session.id} className="relative">
                        {renamingSession === session.id ? (
                          <div className="flex items-center gap-2 px-3 py-2">
                            <ListTodo size={14} className="text-blue-500 shrink-0" />
                            <input
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => { onRenameSession?.(session.id, renameValue); setRenamingSession(null); }}
                              onKeyDown={(e) => { if (e.key === 'Enter') { onRenameSession?.(session.id, renameValue); setRenamingSession(null); } if (e.key === 'Escape') setRenamingSession(null); }}
                              className="flex-1 text-[13px] font-medium bg-blue-50 border border-blue-200 rounded px-2 py-0.5 focus:outline-none"
                              autoFocus
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => onSwitchSession(session.id)}
                            onMouseEnter={() => setHoveredSession(session.id)}
                            onMouseLeave={() => setHoveredSession(null)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[13px] transition-colors group
                              ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                          >
                            <ListTodo size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                            <span className="truncate flex-1">{session.title}</span>
                            {isPinned && <Pin size={10} className="text-blue-400 shrink-0" />}
                            {hoveredSession === session.id && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setContextMenu({ sessionId: session.id, x: e.clientX, y: e.clientY }); }}
                                className="p-1 rounded hover:bg-slate-200 text-slate-300 hover:text-slate-600 transition-colors shrink-0"
                              >
                                <MoreVertical size={12} />
                              </button>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="px-3 pb-4 pt-2">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">Andy Wong</p>
            <p className="text-[11px] text-slate-400 truncate">andy.wong@presslogic.com</p>
          </div>
          {token && onLogout && (
            <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 transition-colors" title="Log out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
      {/* Context Menu for chat sessions */}
      {contextMenu && (
        <div ref={contextRef}
          style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x, zIndex: 100 }}
          className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden min-w-[140px]">
          <button onClick={() => {
            onPinSession?.(contextMenu.sessionId);
            setContextMenu(null);
          }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-slate-600 hover:bg-slate-50 transition-colors">
            <Pin size={13} className="text-slate-400" />
            {sessions.find(s => s.id === contextMenu.sessionId)?.pinned ? 'Unpin' : 'Pin'}
          </button>
          <button onClick={() => {
            const session = sessions.find(s => s.id === contextMenu.sessionId);
            setRenameValue(session?.title || '');
            setRenamingSession(contextMenu.sessionId);
            setContextMenu(null);
          }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-slate-600 hover:bg-slate-50 transition-colors">
            <Pencil size={13} className="text-slate-400" />
            Rename
          </button>
          <button onClick={() => {
            onDeleteSession(contextMenu.sessionId);
            setContextMenu(null);
          }}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[12px] text-red-500 hover:bg-red-50 transition-colors border-t border-slate-100">
            <Trash2 size={13} />
            Delete
          </button>
        </div>
      )}

      </div>
    </aside>
  );
};
