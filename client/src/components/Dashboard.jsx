import { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, LayoutDashboard, MessageSquare, BarChart3, CreditCard, Settings, LogOut, ChevronLeft, ChevronDown, Check, ArrowLeftRight, Building2 } from 'lucide-react';
import { useChatAgent } from '../hooks/useChatAgent.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { ChatInterface } from './ChatInterface.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'chat',      label: 'Chat',         icon: MessageSquare },
  { id: 'reports',   label: 'Reports',      icon: BarChart3 },
  { id: 'accounts',  label: 'Ad accounts',  icon: CreditCard },
  { id: 'settings',  label: 'Settings',     icon: Settings },
];

const SUGGESTED_ACTIONS = [
  { label: 'Full Audit',                  prompt: 'Run a full audit of my ad account' },
  { label: 'Root Cause Analysis',         prompt: 'Perform a root cause analysis on underperforming campaigns' },
  { label: 'Performance Drop Diagnostic', prompt: 'Diagnose recent performance drops across my campaigns' },
  { label: 'Search Term Analysis',        prompt: 'Analyze search terms and keyword performance' },
  { label: 'Daily KPI Report',            prompt: "Show today's KPI report" },
];

// ── Business Selector Dropdown ────────────────────────────────────────────────
const BusinessPicker = ({ selectedBusiness, onSelectBusiness }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { businesses, isLoading } = useBusinesses();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1a2236] border transition-colors text-left
          ${selectedBusiness ? 'border-[#1e293b] hover:border-slate-600' : 'border-blue-500/50 hover:border-blue-400'}`}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
          <Building2 size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{selectedBusiness?.name || 'Select Business'}</p>
          <p className="text-[11px] text-slate-500 truncate">{selectedBusiness ? 'Business Portfolio' : 'Choose a portfolio'}</p>
        </div>
        <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a2236] border border-[#1e293b] rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">Loading businesses...</div>
          ) : businesses.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">No businesses found</div>
          ) : businesses.map((biz) => {
            const isActive = biz.id === selectedBusiness?.id;
            return (
              <button
                key={biz.id}
                onClick={() => { onSelectBusiness(biz); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                  ${isActive ? 'bg-blue-900/20' : 'hover:bg-[#232d42]'}`}
              >
                <div className="w-7 h-7 rounded-md bg-[#141b2d] flex items-center justify-center shrink-0">
                  <Building2 size={12} className="text-slate-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{biz.name}</p>
                </div>
                {isActive && <Check size={14} className="text-blue-400 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Account Switcher Dropdown ─────────────────────────────────────────────────
const AccountSwitcher = ({ selectedAccount, selectedBusiness, onSwitchAccount, onSwitchBusiness }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { adAccounts, isLoading } = useAdAccounts(selectedBusiness?.id);
  const accounts = Array.isArray(adAccounts) ? adAccounts : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1a2236] border transition-colors text-left
          ${selectedAccount ? 'border-[#1e293b] hover:border-slate-600' : 'border-blue-500/50 hover:border-blue-400'}`}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">
            {selectedAccount?.name?.[0]?.toUpperCase() || 'A'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white truncate">{selectedAccount?.name || 'Select Ad Account'}</p>
          <p className="text-[11px] text-slate-500 font-mono truncate">
            {selectedAccount?.account_id ? `act_${selectedAccount.account_id}` : selectedAccount?.id || 'Choose an account'}
          </p>
        </div>
        <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a2236] border border-[#1e293b] rounded-xl shadow-xl z-50 overflow-hidden max-h-72 overflow-y-auto">
          {/* Account list */}
          {isLoading ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">Loading accounts...</div>
          ) : accounts.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-500">
              {selectedBusiness ? 'No accounts found' : 'Select a business first'}
            </div>
          ) : accounts.map((account) => {
            const isActive = account.id === selectedAccount?.id;
            return (
              <button
                key={account.id}
                onClick={() => {
                  if (!isActive) onSwitchAccount(account);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                  ${isActive ? 'bg-blue-900/20' : 'hover:bg-[#232d42]'}`}
              >
                <div className="w-7 h-7 rounded-md bg-[#141b2d] flex items-center justify-center shrink-0">
                  <span className="text-slate-300 text-[10px] font-bold">{account.name?.[0]?.toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{account.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono truncate">act_{account.account_id}</p>
                </div>
                {isActive && <Check size={14} className="text-blue-400 shrink-0" />}
              </button>
            );
          })}

          {/* Switch business */}
          <div className="border-t border-[#1e293b]">
            <button
              onClick={() => { setOpen(false); onSwitchBusiness(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#232d42] transition-colors"
            >
              <ArrowLeftRight size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400">Switch Business Portfolio</span>
            </button>
          </div>
        </div>
      )}
    </div>
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
}) => {
  const [activeNav, setActiveNav] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, isTyping, thinkingText, sendMessage, resetChat, notification } = useChatAgent({ token, adAccountId, selectedAccount });

  const handleSend = useCallback((text) => {
    setActiveNav('chat');
    sendMessage(text);
  }, [sendMessage]);

  // Reset chat when account changes
  const handleSwitchAccount = useCallback((account) => {
    resetChat();
    onSwitchAccount(account);
  }, [resetChat, onSwitchAccount]);

  return (
    <div className="flex h-screen bg-[#0f1623]">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'} shrink-0 bg-[#141b2d] border-r border-[#1e293b] flex flex-col transition-all duration-200`}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">AI Ad Manager</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5
                ${activeNav === id
                  ? 'bg-[#1e293b] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2236]'
                }`}
            >
              <Icon size={18} strokeWidth={activeNav === id ? 2 : 1.5} />
              {label}
            </button>
          ))}
        </nav>

        {/* Business & Account Selectors */}
        <div className="px-3 mb-4 space-y-3">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Business</p>
            <BusinessPicker
              selectedBusiness={selectedBusiness}
              onSelectBusiness={(biz) => onSwitchBusiness(biz)}
            />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Ad Account</p>
            <AccountSwitcher
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSwitchAccount={handleSwitchAccount}
              onSwitchBusiness={onSwitchBusiness}
            />
          </div>
        </div>

        {/* User Profile */}
        <div className="px-3 pb-4 border-t border-[#1e293b] pt-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Andy Wong</p>
              <p className="text-[11px] text-slate-500 truncate">andy.wong@presslogic.com</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-[#1a2236] border border-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <MessageSquare size={16} />
          </button>
        )}

        {selectedAccount ? (
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            thinkingText={thinkingText}
            onSend={handleSend}
            suggestedActions={SUGGESTED_ACTIONS}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-16 h-16 rounded-2xl bg-[#1a2236] border border-[#1e293b] flex items-center justify-center mx-auto mb-4">
                <CreditCard size={28} className="text-slate-500" />
              </div>
              <h2 className="text-lg font-semibold text-white mb-2">Select an Ad Account</h2>
              <p className="text-sm text-slate-400">
                {selectedBusiness
                  ? 'Choose an ad account from the sidebar to start managing your campaigns.'
                  : 'First select a business portfolio, then choose an ad account from the sidebar.'}
              </p>
            </div>
          </div>
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
