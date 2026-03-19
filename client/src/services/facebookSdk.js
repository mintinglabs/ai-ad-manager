const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

// SDK readiness — only true AFTER fbAsyncInit fires AND FB.init() completes
let _sdkReady = false;
let _readyResolve = null;

// Promise that resolves when the SDK is fully initialized
export const sdkReady = new Promise((resolve) => {
  _readyResolve = resolve;
});

// ── Load + init the SDK on import ─────────────────────────────────────────────
(function loadSdk() {
  // Already fully initialized (e.g. HMR re-import)
  if (_sdkReady) return;

  // fbAsyncInit is called BY the SDK when it's truly ready for FB.init()
  window.fbAsyncInit = () => {
    window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
    _sdkReady = true;
    _readyResolve();
  };

  // Inject script if not already in DOM
  if (!document.getElementById('facebook-jssdk')) {
    const script = document.createElement('script');
    script.id    = 'facebook-jssdk';
    script.src   = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    document.body.appendChild(script);
  }
})();

// ── Login — MUST be called from a click handler ──────────────────────────────
export const login = () => {
  if (!_sdkReady || !window.FB) {
    return Promise.reject(new Error('Facebook is still loading. Please try again in a moment.'));
  }

  // FB.init() already called, FB.login() runs synchronously in the click stack
  return new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        if (response.authResponse) {
          resolve(response.authResponse);
        } else {
          reject(new Error(`Facebook login failed (status: ${response.status})`));
        }
      },
      { config_id: FB_CONFIG_ID, response_type: 'token' }
    );
  });
};

// ── Helpers ───────────────────────────────────────────────────────────────────
export const isSdkReady = () => _sdkReady;

export const initFacebookSdk = () => sdkReady;

export const getLoginStatus = () =>
  new Promise((resolve) => {
    if (_sdkReady && window.FB) window.FB.getLoginStatus((r) => resolve(r));
    else resolve({ status: 'unknown' });
  });

export const logout = () =>
  new Promise((resolve) => {
    if (_sdkReady && window.FB) window.FB.logout(() => resolve());
    else resolve();
  });
