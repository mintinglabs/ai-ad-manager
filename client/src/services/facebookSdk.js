const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

let _sdkReady = false;

const ensureInit = () => {
  if (!_sdkReady && window.FB) {
    window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
    _sdkReady = true;
  }
};

// Load the SDK script (does NOT call FB.init — that happens in ensureInit)
const loadSdkScript = () =>
  new Promise((resolve, reject) => {
    if (window.FB) return resolve();

    const timeout = setTimeout(() => {
      reject(new Error('Facebook SDK timed out. Please refresh and try again.'));
    }, 15000);

    window.fbAsyncInit = () => {
      clearTimeout(timeout);
      ensureInit();
      resolve();
    };

    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load Facebook SDK'));
      };
      document.body.appendChild(script);
    }
  });

// Start loading the script immediately on import
loadSdkScript().catch(() => {});

// Login — must be called from a click handler for popup to work
export const login = () => {
  // SDK script is loaded — call init + login synchronously from the click stack
  if (window.FB) {
    ensureInit();
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
  }

  // SDK not loaded yet — wait for it (popup may be blocked by browser)
  return loadSdkScript().then(() => {
    ensureInit();
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
  });
};

export const initFacebookSdk = () => {
  ensureInit();
  return loadSdkScript();
};

export const getLoginStatus = () =>
  new Promise((resolve) => {
    if (window.FB) { ensureInit(); window.FB.getLoginStatus((r) => resolve(r)); }
    else resolve({ status: 'unknown' });
  });

export const logout = () =>
  new Promise((resolve) => {
    if (window.FB) window.FB.logout(() => resolve());
    else resolve();
  });
