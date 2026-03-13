import { useState, Component } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
        <div className="bg-white border border-red-200 rounded-2xl p-6 max-w-md w-full text-center">
          <p className="text-sm font-semibold text-red-600 mb-2">Something went wrong loading the dashboard</p>
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
import { BusinessSelector } from './components/BusinessSelector.jsx';
import { AdAccountSelector } from './components/AdAccountSelector.jsx';
import { Dashboard } from './components/Dashboard.jsx';

export default function App() {
  const { longLivedToken, isLoading, error, login, logout } = useAuth();
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [selectedAccount,  setSelectedAccount]  = useState(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <svg className="animate-spin h-8 w-8" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  // Step 1: Facebook login
  if (!longLivedToken) {
    return <LoginPage onLogin={login} isLoading={isLoading} error={error} />;
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

  // Step 4: Dashboard
  return (
    <ErrorBoundary>
      <Dashboard
        token={longLivedToken}
        adAccountId={selectedAccount.id}
        selectedAccount={selectedAccount}
        onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); }}
      />
    </ErrorBoundary>
  );
}
