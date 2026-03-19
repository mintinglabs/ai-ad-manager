// ── Facebook SDK — Global Promise Initialization Guard ────────────────────────
//
// Single source of truth: window.fbPromise
//
// Rules:
//   1. window.fbPromise is created ONCE and never overwritten
//   2. It resolves ONLY after fbAsyncInit fires AND FB.init() completes
//   3. The <script> tag is injected ONCE (guarded by ID check)
//   4. main.jsx awaits this promise BEFORE mounting React
//   5. All SDK calls (login, logout) can assume FB is initialized
//

const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

// ── Initialize: create the global promise + inject script (runs once) ────────
export function initFacebookSdk() {
  // Already created — return existing promise (idempotent)
  if (window.fbPromise) return window.fbPromise;

  window.fbPromise = new Promise((resolve, reject) => {
    // Timeout — reject after 10s so the UI doesn't spin forever
    const timeout = setTimeout(() => {
      reject(new Error('Facebook SDK failed to load. Please check your connection and refresh.'));
    }, 10000);

    // fbAsyncInit is the ONLY reliable signal that the SDK is ready for FB.init()
    window.fbAsyncInit = () => {
      clearTimeout(timeout);
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      resolve();
    };

    // Inject the script ONLY if not already in the DOM
    if (document.getElementById('facebook-jssdk')) return;

    const script  = document.createElement('script');
    script.id     = 'facebook-jssdk';
    script.src    = 'https://connect.facebook.net/en_US/sdk.js';
    script.async  = true;
    script.defer  = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load Facebook SDK script.'));
    };
    document.body.appendChild(script);
  });

  return window.fbPromise;
}

// ── Login ────────────────────────────────────────────────────────────────────
// Safe to call directly — by the time React mounts, FB.init() has already run
export const login = () =>
  new Promise((resolve, reject) => {
    if (!window.FB) {
      return reject(new Error('Facebook SDK not available. Please refresh the page.'));
    }
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
          reject(new Error(`Facebook login cancelled or failed (status: ${response.status})`));
        }
      },
      { config_id: FB_CONFIG_ID, response_type: 'token' }
    );
  });

// ── Helpers ──────────────────────────────────────────────────────────────────
export const getLoginStatus = () =>
  new Promise((resolve) => {
    if (!window.FB) return resolve({ status: 'unknown' });
    window.FB.getLoginStatus((response) => resolve(response));
  });

export const logout = () =>
  new Promise((resolve) => {
    if (!window.FB) return resolve();
    window.FB.logout(() => resolve());
  });
