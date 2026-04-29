import { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronDown, ChevronLeft, Check, Link2 } from 'lucide-react';
import { useRequireAuth } from '../lib/authGate.jsx';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useGoogleAccounts } from '../hooks/useGoogleAccounts.js';

// ── Icons ──
const MetaIcon = () => <img src="/meta-icon.svg" alt="Meta" className="w-4 h-4 shrink-0" />;
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Variant styles
const variantStyles = {
  header: {
    // For dark-header module contexts (CampaignManager, Reports, etc)
    connected: 'border-white/20 text-white bg-white/15 hover:bg-white/25',
    needsAction: 'border-amber-500/40 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20',
    disconnected: 'border-blue-400/40 text-blue-300 bg-blue-500/15 hover:bg-blue-500/25',
    rounded: 'rounded-lg',
    size: 'px-3 py-2 text-[12px]',
  },
  chat: {
    // For light-background chat input
    connected: 'border-emerald-200 text-emerald-600 bg-emerald-50 hover:bg-emerald-100',
    needsAction: 'border-amber-200 text-amber-600 bg-amber-50 hover:bg-amber-100',
    disconnected: 'border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50',
    rounded: 'rounded-full',
    size: 'px-3 py-1.5 text-[11px]',
  },
};

export const PlatformAccountSelector = ({
  platform = 'meta',
  // Meta
  token, selectedAccount, selectedBusiness, onSelectMetaAccount, onLoginMeta, onLogoutMeta,
  isLoginLoading, loginError,
  // Google
  googleConnected, googleCustomerId, onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount,
  // Layout
  variant = 'header',
  dropUp = false,
}) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('main');
  const [activeBiz, setActiveBiz] = useState(selectedBusiness);
  const [pos, setPos] = useState(null); // { top, left, bottom } viewport coords for portal dropdown
  const ref = useRef(null);
  const btnRef = useRef(null);

  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts: metaAccounts, isLoading: metaAccLoading } = useAdAccounts(activeBiz?.id);
  const { accounts: googleAccounts, isLoading: googleLoading } = useGoogleAccounts(googleConnected);

  // Connecting Meta or Google requires the user to be signed in to the
  // app (Supabase) first — otherwise we'd be granting third-party OAuth
  // tokens to an anonymous browser session, which is both confusing and
  // impossible to associate with a user record. requireAuth bounces the
  // click to the LoginModal in that case.
  const requireAuth = useRequireAuth();
  const gatedLoginMeta     = onLoginMeta     ? requireAuth(onLoginMeta)     : undefined;
  const gatedGoogleConnect = onGoogleConnect ? requireAuth(onGoogleConnect) : undefined;

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      // Allow clicks inside portal-rendered dropdown too
      if (e.target.closest?.('[data-pas-dropdown]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reposition on resize/scroll while open
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => setPos(computePos());
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, dropUp]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset level when platform changes (not when opening — handler sets level)
  useEffect(() => { setLevel('main'); }, [platform]);

  const s = variantStyles[variant];
  const isMeta = platform === 'meta';
  const isGoogle = platform === 'google';

  // Determine current button state
  let buttonLabel, buttonState;
  if (isMeta) {
    if (!token) { buttonLabel = 'Connect Meta'; buttonState = 'disconnected'; }
    else if (!selectedAccount) { buttonLabel = 'Select Account'; buttonState = 'needsAction'; }
    else { buttonLabel = selectedAccount.name; buttonState = 'connected'; }
  } else if (isGoogle) {
    if (!googleConnected) { buttonLabel = 'Connect Google Ads'; buttonState = 'disconnected'; }
    else if (!googleCustomerId) { buttonLabel = 'Select Account'; buttonState = 'needsAction'; }
    else {
      const picked = googleAccounts.find(a => a.id === googleCustomerId);
      buttonLabel = picked?.name || `Account ${googleCustomerId}`;
      buttonState = 'connected';
    }
  }

  const computePos = () => {
    if (!btnRef.current) return null;
    const r = btnRef.current.getBoundingClientRect();
    const DROPDOWN_W = 280;
    const left = Math.min(r.left, window.innerWidth - DROPDOWN_W - 8);
    return dropUp
      ? { left, bottom: window.innerHeight - r.top + 4 }
      : { left, top: r.bottom + 4 };
  };

  const handleButtonClick = () => {
    // Direct action when no dropdown needed. Both connect paths route
    // through the gated wrappers so anon users see the LoginModal first.
    if (isMeta && !token) { gatedLoginMeta?.(); return; }
    if (isGoogle && !googleConnected) { gatedGoogleConnect?.(); return; }
    const nextOpen = !open;
    if (nextOpen) setPos(computePos());
    setOpen(nextOpen);
    if (isMeta) setLevel(selectedBusiness ? 'meta_accounts' : 'meta_business');
    else if (isGoogle) setLevel('google_accounts');
  };

  const handleMetaBizClick = (biz) => { setActiveBiz(biz); setLevel('meta_accounts'); };
  const handleMetaAccountClick = (acc) => {
    onSelectMetaAccount?.(activeBiz, acc, { stayOnPage: true });
    setOpen(false);
  };
  const handleGoogleAccountClick = (acc) => {
    onSelectGoogleAccount?.(acc.id, acc.mccId || null);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button ref={btnRef} onClick={handleButtonClick}
        className={`inline-flex items-center gap-2 border font-medium transition-colors ${s.rounded} ${s.size} ${s[buttonState]}`}>
        {isMeta ? <Building2 size={12} /> : <GoogleIcon />}
        <span className="truncate max-w-[180px]">{buttonLabel}</span>
        {(buttonState === 'connected' || buttonState === 'needsAction') && <ChevronDown size={12} />}
      </button>

      {open && pos && createPortal(
        <div data-pas-dropdown
          style={{ position: 'fixed', left: pos.left, top: pos.top, bottom: pos.bottom, width: 280, zIndex: 99999 }}
          className="bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
          {/* Meta: business level */}
          {level === 'meta_business' && (
            <>
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
                {token && onLogoutMeta && (
                  <button onClick={() => { onLogoutMeta(); setOpen(false); }} className="text-[10px] font-medium text-slate-400 hover:text-red-500">Disconnect</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {bizLoading && <div className="px-3 py-6 text-center text-[11px] text-slate-400">Loading…</div>}
                {!bizLoading && businesses.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-slate-400">No businesses</div>}
                {businesses.map(biz => (
                  <button key={biz.id} onClick={() => handleMetaBizClick(biz)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left">
                    <Building2 size={12} className="text-slate-400 shrink-0" />
                    <span className="text-[12px] font-medium text-slate-700 flex-1 truncate">{biz.name}</span>
                    <ChevronDown size={12} className="text-slate-400 -rotate-90" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Meta: accounts level */}
          {level === 'meta_accounts' && (
            <>
              <button onClick={() => setLevel('meta_business')}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50">
                <ChevronLeft size={14} className="text-slate-400" />
                <span className="text-[11px] font-medium text-slate-500 truncate">{activeBiz?.name || 'Back'}</span>
              </button>
              <div className="max-h-64 overflow-y-auto">
                {metaAccLoading && <div className="px-3 py-6 text-center text-[11px] text-slate-400">Loading accounts…</div>}
                {!metaAccLoading && metaAccounts.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-slate-400">No ad accounts</div>}
                {metaAccounts.map(acc => (
                  <button key={acc.id} onClick={() => handleMetaAccountClick(acc)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 truncate">{acc.name}</p>
                      <p className="text-[10px] text-slate-400">{acc.account_id || acc.id}</p>
                    </div>
                    {acc.id === selectedAccount?.id && <Check size={12} className="text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Google: accounts level */}
          {level === 'google_accounts' && (
            <>
              <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Google Ads Accounts</p>
                {googleConnected && onGoogleDisconnect && (
                  <button onClick={() => { onGoogleDisconnect(); setOpen(false); }} className="text-[10px] font-medium text-slate-400 hover:text-red-500">Disconnect</button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto">
                {googleLoading && <div className="px-3 py-6 text-center text-[11px] text-slate-400">Loading accounts…</div>}
                {!googleLoading && googleAccounts.length === 0 && <div className="px-3 py-6 text-center text-[11px] text-slate-400">No accounts available</div>}
                {googleAccounts.map(acc => (
                  <button key={acc.id} onClick={() => handleGoogleAccountClick(acc)}
                    className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-slate-50 text-left">
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-slate-700 truncate">{acc.name || `Account ${acc.id}`}</p>
                      <p className="text-[10px] text-slate-400">{acc.id} · {acc.currencyCode || ''}{acc.mccName ? ` · ${acc.mccName}` : ''}</p>
                    </div>
                    {acc.id === googleCustomerId && <Check size={12} className="text-emerald-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Meta connect state (when no token) — shouldn't normally open since handleButtonClick triggers login directly */}
          {level === 'main' && isMeta && !token && (
            <>
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Connect Meta</p>
              </div>
              <button onClick={gatedLoginMeta} className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-slate-50 text-left">
                <MetaIcon />
                <span className="text-[12px] font-medium text-slate-700 flex-1">Meta Ads Manager</span>
                <span className="text-[10px] font-medium text-blue-600">Connect</span>
              </button>
              {isLoginLoading && <div className="px-3 py-2 text-[11px] text-indigo-500 font-medium">Connecting…</div>}
              {loginError && <div className="px-3 py-2 text-[11px] text-red-500">{loginError}</div>}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
