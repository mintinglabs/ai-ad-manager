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
  const [selectedBusiness, setSelectedBusiness] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aam_selected_business')); } catch { return null; }
  });
  const [selectedAccount, setSelectedAccount] = useState(() => {
    try { return JSON.parse(localStorage.getItem('aam_selected_account')); } catch { return null; }
  });

  // Dev: sync demo token from server when current token is missing or expired
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    // Try to sync demo token from server
    const syncToken = () => {
      fetch('/api/auth/demo-token').then(r => r.ok ? r.json() : null).then(data => {
        if (!data?.longLivedToken) return;
        const current = localStorage.getItem('fb_long_lived_token');
        if (current !== data.longLivedToken) {
          setTokenDirect(data.longLivedToken);
        }
      }).catch(() => {});
    };
    syncToken();
  }, []);

  // Always show Dashboard — soft wall prompts login when needed
  return (
    <ErrorBoundary>
      <Dashboard
        token={longLivedToken}
        adAccountId={selectedAccount?.id || null}
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        onSwitchAccount={(account) => { setSelectedAccount(account); localStorage.setItem('aam_selected_account', JSON.stringify(account)); }}
        onSwitchBusiness={(business) => { setSelectedAccount(null); setSelectedBusiness(business || null); localStorage.removeItem('aam_selected_account'); localStorage.setItem('aam_selected_business', JSON.stringify(business || null)); }}
        onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); localStorage.removeItem('aam_selected_account'); localStorage.removeItem('aam_selected_business'); }}
        onLogin={login}
        isLoginLoading={isLoading}
        loginError={error}
      />
    </ErrorBoundary>
  );
}
