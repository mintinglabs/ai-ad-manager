import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useSkills } from '../hooks/useSkills.js';
import { ChatInterface } from './ChatInterface.jsx';
import { CanvasPanel } from './CanvasPanel.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';
import { SkillsLibrary } from './SkillsLibrary.jsx';
import { AudienceManager } from './AudienceManager.jsx';

// Actions that require a connected ad account
const ACCOUNT_ACTIONS = [
  { icon: 'Zap',      label: 'Create Campaign',        desc: 'Launch a new ad in minutes — objective, destination, creative, audience, budget.',
    prompt: 'I want to create a new campaign.' },
  { icon: 'Users',    label: 'Build Audience',          desc: 'Create custom audiences from website visitors, video viewers, WhatsApp contacts, or customer lists.',
    prompt: 'I want to build a new audience.' },
  { icon: 'BarChart3', label: 'Performance Analysis',   desc: 'Analyse spend, results, and cost per outcome — conversations, leads, ROAS, or traffic.',
    prompt: 'Show me how my ads are performing.' },
];


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
  const [chatLanguage, setChatLanguage] = useState(() => localStorage.getItem('aam_language') || 'en');
  const [activeView, setActiveView] = useState({ type: 'chat' });
  const [canvasData, setCanvasData] = useState(null);

  const {
    skills, activeSkill, activeSkillId, toggleSkill,
    createSkill, updateSkill, deleteSkill, getSkillContext, getSkillContextById,
  } = useSkills();

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession,
    messages, isTyping, thinkingText, creationStep, creationSummary, activityLog, sendMessage, stopGeneration, startCreation, notification,
    savedItems, saveItem, deleteSavedItem,
    folders, createFolder, deleteFolder, renameFolder, reorderFolders,
  } = useChatSessions({ token, adAccountId, accountName: selectedAccount?.name, language: chatLanguage });

  const handleLanguageChange = useCallback((lang) => {
    setChatLanguage(lang);
    localStorage.setItem('aam_language', lang);
  }, []);

  // Handle account switching — reset chat
  const handleAccountSelect = useCallback((business, account) => {
    onSwitchBusiness(business);
    onSwitchAccount(account);
    setActiveView({ type: 'chat' });
  }, [onSwitchBusiness, onSwitchAccount]);

  const handleSend = useCallback((text, attachments, slashIds) => {
    setActiveView({ type: 'chat' });
    // Inject skill context: slash commands take priority, then active skill
    let skillCtx = null;
    if (slashIds?.length) {
      skillCtx = slashIds.map(id => getSkillContextById(id)).filter(Boolean).join('\n\n---\n\n');
    }
    if (!skillCtx) skillCtx = getSkillContext();
    const fullText = skillCtx ? `${skillCtx}\n\n---\n\nUser message: ${text}` : text;
    // Send full text to API but only show user's message in chat
    sendMessage(fullText, attachments, { displayText: text });
  }, [sendMessage, getSkillContext, getSkillContextById]);

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

  const handleOpenSkillsLibrary = useCallback(() => {
    setActiveView({ type: 'skillsLibrary' });
  }, []);

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

  // Find current saved item for viewer
  const currentSavedItem = activeView.type === 'saved'
    ? savedItems.find(i => i.id === activeView.itemId)
    : null;

  const suggestedActions = ACCOUNT_ACTIONS;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={deleteSession}
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
        skills={skills}
        activeSkill={activeSkill}
        onToggleSkill={toggleSkill}
        onOpenAudiences={handleOpenAudiences}
        onOpenSkillsLibrary={handleOpenSkillsLibrary}
        token={token}
        onLogin={onLogin}
      />

      {/* Main Content */}
      <main className="flex-1 flex min-w-0">
        {/* Chat area — shrinks to 40% when canvas is open */}
        <div className={`flex flex-col min-w-0 transition-all duration-300 ease-in-out ${canvasData ? 'w-[40%]' : 'flex-1'}`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
            >
              <MessageSquare size={16} />
            </button>
          )}

          {activeView.type === 'skillsLibrary' ? (
            <SkillsLibrary
              skills={skills}
              onCreate={createSkill}
              onUpdate={updateSkill}
              onDelete={deleteSkill}
              onBack={() => setActiveView({ type: 'chat' })}
              onConfigure={(skill) => setActiveView({ type: 'skillConfig', skill })}
              onActivateSkill={(skill) => { toggleSkill(skill.id); setActiveView({ type: 'chat' }); }}
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
          ) : activeView.type === 'audiences' ? (
            <AudienceManager
              adAccountId={adAccountId}
              onSendToChat={handleAudienceToChat}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
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
              creationStep={creationStep}
              creationSummary={creationSummary}
              activityLog={activityLog}
              onSend={handleSend}
              onStop={stopGeneration}
              suggestedActions={suggestedActions}
              adAccountId={adAccountId}
              onSaveItem={saveItem}
              folders={folders}
              activeSkill={activeSkill}
              onDeactivateSkill={() => activeSkill && toggleSkill(activeSkill.id)}
              skills={skills}
              onToggleSkill={toggleSkill}
              onManageSkills={(skill) => skill ? setActiveView({ type: 'skillConfig', skill }) : setActiveView({ type: 'skillsLibrary' })}
              onNavigate={(view) => {
                const viewMap = { audiences: 'audiences', skills: 'skillsLibrary' };
                setActiveView({ type: viewMap[view] || 'chat' });
              }}
              onOpenCanvas={handleOpenCanvas}
              onStartCreation={startCreation}
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
