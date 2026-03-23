import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useStrategists } from '../hooks/useStrategists.js';
import { ChatInterface } from './ChatInterface.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { ReportPanel } from './ReportPanel.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';

const SUGGESTED_ACTIONS = [
  { icon: 'BarChart3',     label: 'Weekly Performance Report',      desc: 'Spend, ROAS, CTR, CPA across all campaigns — with trends vs last week.',
    prompt: 'Show my weekly performance report for the last 7 days with all campaigns, spend, ROAS, CTR, CPA. Compare to previous week.' },
  { icon: 'AlertTriangle', label: 'Problems & Quick Wins',          desc: 'Find issues, wasted spend, and actionable fixes you can apply today.',
    prompt: 'Find problems and quick wins in my ad account. Flag low ROAS campaigns, wasted spend, and give me fixes.' },
  { icon: 'Search',        label: 'Creative Performance Analysis',  desc: 'Which ads are winning, which show fatigue — with copy recommendations.',
    prompt: 'Analyze my ad creative performance. Show CTR, CPA, frequency for all ads. Flag fatigue and suggest new copy.' },
  { icon: 'DollarSign',    label: 'Budget Optimization Plan',       desc: 'Where to shift spend for maximum ROAS — with specific reallocation amounts.',
    prompt: 'Create a budget optimization plan. Show spend vs ROAS per campaign and recommend specific budget reallocations.' },
  { icon: 'Target',        label: 'Audience & Targeting Review',    desc: 'Audience sizes, overlap issues, and expansion opportunities.',
    prompt: 'Review my audiences and targeting. Show sizes, find overlap, suggest new audiences to test.' },
  { icon: 'BarChart3',     label: 'Full Account Health Audit',      desc: 'Pixel, CAPI, campaign structure, exclusions — scored with fix priorities.',
    prompt: 'Run a full account health audit. Check pixel, structure, budget, overlaps. Give me a score out of 10.' },
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
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatLanguage, setChatLanguage] = useState(() => localStorage.getItem('aam_language') || 'en');
  const [activeView, setActiveView] = useState({ type: 'chat' });
  const [reportPanel, setReportPanel] = useState(null);
  const [configuringStrategistId, setConfiguringStrategistId] = useState(null);

  const {
    strategists, activeStrategist, toggleStrategist, updateStrategist,
    addDocument, removeDocument, getStrategistContext,
  } = useStrategists();

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession,
    messages, isTyping, thinkingText, sendMessage, stopGeneration, notification,
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

  const handleSend = useCallback((text, attachments) => {
    setActiveView({ type: 'chat' });
    // Prepend strategist context if active
    const stratContext = getStrategistContext();
    const fullText = stratContext ? `${stratContext}\n\n---\n\nUser message: ${text}` : text;
    sendMessage(fullText, attachments);
  }, [sendMessage, getStrategistContext]);

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

  const handleNavigateFunnel = useCallback(() => {
    setActiveView({ type: 'funnel' });
  }, []);

  const handleFunnelToChat = useCallback((prompt) => {
    setActiveView({ type: 'chat' });
    sendMessage(prompt);
  }, [sendMessage]);

  // Report canvas panel
  const handleOpenReport = useCallback((messageId, content) => {
    const title = content?.split('\n').find(l => l.trim())?.replace(/^[#*\s]+/, '')?.slice(0, 60) || 'Report';
    setReportPanel({ messageId, content, title });
  }, []);

  const handleCloseReport = useCallback(() => setReportPanel(null), []);

  const handleSaveFromPanel = useCallback((folderId) => {
    if (reportPanel) {
      saveItem(reportPanel.messageId, folderId, reportPanel.title);
    }
  }, [reportPanel, saveItem]);

  // Find current saved item for viewer
  const currentSavedItem = activeView.type === 'saved'
    ? savedItems.find(i => i.id === activeView.itemId)
    : null;

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
        onNavigateFunnel={handleNavigateFunnel}
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
        strategists={strategists}
        activeStrategist={activeStrategist}
        onToggleStrategist={toggleStrategist}
        onConfigureStrategist={(id) => { setConfiguringStrategistId(id); setActiveView({ type: 'strategist' }); }}
      />

      {/* Main Content */}
      <main className="flex-1 flex min-w-0">
        <div className={`flex flex-col min-w-0 ${reportPanel ? 'w-[45%]' : 'flex-1'} transition-all duration-300`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
            >
              <MessageSquare size={16} />
            </button>
          )}

          {activeView.type === 'strategist' && configuringStrategistId ? (
            <StrategistConfig
              strategist={strategists.find(s => s.id === configuringStrategistId) || strategists[0]}
              onUpdate={updateStrategist}
              onAddDoc={addDocument}
              onRemoveDoc={removeDocument}
              onBack={() => setActiveView({ type: 'chat' })}
            />
          ) : activeView.type === 'funnel' ? (
            <DashboardPage
              adAccountId={adAccountId}
              onNavigateToChat={handleFunnelToChat}
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
              onSend={handleSend}
              onStop={stopGeneration}
              suggestedActions={SUGGESTED_ACTIONS}
              adAccountId={adAccountId}
              onSaveItem={saveItem}
              onOpenReport={handleOpenReport}
              folders={folders}
              activeStrategist={activeStrategist}
              onDeactivateStrategist={() => activeStrategist && toggleStrategist(activeStrategist.id)}
            />
          )}
        </div>

        {/* Report Canvas Panel */}
        {reportPanel && (
          <ReportPanel
            content={reportPanel.content}
            title={reportPanel.title}
            onClose={handleCloseReport}
            onSave={handleSaveFromPanel}
            folders={folders}
          />
        )}
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
