import { Router } from 'express';
import axios from 'axios';
import { supabase } from '../../lib/supabase.js';

const router = Router();

// ── FB User ID resolution (reused pattern from skills.js) ───────────────────
const userIdCache = new Map();
const getFbUserId = async (token) => {
  if (!token) return null;
  if (userIdCache.has(token)) return userIdCache.get(token);
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`);
    if (data?.id) { userIdCache.set(token, data.id); return data.id; }
  } catch (err) { console.error('[google-auth] FB user ID error:', err.message); }
  return null;
};

const resolveUser = async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.token = auth.slice(7);
    req.fbUserId = await getFbUserId(req.token);
  }
  // Dev fallback so localhost works without Meta login
  if (!req.fbUserId && process.env.NODE_ENV !== 'production') {
    req.fbUserId = process.env.DEV_FB_USER_ID || '_solo';
  }
  next();
};

router.use(resolveUser);

// ── OAuth configuration ─────────────────────────────────────────────────────
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/adwords';
const getRedirectUri = () => process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3001/api/google/auth/callback';

// GET /api/google/auth/connect — returns OAuth URL OR redirects to it
router.get('/connect', async (req, res) => {
  try {
    const fbUserId = req.fbUserId || req.query.fb_user_id;
    if (!fbUserId) return res.status(401).json({ error: 'Not authenticated' });

    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    if (!clientId) return res.status(500).json({ error: 'Google OAuth client not configured' });

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: getRedirectUri(),
      response_type: 'code',
      scope: OAUTH_SCOPE,
      access_type: 'offline',
      prompt: 'consent',
      state: fbUserId,
    });
    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    if (req.query.redirect === '1') return res.redirect(url);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/google/auth/callback?code=&state= — handles OAuth redirect from Google
router.get('/callback', async (req, res) => {
  try {
    const { code, state, error: oauthError } = req.query;
    if (oauthError) return res.redirect(`/?google_auth_error=${encodeURIComponent(oauthError)}`);
    if (!code || !state) return res.redirect('/?google_auth_error=missing_code');

    const fbUserId = state;
    const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;

    // Exchange code for tokens
    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code, client_id: clientId, client_secret: clientSecret,
      redirect_uri: getRedirectUri(), grant_type: 'authorization_code',
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });

    const { refresh_token, access_token, expires_in, scope } = tokenRes.data;
    if (!refresh_token) {
      // User may have previously granted consent — Google only returns refresh_token on first grant unless prompt=consent
      return res.redirect('/?google_auth_error=no_refresh_token');
    }

    const expiresAt = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    if (supabase) {
      await supabase.from('platform_tokens').upsert({
        fb_user_id: fbUserId,
        platform: 'google',
        refresh_token, access_token,
        expires_at: expiresAt,
        scope,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'fb_user_id,platform' });
    }

    // Redirect to app with success flag
    const clientOrigin = req.headers.referer?.split('/').slice(0, 3).join('/') || '/';
    res.redirect(`${clientOrigin}?google_connected=1`);
  } catch (err) {
    console.error('[google-auth] callback error:', err.response?.data || err.message);
    res.redirect(`/?google_auth_error=${encodeURIComponent(err.message)}`);
  }
});

// GET /api/google/auth/status — is the current user connected?
router.get('/status', async (req, res) => {
  try {
    const fbUserId = req.fbUserId;
    if (!fbUserId) return res.json({ connected: false });

    if (supabase) {
      const { data } = await supabase.from('platform_tokens')
        .select('customer_id, login_customer_id, expires_at')
        .eq('fb_user_id', fbUserId).eq('platform', 'google').maybeSingle();
      if (data) return res.json({ connected: true, customerId: data.customer_id, loginCustomerId: data.login_customer_id });
    }

    // Env fallback for local solo dev
    if (process.env.GOOGLE_ADS_REFRESH_TOKEN && process.env.NODE_ENV !== 'production') {
      return res.json({ connected: true, customerId: process.env.GOOGLE_ADS_CUSTOMER_ID || null, loginCustomerId: null, source: 'env' });
    }

    res.json({ connected: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/google/auth/disconnect
router.post('/disconnect', async (req, res) => {
  try {
    const fbUserId = req.fbUserId;
    if (!fbUserId) return res.status(401).json({ error: 'Not authenticated' });
    if (supabase) {
      await supabase.from('platform_tokens').delete().eq('fb_user_id', fbUserId).eq('platform', 'google');
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/google/auth/select-account — persist the selected customer_id
router.post('/select-account', async (req, res) => {
  try {
    const fbUserId = req.fbUserId;
    if (!fbUserId) return res.status(401).json({ error: 'Not authenticated' });
    const { customerId, loginCustomerId } = req.body || {};
    if (supabase) {
      await supabase.from('platform_tokens').update({
        customer_id: customerId || null,
        login_customer_id: loginCustomerId || null,
        updated_at: new Date().toISOString(),
      }).eq('fb_user_id', fbUserId).eq('platform', 'google');
    }
    res.json({ ok: true, customerId, loginCustomerId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
