import axios from 'axios';
import { supabase } from '../lib/supabaseClient.js';

// `withCredentials: true` ships the HttpOnly aam_session cookie on every
// /api request. The cookie carries the FB token reference; we no longer
// read the token from JS, so the previous Authorization-header interceptor
// is gone. Same-origin in production (Vercel rewrite) means CORS isn't
// actually involved, but withCredentials is still required for axios to
// send/receive cookies.
const api = axios.create({ baseURL: '/api', timeout: 120000, withCredentials: true });

// Inject the Supabase access_token (JWT) as `Authorization: Bearer <jwt>`
// on every request. Server-side resolveAppUser middleware verifies the
// JWT and sets req.appUserId — used by credits / billing / chat to key
// per-account state. The Meta long-lived token still rides in the
// HttpOnly aam_session cookie, so the two identities don't conflict.
//
// We deliberately don't cache the token in memory — supabase-js already
// holds + refreshes it. getSession() is sync after first boot.
api.interceptors.request.use(async (config) => {
  if (!supabase) return config;
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// On a Meta-token-expired error, try a silent refresh first and replay
// the original request. Only if refresh itself fails do we surface
// `fb_token_error` — that event is the "show the login screen" signal
// and we want it to be a last resort.
//
// We deliberately do NOT fire on plain 401 from /auth/session — that's
// the normal pre-login state and would loop with the boot effect.
let refreshInFlight = null;
const tryRefresh = () => {
  if (!refreshInFlight) {
    refreshInFlight = fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
      .then(r => r.ok)
      .catch(() => false)
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const cfg = err.config || {};
    const url = cfg.url || '';
    const msg = err.response?.data?.error || '';
    const expired = typeof msg === 'string' && (msg.includes('Session has expired') || msg.includes('access token'));

    // Don't loop on the refresh endpoint itself or on the auth probe.
    const isAuthEndpoint = url.includes('/auth/session') || url.includes('/auth/refresh');

    if (expired && !isAuthEndpoint && !cfg.__retried) {
      cfg.__retried = true;
      const ok = await tryRefresh();
      if (ok) return api.request(cfg);             // replay with fresh cookie token
      window.dispatchEvent(new Event('fb_token_error'));
    }
    return Promise.reject(err);
  }
);

export default api;
