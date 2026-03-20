import { useState, useEffect } from 'react';
import { Bot, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAdAccounts } from '../hooks/useAdAccounts.js';

const STATUS_LABEL = {
  1:   { label: 'Active',    cls: 'bg-emerald-50 text-emerald-600 border border-emerald-200' },
  2:   { label: 'Disabled',  cls: 'bg-red-50 text-red-500 border border-red-200'             },
  3:   { label: 'Unsettled', cls: 'bg-amber-50 text-amber-600 border border-amber-200'       },
  7:   { label: 'Pending',   cls: 'bg-slate-100 text-slate-500 border border-slate-200'       },
  9:   { label: 'In Review', cls: 'bg-blue-50 text-blue-600 border border-blue-200'           },
  100: { label: 'Closed',    cls: 'bg-slate-100 text-slate-400 border border-slate-200'       },
};

const StatusChip = ({ code }) => {
  const { label, cls } = STATUS_LABEL[code] || { label: 'Unknown', cls: 'bg-slate-100 text-slate-400 border border-slate-200' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

export const AdAccountSelector = ({ token, business, onSelect, onBack }) => {
  const { adAccounts, error } = useAdAccounts(business?.id);
  const [fetching,    setFetching]    = useState(true);
  const [connecting,  setConnecting]  = useState(null);

  // Simulate 1s API sync
  useEffect(() => {
    const t = setTimeout(() => setFetching(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const accounts = Array.isArray(adAccounts) ? adAccounts : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 flex flex-col">
      {/* Header */}
      <header className="bg-white/70 backdrop-blur-xl border-b border-slate-200 px-6 py-3.5 flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors mr-1"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>
        )}
        <div className="bg-gradient-to-br from-amber-400 to-orange-500 p-1.5 rounded-lg shadow-sm">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-bold text-slate-800 leading-tight">AI Ad Manager</h1>
          {business && <p className="text-xs text-slate-400 truncate">{business.name}</p>}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-16 pb-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Select Ad Account</h2>
            <p className="text-slate-500 text-sm">Choose the ad account you want to manage with AI.</p>
          </div>

          {/* Fetching */}
          {fetching && (
            <div className="flex flex-col items-center gap-3 py-16">
              <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-slate-500 font-medium">Syncing with Meta Marketing API…</p>
              <p className="text-xs text-slate-400">Verifying ad account permissions</p>
            </div>
          )}

          {/* Connecting overlay */}
          {!fetching && connecting && (
            <div className="flex flex-col items-center gap-3 py-16">
              <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-slate-600 font-medium">Connecting to {connecting.name}…</p>
              <p className="text-xs text-slate-400">Authorizing via Meta Graph API</p>
            </div>
          )}

          {/* Account list */}
          {!fetching && !connecting && accounts.length > 0 && (
            <div className="space-y-2.5">
              {accounts.map((account) => (
                <button
                  key={account.id}
                  onClick={() => {
                    setConnecting(account);
                    setTimeout(() => { setConnecting(null); onSelect(account); }, 1500);
                  }}
                  className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <span className="text-blue-600 font-bold text-sm">
                      {account.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{account.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">act_{account.account_id}</span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-400">{account.currency}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <StatusChip code={account.account_status} />
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {!fetching && !connecting && error && (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-red-500">Data Load Error</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
          )}

          {!fetching && !connecting && !error && accounts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No ad accounts found for this Business Portfolio.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
