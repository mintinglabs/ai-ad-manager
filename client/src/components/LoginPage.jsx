import { useState } from 'react';
import { Bot, Shield, BarChart2, Zap, X } from 'lucide-react';

const Feature = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 text-blue-100">
    <Icon size={14} className="shrink-0" />
    <span className="text-sm">{text}</span>
  </div>
);

const FB_LOGO = (
  <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const TEST_EMAIL    = 'testuser_meta@aiadmanager.com';
const TEST_PASSWORD = 'meta_review_2026';

// ── Realistic Facebook Login modal ────────────────────────────────────────────
const FbLoginModal = ({ onConfirm, onCancel }) => {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleLogin = () => {
    if (email === TEST_EMAIL && password === TEST_PASSWORD) {
      setError('');
      setLoading(true);
      setTimeout(() => { setLoading(false); onConfirm(); }, 1500);
    } else {
      setError('The email address or password you entered is incorrect. Learn more');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-2xl overflow-hidden">

        {/* FB Header */}
        <div className="bg-[#1877F2] px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {FB_LOGO}
            <div>
              <p className="text-white/80 text-xs">facebook</p>
              <p className="text-white font-bold text-sm leading-tight">Log in to Facebook</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-white/70 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-[#1877F2] border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-slate-800 font-semibold text-sm">Logging in…</p>
                <p className="text-slate-400 text-xs mt-1">Verifying your Facebook account</p>
              </div>
            </div>
          ) : (
            <>
              {/* Test account banner */}
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md px-3 py-2.5">
                <p className="text-xs font-semibold text-blue-800 mb-1">🔑 Test Account (Demo)</p>
                <div className="space-y-0.5 mb-2">
                  <p className="text-xs text-blue-700 font-mono">{TEST_EMAIL}</p>
                  <p className="text-xs text-blue-700 font-mono">{TEST_PASSWORD}</p>
                </div>
              </div>

              {error && (
                <div className="mb-3 bg-yellow-50 border border-yellow-300 rounded-md px-3 py-2">
                  <p className="text-xs text-yellow-800 font-medium">Login Failed</p>
                  <p className="text-xs text-yellow-700 mt-0.5">{error}</p>
                </div>
              )}

              <input
                type="email"
                placeholder="Email address or phone number"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] mb-2"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                onKeyDown={handleKeyDown}
                className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#1877F2] focus:ring-1 focus:ring-[#1877F2] mb-3"
              />

              <button
                onClick={handleLogin}
                disabled={!email || !password}
                className="w-full bg-[#1877F2] hover:bg-[#0e6fdf] disabled:bg-[#1877F2]/50 text-white font-bold py-2.5 rounded-md text-sm transition-colors mb-3"
              >
                Log In
              </button>

              <div className="text-center mb-4">
                <button className="text-[#1877F2] text-xs hover:underline">
                  Forgotten password?
                </button>
              </div>

              <hr className="border-slate-200 mb-4" />

              <div className="text-center">
                <button
                  disabled
                  className="bg-[#42b72a] text-white font-bold py-2.5 px-5 rounded-md text-sm opacity-60 cursor-not-allowed"
                >
                  Create new account
                </button>
              </div>

              <p className="text-center text-xs text-slate-400 mt-4">
                <strong>Create a Page</strong> for a celebrity, brand or business.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main login page ───────────────────────────────────────────────────────────
export const LoginPage = ({ onLogin, isLoading, error }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur">
              <Bot size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">AI Ad Manager</h1>
            <p className="text-blue-200 mt-2 text-sm">Intelligent Facebook Ads Automation</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Connect your account</h2>
            <p className="text-slate-500 text-sm mb-6">
              Sign in with Facebook to manage your ad campaigns with AI assistance.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={() => setShowModal(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#0e6fdf] disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>

          </div>

          {/* Features */}
          <div className="mt-6 space-y-2 px-2">
            <Feature icon={BarChart2} text="Real-time campaign performance analytics" />
            <Feature icon={Zap}       text="AI-powered budget optimization decisions" />
            <Feature icon={Shield}    text="Set up custom audience easily" />
          </div>

          <p className="text-center text-xs text-blue-200/70 mt-4">
            <a
              href="https://juvenile-sauce-34d.notion.site/Privacy-Policy-for-AI-Ad-Manager-3202cc383a9b80df9439ed45e4a8cc74"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {showModal && (
        <FbLoginModal
          onConfirm={() => { setShowModal(false); onLogin(); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
};
