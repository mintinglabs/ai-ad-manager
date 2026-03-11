import { useState } from 'react';
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
    <Dashboard
      token={longLivedToken}
      adAccountId={selectedAccount.id}
      selectedAccount={selectedAccount}
      onLogout={() => { logout(); setSelectedBusiness(null); setSelectedAccount(null); }}
    />
  );
}
