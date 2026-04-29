import { useState, useEffect, Component } from 'react';
import { Routes, Route } from 'react-router-dom';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200 rounded-2xl p-6 max-w-md w-full text-center shadow-lg">
          <p className="text-sm font-semibold text-red-500 mb-2">Something went wrong loading the dashboard</p>
          <p className="text-xs text-slate-500 font-mono break-all mb-4">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="text-xs text-blue-600 underline">Try again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
import { useAuth } from './hooks/useAuth.js';
import { useGoogleAuth } from './hooks/useGoogleAuth.js';
import { useSupabaseAuth } from './hooks/useSupabaseAuth.js';
import { LoginPage } from './components/LoginPage.jsx';
import { Dashboard } from './components/Dashboard.jsx';

// Local dev bypass — skip login and go straight to dashboard
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true';

export default function App() {
  const supaAuth = useSupabaseAuth();
  const { longLivedToken, isAuthenticated, user, bootChecked, isLoading, error, login, logout, markAuthed } = useAuth();
  const [userName, setUserName] = useState(() => localStorage.getItem('aam_user_first_name') || '');
  const [selectedBusiness, setSelectedBusiness] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aam_selected_business')); } catch { return null; }
  });
  const [selectedAccount, setSelectedAccount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aam_selected_account')); } catch { return null; }
  });
  const google = useGoogleAuth();

  // Dev: establish a real cookie session from META_DEMO_TOKEN before render.
  // The token stays on the server; the browser only ever sees the HttpOnly
  // session cookie.
  const [devSessionReady, setDevSessionReady] = useState(!import.meta.env.DEV);

  useEffect(() => {
    if (user?.firstName && !userName) setUserName(user.firstName);
  }, [user, userName]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const seedDemo = async () => {
      try {
        const r = await fetch('/api/auth/demo-session', { method: 'POST', credentials: 'include' });
        if (r.ok) {
          const data = await r.json();
          if (data?.authenticated) {
            markAuthed(data.user);
            if (data.user?.firstName) {
              localStorage.setItem('aam_user_first_name', data.user.firstName);
              setUserName(data.user.firstName);
            }
          }
        }
      } catch {}
    };
    seedDemo().finally(() => setDevSessionReady(true));

    // Re-seed on auth errors, but throttle: a 500 page that fires multiple
    // 401s in a row used to spawn a flood of /demo-session requests. Cap to
    // one re-seed every 5s.
    let lastReseed = 0;
    const handleTokenError = () => {
      const now = Date.now();
      if (now - lastReseed < 5000) return;
      lastReseed = now;
      seedDemo();
    };
    window.addEventListener('fb_token_error', handleTokenError);
    return () => window.removeEventListener('fb_token_error', handleTokenError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Block rendering until dev session attempt completes (so the dashboard
  // doesn't briefly render in a logged-out state on localhost).
  if (!devSessionReady || !bootChecked || !supaAuth.bootChecked) return null;

  // OfflineBanner is mounted alongside the dashboard so a WiFi drop is
  // visibly acknowledged. The actual chat-context preservation happens
  // server-side (see server/src/api/chat.js sse helper).

  // Prefer Google identity (from Supabase) for the displayed user info.
  // Supabase sometimes puts the Google fields in user_metadata, sometimes
  // in identities[].identity_data — check both.
  //
  // When the user is NOT signed in via Supabase (anonymous preview, post-
  // logout), show empty strings rather than falling back to the cached
  // FB demo userName / aam_user_first_name in localStorage. Otherwise the
  // chat hero keeps greeting "Hello, Andy" after sign-out.
  const googleMeta = supaAuth.user?.user_metadata || {};
  const googleIdentity = supaAuth.user?.identities?.find(i => i.provider === 'google')?.identity_data || {};
  const displayName = supaAuth.user
    ? (googleMeta.full_name || googleMeta.name || googleIdentity.full_name || googleIdentity.name || (supaAuth.user.email?.split('@')[0] ?? ''))
    : '';
  const displayEmail = supaAuth.user ? (supaAuth.user.email || googleIdentity.email || '') : '';
  const displayAvatarUrl = supaAuth.user
    ? (googleMeta.avatar_url || googleMeta.picture || googleIdentity.avatar_url || googleIdentity.picture || '')
    : '';

  // Soft paywall: always render Dashboard so anonymous visitors can preview
  // the UI. Mutating actions (chat send, etc.) trigger the Supabase Google
  // sign-in popup via onAppSignIn.
  const dashboardEl = (
    <Dashboard
      token={longLivedToken}
      adAccountId={selectedAccount?.id || null}
      selectedAccount={selectedAccount}
      selectedBusiness={selectedBusiness}
      userName={displayName}
      userEmail={displayEmail}
      userAvatarUrl={displayAvatarUrl}
      isAppAuthed={!!supaAuth.user}
      onAppSignIn={supaAuth.signInWithGoogle}
      onAppSignOut={supaAuth.signOut}
      onSwitchAccount={(account) => { setSelectedAccount(account); localStorage.setItem('aam_selected_account', JSON.stringify(account)); }}
      onSwitchBusiness={(business) => { setSelectedAccount(null); setSelectedBusiness(business || null); localStorage.removeItem('aam_selected_account'); localStorage.setItem('aam_selected_business', JSON.stringify(business || null)); }}
      onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); localStorage.removeItem('aam_selected_account'); localStorage.removeItem('aam_selected_business'); }}
      onLogin={login}
      isLoginLoading={isLoading}
      loginError={error}
      googleConnected={google.connected}
      googleCustomerId={google.customerId}
      googleLoginCustomerId={google.loginCustomerId}
      onGoogleConnect={google.connect}
      onGoogleDisconnect={google.disconnect}
      onSelectGoogleAccount={google.selectAccount}
    />
  );

  return (
    <ErrorBoundary>
      <OfflineBanner />
      <Routes>
        <Route path="/c/:sessionId" element={dashboardEl} />
        <Route path="*" element={dashboardEl} />
      </Routes>
    </ErrorBoundary>
  );
}

function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  if (isOnline) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[100] bg-amber-500 text-white text-center text-[12px] font-medium px-4 py-1.5 shadow-md">
      You're offline — your conversation will resume automatically once you're back online.
    </div>
  );
}
