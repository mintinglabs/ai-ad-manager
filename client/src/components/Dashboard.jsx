import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { ChatInterface } from './ChatInterface.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { DashboardPage } from './DashboardPage.jsx';

const SUGGESTED_ACTIONS = [
  // ── Performance & Reporting ────────────────────────────────────────────────
  { icon: 'BarChart3',     category: 'Performance', label: 'How are my ads doing?',         desc: 'See spend, CTR, ROAS, and what needs attention.',          prompt: 'Show all my active campaigns with their performance metrics from the last 7 days' },
  { icon: 'FileText',      category: 'Performance', label: "Show today's results",          desc: "Today's spend, conversions, CPA, and ROAS.",              prompt: "Show today's KPI report — spend, impressions, clicks, conversions, CPA, and ROAS" },
  { icon: 'TrendingDown',  category: 'Performance', label: 'Any problems I should know?',   desc: 'Flag rising costs or declining performance.',              prompt: 'Which campaigns have declining performance? Compare last 7 days vs previous 7 days' },
  { icon: 'Search',        category: 'Performance', label: "What's working best?",          desc: 'Find top creatives and winning strategies.',               prompt: 'Analyze my ad creatives — which ones are performing best and which show fatigue signals?' },
  // ── Budget & Optimization ──────────────────────────────────────────────────
  { icon: 'DollarSign',    category: 'Budget',      label: 'Find ways to save money',       desc: 'Reallocate budget to top performers.',                     prompt: 'Analyze my budget allocation across campaigns and ad sets — where should I shift spend?' },
  { icon: 'AlertTriangle', category: 'Budget',      label: 'Quick wins I can do now',        desc: 'Actionable changes you can apply right now.',              prompt: 'Give me quick wins for my Meta ad account — what can I change today to improve results?' },
  // ── Audiences & Targeting ──────────────────────────────────────────────────
  { icon: 'Target',        category: 'Audiences',   label: 'Help me reach new people',       desc: 'Audiences, lookalikes, and expansion ideas.',              prompt: 'Show me all my custom audiences and their sizes, plus any targeting overlap between ad sets' },
  // ── Competitive & Creative ─────────────────────────────────────────────────
  { icon: 'Zap',           category: 'Creative',    label: 'What are competitors doing?',    desc: 'Check the Ad Library for competitor activity.',            prompt: 'Search the Meta Ad Library for ads from my competitors in my industry. What can I learn from them?' },
  // ── Account Management ─────────────────────────────────────────────────────
  { icon: 'BarChart3',     category: 'Account',     label: 'Full account audit',             desc: 'Pixel, CAPI, structure, exclusions health check.',         prompt: 'Run a full account audit — check my pixel setup, CAPI integration, campaign structure, audience exclusions, and give me a health score' },
  { icon: 'Target',        category: 'Account',     label: 'Show all my campaigns',          desc: 'List every campaign with status and budget.',              prompt: 'List all my campaigns with their status, objective, daily budget, and lifetime spend' },
  // ── Create & Manage ───────────────────────────────────────────────────────
  { icon: 'Zap',           category: 'Create',      label: 'Create a new campaign',          desc: 'Set up a campaign with AI guidance step by step.',         prompt: 'Help me create a new campaign. Ask me about my goal, budget, audience, and creatives — then set it up.' },
  { icon: 'Search',        category: 'Create',      label: 'Write ad copy for me',           desc: 'Generate headlines, body text, and CTAs.',                 prompt: 'Write 3 ad copy variations for my best-performing campaign — include headlines, primary text, and CTA recommendations' },
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
  const [chatMode, setChatMode] = useState('Fast');
  const [chatLanguage, setChatLanguage] = useState(() => localStorage.getItem('aam_language') || 'en');
  const [activeView, setActiveView] = useState({ type: 'chat' });

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession,
    messages, isTyping, thinkingText, sendMessage, notification,
    savedItems, saveItem, deleteSavedItem,
  } = useChatSessions({ token, adAccountId, accountName: selectedAccount?.name, mode: chatMode, language: chatLanguage });

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
    sendMessage(text, attachments);
  }, [sendMessage]);

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
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
          >
            <MessageSquare size={16} />
          </button>
        )}

        {activeView.type === 'funnel' ? (
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
            suggestedActions={SUGGESTED_ACTIONS}
            mode={chatMode}
            onModeChange={setChatMode}
            adAccountId={adAccountId}
            onSaveItem={saveItem}
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
