import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Menu, Zap, Settings, User, LogOut, Building2, ChevronRight, Plug, X } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useSkills } from '../hooks/useSkills.js';
import { ChatInterface } from './ChatInterface.jsx';
import { CanvasPanel } from './CanvasPanel.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';
import { SkillsLibrary } from './SkillsLibrary.jsx';
import { AudienceManager } from './AudienceManager.jsx';
import { KeywordsManager } from './KeywordsManager.jsx';
import { CampaignManager } from './CampaignManager.jsx';
import { CreativeLibrary } from './CreativeLibrary.jsx';
import { AutomationRules } from './AutomationRules.jsx';
import { InstantForms } from './InstantForms.jsx';
import { EventsManager } from './EventsManager.jsx';
import { Optimizations } from './Optimizations.jsx';
import { Subscriptions } from './Subscriptions.jsx';
import { BuyCredits } from './BuyCredits.jsx';
import { AdLibrary } from './AdLibrary.jsx';
import { BrandLibrary } from './BrandLibrary.jsx';
import { ReportDashboard } from './ReportDashboard.jsx';
import { ProjectDetail } from './ProjectDetail.jsx';
import { useProjects } from '../hooks/useProjects.js';
import { useBrandLibrary } from '../hooks/useBrandLibrary.js';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { LoginModal } from './LoginModal.jsx';
import { AuthGateProvider } from '../lib/authGate.jsx';

