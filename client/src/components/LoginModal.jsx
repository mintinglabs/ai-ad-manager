import { useEffect, useState } from 'react';
import { Zap, Sparkles, X } from 'lucide-react';

const GoogleIcon = ({ className = '' }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
    <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z" fill="#EA4335"/>
  </svg>
);

// Modal-only sign-in popup. Triggered when an anonymous visitor attempts
// any mutating action (Start Now, chat send, Connect platform, …).
export const LoginModal = ({ onClose, onGoogleSignIn }) => {
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onGoogleSignIn?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm animate-[fadeIn_0.15s_ease-out]"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 animate-[fadeSlideUp_0.2s_ease-out]"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Logo with a small sparkle accent in the top-right corner —
              same orange-amber gradient as the rest of the brand. */}
          <div className="relative mb-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Zap size={28} className="text-white" strokeWidth={2.5} fill="white" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center">
              <Sparkles size={12} className="text-amber-500" fill="currentColor" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Welcome to AI Ad Manager</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue</p>

          {/* Google button — orange-gradient CTA with a white inset for the
              official Google "G" mark so it still reads as a Google sign-in. */}
          <button
            onClick={handleClick}
            disabled={isLoading}
            className="mt-8 w-full inline-flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-orange-500/20"
          >
            <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-sm">
              <GoogleIcon className="w-3.5 h-3.5" />
            </span>
            {isLoading ? 'Redirecting…' : 'Continue with Google'}
          </button>

          <p className="mt-6 text-xs text-slate-400">
            By continuing you agree to our{' '}
            <a href="#" className="text-slate-500 hover:text-slate-700 underline decoration-slate-300 hover:decoration-slate-500 underline-offset-2 transition-colors">
              Terms
            </a>{' '}
            &amp;{' '}
            <a href="#" className="text-slate-500 hover:text-slate-700 underline decoration-slate-300 hover:decoration-slate-500 underline-offset-2 transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
};
