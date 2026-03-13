const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

let _initPromise = null;

export const initFacebookSdk = () => {
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve, reject) => {
    // Case 1: SDK already available (extension pre-loaded it, SPA re-mount, etc.)
    if (window.FB) {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      return resolve();
    }

    // Set fbAsyncInit BEFORE injecting the script — the SDK calls this when truly ready
    window.fbAsyncInit = () => {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      resolve();
    };

    // Inject script only if not already in DOM
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.onerror = () => reject(new Error('Failed to load Facebook SDK'));
      document.body.appendChild(script);
    }
    // If script already injected and still loading, fbAsyncInit will fire when SDK is ready
  });

  return _initPromise;
};

export const login = () =>
  new Promise((resolve, reject) => {
    initFacebookSdk().then(() => {
      if (!window.FB) {
        return reject(new Error('Facebook SDK not loaded. Please refresh and try again.'));
      }
      window.FB.login(
        (response) => {
          if (response.authResponse) {
            resolve(response.authResponse);
          } else {
            reject(new Error(`Facebook login failed (status: ${response.status})`));
          }
        },
        {
          config_id:     FB_CONFIG_ID,
          response_type: 'token',
        }
      );
    });
  });

export const getLoginStatus = () =>
  new Promise((resolve) => {
    window.FB.getLoginStatus((response) => resolve(response));
  });

export const logout = () =>
  new Promise((resolve) => {
    window.FB.logout(() => resolve());
  });
