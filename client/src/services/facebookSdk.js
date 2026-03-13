const FB_APP_ID    = import.meta.env.VITE_FB_APP_ID;
const FB_CONFIG_ID = import.meta.env.VITE_FB_CONFIG_ID;

export const initFacebookSdk = () =>
  new Promise((resolve) => {
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
      // Script already in DOM — wait for window.FB to be initialized
      const waitForFB = (attempt = 0) => {
        if (window.FB) return resolve();
        if (attempt > 20) return resolve(); // give up after ~2s, caller handles error
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

export const login = () =>
  new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        console.log('[FB.login] full response:', JSON.stringify(response, null, 2));
        if (response.authResponse) {
          console.log('[FB.login] success — accessToken:', response.authResponse.accessToken);
          resolve(response.authResponse);
        } else {
          console.warn('[FB.login] failed/cancelled — status:', response.status);
          reject(new Error(`Facebook login failed (status: ${response.status})`));
        }
      },
      {
        config_id:     FB_CONFIG_ID,
        response_type: 'code',
      }
    );
  });

export const getLoginStatus = () =>
  new Promise((resolve) => {
    window.FB.getLoginStatus((response) => resolve(response));
  });

export const logout = () =>
  new Promise((resolve) => {
    window.FB.logout(() => resolve());
  });
