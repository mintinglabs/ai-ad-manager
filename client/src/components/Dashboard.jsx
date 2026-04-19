import { useState, useCallback, useEffect } from 'react';
import { Menu, Zap, Settings, Sparkles, Users, User, LogOut, ChevronRight, X } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useSkills } from '../hooks/useSkills.js';
import { ChatInterface } from './ChatInterface.jsx';
import { CanvasPanel } from './CanvasPanel.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';
import { SkillsLibrary } from './SkillsLibrary.jsx';
import { AudienceManager } from './AudienceManager.jsx';
import { CampaignManager } from './CampaignManager.jsx';
import { CreativeLibrary } from './CreativeLibrary.jsx';
import { AutomationRules } from './AutomationRules.jsx';
import { InstantForms } from './InstantForms.jsx';
import { EventsManager } from './EventsManager.jsx';
import { Optimizations } from './Optimizations.jsx';
import { AdLibrary } from './AdLibrary.jsx';
import { BrandLibrary } from './BrandLibrary.jsx';
import { ReportDashboard } from './ReportDashboard.jsx';
import { ProjectDetail } from './ProjectDetail.jsx';
import { useProjects } from '../hooks/useProjects.js';
import { useBrandLibrary } from '../hooks/useBrandLibrary.js';

const CARD_CATEGORIES = [];
const QUICK_CHIPS = [];

