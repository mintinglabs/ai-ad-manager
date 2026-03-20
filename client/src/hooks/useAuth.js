import { useState } from 'react';
import { login as fbLogin } from '../services/facebookSdk.js';

const TOKEN_KEY = 'fb_long_lived_token';

// Clear any stale token on load — user must login every session
localStorage.removeItem(TOKEN_KEY);

export const useAuth = () => {
  const [longLivedToken, setLongLivedToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState(null);

  // FB SDK is guaranteed ready before React mounts (main.jsx awaits initFacebookSdk).
  // login() calls FB.login() synchronously in the click handler to avoid popup blocking.
  const login = () => {
    setIsLoading(true);
    setError(null);
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);

    fbLogin()
      .then((authResponse) => {
        const token = authResponse.accessToken;
        if (!token) throw new Error('No access token returned from Facebook login.');
        localStorage.setItem(TOKEN_KEY, token);
        setLongLivedToken(token);
      })
      .catch((err) => {
        setError(err.message || 'Facebook login failed. Please try again.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setLongLivedToken(null);
  };

  return { longLivedToken, isLoading, error, login, logout };
};
