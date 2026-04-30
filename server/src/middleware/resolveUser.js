// Shared resolver for "who is this caller?" used by every router that keys
// data by fb_user_id (skills, brand library, chat history, creative sets,
// uploads, confirmations, google auth).
//
// Resolution order:
//   1. HttpOnly aam_session cookie  → req.fbUserId comes straight from the
//      session row, no Graph round-trip. This is the production path.
//   2. Authorization: Bearer <token> → legacy fallback (some callers still
//      hold a token from a previous version). We resolve fb_user_id by
//      hitting /me?fields=id and cache the result in-process.
//
// Sets `req.token` (FB access token) and `req.fbUserId` (numeric string)
// when known; leaves them undefined otherwise. Never returns a response
// itself — it's a soft resolver. Callers that need authentication should
// add their own `requireUser`-style guard after this.

import axios from 'axios';
import * as sessionService from '../services/sessionService.js';

const userIdCache = new Map();

const fetchFbUserId = async (token) => {
  if (!token) return null;
  if (userIdCache.has(token)) return userIdCache.get(token);
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`);
    if (data?.id) {
      userIdCache.set(token, data.id);
      return data.id;
    }
  } catch {}
  return null;
};

export const resolveUser = async (req, _res, next) => {
  try {
    const sid = req.cookies?.[sessionService.COOKIE_NAME];
    if (sid) {
      const session = await sessionService.getSession(sid);
      if (session?.fbToken) {
        req.token = session.fbToken;
        req.fbUserId = session.fbUserId || (await fetchFbUserId(session.fbToken));
        return next();
      }
    }
    const auth = req.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const candidate = auth.slice(7);
      // Skip JWT-shaped tokens — those are Supabase access tokens carried
      // for `resolveAppUser`. Trying to verify them via the FB Graph
      // wastes a network call and burns the user-id cache slot. Meta
      // long-lived tokens have no dots; JWTs have exactly two.
      if ((candidate.match(/\./g) || []).length !== 2) {
        req.token = candidate;
        req.fbUserId = await fetchFbUserId(req.token);
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};