// ── Settings View — left sidebar + right panel like Claude settings ──
const SettingsView = ({ onClose, onLogout, token, userName, googleConnected, googleCustomerId }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [showTeamHelp, setShowTeamHelp] = useState(false);

  const navItems = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'team', label: 'Team', icon: Users },
  ];


  const roleColors = {
    Admin: 'bg-orange-50 text-orange-600 border-orange-200',
    Editor: 'bg-blue-50 text-blue-600 border-blue-200',
    Viewer: 'bg-slate-50 text-slate-500 border-slate-200',
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-[fadeIn_0.15s_ease-out]" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-8" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden animate-[fadeSlideUp_0.2s_ease-out]" onClick={e => e.stopPropagation()}>

      {/* Left sidebar nav — dark theme */}
      <div className="w-[200px] shrink-0 flex flex-col rounded-l-2xl relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.1),transparent_60%)]" /></div>
        <div className="relative px-4 py-5">
          <h2 className="text-[15px] font-bold text-white">Settings</h2>
          <p className="text-[10px] text-slate-400 mt-0.5">Manage your workspace</p>
        </div>
        <nav className="relative px-3 flex-1">
          {navItems.map(item => (
            <button key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[12px] font-medium mb-1 transition-all ${
                activeTab === item.id
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}>
              <item.icon size={14} className={activeTab === item.id ? 'text-orange-400' : 'text-slate-500'} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="relative px-3 py-4">
          <button onClick={onClose} className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium text-slate-500 hover:text-white hover:bg-white/5 transition-all">
            <X size={13} /> Close
          </button>
        </div>
      </div>

      {/* Right content panel */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
        {activeTab === 'account' && (
          <div className="p-8 max-w-2xl">
            <h2 className="text-[16px] font-bold text-slate-800 mb-1">Account</h2>
            <p className="text-[12px] text-slate-400 mb-6">Manage your profile and connected platforms</p>

            {/* Profile */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Profile</h3>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
                  <span className="text-white text-xl font-bold">{(userName || 'A').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-slate-800">{userName || 'User'}</p>
                  <p className="text-[12px] text-slate-400">andy.wong@presslogic.com</p>
                </div>
              </div>
            </div>

            {/* Connected Platforms */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Connected Platforms</h3>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold">f</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">Meta (Facebook & Instagram)</p>
                    <p className="text-[11px] text-slate-400">Ad accounts, campaigns, audiences, creatives</p>
                  </div>
                </div>
                {token ? (
                  <button onClick={onLogout} className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-500 transition-colors group">
                    <span className={`w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:bg-red-500 transition-colors`} />
                    <span className="group-hover:hidden">Connected</span>
                    <span className="hidden group-hover:inline">Disconnect</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Not connected
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between py-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold">G</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">Google Ads</p>
                    <p className="text-[11px] text-slate-400">
                      {googleConnected && googleCustomerId ? `Account: ${googleCustomerId}` : googleConnected ? 'Connected — pick an account from the chat bar' : 'Manage from the account picker in the chat bar'}
                    </p>
                  </div>
                </div>
                {googleConnected ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Connected
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300" /> Not connected
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between py-3 opacity-40">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                    <span className="text-white text-[11px] font-bold">T</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-slate-700">TikTok Ads</p>
                    <p className="text-[11px] text-slate-400">In-feed, TopView, Spark Ads</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-300 font-medium">Coming Soon</span>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'team' && (
          <div className="p-8 max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-[16px] font-bold text-slate-800">Team</h2>
                <button onClick={() => setShowTeamHelp(v => !v)}
                  className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-colors text-[10px] font-bold">
                  ?
                </button>
              </div>
            </div>

            {/* Help panel — collapsed by default */}
            {showTeamHelp && (
              <div className="bg-blue-50/50 rounded-xl border border-blue-200/60 p-4 mb-5 animate-[fadeSlideUp_0.2s_ease-out]">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">How Access Works</h3>
                  <button onClick={() => setShowTeamHelp(false)} className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
                </div>
                <p className="text-[11px] text-slate-600 mb-3">Everyone logs in with their own Facebook account. Their Meta Business role auto-maps to an app role. Admin can override.</p>
                <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                  <table className="w-full text-[10px]">
                    <thead><tr className="bg-blue-50/50">
                      <th className="text-left px-3 py-1.5 font-semibold text-slate-500">Meta Role</th>
                      <th className="text-left px-3 py-1.5 font-semibold text-slate-500">→ App Role</th>
                      <th className="text-left px-3 py-1.5 font-semibold text-slate-500">Can do</th>
                    </tr></thead>
                    <tbody>
                      <tr className="border-t border-blue-50"><td className="px-3 py-1.5">First user (you)</td><td className="px-3 py-1.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleColors.Admin}`}>Admin</span></td><td className="px-3 py-1.5 text-slate-400">Everything + manage team</td></tr>
                      <tr className="border-t border-blue-50"><td className="px-3 py-1.5">Admin / Advertiser</td><td className="px-3 py-1.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleColors.Editor}`}>Editor</span></td><td className="px-3 py-1.5 text-slate-400">Create, edit, publish</td></tr>
                      <tr className="border-t border-blue-50"><td className="px-3 py-1.5">Analyst</td><td className="px-3 py-1.5"><span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleColors.Viewer}`}>Viewer</span></td><td className="px-3 py-1.5 text-slate-400">View only</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-[10px] text-slate-400 mt-2">Admin can override any role, and restrict access to specific ad accounts, pages, or modules.</p>
              </div>
            )}

            {/* Members list */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* You (admin) */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-white text-sm font-bold">{(userName || 'A').charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-slate-700">{userName || 'User'}</p>
                  <p className="text-[10px] text-slate-400">All accounts · All pages · All modules</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColors.Admin}`}>Admin</span>
              </div>
              {/* Empty state */}
              <div className="px-5 py-10 text-center">
                <Users size={28} className="text-slate-200 mx-auto mb-3" />
                <p className="text-[13px] font-medium text-slate-500 mb-1">No team members yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">When teammates log in with their own Facebook account, they'll auto-appear here. You can then adjust their role and access.</p>
              </div>
            </div>
          </div>
        )}

      </div>
        </div>
      </div>
    </>
  );
};


// ── Dashboard ─────────────────────────────────────────────────────────────────

export const Dashboard = ({
  token = null,
  adAccountId = null,
  selectedAccount = null,
  selectedBusiness = null,
  onSwitchAccount,
  onSwitchBusiness,
  onLogout,
  onLogin,
  isLoginLoading,
  loginError,
  userName = '',
  googleConnected = false,
  googleCustomerId = '',
  googleLoginCustomerId = '',
  onGoogleConnect,
  onGoogleDisconnect,
  onSelectGoogleAccount,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatLanguage, setChatLanguage] = useState('en');
  const [activeView, setActiveView] = useState({ type: 'chat' });
  const [canvasData, setCanvasData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    skills, activeSkill, activeSkills, activeSkillId, activeSkillIds, toggleSkill,
    createSkill, updateSkill, deleteSkill, generateSkill, enrichSkill, getSkillContext, getSkillContextById, fetchSkills,
  } = useSkills();

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession, renameSession, pinSession,
    messages, isTyping, thinkingText, activityLog, sendMessage, stopGeneration, notification,
    savedItems, saveItem, deleteSavedItem,
    folders, createFolder, deleteFolder, renameFolder, reorderFolders,
  } = useChatSessions({ token, adAccountId, accountName: selectedAccount?.name, language: chatLanguage });

  const {
    projects, createProject, updateProject, deleteProject,
    addTask, toggleTask, deleteTask, updateInstructions, addFile, deleteFile, toggleSkill: toggleProjectSkill, addConnector, removeConnector,
  } = useProjects();

  const { getBrandContext, enabledCount: brandEnabledCount, createItem: createBrandItem } = useBrandLibrary(adAccountId);

  const handleOpenBrandLibrary = useCallback(() => {
    setActiveView({ type: 'brandLibrary' });
  }, []);


  const handleOpenProject = useCallback((projectId) => {
    setActiveView({ type: 'projectDetail', projectId });
    // Auto-switch to project's connected ad account
    const proj = projects.find(p => p.id === projectId);
    const connector = (proj?.connectors || [])[0];
    if (connector?.accountId && connector.accountId !== selectedAccount?.id) {
      const biz = connector.businessId ? { id: connector.businessId, name: connector.businessName } : selectedBusiness;
      const acc = { id: connector.accountId, name: connector.accountName, account_id: connector.accountId.replace('act_', '') };
      if (biz) onSwitchBusiness(biz);
      onSwitchAccount(acc);
    }
  }, [projects, selectedAccount, selectedBusiness, onSwitchBusiness, onSwitchAccount]);

  const handleLanguageChange = useCallback((lang) => {
    setChatLanguage(lang);
    localStorage.setItem('aam_language', lang);
  }, []);

  // Handle account switching — reset chat
  const handleAccountSelect = useCallback((business, account, { stayOnPage } = {}) => {
    onSwitchBusiness(business);
    onSwitchAccount(account);
    if (!stayOnPage) setActiveView({ type: 'chat' });
  }, [onSwitchBusiness, onSwitchAccount]);

  const handleSend = useCallback((text, attachments, slashIds) => {
    setActiveView({ type: 'chat' });
    // Inject skill context: slash commands take priority, then active skill
    let skillCtx = null;
    if (slashIds?.length) {
      skillCtx = slashIds.map(id => getSkillContextById(id)).filter(Boolean).join('\n\n---\n\n');
    }
    if (!skillCtx) skillCtx = getSkillContext();
    // Inject brand context alongside skill context
    const brandCtx = getBrandContext();
    const allContext = [skillCtx, brandCtx].filter(Boolean).join('\n\n---\n\n');
    const fullText = allContext ? `${allContext}\n\n---\n\nUser message: ${text}` : text;
    // Pass active custom skill IDs so backend load_skill can apply them
    const customSkillIds = activeSkills.filter(s => !s.isDefault).map(s => s.id);
    sendMessage(fullText, attachments, { displayText: text, activeCustomSkill: customSkillIds[0] || null, activeCustomSkills: customSkillIds });
  }, [sendMessage, getSkillContext, getSkillContextById, activeSkills, getBrandContext]);

  const handleSwitchSession = useCallback((sessionId) => {
    setActiveView({ type: 'chat' });
    switchSession(sessionId);
  }, [switchSession]);

  const handleNewChat = useCallback(() => {
    setActiveView({ type: 'chat' });
    createNewChat();
  }, [createNewChat]);

  const handleViewSavedItem = useCallback((item) => {
    setActiveView({ type: 'saved', itemId: item.id });
  }, []);

  const handleDeleteSavedItem = useCallback((itemId) => {
    deleteSavedItem(itemId);
    if (activeView.type === 'saved' && activeView.itemId === itemId) {
      setActiveView({ type: 'chat' });
    }
  }, [deleteSavedItem, activeView]);

  const handleOpenAudiences = useCallback(() => {
    setActiveView({ type: 'audiences' });
  }, []);

  const handleOpenCampaigns = useCallback(() => {
    setActiveView({ type: 'campaigns' });
  }, []);

  const handleOpenSkillsLibrary = useCallback(() => {
    setActiveView({ type: 'skillsLibrary' });
  }, []);

  const handleOpenCreativeLibrary = useCallback(() => {
    setActiveView({ type: 'creativeLibrary' });
  }, []);

  const handleOpenAutomationRules = useCallback(() => {
    setActiveView({ type: 'automationRules' });
  }, []);

  const handleOpenInstantForms = useCallback(() => {
    setActiveView({ type: 'instantForms' });
  }, []);

  const handleOpenEventsManager = useCallback(() => {
    setActiveView({ type: 'eventsManager' });
  }, []);

  const handleOpenOptimizations = useCallback(() => {
    setActiveView({ type: 'optimizations' });
  }, []);

  const handleOpenAdLibrary = useCallback(() => {
    setActiveView({ type: 'adLibrary' });
  }, []);

  const handleOpenReports = useCallback(() => {
    setActiveView({ type: 'report' });
  }, []);

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true);
  }, []);

  const [pendingInput, setPendingInput] = useState(null);
  const [pendingSlashSkill, setPendingSlashSkill] = useState(null);
  const [pendingPill, setPendingPill] = useState(null);

  // Skill toggles — single source of truth, shared with SkillsLibrary
  const [skillToggles, setSkillToggles] = useState(() => {
    try {
      const s = localStorage.getItem('skill_toggles');
      if (s) return JSON.parse(s);
    } catch {}
    return {};
  });

  // Default all official skills to ON when skills list loads
  useEffect(() => {
    const officialIds = skills.filter(s => s.isDefault).map(s => s.id);
    if (officialIds.length === 0) return;
    setSkillToggles(prev => {
      let changed = false;
      const next = { ...prev };
      officialIds.forEach(id => {
        if (next[id] === undefined) { next[id] = true; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [skills]);

  const enabledSkillIds = Object.keys(skillToggles).filter(k => skillToggles[k]);
  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('skill_toggles', JSON.stringify(skillToggles));
  }, [skillToggles]);

  const handleBuildSkillWithAI = useCallback(() => {
    createNewChat();
    const skillCreator = skills.find(s => s.id === 'skill-creator');
    if (skillCreator) setPendingSlashSkill(skillCreator);
    setPendingInput("Help me create a skill together using /skill-creator. First ask me what the skill should do.");
    setActiveView({ type: 'chat' });
  }, [skills, createNewChat]);

  const handleTrySkill = useCallback((skill) => {
    createNewChat();
    setPendingSlashSkill(skill);
    setPendingInput(`I just added the /${skill.id} skill for AI Ad Manager. Can you demo it with some great examples?`);
    setActiveView({ type: 'chat' });
  }, [createNewChat]);

  const handleAudienceToChat = useCallback((prompt) => {
    setActiveView({ type: 'chat' });
    sendMessage(prompt);
  }, [sendMessage]);

  const handlePrefillChat = useCallback((text, pill) => {
    createNewChat();
    setPendingInput(text);
    if (pill) setPendingPill(pill);
    setActiveView({ type: 'chat' });
  }, [createNewChat]);

  // Close canvas when switching to any module
  useEffect(() => { setCanvasData(null); }, [activeView]);

  const handleOpenCanvas = useCallback((data) => {
    setCanvasData(data);
  }, []);

  const handleCloseCanvas = useCallback(() => {
    setCanvasData(null);
  }, []);

  // Close canvas when switching chats
  const handleSwitchSessionWithCanvas = useCallback((sessionId) => {
    setCanvasData(null); // close canvas on chat switch
    handleSwitchSession(sessionId);
  }, [handleSwitchSession]);

  // Find current saved item for viewer
  const currentSavedItem = activeView.type === 'saved'
    ? savedItems.find(i => i.id === activeView.itemId)
    : null;

  const cardCategories = CARD_CATEGORIES;
  const quickChips = QUICK_CHIPS;

  return (
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSessionWithCanvas}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onPinSession={pinSession}
        savedItems={savedItems}
        onViewSavedItem={handleViewSavedItem}
        onDeleteSavedItem={handleDeleteSavedItem}
        activeView={activeView}
        onLogout={onLogout}
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        onSelectAccount={handleAccountSelect}
        language={chatLanguage}
        onLanguageChange={handleLanguageChange}
        folders={folders}
        onCreateFolder={createFolder}
        onDeleteFolder={deleteFolder}
        onRenameFolder={renameFolder}
        onReorderFolders={reorderFolders}
        projects={projects}
        onCreateProject={createProject}
        onOpenProject={handleOpenProject}
        skills={skills}
        activeSkill={activeSkill}
        activeSkills={activeSkills}
        activeSkillIds={activeSkillIds}
        onToggleSkill={toggleSkill}
        onOpenAudiences={handleOpenAudiences}
        onOpenCampaigns={handleOpenCampaigns}
        onOpenCreativeLibrary={handleOpenCreativeLibrary}
        onOpenAutomationRules={handleOpenAutomationRules}
        onOpenInstantForms={handleOpenInstantForms}
        onOpenEventsManager={handleOpenEventsManager}
        onOpenOptimizations={handleOpenOptimizations}
        onOpenAdLibrary={handleOpenAdLibrary}
        onOpenBrandLibrary={handleOpenBrandLibrary}
        onOpenSkillsLibrary={handleOpenSkillsLibrary}
        onOpenReports={handleOpenReports}
        onOpenSettings={handleOpenSettings}
        token={token}
        onLogin={onLogin}
      />

      {/* Main Content */}
      <main className="flex-1 flex min-w-0">
        {/* Chat area — shrinks to 40% when canvas is open */}
        <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${canvasData ? 'w-[40%]' : 'flex-1'}`}>

          {activeView.type === 'skillsLibrary' ? (
            <SkillsLibrary
              skills={skills}
              onCreate={createSkill}
              onDelete={deleteSkill}
              onBack={() => setActiveView({ type: 'chat' })}
              onActivateSkill={(skill) => { toggleSkill(skill.id); setActiveView({ type: 'chat' }); }}
              onBuildWithAI={handleBuildSkillWithAI}
              onTrySkill={handleTrySkill}
              onRefresh={fetchSkills}
              onEnrich={enrichSkill}
              skillToggles={skillToggles}
              onToggleChange={setSkillToggles}
            />
          ) : activeView.type === 'skillConfig' && activeView.skill ? (
            <StrategistConfig
              strategist={activeView.skill}
              onUpdate={async (id, updates) => {
                await updateSkill(id, updates);
              }}
              onAddDoc={() => {}}
              onRemoveDoc={() => {}}
              onBack={() => setActiveView({ type: 'skillsLibrary' })}
            />
          ) : activeView.type === 'campaigns' ? (
            <CampaignManager
              adAccountId={adAccountId}
              onBack={() => setActiveView({ type: 'chat' })}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              googleConnected={googleConnected}
              googleCustomerId={googleCustomerId}
              googleLoginCustomerId={googleLoginCustomerId}
              onGoogleConnect={onGoogleConnect}
              onGoogleDisconnect={onGoogleDisconnect}
              onSelectGoogleAccount={onSelectGoogleAccount}
            />
          ) : activeView.type === 'creativeLibrary' ? (
            <CreativeLibrary
              adAccountId={adAccountId}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
            />
          ) : activeView.type === 'automationRules' ? (
            <AutomationRules
              adAccountId={adAccountId}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
            />
          ) : activeView.type === 'instantForms' ? (
            <InstantForms
              adAccountId={adAccountId}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
            />
          ) : activeView.type === 'eventsManager' ? (
            <EventsManager
              adAccountId={adAccountId}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
            />
          ) : activeView.type === 'adLibrary' ? (
            <AdLibrary
              adAccountId={adAccountId}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSendToChat={handleAudienceToChat}
              onSelectAccount={handleAccountSelect}
              onPrefillChat={handlePrefillChat}
            />
          ) : activeView.type === 'report' ? (
            <ReportDashboard
              adAccountId={adAccountId}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onNavigateToOptimizations={() => setActiveView({ type: 'optimizations' })}
              googleConnected={googleConnected}
              googleCustomerId={googleCustomerId}
              googleLoginCustomerId={googleLoginCustomerId}
              onGoogleConnect={onGoogleConnect}
              onGoogleDisconnect={onGoogleDisconnect}
              onSelectGoogleAccount={onSelectGoogleAccount}
            />
          ) : activeView.type === 'brandLibrary' ? (
            <BrandLibrary
              adAccountId={adAccountId}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
            />
          ) : activeView.type === 'projectDetail' ? (() => {
            const proj = projects.find(p => p.id === activeView.projectId);
            if (!proj) return <div className="flex-1 flex items-center justify-center text-slate-400">Project not found</div>;
            return (
              <ProjectDetail
                project={proj}
                skills={skills}
                onUpdate={(updates) => updateProject(proj.id, updates)}
                onDelete={() => { deleteProject(proj.id); setActiveView({ type: 'chat' }); }}
                onAddTask={(title) => addTask(proj.id, title)}
                onToggleTask={(taskId) => toggleTask(proj.id, taskId)}
                onDeleteTask={(taskId) => deleteTask(proj.id, taskId)}
                onUpdateInstructions={(text) => updateInstructions(proj.id, text)}
                onAddFile={(file) => addFile(proj.id, file)}
                onDeleteFile={(fileId) => deleteFile(proj.id, fileId)}
                onToggleSkill={(skillId) => toggleProjectSkill(proj.id, skillId)}
                onAddConnector={(connector) => addConnector(proj.id, connector)}
                onRemoveConnector={(connectorId) => removeConnector(proj.id, connectorId)}
                onOpenChat={() => setActiveView({ type: 'chat' })}
              />
            );
          })() : activeView.type === 'optimizations' ? (
            <Optimizations
              adAccountId={adAccountId}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
              activeSkills={activeSkills}
              googleConnected={googleConnected}
              googleCustomerId={googleCustomerId}
              googleLoginCustomerId={googleLoginCustomerId}
              onGoogleConnect={onGoogleConnect}
              onGoogleDisconnect={onGoogleDisconnect}
              onSelectGoogleAccount={onSelectGoogleAccount}
            />
          ) : activeView.type === 'audiences' ? (
            <AudienceManager
              adAccountId={adAccountId}
              onSendToChat={handleAudienceToChat}
              onPrefillChat={handlePrefillChat}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              googleConnected={googleConnected}
              googleCustomerId={googleCustomerId}
              googleLoginCustomerId={googleLoginCustomerId}
              onGoogleConnect={onGoogleConnect}
              onGoogleDisconnect={onGoogleDisconnect}
              onSelectGoogleAccount={onSelectGoogleAccount}
            />
          ) : activeView.type === 'saved' && currentSavedItem ? (
            <SavedItemView
              item={currentSavedItem}
              onBack={() => setActiveView({ type: 'chat' })}
              onDelete={handleDeleteSavedItem}
            />
          ) : (
            <ChatInterface
              messages={messages}
              isTyping={isTyping}
              thinkingText={thinkingText}
              activityLog={activityLog}
              onSend={handleSend}
              onStop={stopGeneration}
              cardCategories={cardCategories}
              quickChips={quickChips}
              adAccountId={adAccountId}
              onSaveItem={saveItem}
              folders={folders}
              activeSkill={activeSkill}
              activeSkills={activeSkills}
              activeSkillIds={activeSkillIds}
              onDeactivateSkill={(id) => id ? toggleSkill(id) : activeSkills.forEach(s => toggleSkill(s.id))}
              skills={skills}
              onToggleSkill={toggleSkill}
              onManageSkills={(skill) => skill ? setActiveView({ type: 'skillConfig', skill }) : setActiveView({ type: 'skillsLibrary' })}
              token={token}
              onLogin={onLogin}
              isLoginLoading={isLoginLoading}
              loginError={loginError}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onLogout={onLogout}
              onNavigate={(view) => {
                const viewMap = { audiences: 'audiences', skills: 'skillsLibrary' };
                setActiveView({ type: viewMap[view] || 'chat' });
              }}
              onOpenCanvas={handleOpenCanvas}
              initialInput={pendingInput}
              initialPill={pendingPill}
              initialSlashSkill={pendingSlashSkill}
              enabledSkillIds={enabledSkillIds}
              onCreateSkill={createSkill}
              generateSkill={generateSkill}
              brandEnabledCount={brandEnabledCount}
              onSaveToBrand={createBrandItem}
              userName={userName}
              googleConnected={googleConnected}
              googleCustomerId={googleCustomerId}
              onGoogleConnect={onGoogleConnect}
              onGoogleDisconnect={onGoogleDisconnect}
              onSelectGoogleAccount={onSelectGoogleAccount}
            />
          )}
        </div>

        {/* Canvas Panel — slides in from right, 60% width */}
        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${canvasData ? 'w-[60%]' : 'w-0'}`}>
          {canvasData && (
            <CanvasPanel
              data={canvasData}
              onClose={handleCloseCanvas}
              onSend={handleSend}
            />
          )}
        </div>
      </main>

      {/* Settings Modal — floating overlay */}
      {showSettings && (
        <SettingsView
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}
          token={token}
          userName={userName}
          googleConnected={googleConnected}
          googleCustomerId={googleCustomerId}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {notification}
        </div>
      )}
    </div>
  );
};
