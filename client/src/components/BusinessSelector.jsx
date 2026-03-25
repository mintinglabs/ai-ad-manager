import { useState } from 'react';
import { Bot, ArrowLeft, Building2, ChevronRight } from 'lucide-react';
import { useBusinesses } from '../hooks/useBusinesses.js';

export const BusinessSelector = ({ onSelect, onBack }) => {
  const { businesses, isLoading, error } = useBusinesses();
  const [connecting, setConnecting] = useState(null);

  const handleSelect = (biz) => {
    setConnecting(biz);
    setTimeout(() => { setConnecting(null); onSelect(biz); }, 1500);
  };

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
        <h1 className="text-sm font-bold text-slate-800">AI Ad Manager</h1>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-4 pt-16 pb-12">
        <div className="w-full max-w-lg">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">Select Business Portfolio</h2>
            <p className="text-slate-500 text-sm">
              Choose a Business Manager portfolio to access its ad accounts.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <svg className="animate-spin h-6 w-6 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-slate-500 font-medium">Loading Business Portfolios…</p>
              <p className="text-xs text-slate-400 font-mono">GET /me/businesses · business_management</p>
            </div>
          ) : connecting ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <p className="text-sm text-slate-600 font-medium">Loading Business Portfolio…</p>
              <p className="text-xs text-slate-400">Fetching ad accounts via Meta Graph API</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-red-500">Data Load Error</p>
              <p className="text-xs text-slate-400 mt-1">{error}</p>
            </div>
          ) : businesses.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p className="text-sm">No Business Portfolios found for this account.</p>
              <p className="text-xs mt-1">Make sure you have Business Manager access.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {businesses.map((biz) => (
                <button
                  key={biz.id}
                  onClick={() => handleSelect(biz)}
                  className="w-full bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-11 h-11 rounded-xl bg-violet-50 flex items-center justify-center shrink-0 group-hover:bg-violet-100 transition-colors">
                    <Building2 size={20} className="text-violet-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{biz.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-400 font-mono">BM ID: {biz.id}</span>
                      {biz.verification_status && (
                        <span className="text-xs text-slate-400">· {biz.verification_status}</span>
                      )}
                    </div>
                  </div>

                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Permissions footer */}
          <div className="mt-8 flex flex-col items-center gap-2">
            <p className="text-xs text-slate-400">Data fetched via <code className="bg-slate-100 px-1 rounded font-mono">GET /me/businesses</code> · <code className="bg-slate-100 px-1 rounded font-mono">business_management</code></p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {['ads_read', 'ads_management', 'business_management', 'read_insights', 'instagram_basic', 'instagram_manage_insights', 'pages_read_engagement', 'pages_show_list'].map((p) => (
                <span key={p} className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