// Brand icons — real logos for the connections panel.
const MetaBrandIcon = ({ className = 'w-6 h-6' }) => (
  <img src="/meta-icon.svg" alt="Meta" className={`${className} object-contain`} />
);
const GoogleBrandIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);
const TikTokBrandIcon = ({ className = 'w-6 h-6' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.84 4.84 0 01-3.77-1.81V6.69h3.77z" />
  </svg>
);

const CARD_CATEGORIES = [];
const QUICK_CHIPS = [];

// Read-only roster of resources the user has access to via their FB token.
// Groups ad accounts under their owning business (the global
// /meta/adaccounts endpoint already returns business_id + business_name on
// each account, so this is a single API call).
const MetaRoster = ({ businesses }) => {
  const { adAccounts, isLoading } = useAdAccounts();

  // Group accounts by business_id; preserve the businesses[] order so the
  // user sees a stable hierarchy. Accounts whose business isn't in the list
  // (e.g. "Other") collect into an "Other" bucket at the bottom.
  const groups = (() => {
    const byBiz = new Map();
    businesses.forEach(b => byBiz.set(b.id, { biz: b, accounts: [] }));
    const other = { biz: { id: '__other', name: 'Other' }, accounts: [] };
    adAccounts.forEach(acc => {
      const target = byBiz.get(acc.business_id) || other;
      target.accounts.push(acc);
    });
    const result = Array.from(byBiz.values()).filter(g => g.accounts.length > 0);
    if (other.accounts.length) result.push(other);
    return result;
  })();

  const emptyBusinesses = businesses.filter(b => !groups.some(g => g.biz.id === b.id));

  return (
    <div>
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
          Business Portfolios
        </p>
        {!isLoading && (
          <p className="text-[10px] text-slate-400">
            {businesses.length} {businesses.length === 1 ? 'portfolio' : 'portfolios'} · {adAccounts.length} ad {adAccounts.length === 1 ? 'account' : 'accounts'}
          </p>
        )}
      </div>
      {isLoading ? (
        <p className="text-[11px] text-slate-400 py-2">Loading…</p>
      ) : (
        <div className="rounded-lg border border-slate-200 max-h-80 overflow-y-auto">
          {groups.map(({ biz, accounts }, i) => (
            <div key={biz.id} className={i > 0 ? 'border-t border-slate-100' : ''}>
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50/70">
                <Building2 size={13} className="text-blue-500 shrink-0" />
                <span className="text-[12px] font-semibold text-slate-800 truncate flex-1">{biz.name}</span>
                <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}</span>
              </div>
              <div className="px-3 py-1.5 space-y-0.5">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-2 pl-5 pr-1 py-1 min-w-0">
                    <div className="w-1 h-1 rounded-full bg-slate-300 shrink-0" />
                    <span className="text-[12px] text-slate-700 truncate flex-1">{acc.name}</span>
                    <span className="text-[10px] text-slate-400 tabular-nums shrink-0">{acc.account_id || acc.id}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {emptyBusinesses.length > 0 && (
            <div className="border-t border-slate-100 px-3 py-2 bg-slate-50/40">
              <p className="text-[10px] text-slate-400">
                {emptyBusinesses.length} {emptyBusinesses.length === 1 ? 'portfolio' : 'portfolios'} with no ad accounts: {emptyBusinesses.map(b => b.name).join(', ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Settings View — left sidebar + right panel like Claude settings ──
// Two tabs:
//   - Account: profile + sign out
//   - Connected Platforms: permission/config view (no active picker —
//     daily ad-account switching is handled by chat bar / header).
const SettingsView = ({
  onClose, onLogout, onLogin, onAppSignOut,
  isAppAuthed = true, onAppSignIn,
  token, userName, userEmail = '', userAvatarUrl = '',
  isLoginLoading = false, loginError = null,
  initialTab = 'account',
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [showRoster, setShowRoster] = useState(false);
  const [pendingDisconnect, setPendingDisconnect] = useState(null); // platform id or null
  const { businesses, isLoading: bizLoading } = useBusinesses();

  const handleMetaToggle = () => {
    // Gate: connecting Meta requires the app-level Google sign-in first.
    // Otherwise an anonymous visitor could grant FB access without ever
    // creating a Supabase user — confusing data state.
    if (!isAppAuthed) { onAppSignIn?.(); return; }
    if (token) setPendingDisconnect('meta');
    else onLogin?.();
  };
  const confirmDisconnect = () => {
    if (pendingDisconnect === 'meta') onLogout?.();
    setPendingDisconnect(null);
  };

  const navItems = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'connections', label: 'Connected Platforms', icon: Plug },
  ];

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
            <p className="text-[12px] text-slate-400 mb-6">Your profile and sign-in info</p>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Profile</h3>
              <div className="flex items-center gap-4">
                {userAvatarUrl ? (
                  <img src={userAvatarUrl} alt={userName} className="w-14 h-14 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-sm">
                    <span className="text-white text-xl font-bold">{(userName || 'A').charAt(0).toUpperCase()}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-slate-800 truncate">{userName || 'User'}</p>
                  <p className="text-[12px] text-slate-400 truncate">{userEmail || '—'}</p>
                </div>
                {onAppSignOut && (
                  <button
                    onClick={onAppSignOut}
                    className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full bg-slate-50 text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
                  >
                    <LogOut size={12} />
                    Sign out
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'connections' && (
          <div className="p-8 max-w-2xl">
            <h2 className="text-[16px] font-bold text-slate-800 mb-1">Connected Platforms</h2>
            <p className="text-[12px] text-slate-400 mb-3">Platforms granting this app access to your data</p>

            {/* Meta */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <MetaBrandIcon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-slate-800 mb-0.5">Meta Ads</p>
                  <p className="text-[11px] text-slate-500">
                    {token
                      ? (businesses.length > 0
                          ? `Full access · ${businesses.length} business ${businesses.length === 1 ? 'portfolio' : 'portfolios'}`
                          : (bizLoading ? 'Loading…' : 'Connected, but no business portfolios found'))
                      : 'Ad accounts, campaigns, audiences, creatives'}
                  </p>
                </div>
                <div className="flex items-center gap-2.5 shrink-0">
                  <span className={`text-[11px] font-medium ${token ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {isLoginLoading ? 'Connecting…' : (token ? 'Connected' : 'Off')}
                  </span>
                  <button
                    type="button"
                    onClick={handleMetaToggle}
                    disabled={isLoginLoading}
                    role="switch"
                    aria-checked={!!token}
                    title={token ? 'Click to disconnect' : 'Click to connect'}
                    className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait ${token ? 'bg-emerald-500' : 'bg-slate-300 hover:bg-slate-400'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${token ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {loginError && !token && (
                <p className="text-[11px] text-red-500 mt-2">{loginError}</p>
              )}

              {token && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowRoster(v => !v)}
                    className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 transition-colors">
                    <ChevronRight size={12} className={`transition-transform ${showRoster ? 'rotate-90' : ''}`} />
                    {showRoster ? 'Hide' : 'Show'} accessible resources
                  </button>
                  {showRoster && (
                    <div className="mt-3">
                      <MetaRoster businesses={businesses} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Coming Soon — compact rows. Stays scannable as more
                connectors land (LinkedIn, Pinterest, Twitter, …). When a
                platform goes live, promote it to a full card like Meta. */}
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
              <div className="flex items-center gap-3 px-4 py-2.5 opacity-70">
                <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0">
                  <GoogleBrandIcon className="w-4 h-4" />
                </div>
                <p className="text-[12px] font-medium text-slate-700 flex-1">Google Ads</p>
                <span className="text-[10px] text-slate-400 font-medium">Coming Soon</span>
              </div>
              <div className="flex items-center gap-3 px-4 py-2.5 opacity-70">
                <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-900">
                  <TikTokBrandIcon className="w-4 h-4" />
                </div>
                <p className="text-[12px] font-medium text-slate-700 flex-1">TikTok Ads</p>
                <span className="text-[10px] text-slate-400 font-medium">Coming Soon</span>
              </div>
            </div>
          </div>
        )}

      </div>
        </div>
      </div>

      {/* Disconnect confirmation modal */}
      {pendingDisconnect && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setPendingDisconnect(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-[fadeSlideUp_0.2s_ease-out]"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-bold text-slate-900 mb-1">
              Disconnect {pendingDisconnect === 'meta' ? 'Meta Ads' : pendingDisconnect}?
            </h3>
            <p className="text-[12px] text-slate-500 mb-5">
              This will revoke this app's access to your business portfolios and ad accounts. You can reconnect anytime.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setPendingDisconnect(null)}
                className="px-4 py-2 text-[12px] font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                className="px-4 py-2 text-[12px] font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
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
  isAppAuthed = true,
  onAppSignIn,
  onAppSignOut,
  isLoginLoading,
  loginError,
  userName = '',
  userEmail = '',
  userAvatarUrl = '',
  googleConnected = false,
  googleCustomerId = '',
  googleLoginCustomerId = '',
  onGoogleConnect,
  onGoogleDisconnect,
  onSelectGoogleAccount,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatLanguage, setChatLanguage] = useState('en');
  const [canvasData, setCanvasData] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('account');
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Open the login modal instead of triggering OAuth directly. Used by
  // every soft-paywall gate (chat send, Connect platform, …) so the user
  // sees a consistent welcome surface before leaving for Google's popup.
  const requestSignIn = useCallback(() => setShowLoginModal(true), []);

  const openSettings = (tab = 'account') => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  };

  // ── Routing — URL is source of truth for the entire main view ─────────────
  // Mapping:
  //   /                         → chat (blank new)
  //   /c/:sessionId             → chat (specific session)
  //   /campaigns                → CampaignManager
  //   /audiences                → AudienceManager
  //   /reports                  → ReportDashboard
  //   /optimizations            → Optimizations
  //   /ad-gallery               → AdLibrary           (legacy: adLibrary)
  //   /creative-hub             → CreativeLibrary
  //   /automations              → AutomationRules
  //   /lead-forms               → InstantForms
  //   /events                   → EventsManager
  //   /brand-memory             → BrandLibrary
  //   /skills                   → SkillsLibrary
  //   /skills/:skillId          → StrategistConfig (per-skill)
  //   /projects/:projectId      → ProjectDetail
  //   /saved/:itemId            → SavedItemView
  const navigate = useNavigate();
  const { sessionId: urlSessionId } = useParams();
  const location = useLocation();

  // Snapshot the URL session id at mount time so we boot the chat hook on the
  // right transcript. Subsequent URL changes are handled by the URL-sync
  // effect (so back/forward and sidebar clicks still work without re-init).
  const initialUrlSessionIdRef = useRef(urlSessionId || null);

  const {
    skills, activeSkill, activeSkills, activeSkillId, activeSkillIds, toggleSkill,
    createSkill, updateSkill, deleteSkill, generateSkill, enrichSkill, getSkillContext, getSkillContextById, fetchSkills,
    fetchRevisions, fetchRevision, revertSkill,
  } = useSkills();

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession, renameSession, pinSession,
    messages, isTyping, thinkingText, activityLog, sendMessage, stopGeneration, notification,
    savedItems, saveItem, deleteSavedItem,
    folders, createFolder, deleteFolder, renameFolder, reorderFolders,
  } = useChatSessions({
    token,
    adAccountId,
    accountName: selectedAccount?.name,
    language: chatLanguage,
    initialSessionId: initialUrlSessionIdRef.current,
  });

  const {
    projects, createProject, updateProject, deleteProject,
    addTask, toggleTask, deleteTask, updateInstructions, addFile, deleteFile, toggleSkill: toggleProjectSkill, addConnector, removeConnector,
  } = useProjects();

  const { getBrandContext, enabledCount: brandEnabledCount, createItem: createBrandItem } = useBrandLibrary(adAccountId);

  // Derive activeView from URL — single source of truth. Skills are needed
  // here because /skills/:id resolves to a full skill object the render block
  // can pass straight to <StrategistConfig />.
  const activeView = useMemo(() => {
    const path = location.pathname;
    if (path === '/' || path === '/c' || path.startsWith('/c/')) return { type: 'chat' };
    if (path === '/campaigns') return { type: 'campaigns' };
    if (path === '/audiences') return { type: 'audiences' };
    if (path === '/keywords') return { type: 'keywords' };
    if (path === '/reports') return { type: 'report' };
    if (path === '/optimizations') return { type: 'optimizations' };
    if (path === '/ad-gallery') return { type: 'adLibrary' };
    if (path === '/creative-hub') return { type: 'creativeLibrary' };
    if (path === '/automations') return { type: 'automationRules' };
    if (path === '/lead-forms') return { type: 'instantForms' };
    if (path === '/events') return { type: 'eventsManager' };
    if (path === '/brand-memory') return { type: 'brandLibrary' };
    if (path === '/skills') return { type: 'skillsLibrary' };
    if (path.startsWith('/skills/')) {
      const skillId = decodeURIComponent(path.slice('/skills/'.length));
      const skill = skills.find(s => s.id === skillId);
      return { type: 'skillConfig', skillId, skill };
    }
    if (path.startsWith('/projects/')) return { type: 'projectDetail', projectId: decodeURIComponent(path.slice('/projects/'.length)) };
    if (path.startsWith('/saved/')) return { type: 'saved', itemId: decodeURIComponent(path.slice('/saved/'.length)) };
    return { type: 'chat' };
  }, [location.pathname, skills]);

  // Navigate "back to chat" without nuking the active session — land on
  // /c/<activeId> if we have one, else `/` (which spins up a fresh chat).
  const goToChat = useCallback(() => {
    navigate(activeSessionId ? `/c/${activeSessionId}` : '/');
  }, [navigate, activeSessionId]);

  const handleOpenBrandLibrary = useCallback(() => {
    navigate('/brand-memory');
    if (!isAppAuthed) requestSignIn();
  }, [isAppAuthed, requestSignIn, navigate]);


  const handleOpenProject = useCallback((projectId) => {
    navigate(`/projects/${encodeURIComponent(projectId)}`);
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

  // Handle account switching — reset chat. Soft paywall: an anonymous
  // visitor clicking the picker should be bounced to Supabase sign-in
  // first, otherwise they'd be flipping the agency-wide demo workspace
  // even though they have no app account.
  const handleAccountSelect = useCallback((business, account, { stayOnPage } = {}) => {
    if (!isAppAuthed) { requestSignIn(); return; }
    onSwitchBusiness(business);
    onSwitchAccount(account);
    if (!stayOnPage) goToChat();
  }, [isAppAuthed, requestSignIn, onSwitchBusiness, onSwitchAccount, goToChat]);

  const handleSend = useCallback((text, attachments, slashIds, rawDisplayText) => {
    // Soft paywall: anonymous visitors are bounced to Google sign-in
    // before any message hits the backend. Once they're authed they can
    // re-submit; we don't auto-replay since the popup itself can take a
    // moment.
    if (!isAppAuthed) {
      requestSignIn();
      return;
    }
    // Already on a chat path by definition (send only fires from ChatInterface)
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
    // Pass active custom skill IDs so backend load_skill can apply them.
    // displayText = what user sees; prefer raw input (no [Uploaded image:...]
    // preamble), fall back to `text` for callers that don't supply it.
    const customSkillIds = activeSkills.filter(s => !s.isDefault).map(s => s.id);
    sendMessage(fullText, attachments, { displayText: rawDisplayText ?? text, activeCustomSkill: customSkillIds[0] || null, activeCustomSkills: customSkillIds });

    // First send on `/` (blank new chat) → promote URL to /c/<id>, ChatGPT-style.
    // replace:true so the back-button from the session doesn't return to an
    // already-stale blank-chat url.
    if (!urlSessionId && activeSessionId) {
      navigate(`/c/${activeSessionId}`, { replace: true });
    }
  }, [isAppAuthed, requestSignIn, sendMessage, getSkillContext, getSkillContextById, activeSkills, getBrandContext, urlSessionId, activeSessionId, navigate]);

  const handleSwitchSession = useCallback((sessionId) => {
    // Anonymous users see no sessions in the sidebar (Sidebar hides the
    // list when !isAppAuthed), but guard here too in case some other
    // path triggers a switch.
    if (!isAppAuthed) { requestSignIn(); return; }
    // Navigate first; the URL-sync effect below calls switchSession().
    // If the user clicks the session they're already on, this is a no-op.
    if (sessionId !== urlSessionId) navigate(`/c/${sessionId}`);
  }, [isAppAuthed, requestSignIn, navigate, urlSessionId]);

  const handleNewChat = useCallback(() => {
    // Anonymous: navigate to the chat empty state (preview) and surface
    // the LoginModal on top — same pattern as the Meta modules.
    if (!isAppAuthed) {
      if (location.pathname !== '/') navigate('/');
      requestSignIn();
      return;
    }
    // Navigate home; URL-sync effect spins up a fresh chat if the current
    // session is already persisted. If already on `/`, force a new chat.
    if (location.pathname !== '/') navigate('/');
    else createNewChat();
  }, [isAppAuthed, requestSignIn, navigate, location.pathname, createNewChat]);

  // ── URL → hook state sync ────────────────────────────────────────────────
  // Keeps the chat engine aligned with whatever the URL says. The opposite
  // direction (state → URL) is handled inside the wrapped handlers above, so
  // we don't need a reverse effect here (which would risk ping-pong loops).
  const didInitialSyncRef = useRef(false);
  useEffect(() => {
    // Only run on chat-shaped paths. Visiting /campaigns shouldn't mint a new
    // chat session — but we still flip the ref so a later /campaigns→/ jump
    // is treated as "user wants a new chat", not "first mount".
    const onChatPath = !!urlSessionId || location.pathname === '/';
    if (!onChatPath) {
      didInitialSyncRef.current = true;
      return;
    }
    if (urlSessionId) {
      if (urlSessionId !== activeSessionId) switchSession(urlSessionId);
    } else if (didInitialSyncRef.current) {
      createNewChat();
    }
    didInitialSyncRef.current = true;
  }, [urlSessionId, location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleViewSavedItem = useCallback((item) => {
    navigate(`/saved/${encodeURIComponent(item.id)}`);
  }, [navigate]);

  const handleDeleteSavedItem = useCallback((itemId) => {
    deleteSavedItem(itemId);
    if (activeView.type === 'saved' && activeView.itemId === itemId) {
      goToChat();
    }
  }, [deleteSavedItem, activeView, goToChat]);

  // Meta-data-backed modules: anonymous visitors are still allowed to
  // navigate in (so they can see the module's empty interface for a
  // sense of what the product offers) but the LoginModal opens
  // automatically on top, blurring the preview underneath. Once they
  // sign in, the modal closes and the module hydrates normally.
  const gatedNav = useCallback((path) => {
    navigate(path);
    if (!isAppAuthed) requestSignIn();
  }, [isAppAuthed, requestSignIn, navigate]);
  const handleOpenAudiences      = useCallback(() => gatedNav('/audiences'),      [gatedNav]);
  const handleOpenCampaigns      = useCallback(() => gatedNav('/campaigns'),      [gatedNav]);
  // Keywords (Google Ads) goes through the same paywall gate.
  const handleOpenKeywords       = useCallback(() => gatedNav('/keywords'),       [gatedNav]);
  const handleOpenSkillsLibrary  = useCallback(() => gatedNav('/skills'),         [gatedNav]);
  const handleOpenCreativeLibrary= useCallback(() => gatedNav('/creative-hub'),   [gatedNav]);
  const handleOpenAutomationRules= useCallback(() => gatedNav('/automations'),    [gatedNav]);
  const handleOpenInstantForms   = useCallback(() => gatedNav('/lead-forms'),     [gatedNav]);
  const handleOpenEventsManager  = useCallback(() => gatedNav('/events'),         [gatedNav]);
  const handleOpenOptimizations  = useCallback(() => gatedNav('/optimizations'),  [gatedNav]);
  const handleOpenAdLibrary      = useCallback(() => gatedNav('/ad-gallery'),     [gatedNav]);
  const handleOpenReports        = useCallback(() => gatedNav('/reports'),        [gatedNav]);
  // Subscriptions + Buy Credits are modals (not routes) — closing them
  // shouldn't push the user back through history. Anonymous users still
  // hit the sign-in gate before the modal opens, mirroring gatedNav.
  const [showSubscriptions, setShowSubscriptions] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const handleOpenSubscriptions  = useCallback(() => {
    if (!isAppAuthed) { requestSignIn(); return; }
    setShowSubscriptions(true);
  }, [isAppAuthed, requestSignIn]);
  const handleCloseSubscriptions = useCallback(() => setShowSubscriptions(false), []);
  const handleOpenBuyCredits     = useCallback(() => {
    if (!isAppAuthed) { requestSignIn(); return; }
    setShowBuyCredits(true);
  }, [isAppAuthed, requestSignIn]);
  const handleCloseBuyCredits    = useCallback(() => setShowBuyCredits(false), []);

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
    const newId = createNewChat();
    const skillCreator = skills.find(s => s.id === 'skill-creator');
    if (skillCreator) setPendingSlashSkill(skillCreator);
    setPendingInput("Help me create a skill together using /skill-creator. First ask me what the skill should do.");
    navigate(newId ? `/c/${newId}` : '/');
  }, [skills, createNewChat, navigate]);

  const handleTrySkill = useCallback((skill) => {
    const newId = createNewChat();
    setPendingSlashSkill(skill);
    setPendingInput(`I just added the /${skill.id} skill for AI Ad Manager. Can you demo it with some great examples?`);
    navigate(newId ? `/c/${newId}` : '/');
  }, [createNewChat, navigate]);

  const handleAudienceToChat = useCallback((prompt) => {
    if (!isAppAuthed) { requestSignIn(); return; }
    goToChat();
    sendMessage(prompt);
  }, [isAppAuthed, requestSignIn, sendMessage, goToChat]);

  const handlePrefillChat = useCallback((text, pill) => {
    const newId = createNewChat();
    setPendingInput(text);
    if (pill) setPendingPill(pill);
    navigate(newId ? `/c/${newId}` : '/');
  }, [createNewChat, navigate]);

  // Close canvas when switching to a different MODULE (chat → reports etc.).
  // Depend on activeView.type, not the whole activeView object — the object
  // is rebuilt by useMemo whenever location.pathname or skills change, so
  // depending on `activeView` would close the canvas every time the route
  // shifts from `/` to `/c/<id>` (which happens right after the first
  // message of a new chat) or whenever the skills list refetches. That's
  // why the right detail panel was auto-closing while the user was still
  // inside the chat view.
  useEffect(() => { setCanvasData(null); }, [activeView.type]);

  // Close canvas when the URL session changes — covers ALL paths that swap
  // chats: explicit sidebar click (handleSwitchSessionWithCanvas), the
  // "New Task" button (handleNewChat → navigate('/')), prefill flows, and
  // any future caller. Keeping the chart from a previous chat visible
  // while a new chat starts streaming is confusing. urlSessionId being
  // undefined (route '/') is also a session change worth closing on.
  useEffect(() => { setCanvasData(null); }, [urlSessionId]);

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

  // Delete session — if the deleted session is the one in the URL, go home
  // so we don't leave a dangling /c/<deleted-id>.
  const handleDeleteSession = useCallback((sessionId) => {
    deleteSession(sessionId);
    if (sessionId === urlSessionId) navigate('/');
  }, [deleteSession, urlSessionId, navigate]);

  // Find current saved item for viewer
  const currentSavedItem = activeView.type === 'saved'
    ? savedItems.find(i => i.id === activeView.itemId)
    : null;

  const cardCategories = CARD_CATEGORIES;
  const quickChips = QUICK_CHIPS;

  return (
    // AuthGateProvider lets every module use useRequireAuth() to gate
    // their action handlers on isAppAuthed without prop-drilling.
    <AuthGateProvider isAppAuthed={isAppAuthed} requestSignIn={requestSignIn}>
    <div className="flex h-full overflow-hidden bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

      {/* Login modal — opened by Start Now or any soft-paywall gate */}
      {showLoginModal && (
        <LoginModal
          onClose={() => setShowLoginModal(false)}
          onGoogleSignIn={onAppSignIn}
        />
      )}

      {/* Subscriptions + Buy Credits modals — overlays so dismissing
          doesn't pop history. Buy Credits' "Manage subscription" link
          chains into the Subscriptions modal via onOpenSubscriptions. */}
      <Subscriptions open={showSubscriptions} onClose={handleCloseSubscriptions} />
      <BuyCredits
        open={showBuyCredits}
        onClose={handleCloseBuyCredits}
        onOpenSubscriptions={() => { setShowBuyCredits(false); handleOpenSubscriptions(); }}
      />

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(prev => !prev)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSessionWithCanvas}
        onDeleteSession={handleDeleteSession}
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
        onOpenKeywords={handleOpenKeywords}
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
        token={token}
        onLogin={onLogin}
        isAppAuthed={isAppAuthed}
        onAppSignIn={requestSignIn}
        onAppSignOut={onAppSignOut}
        appUserName={userName}
        appUserEmail={userEmail}
        appUserAvatarUrl={userAvatarUrl}
        onOpenAccountSettings={() => openSettings('account')}
        onOpenConnectedPlatforms={() => openSettings('connections')}
        onOpenSubscriptions={handleOpenSubscriptions}
        onOpenBuyCredits={handleOpenBuyCredits}
      />

      {/* Main Content */}
      <main className="flex-1 flex min-w-0">
        {/* Chat area —
            • No canvas open → fills the whole main pane (flex-1).
            • Canvas open → fixed 520px so the chat width never depends on
              viewport size or canvas content. Previously this was 40% which
              squeezed the chat to an unusable width on laptop screens (and
              triggered a horizontal scrollbar at the bottom). overflow-x-hidden
              kills that scrollbar even if a child message overshoots.
        */}
        <div className={`flex flex-col min-w-0 overflow-x-hidden transition-[width] duration-300 ease-in-out ${canvasData ? 'w-[520px] shrink-0' : 'flex-1'}`}>

          {activeView.type === 'skillsLibrary' ? (
            <SkillsLibrary
              skills={skills}
              onCreate={createSkill}
              onDelete={deleteSkill}
              onBack={goToChat}
              onActivateSkill={(skill) => { toggleSkill(skill.id); goToChat(); }}
              onBuildWithAI={handleBuildSkillWithAI}
              onTrySkill={handleTrySkill}
              onEditSkill={(skill) => navigate(`/skills/${encodeURIComponent(skill.id)}`)}
              onRefresh={fetchSkills}
              onEnrich={enrichSkill}
              skillToggles={skillToggles}
              onToggleChange={setSkillToggles}
            />
          ) : activeView.type === 'skillConfig' ? (
            activeView.skill ? (
              <StrategistConfig
                strategist={activeView.skill}
                onUpdate={async (id, updates) => {
                  await updateSkill(id, updates);
                }}
                onAddDoc={() => {}}
                onRemoveDoc={() => {}}
                onBack={() => navigate('/skills')}
                fetchRevisions={fetchRevisions}
                fetchRevision={fetchRevision}
                revertSkill={revertSkill}
              />
            ) : (
              // Skills array might still be loading on a hard refresh of
              // /skills/<id>. Render a placeholder rather than falling through
              // to the chat view (which would briefly flash the wrong UI).
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Loading skill…
              </div>
            )
          ) : activeView.type === 'campaigns' ? (
            <CampaignManager
              adAccountId={adAccountId}
              onBack={goToChat}
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
              onBack={goToChat}
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
              onBack={goToChat}
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
              onBack={goToChat}
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
              onNavigateToOptimizations={() => navigate('/optimizations')}
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
                onDelete={() => { deleteProject(proj.id); goToChat(); }}
                onAddTask={(title) => addTask(proj.id, title)}
                onToggleTask={(taskId) => toggleTask(proj.id, taskId)}
                onDeleteTask={(taskId) => deleteTask(proj.id, taskId)}
                onUpdateInstructions={(text) => updateInstructions(proj.id, text)}
                onAddFile={(file) => addFile(proj.id, file)}
                onDeleteFile={(fileId) => deleteFile(proj.id, fileId)}
                onToggleSkill={(skillId) => toggleProjectSkill(proj.id, skillId)}
                onAddConnector={(connector) => addConnector(proj.id, connector)}
                onRemoveConnector={(connectorId) => removeConnector(proj.id, connectorId)}
                onOpenChat={goToChat}
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
              onBack={goToChat}
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
          ) : activeView.type === 'keywords' ? (
            <KeywordsManager
              onBack={goToChat}
              onSendToChat={handleAudienceToChat}
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
          ) : activeView.type === 'saved' ? (
            currentSavedItem ? (
              <SavedItemView
                item={currentSavedItem}
                onBack={goToChat}
                onDelete={handleDeleteSavedItem}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
                Loading…
              </div>
            )
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
              onManageSkills={(skill) => navigate(skill ? `/skills/${encodeURIComponent(skill.id)}` : '/skills')}
              token={token}
              onLogin={onLogin}
              isLoginLoading={isLoginLoading}
              loginError={loginError}
              selectedAccount={selectedAccount}
              selectedBusiness={selectedBusiness}
              onSelectAccount={handleAccountSelect}
              onLogout={onLogout}
              onNavigate={(view) => {
                const pathMap = { audiences: '/audiences', skills: '/skills' };
                navigate(pathMap[view] || '/');
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

        {/* Canvas Panel — fills the remaining space next to the fixed-width
            chat. Was a hard 60%, which combined with chat=40% meant the
            split flexed with viewport instead of giving the user a stable
            chat column. flex-1 + min-w-0 lets the canvas absorb whatever
            width is left after the chat's 520px. */}
        <div className={`transition-[width,flex] duration-300 ease-in-out overflow-hidden ${canvasData ? 'flex-1 min-w-0' : 'w-0'}`}>
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
          initialTab={settingsInitialTab}
          onLogin={onLogin}
          onLogout={onLogout}
          isAppAuthed={isAppAuthed}
          onAppSignIn={requestSignIn}
          onAppSignOut={onAppSignOut}
          token={token}
          userName={userName}
          userEmail={userEmail}
          userAvatarUrl={userAvatarUrl}
          isLoginLoading={isLoginLoading}
          loginError={loginError}
        />
      )}

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {notification}
        </div>
      )}
    </div>
    </AuthGateProvider>
  );
};
