import { useState } from 'react';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

export const AppLoginGate = ({ onSignIn }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(true);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      await onSignIn();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-200/40 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl" />

      {/* Top-right Start Now button */}
      <div className="relative flex items-center justify-end px-6 py-5">
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          Start Now
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17L17 7M17 7H7M17 7V17"/>
          </svg>
        </button>
      </div>

      {/* Hero text */}
      <div className="relative flex flex-col items-center justify-center px-6 text-center" style={{ height: 'calc(100vh - 88px)' }}>
        <div className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur-sm border border-orange-200/60 text-xs font-medium text-orange-600">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          AI Agent Active
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-slate-900 max-w-3xl">
          Your AI co-pilot for{' '}
          <span className="bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
            ad management
          </span>
        </h1>
        <p className="mt-6 text-lg text-slate-600 max-w-xl">
          Manage Meta &amp; Google Ads campaigns, audiences, and creatives — all from one chat-driven workspace.
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="mt-10 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-base font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
        >
          Get Started
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Login modal */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg mb-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Welcome to AI Ad Manager</h2>
              <p className="mt-2 text-sm text-slate-500">Sign in to continue</p>

              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="mt-8 w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-white border border-slate-200 text-slate-700 text-sm font-medium hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <GoogleIcon />
                {isLoading ? 'Redirecting…' : 'Continue with Google'}
              </button>

              <p className="mt-6 text-xs text-slate-400">
                By continuing you agree to our Terms &amp; Privacy Policy.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
