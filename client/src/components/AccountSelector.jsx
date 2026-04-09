import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.84 4.84 0 01-3.77-1.81V6.69h3.77z"/></svg>
);

export const AccountSelector = ({ token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('business');
  const [activeBiz, setActiveBiz] = useState(selectedBusiness);
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts: accounts, isLoading: accLoading } = useAdAccounts(activeBiz?.id);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!token) {
    return (
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(v => !v)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
          <Link2 size={12} /> Connect
        </button>
        {open && (
          <div className="absolute top-full left-0 mt-1 w-[220px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-100">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ad Platforms</p>
            </div>
            <div className="py-1">
              <button onClick={() => { onLogin(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
                <img src="/meta-icon.svg" alt="Meta" className="w-4 h-4 shrink-0" />
                <span className="text-[12px] font-medium text-slate-700 flex-1">Meta Ads Manager</span>
                <span className="text-[10px] font-medium text-blue-600">Connect</span>
              </button>
              <div className="w-full flex items-center gap-2.5 px-3 py-2.5 opacity-50">
                <GoogleIcon />
                <span className="text-[12px] font-medium text-slate-400 flex-1">Google Ads</span>
                <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Soon</span>
              </div>
              <div className="w-full flex items-center gap-2.5 px-3 py-2.5 opacity-50">
                <TikTokIcon />
                <span className="text-[12px] font-medium text-slate-400 flex-1">TikTok Ads</span>
                <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Soon</span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(v => !v); setLevel(selectedBusiness ? 'accounts' : 'business'); if (selectedBusiness) setActiveBiz(selectedBusiness); }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
          ${selectedAccount ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'}`}>
        <Building2 size={12} />
        {selectedAccount ? selectedAccount.name : 'Select Ad Account'}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {level === 'business' && (
            <>
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {bizLoading ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">Loading businesses...</div>
                ) : businesses.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No businesses found</div>
                ) : businesses.map(biz => (
                  <button key={biz.id} onClick={() => { setActiveBiz(biz); setLevel('accounts'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${biz.id === selectedBusiness?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <Building2 size={12} className="text-slate-400 shrink-0" />
                    <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{biz.name}</span>
                    <ChevronRight size={12} className="text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
          {level === 'accounts' && (
            <>
              <button onClick={() => setLevel('business')}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronDown size={14} className="text-slate-400 rotate-90" />
                <Building2 size={12} className="text-slate-400" />
                <span className="text-[11px] font-medium text-slate-500 truncate">{activeBiz?.name}</span>
              </button>
              <div className="px-3 py-1.5 border-b border-slate-50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Ad Account</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accLoading ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">Loading accounts...</div>
                ) : accounts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No ad accounts found</div>
                ) : accounts.map(acc => (
                  <button key={acc.id} onClick={() => { onSelectAccount?.(activeBiz, acc, { stayOnPage: true }); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${acc.id === selectedAccount?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{acc.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{acc.id}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
