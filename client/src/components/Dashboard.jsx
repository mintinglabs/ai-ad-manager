import { useState, useCallback, useEffect } from 'react';
import { Menu, Zap } from 'lucide-react';
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
import { ProjectDetail } from './ProjectDetail.jsx';
import { useProjects } from '../hooks/useProjects.js';
import { useBrandLibrary } from '../hooks/useBrandLibrary.js';

const CARD_CATEGORIES = [];
const QUICK_CHIPS = [];


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
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatLanguage, setChatLanguage] = useState('en');
  const [activeView, setActiveView] = useState({ type: 'chat' });
  const [canvasData, setCanvasData] = useState(null);

  const {
    skills, activeSkill, activeSkills, activeSkillId, activeSkillIds, toggleSkill,
    createSkill, updateSkill, deleteSkill, generateSkill, getSkillContext, getSkillContextById, fetchSkills,
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

  const { getBrandContext } = useBrandLibrary();

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

  const [pendingInput, setPendingInput] = useState(null);
  const [pendingSlashSkill, setPendingSlashSkill] = useState(null);

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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

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
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
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
              activeSkills={activeSkills}
            />
          ) : activeView.type === 'audiences' ? (
            <AudienceManager
              adAccountId={adAccountId}
              onSendToChat={handleAudienceToChat}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
              onLogout={onLogout}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
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
              initialSlashSkill={pendingSlashSkill}
              enabledSkillIds={enabledSkillIds}
              onCreateSkill={createSkill}
              generateSkill={generateSkill}
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

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {notification}
        </div>
      )}
    </div>
  );
};
