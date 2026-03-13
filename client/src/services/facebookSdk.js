const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

let _initPromise = null;

export const initFacebookSdk = () => {
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve) => {
    const doInit = () => {
      window.FB.init({ appId: FB_APP_ID, cookie: true, xfbml: false, version: 'v25.0' });
      resolve();
    };

    // Case 1: SDK already loaded (SPA re-init, or browser extension pre-loaded it)
    if (window.FB) return doInit();

    // Case 2: Script already injected but still loading — poll for window.FB
    if (document.getElementById('facebook-jssdk')) {
      const wait = (n = 0) => {
        if (window.FB) return doInit(); // FB.init() is called here too — not just resolve()
        if (n > 50) return resolve();   // 5s fallback
        setTimeout(() => wait(n + 1), 100);
      };
      return wait();
    }

    // Case 3: Fresh load — inject script, call FB.init() in onload
    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.onload = doInit;
    document.body.appendChild(script);
  });

  return _initPromise;
};

export const login = () =>
  new Promise((resolve, reject) => {
    initFacebookSdk().then(() => {
      if (!window.FB) {
        return reject(new Error('Facebook SDK not loaded. Please refresh and try again.'));
      }
      const timeout = setTimeout(() => {
        reject(new Error('Facebook login timed out. Please try again.'));
      }, 30000);
      window.FB.login(
        (response) => {
          clearTimeout(timeout);
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
