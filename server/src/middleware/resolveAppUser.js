// Resolves the *app* user (Supabase Google sign-in) from a request.
//
// Different identity from `resolveUser` (which resolves the Meta user via
// the aam_session cookie). The two coexist:
//
//   req.appUserId  → Supabase auth user UUID (stable, primary app identity)
//   req.fbUserId   → Meta numeric user id (optional, only set after the
//                    user connects Meta Marketing)
//
// Routes that key data on the app account (credits, billing, future
// per-account settings) should use req.appUserId. Routes that key on
// Meta connection (campaigns, audiences, ad library) keep using
// req.fbUserId.
//
// Token transport: the client puts the Supabase access_token (a standard
// JWT) into the Authorization header as `Bearer <jwt>`. We verify it
// locally with the project JWT secret — no network round-trip per request.
//
// Set SUPABASE_JWT_SECRET in server/.env. Find it in:
//   Supabase Dashboard → Project Settings → API → JWT Settings → JWT Secret

import jwt from 'jsonwebtoken';
import { getSupabase } from '../lib/supabase.js';

// Tiny in-memory cache so repeated requests within the same minute skip
// re-verification. Keyed by the raw token string. Cleared lazily as
// entries expire — JWTs are short-lived (1h by default) so memory stays
// bounded even without aggressive cleanup.
const userIdCache = new Map();
const CACHE_TTL_MS = 60_000;

// Two verification modes:
//   1. SUPABASE_JWT_SECRET set → verify the HS256 signature locally
//      (fast, no network).
//   2. Fallback → call supabase.auth.getUser(token) using the service
//      key client (one HTTP round-trip per fresh token, then cached).
//
// Mode 1 is recommended for production. Mode 2 is the zero-config path
// that works as long as SUPABASE_URL + SUPABASE_SERVICE_KEY are set.
const verify = async (token) => {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (secret) {
    try {
      const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
      if (decoded.aud !== 'authenticated' || !decoded.sub) return null;
      return { id: decoded.sub, email: decoded.email || null };
    } catch {
      return null;
    }
  }
  // Fallback: ask Supabase. Service-key client can introspect any JWT.
  const supa = getSupabase();
  if (!supa) return null;
  try {
    const { data, error } = await supa.auth.getUser(token);
    if (error || !data?.user?.id) return null;
    return { id: data.user.id, email: data.user.email || null };
  } catch {
    return null;
  }
};

export const resolveAppUser = async (req, _res, next) => {
  try {
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return next();
    const token = auth.slice(7);

    // Very basic shape check: a JWT has two dots; an FB long-lived token
    // doesn't. Skip verification if the token clearly isn't a JWT so we
    // don't waste cycles on Meta-token requests that hit this same header
    // (legacy callers).
    if ((token.match(/\./g) || []).length !== 2) return next();

    const cached = userIdCache.get(token);
    if (cached && cached.exp > Date.now()) {
      req.appUserId = cached.user.id;
      req.appUserEmail = cached.user.email;
      return next();
    }

    const user = await verify(token);
    if (user) {
      req.appUserId = user.id;
      req.appUserEmail = user.email;
      userIdCache.set(token, { user, exp: Date.now() + CACHE_TTL_MS });
      // One-line diagnostic on first verify per token. Avoids noise on
      // subsequent cache-hit requests.
      console.log(`[appAuth] verified user=${user.id.slice(0, 8)} email=${user.email || '?'}`);
    } else {
      console.warn(`[appAuth] JWT verification FAILED — secret=${process.env.SUPABASE_JWT_SECRET ? 'set' : 'unset'} fallback=${getSupabase() ? 'available' : 'unavailable'}`);
    }
    next();
  } catch (err) {
    next(err);
  }
};
