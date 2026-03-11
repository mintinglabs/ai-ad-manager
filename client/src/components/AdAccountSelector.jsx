import { useState, useEffect } from 'react';
import { Bot, ChevronRight, AlertCircle, RefreshCw, ArrowLeft, ChevronDown, ChevronUp, Building2 } from 'lucide-react';
import { useAdAccounts } from '../hooks/useAdAccounts.js';

// account_status codes from Meta API
const STATUS_LABEL = {
  1:   { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
  2:   { label: 'Disabled',  cls: 'bg-red-100     text-red-700'     },
  3:   { label: 'Unsettled', cls: 'bg-amber-100   text-amber-700'   },
  7:   { label: 'Pending',   cls: 'bg-slate-100   text-slate-600'   },
  9:   { label: 'In Review', cls: 'bg-blue-100    text-blue-700'    },
  100: { label: 'Closed',    cls: 'bg-slate-100   text-slate-500'   },
};

const StatusChip = ({ code }) => {
  const { label, cls } = STATUS_LABEL[code] || { label: 'Unknown', cls: 'bg-slate-100 text-slate-500' };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

const Spinner = ({ size = 5, color = 'text-blue-500' }) => (
  <svg className={`animate-spin h-${size} w-${size} ${color}`} viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
  </svg>
);

// Group accounts by business_name
const groupByBusiness = (accounts) => {
  const map = new Map();
  for (const acc of accounts) {
    const key = acc.business_name || 'Personal';
    if (!map.has(key)) map.set(key, { business_name: key, business_id: acc.business_id || null, accounts: [] });
    map.get(key).accounts.push(acc);
  }
  return Array.from(map.values());
};

export const AdAccountSelector = ({ token, onSelect, onBack }) => {
  const { adAccounts, error } = useAdAccounts(token);
  const [fetching, setFetching] = useState(true);
  const [showDevInfo, setShowDevInfo] = useState(false);
  const [connecting, setConnecting] = useState(null);

  // Simulate a 1s API fetch delay
  useEffect(() => {
    const t = setTimeout(() => setFetching(false), 1000);
    return () => clearTimeout(t);
  }, []);

  const groups = groupByBusiness(adAccounts);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors mr-1"
            title="Back to login"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>
        )}
        <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-1.5 rounded-lg">
          <Bot size={16} className="text-white" />
        </div>
        <h1 className="text-sm font-bold text-slate-900">AI Ad Manager</h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-16 pb-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Select your Ad Account</h2>
            <p className="text-slate-500 text-sm">Choose the ad account you want to manage with AI.</p>
          </div>

          {/* Fetching state */}
          {fetching && (
            <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
              <Spinner />
              <p className="text-sm text-slate-500">Fetching ad accounts from your verified Business Manager portfolios…</p>
              <p className="text-xs text-slate-400">Verifying via Meta Graph API</p>
            </div>
          )}

          {/* Error */}
          {error && !fetching && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
              <AlertCircle size={20} className="text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-700 mb-3">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-1.5 mx-auto text-xs text-red-600 hover:text-red-800 transition-colors"
              >
                <RefreshCw size={12} />
                Try again
              </button>
            </div>
          )}

          {/* Empty */}
          {!fetching && !error && adAccounts.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No ad accounts found for this Facebook account.</p>
              <p className="text-xs mt-1">Make sure you have access to at least one ad account.</p>
            </div>
          )}

          {/* Connecting overlay */}
          {connecting && (
            <div className="flex flex-col items-center gap-3 py-12">
              <Spinner />
              <p className="text-sm text-slate-600 font-medium">Connecting to {connecting.name}…</p>
              <p className="text-xs text-slate-400">Authorizing via Meta Graph API</p>
            </div>
          )}

          {/* Account list grouped by Business Portfolio */}
          {!fetching && !connecting && !error && adAccounts.length > 0 && (
            <div className="space-y-6">
              {groups.map((group) => (
                <div key={group.business_name}>
                  {/* Portfolio header */}
                  <div className="flex items-center gap-2 mb-2.5 px-1">
                    <Building2 size={13} className="text-slate-400 shrink-0" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Business Portfolio — {group.business_name}
                    </span>
                    {group.business_id && (
                      <span className="text-xs text-slate-400 font-mono ml-auto shrink-0">
                        BM ID: {group.business_id}
                      </span>
                    )}
                  </div>

                  {/* Accounts in this portfolio */}
                  <div className="space-y-2.5">
                    {group.accounts.map((account) => (
                      <button
                        key={account.id}
                        onClick={() => {
                          setConnecting(account);
                          setTimeout(() => { setConnecting(null); onSelect(account); }, 1500);
                        }}
                        disabled={!!connecting}
                        className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-blue-400 hover:shadow-sm transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {/* Account icon */}
                        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                          <span className="text-blue-600 font-bold text-sm">
                            {account.name.charAt(0).toUpperCase()}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{account.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-slate-400 font-mono">act_{account.account_id}</span>
                            <span className="text-slate-200">·</span>
                            <span className="text-xs text-slate-400">{account.currency}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            BM: <span className="text-slate-500">{account.business_name}</span>
                            {account.business_id && (
                              <span className="font-mono text-slate-400 ml-1">({account.business_id})</span>
                            )}
                          </p>
                        </div>

                        {/* Status + arrow */}
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusChip code={account.account_status} />
                          <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Dev Info toggle */}
              <div className="mt-4">
                <button
                  onClick={() => setShowDevInfo((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors mx-auto"
                >
                  {showDevInfo ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  Dev Info
                </button>
                {showDevInfo && (
                  <div className="mt-2 bg-slate-900 rounded-xl px-4 py-3">
                    <p className="text-xs text-slate-400 mb-1 font-semibold">API Call</p>
                    <code className="text-xs text-emerald-400 font-mono break-all">
                      GET /me/adaccounts?fields=name,account_id,account_status,currency,business&#123;id,name&#125;
                    </code>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
