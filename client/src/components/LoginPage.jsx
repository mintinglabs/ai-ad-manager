import { Bot, Shield, BarChart2, Zap } from 'lucide-react';

const Feature = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 text-blue-100">
    <Icon size={14} className="shrink-0" />
    <span className="text-sm">{text}</span>
  </div>
);

// ── Main login page ───────────────────────────────────────────────────────────
export const LoginPage = ({ onLogin, isLoading, error, fbReady = false }) => {
  const disabled = !fbReady || isLoading;

  return (
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
            onClick={onLogin}
            disabled={disabled}
            className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#0e6fdf] disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : !fbReady ? (
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            )}
            {isLoading ? 'Connecting…' : !fbReady ? 'Loading Facebook…' : 'Continue with Facebook'}
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
  );
};
