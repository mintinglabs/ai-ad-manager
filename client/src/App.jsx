import { useState, Component } from 'react';

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

export default function App() {
  const { longLivedToken, isLoading, error, login, logout } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedAccount,  setSelectedAccount]  = useState(null);

  // Step 1: Facebook login
  if (!longLivedToken) {
    return <LoginPage onLogin={login} isLoading={isLoading} error={error} />;
  }

  // Step 2: Dashboard — user selects business/account from sidebar
  return (
    <ErrorBoundary>
      <Dashboard
        token={longLivedToken}
        adAccountId={selectedAccount?.id || null}
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        onSwitchAccount={(account) => setSelectedAccount(account)}
        onSwitchBusiness={(business) => { setSelectedAccount(null); setSelectedBusiness(business || null); }}
        onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); }}
      />
    </ErrorBoundary>
  );
}
