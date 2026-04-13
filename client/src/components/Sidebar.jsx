import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Plus, MessageSquare, Trash2, ChevronDown, ChevronLeft, ChevronRight, LogOut, FileText, Lightbulb, FolderOpen, Building2, Check, Globe, GripVertical, FolderPlus, X, Users, Sparkles, MoreVertical, Pin, Pencil, Menu, BarChart3, Image, Calendar, TrendingUp, ClipboardList, Settings, Palette } from 'lucide-react';
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
  onOpenAudiences,
  onOpenCampaigns,
  onOpenCreativeLibrary,
  onOpenAutomationRules,
  onOpenInstantForms,
  onOpenEventsManager,
  onOpenOptimizations,
  onOpenAdLibrary,
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
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editFolderName, setEditFolderName] = useState('');
  const newFolderRef = useRef(null);

  // Close context menu / collapsed history on outside click
  useEffect(() => {
    if (!contextMenu && !collapsedHistoryOpen) return;
    const handler = (e) => {
      if (contextMenu && contextRef.current && !contextRef.current.contains(e.target)) setContextMenu(null);
      if (collapsedHistoryOpen) setCollapsedHistoryOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [contextMenu, collapsedHistoryOpen]);

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

  // Collapsed icon rail — hover to expand
  if (!open) {
    const modules = [
      { icon: BarChart3, type: 'campaigns', action: onOpenCampaigns, label: 'Campaigns' },
      { icon: Users, type: 'audiences', action: onOpenAudiences, label: 'Audiences' },
      { icon: Image, type: 'creativeLibrary', action: onOpenCreativeLibrary, label: 'Asset Library' },
      { icon: Palette, type: 'adLibrary', action: onOpenAdLibrary, label: 'Ad Library' },
      { icon: ClipboardList, type: 'instantForms', action: onOpenInstantForms, label: 'Instant Forms' },
      { icon: TrendingUp, type: 'eventsManager', action: onOpenEventsManager, label: 'Events Manager' },
      { icon: Settings, type: 'automationRules', action: onOpenAutomationRules, label: 'Automation Rules' },
      { icon: Zap, type: 'optimizations', action: () => {}, label: 'Optimizations' },
      { icon: FileText, type: 'report', action: () => {}, label: 'Report' },
    ];
    const allItems = [
      { icon: Sparkles, label: 'Skills', action: onOpenSkillsLibrary, type: 'skillsLibrary' },
      ...modules,
    ];
    return (
      <aside className="w-[52px] shrink-0 bg-white/70 backdrop-blur-xl border-r border-slate-200 flex flex-col h-screen items-center">
        {/* Header — same height as expanded (px-4 py-4 = 64px total) */}
        <div className="h-[64px] w-full flex items-center justify-center shrink-0">
          <button onClick={onToggle} title="Expand sidebar"
            className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
            <Menu size={18} />
          </button>
        </div>

        {/* New Chat — taller to match expanded button with mb-2 */}
        <div className="w-full px-1.5 mb-1.5 shrink-0">
          <button onClick={onNewChat}
            className="group relative w-full h-[40px] rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors border border-slate-200">
            <Plus size={16} />
            <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">New Chat</span>
          </button>
        </div>

        {/* All module items */}
        <div className="flex flex-col items-center w-full px-1.5 gap-0.5 shrink-0">
          {allItems.map(({ icon: Icon, type, action, label }) => {
            const isActive = type && activeView?.type === type;
            return (
              <button key={label} onClick={action}
                className={`group relative w-full h-[36px] rounded-xl flex items-center justify-center transition-colors
                  ${isActive ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                <Icon size={16} />
                <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">{label}</span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-6 h-px bg-slate-200 my-2" />

        {/* History — single icon, click to show flyout with folders + recent chats */}
        <div className="relative w-full px-1.5 shrink-0">
          <button onClick={() => setCollapsedHistoryOpen(v => !v)}
            className={`group w-full h-[36px] rounded-xl flex items-center justify-center transition-colors
              ${collapsedHistoryOpen ? 'bg-slate-100 text-slate-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
            <MessageSquare size={16} />
            {!collapsedHistoryOpen && (
              <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">Chats & Folders</span>
            )}
          </button>

          {/* Flyout menu */}
          {collapsedHistoryOpen && (
            <div className="absolute left-full top-0 ml-2 w-[240px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden max-h-[400px] flex flex-col">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Chats & Folders</p>
              </div>

              <div className="flex-1 overflow-auto">
                {/* Folders */}
                {sortedFolders.length > 0 && (
                  <div className="px-2 py-1.5">
                    <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider px-2 mb-1">Folders</p>
                    {sortedFolders.map(folder => (
                      <button key={folder.id} onClick={() => { setCollapsedHistoryOpen(false); onToggle(); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 text-left transition-colors">
                        <FolderOpen size={13} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] text-slate-600 truncate">{folder.name}</span>
                        <span className="text-[9px] text-slate-300 ml-auto shrink-0">{(folder.sessionIds || []).length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent conversations */}
                <div className="px-2 py-1.5">
                  <p className="text-[9px] font-bold text-slate-300 uppercase tracking-wider px-2 mb-1">Recent</p>
                  {sessions.slice(0, 10).map(s => (
                    <button key={s.id} onClick={() => { onSwitchSession(s.id); setCollapsedHistoryOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors
                        ${s.id === activeSessionId ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                      <MessageSquare size={12} className="shrink-0 text-slate-400" />
                      <span className="text-[11px] truncate">{s.title || 'Untitled'}</span>
                    </button>
                  ))}
                  {sessions.length === 0 && (
                    <p className="text-[10px] text-slate-400 px-2 py-2">No conversations yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* User avatar */}
        <div className="pb-4">
          <div className="group relative w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-[10px] font-bold">A</span>
            <span className="absolute left-full ml-2 px-2.5 py-1 text-[11px] font-medium text-white bg-slate-800 rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 shadow-lg">Andy Wong</span>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-[260px] shrink-0 bg-white/70 backdrop-blur-xl border-r border-slate-200 flex flex-col h-screen">

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

      {/* New Chat */}
      <div className="px-3 mb-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all hover:shadow-sm"
        >
          <Plus size={16} className="text-slate-400" />
          New Chat
        </button>
      </div>

      {/* All navigation items — flat list */}
      <div className="px-3 mb-2">
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

        {/* Campaigns */}
        <button
          onClick={onOpenCampaigns}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'campaigns'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <BarChart3 size={14} className={activeView?.type === 'campaigns' ? 'text-emerald-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Campaigns</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Audiences */}
        <button
          onClick={onOpenAudiences}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'audiences'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Users size={14} className={activeView?.type === 'audiences' ? 'text-blue-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Audiences</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Asset Library */}
        <button
          onClick={onOpenCreativeLibrary}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'creativeLibrary'
              ? 'bg-pink-50 text-pink-700 border-pink-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Image size={14} className={activeView?.type === 'creativeLibrary' ? 'text-pink-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Asset Library</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Ad Library */}
        <button
          onClick={onOpenAdLibrary}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'adLibrary'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Palette size={14} className={activeView?.type === 'adLibrary' ? 'text-orange-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Ad Library</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Instant Forms (Lead Gen) */}
        <button
          onClick={onOpenInstantForms}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'instantForms'
              ? 'bg-orange-50 text-orange-700 border-orange-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <ClipboardList size={14} className={activeView?.type === 'instantForms' ? 'text-orange-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Instant Forms</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Events Manager */}
        <button
          onClick={onOpenEventsManager}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'eventsManager'
              ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <TrendingUp size={14} className={activeView?.type === 'eventsManager' ? 'text-cyan-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Events Manager</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Automation Rules */}
        <button
          onClick={onOpenAutomationRules}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'automationRules'
              ? 'bg-violet-50 text-violet-700 border-violet-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Settings size={14} className={activeView?.type === 'automationRules' ? 'text-violet-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Automation Rules</span>
          <ChevronRight size={12} className="text-slate-300" />
        </button>

        {/* Optimizations */}
        <button
          onClick={() => {}}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'optimizations'
              ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Zap size={14} className={activeView?.type === 'optimizations' ? 'text-amber-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Optimizations</span>
          <span className="text-[9px] text-slate-300 font-medium">Soon</span>
        </button>

        {/* Report */}
        <button
          onClick={() => {}}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${activeView?.type === 'report'
              ? 'bg-slate-100 text-slate-700 border-slate-300'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <ClipboardList size={14} className={activeView?.type === 'report' ? 'text-slate-500' : 'text-slate-400'} />
          <span className="flex-1 text-left">Report</span>
          <span className="text-[9px] text-slate-300 font-medium">Soon</span>
        </button>
      </div>

      {/* Scrollable area: Folders first, then Chat History */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">

        {/* Folders Section */}
        <div className="mb-3">
          <div className="flex items-center justify-between px-3 py-1.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Folders</p>
            <button onClick={handleAddFolder} className="text-slate-300 hover:text-blue-500 transition-colors" title="Add folder">
              <FolderPlus size={13} />
            </button>
          </div>

          {sortedFolders.map(folder => {
            const folderItems = savedItems.filter(i => (i.folderId || (i.type === 'report' ? 'reports' : i.type === 'strategy' ? 'strategies' : '')) === folder.id);
            const isOpen = openFolders[folder.id] ?? true;
            const isDefault = folder.id === 'reports' || folder.id === 'strategies';
            const folderIcon = folder.id === 'reports' ? <FileText size={13} className="text-blue-400" />
              : folder.id === 'strategies' ? <Lightbulb size={13} className="text-amber-400" />
              : <FolderOpen size={13} className="text-slate-400" />;

            return (
              <div
                key={folder.id}
                draggable
                onDragStart={(e) => handleFolderDragStart(e, folder.id)}
                onDragOver={(e) => handleFolderDragOver(e, folder.id)}
                onDrop={(e) => handleFolderDrop(e, folder.id)}
                onDragEnd={handleFolderDragEnd}
                className={`mb-0.5 transition-all ${dragOverFolderId === folder.id && dragFolderId !== folder.id ? 'border-t-2 border-blue-400' : 'border-t-2 border-transparent'} ${dragFolderId === folder.id ? 'opacity-40' : ''}`}
              >
                <div className="flex items-center gap-1.5 group px-1">
                  <GripVertical size={14} className="text-slate-300 cursor-grab shrink-0 hover:text-slate-500 transition-colors" />
                  <button
                    onClick={() => setOpenFolders(prev => ({ ...prev, [folder.id]: !isOpen }))}
                    className="flex-1 flex items-center gap-2 px-2 py-2 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors min-w-0"
                  >
                    {folderIcon}
                    {editingFolderId === folder.id ? (
                      <input
                        value={editFolderName}
                        onChange={(e) => setEditFolderName(e.target.value)}
                        onBlur={finishRenaming}
                        onKeyDown={(e) => { if (e.key === 'Enter') finishRenaming(); if (e.key === 'Escape') setEditingFolderId(null); }}
                        className="text-[12px] font-medium bg-blue-50 border border-blue-200 rounded px-1 py-0.5 w-full min-w-0 focus:outline-none"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="flex-1 truncate text-left" onDoubleClick={(e) => { e.stopPropagation(); startRenaming(folder); }}>
                        {folder.name} ({folderItems.length})
                      </span>
                    )}
                    {isOpen ? <ChevronDown size={12} className="shrink-0 text-slate-300" /> : <ChevronRight size={12} className="shrink-0 text-slate-300" />}
                  </button>
                  {!isDefault && editingFolderId !== folder.id && (
                    <button onClick={() => onDeleteFolder?.(folder.id)}
                      className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all p-1 shrink-0"
                      title="Delete folder">
                      <X size={10} />
                    </button>
                  )}
                </div>
                {isOpen && folderItems.length > 0 && folderItems.map(item => (
                  <button key={item.id} onClick={() => onViewSavedItem(item)}
                    className={`w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-left
                      ${activeView?.type === 'saved' && activeView?.itemId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}>
                    <span className="truncate">{item.title}</span>
                  </button>
                ))}
                {isOpen && folderItems.length === 0 && (
                  <p className="pl-10 pr-3 py-1 text-[11px] text-slate-300 italic">Empty</p>
                )}
              </div>
            );
          })}

          {/* Add folder inline input */}
          {addingFolder && (
            <div className="flex items-center gap-1.5 px-3 py-1.5">
              <FolderPlus size={13} className="text-blue-400 shrink-0" />
              <input
                ref={newFolderRef}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onBlur={handleCreateFolder}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') { setAddingFolder(false); setNewFolderName(''); } }}
                placeholder="Folder name..."
                className="text-[12px] font-medium bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-blue-300"
              />
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="border-t border-slate-100 pt-2">
          {sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <MessageSquare size={20} className="text-slate-200 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">No conversations yet</p>
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
                            <MessageSquare size={14} className="text-blue-500 shrink-0" />
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
                            <MessageSquare size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
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

    </aside>
  );
};
