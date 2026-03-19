import { useState, Component } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-[#0f1623] flex items-center justify-center p-8">
        <div className="bg-[#141b2d] border border-[#1e293b] rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-sm font-semibold text-red-400 mb-2">Something went wrong loading the dashboard</p>
          <p className="text-xs text-slate-400 font-mono break-all mb-4">{this.state.error.message}</p>
          <button onClick={() => this.setState({ error: null })} className="text-xs text-blue-400 underline">Try again</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
import { useAuth } from './hooks/useAuth.js';
import { LoginPage } from './components/LoginPage.jsx';
import { BusinessSelector } from './components/BusinessSelector.jsx';
import { AdAccountSelector } from './components/AdAccountSelector.jsx';
import { Dashboard } from './components/Dashboard.jsx';

export default function App() {
  const { longLivedToken, isLoading, error, login, logout, fbReady } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedAccount,  setSelectedAccount]  = useState(null);

  // Step 1: Facebook login
  if (!longLivedToken) {
    return <LoginPage onLogin={login} isLoading={isLoading} error={error} fbReady={fbReady} />;
  }

  // Step 2: Select Business Portfolio
  if (!selectedBusiness) {
    return (
      <BusinessSelector
        onSelect={setSelectedBusiness}
        onBack={logout}
      />
    );
  }

  // Step 3: Select Ad Account (filtered to selected business)
  if (!selectedAccount) {
    return (
      <AdAccountSelector
        token={longLivedToken}
        business={selectedBusiness}
        onSelect={setSelectedAccount}
        onBack={() => setSelectedBusiness(null)}
      />
    );
  }

  // Step 4: Dashboard — pass switching callbacks
  return (
    <ErrorBoundary>
      <Dashboard
        token={longLivedToken}
        adAccountId={selectedAccount.id}
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        onSwitchAccount={(account) => setSelectedAccount(account)}
        onSwitchBusiness={() => { setSelectedAccount(null); setSelectedBusiness(null); }}
        onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); }}
      />
    </ErrorBoundary>
  );
}
