import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useSkills } from '../hooks/useSkills.js';
import { ChatInterface } from './ChatInterface.jsx';
import { CanvasPanel } from './CanvasPanel.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';
import { SkillsLibrary } from './SkillsLibrary.jsx';
import { AudienceManager } from './AudienceManager.jsx';

// Use-case driven cards — categorized, battle-tested entry points
const CARD_CATEGORIES = [
  {
    heading: 'Get Started',
    cards: [
      { icon: 'Zap', label: 'Create Campaign', desc: 'Step-by-step guided setup, or bulk create from a spreadsheet.', prompt: 'I want to create a new campaign.', color: 'violet' },
      { icon: 'Users', label: 'Build Audience', desc: 'Website visitors, video viewers, IG/FB posts, lookalikes, customer lists.', prompt: 'I want to build a new audience.', color: 'emerald' },
    ],
  },
  {
    heading: 'Check What\'s Working',
    cards: [
      { icon: 'BarChart3', label: 'Analyze Ads', desc: 'Performance report — what to pause, what to scale, where budget is wasted.', prompt: 'How are my ads performing?', color: 'blue' },
      { icon: 'Image', label: 'Audit Creatives', desc: 'Fatigue detection, hook rate ranking, AI visual analysis.', prompt: 'Audit my ad creatives.', color: 'amber' },
    ],
  },
];

const QUICK_CHIPS = [
  { label: 'What should I pause?', prompt: 'What campaigns should I pause?' },
  { label: 'Scale my winners', prompt: 'Which ads should I scale up?' },
  { label: 'Check tracking health', prompt: 'Check my pixel and tracking health.' },
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
    createSkill, updateSkill, deleteSkill, generateSkill, getSkillContext, getSkillContextById,
  } = useSkills();

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession, renameSession, pinSession,
    messages, isTyping, thinkingText, activityLog, sendMessage, stopGeneration, notification,
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
    // Pass custom skill ID so backend load_skill can override default analysis strategy
    const customSkillId = activeSkill && !activeSkill.isDefault ? activeSkill.id : null;
    sendMessage(fullText, attachments, { displayText: text, activeCustomSkill: customSkillId });
  }, [sendMessage, getSkillContext, getSkillContextById, activeSkill]);

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
        onToggle={() => setSidebarOpen(false)}
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
              <Menu size={16} />
            </button>
          )}

          {activeView.type === 'skillsLibrary' ? (
            <SkillsLibrary
              skills={skills}
              onCreate={createSkill}
              onUpdate={updateSkill}
              onDelete={deleteSkill}
              onGenerate={generateSkill}
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
              activityLog={activityLog}
              onSend={handleSend}
              onStop={stopGeneration}
              cardCategories={cardCategories}
              quickChips={quickChips}
              adAccountId={adAccountId}
              onSaveItem={saveItem}
              folders={folders}
              activeSkill={activeSkill}
              onDeactivateSkill={() => activeSkill && toggleSkill(activeSkill.id)}
              skills={skills}
              onToggleSkill={toggleSkill}
              onManageSkills={(skill) => skill ? setActiveView({ type: 'skillConfig', skill }) : setActiveView({ type: 'skillsLibrary' })}
              token={token}
              onLogin={onLogin}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onNavigate={(view) => {
                const viewMap = { audiences: 'audiences', skills: 'skillsLibrary' };
                setActiveView({ type: viewMap[view] || 'chat' });
              }}
              onOpenCanvas={handleOpenCanvas}
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
