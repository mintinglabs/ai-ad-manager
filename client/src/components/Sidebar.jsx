import { useState, useEffect, useRef } from 'react';
import { Bot, Plus, MessageSquare, Trash2, Sparkles, ChevronDown, ChevronLeft, ChevronRight, LogOut, FileText, Lightbulb, FolderOpen, Building2, Check, Globe } from 'lucide-react';
import { groupSessionsByDate } from '../hooks/useChatSessions.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useBusinesses } from '../hooks/useBusinesses.js';

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

// ── Platform logos ───────────────────────────────────────────────────────────
const MetaIcon = () => (
  <img src="/meta-icon.svg" alt="Meta" className="w-4 h-4 shrink-0" />
);

// ── Multi-platform Account Picker ───────────────────────────────────────────
const SidebarAccountPicker = ({ selectedAccount, selectedBusiness, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('business');
  const [activeBiz, setActiveBiz] = useState(null);
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts, isLoading: accLoading } = useAdAccounts(level === 'accounts' ? activeBiz?.id : null);
  const accounts = Array.isArray(adAccounts) ? adAccounts : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!open) {
      setLevel(selectedBusiness ? 'accounts' : 'platform');
      setActiveBiz(selectedBusiness || null);
    }
    setOpen(!open);
  };

  const handleMetaClick = () => { setLevel('business'); };
  const handleBizClick = (biz) => { setActiveBiz(biz); setLevel('accounts'); };
  const handleAccClick = (account) => { onSelect(activeBiz, account); setOpen(false); };

  const hasSelection = selectedBusiness && selectedAccount;

  return (
    <div className="px-3 mb-2 space-y-1" ref={ref}>
      {/* Platform section label */}
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 py-0.5">Ad Platforms</p>

      {/* Meta — active, clickable */}
      <div className="relative">
        <button onClick={toggle}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium transition-all border
            ${hasSelection
              ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 animate-pulse-subtle'
            }`}>
          <MetaIcon />
          <span className="flex-1 text-left truncate">
            {hasSelection
              ? `${selectedBusiness.name} · act_${selectedAccount.account_id}`
              : 'Connect Meta Account'
            }
          </span>
          <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {open && (
          <div className="absolute left-0 right-0 top-full mt-1 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 z-50 overflow-hidden">
            {level === 'platform' && (
              <>
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Platform</p>
                </div>
                <button onClick={handleMetaClick}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
                  <MetaIcon />
                  <span className="text-xs font-medium text-slate-700 flex-1">Meta Ads</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </button>
              </>
            )}
            {level === 'business' && (
              <>
                <div className="px-3 py-2.5 border-b border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {bizLoading ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">Loading...</div>
                  ) : businesses.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">No businesses found</div>
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
                  className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={14} className="text-slate-400" />
                  <Building2 size={12} className="text-emerald-600" />
                  <span className="text-xs font-medium text-slate-500 truncate">{activeBiz?.name}</span>
                </button>
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ad Accounts</p>
                </div>
                <div className="max-h-56 overflow-y-auto">
                  {accLoading ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">Loading...</div>
                  ) : accounts.length === 0 ? (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">No accounts found</div>
                  ) : accounts.map((account) => (
                    <button key={account.id} onClick={() => handleAccClick(account)}
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

      {/* Google Ads — coming soon */}
      <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-slate-100 bg-slate-50/50 text-slate-400 cursor-default">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        <span className="flex-1 text-left">Google Ads</span>
        <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
      </div>

      {/* TikTok Ads — coming soon */}
      <div className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12px] font-medium border border-slate-100 bg-slate-50/50 text-slate-400 cursor-default">
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.84 4.84 0 01-3.77-1.81V6.69h3.77z"/></svg>
        <span className="flex-1 text-left">TikTok Ads</span>
        <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
      </div>
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
  savedItems,
  onViewSavedItem,
  onDeleteSavedItem,
  onNavigateFunnel,
  activeView,
  onLogout,
  selectedAccount,
  selectedBusiness,
  onSelectAccount,
  language,
  onLanguageChange,
}) => {
  const [reportsOpen, setReportsOpen] = useState(true);
  const [strategiesOpen, setStrategiesOpen] = useState(true);
  const [hoveredSession, setHoveredSession] = useState(null);

  const grouped = groupSessionsByDate(sessions);
  const reports = savedItems.filter(i => i.type === 'report');
  const strategies = savedItems.filter(i => i.type === 'strategy');

  if (!open) return null;

  return (
    <aside className="w-[260px] shrink-0 bg-white/70 backdrop-blur-xl border-r border-slate-200 flex flex-col h-screen">

      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200/50">
            <Bot size={18} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-800 tracking-tight">AI Ad Manager</span>
        </div>
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* New Chat + My Strategist */}
      <div className="px-3 mb-2 space-y-1.5">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all hover:shadow-sm"
        >
          <Plus size={16} className="text-slate-400" />
          New Chat
        </button>
        <button
          onClick={onNavigateFunnel}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors
            ${activeView?.type === 'funnel' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Sparkles size={16} className={activeView?.type === 'funnel' ? 'text-indigo-500' : 'text-slate-400'} />
          My Strategist
        </button>
      </div>

      {/* Account Picker */}
      <SidebarAccountPicker
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        onSelect={onSelectAccount}
      />

      {/* Scrollable area: Folders first, then Chat History */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">

        {/* Folders Section */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">Folders</p>

          {/* Reports folder */}
          <div className="mb-1">
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {reportsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <FileText size={13} className="text-blue-400" />
              <span>Reports ({reports.length})</span>
            </button>
            {reportsOpen && reports.length > 0 && reports.map(item => (
              <button
                key={item.id}
                onClick={() => onViewSavedItem(item)}
                className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-left
                  ${activeView?.type === 'saved' && activeView?.itemId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <span className="truncate">{item.title}</span>
              </button>
            ))}
            {reportsOpen && reports.length === 0 && (
              <p className="pl-9 pr-3 py-1 text-[11px] text-slate-300 italic">No reports yet</p>
            )}
          </div>

          {/* Strategies folder */}
          <div className="mb-1">
            <button
              onClick={() => setStrategiesOpen(!strategiesOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {strategiesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Lightbulb size={13} className="text-amber-400" />
              <span>Strategies ({strategies.length})</span>
            </button>
            {strategiesOpen && strategies.length > 0 && strategies.map(item => (
              <button
                key={item.id}
                onClick={() => onViewSavedItem(item)}
                className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-left
                  ${activeView?.type === 'saved' && activeView?.itemId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <span className="truncate">{item.title}</span>
              </button>
            ))}
            {strategiesOpen && strategies.length === 0 && (
              <p className="pl-9 pr-3 py-1 text-[11px] text-slate-300 italic">No strategies yet</p>
            )}
          </div>
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
                    return (
                      <button
                        key={session.id}
                        onClick={() => onSwitchSession(session.id)}
                        onMouseEnter={() => setHoveredSession(session.id)}
                        onMouseLeave={() => setHoveredSession(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[13px] transition-colors group relative
                          ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <MessageSquare size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                        <span className="truncate flex-1">{session.title}</span>
                        {hoveredSession === session.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                            className="absolute right-2 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Language Selector */}
      <div className="px-3 pb-2 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2 px-1 mb-1">
          <Globe size={13} className="text-slate-400" />
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Reply Language</span>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {[{ value: 'en', label: 'English' }, { value: 'yue', label: '廣東話' }].map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onLanguageChange?.(value)}
              className={`flex-1 px-2 py-1.5 rounded-md text-[11px] font-medium transition-all
                ${language === value
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              {label}
            </button>
          ))}
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
          {onLogout && (
            <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 transition-colors" title="Log out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
