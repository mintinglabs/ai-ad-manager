const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

let _initPromise = null;

export const initFacebookSdk = () => {
  if (_initPromise) return _initPromise;

  _initPromise = new Promise((resolve) => {
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: false,
        version: 'v25.0'
      });
      resolve();
    };

    if (document.getElementById('facebook-jssdk')) {
      // Script already in DOM — fbAsyncInit already fired from our previous call.
      // window.FB existing means FB.init() ran (we set fbAsyncInit before adding the script).
      const waitForFB = (attempt = 0) => {
        if (window.FB) return resolve();
        if (attempt > 20) return resolve();
        setTimeout(() => waitForFB(attempt + 1), 100);
      };
      return waitForFB();
    }

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
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
