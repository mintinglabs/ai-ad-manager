import { useState, useCallback } from 'react';
import { Bot, ArrowLeft, LogOut, CheckCircle } from 'lucide-react';
import { useChatAgent } from '../hooks/useChatAgent.js';
import { HomeScreen } from './HomeScreen.jsx';
import { ChatInterface } from './ChatInterface.jsx';

const PERMISSIONS = ['ads_read', 'ads_management', 'business_management'];

const SUGGESTED_ACTIONS = [
  { label: '📊 Campaign Report', prompt: "Show this week's campaign report"  },
  { label: '⚙️ On/Off & Budget', prompt: 'Manage campaign status and budget' },
  { label: '👥 Custom Audience', prompt: 'Create a custom audience'           },
];

export const Dashboard = ({ token = null, adAccountId = null, selectedAccount = null, onLogout }) => {
  const [view, setView] = useState('home');
  const { messages, isTyping, thinkingText, sendMessage, resetChat, notification } = useChatAgent({ token, adAccountId });

  const goHome = useCallback(() => {
    resetChat();
    setView('home');
  }, [resetChat]);

  const handleSend = useCallback((text) => {
    setView('chat');
    sendMessage(text);
  }, [sendMessage]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">

      {/* Header */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 py-2.5 flex items-center gap-3">
        {view !== 'home' && (
          <button
            onClick={goHome}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors mr-1"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>
        )}

        <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-1.5 rounded-lg shrink-0">
          <Bot size={16} className="text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-900 leading-tight">AI Ad Manager</h1>
          {selectedAccount && (
            <p className="text-xs text-slate-400 truncate leading-tight">{selectedAccount.name}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-1">
            {PERMISSIONS.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded font-mono">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />{p}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1.5 ml-1">
            <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-600">Development</span>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors" title="Disconnect">
              <LogOut size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 overflow-hidden">
        {view === 'home' && <HomeScreen onSend={handleSend} selectedAccount={selectedAccount} />}
        {view === 'chat' && (
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            thinkingText={thinkingText}
            onSend={sendMessage}
            suggestedActions={SUGGESTED_ACTIONS}
          />
        )}
      </main>

      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle size={16} />
          {notification}
        </div>
      )}
    </div>
  );
};
