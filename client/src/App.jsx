import { useState, useEffect, Component } from 'react';

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
import { LoginPage } from './components/LoginPage.jsx';
import { Dashboard } from './components/Dashboard.jsx';

// Local dev bypass — skip login and go straight to dashboard
const DEV_BYPASS = import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS === 'true';

export default function App() {
  const { longLivedToken, isLoading, error, login, logout, setTokenDirect } = useAuth();
  const [userName, setUserName] = useState(() => localStorage.getItem('aam_user_first_name') || '');
  const [selectedBusiness, setSelectedBusiness] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aam_selected_business')); } catch { return null; }
  });
  const [selectedAccount, setSelectedAccount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aam_selected_account')); } catch { return null; }
  });
  const [googleCustomerId, setGoogleCustomerId] = useState(() => localStorage.getItem('aam_google_customer_id') || '');
  const handleGoogleConnect = (id) => { setGoogleCustomerId(id); localStorage.setItem('aam_google_customer_id', id); };
  const handleGoogleDisconnect = () => { setGoogleCustomerId(''); localStorage.removeItem('aam_google_customer_id'); };

  // Dev: sync demo token from server BEFORE rendering anything
  const [devTokenReady, setDevTokenReady] = useState(!import.meta.env.DEV);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    fetch('/api/auth/demo-token')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.longLivedToken) {
          localStorage.setItem('fb_long_lived_token', data.longLivedToken);
          setTokenDirect(data.longLivedToken);
        }
      })
      .catch(() => {})
      .finally(() => {
        setDevTokenReady(true);
        // Fetch user name
        fetch('/api/auth/me').then(r => r.ok ? r.json() : null).then(data => {
          if (data?.firstName) { localStorage.setItem('aam_user_first_name', data.firstName); setUserName(data.firstName); }
        }).catch(() => {});
      });

    // Also auto-refresh on token errors
    const handleTokenError = () => {
      fetch('/api/auth/demo-token')
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.longLivedToken) {
            localStorage.setItem('fb_long_lived_token', data.longLivedToken);
            setTokenDirect(data.longLivedToken);
          }
        }).catch(() => {});
    };
    window.addEventListener('fb_token_error', handleTokenError);
    return () => window.removeEventListener('fb_token_error', handleTokenError);
  }, []);

  // Block rendering until dev token is synced
  if (!devTokenReady) return null;

  // Always show Dashboard — soft wall prompts login when needed
  return (
    <ErrorBoundary>
      <Dashboard
        token={longLivedToken}
        adAccountId={selectedAccount?.id || null}
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        userName={userName}
        onSwitchAccount={(account) => { setSelectedAccount(account); localStorage.setItem('aam_selected_account', JSON.stringify(account)); }}
        onSwitchBusiness={(business) => { setSelectedAccount(null); setSelectedBusiness(business || null); localStorage.removeItem('aam_selected_account'); localStorage.setItem('aam_selected_business', JSON.stringify(business || null)); }}
        onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); localStorage.removeItem('aam_selected_account'); localStorage.removeItem('aam_selected_business'); }}
        onLogin={login}
        isLoginLoading={isLoading}
        loginError={error}
        googleCustomerId={googleCustomerId}
        onGoogleConnect={handleGoogleConnect}
        onGoogleDisconnect={handleGoogleDisconnect}
      />
    </ErrorBoundary>
  );
}
