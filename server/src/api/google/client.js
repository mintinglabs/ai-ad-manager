const { GoogleAdsApi } = await import('google-ads-api');
import axios from 'axios';
import { supabase } from '../../lib/supabase.js';

const VALID_DATE_RANGES = [
  'TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_14_DAYS', 'LAST_30_DAYS',
  'LAST_90_DAYS', 'THIS_MONTH', 'LAST_MONTH', 'THIS_WEEK_SUN_TODAY',
  'THIS_WEEK_MON_TODAY', 'LAST_WEEK_SUN_SAT', 'LAST_WEEK_MON_SUN',
];

export function getGoogleAdsClient() {
  const client_id = process.env.GOOGLE_ADS_CLIENT_ID;
  const client_secret = process.env.GOOGLE_ADS_CLIENT_SECRET;
  const developer_token = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!client_id || !client_secret || !developer_token) {
    throw new Error('Missing Google Ads credentials in environment variables.');
  }
  return new GoogleAdsApi({ client_id, client_secret, developer_token });
}

// ── FB User ID resolution (shared pattern) ──────────────────────────────────
const userIdCache = new Map();
async function getFbUserId(token) {
  if (!token) return null;
  if (userIdCache.has(token)) return userIdCache.get(token);
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`);
    if (data?.id) { userIdCache.set(token, data.id); return data.id; }
  } catch { /* ignore */ }
  return null;
}

// Look up a user's Google refresh token from platform_tokens, or fall back to env var (solo/local dev).
// Returns { refresh_token, customer_id, login_customer_id } or null.
async function resolveUserTokens(req) {
  // Try user-specific token first
  const auth = req?.headers?.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  let fbUserId = req?.fbUserId;
  if (!fbUserId && token) fbUserId = await getFbUserId(token);
  if (!fbUserId && process.env.NODE_ENV !== 'production') fbUserId = process.env.DEV_FB_USER_ID || '_solo';

  if (supabase && fbUserId) {
    const { data } = await supabase.from('platform_tokens')
      .select('refresh_token, customer_id, login_customer_id')
      .eq('fb_user_id', fbUserId).eq('platform', 'google').maybeSingle();
    if (data?.refresh_token) return data;
  }

  // Fallback: env var (solo/local dev)
  if (process.env.GOOGLE_ADS_REFRESH_TOKEN) {
    return {
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN,
      customer_id: process.env.GOOGLE_ADS_CUSTOMER_ID,
      login_customer_id: null,
    };
  }

  return null;
}

// Backwards-compatible sync getter — env only. Used by legacy callers that don't have req.
export function getCustomer(accountId, loginCustomerId) {
  const client = getGoogleAdsClient();
  const refresh_token = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customer_id = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const login_customer_id = loginCustomerId || customer_id;
  if (!refresh_token || !customer_id) throw new Error('Missing Google Ads refresh token or customer ID.');
  return client.Customer({ customer_id, login_customer_id, refresh_token });
}

// New async getter — looks up per-user tokens from Supabase, falls back to env.
// Use this in new routes. Pass req, plus optional accountId/loginCustomerId overrides from query.
export async function getCustomerForUser(req, accountId, loginCustomerId) {
  const tokens = await resolveUserTokens(req);
  if (!tokens) throw new Error('Google Ads not connected. Please connect your Google account.');
  const client = getGoogleAdsClient();
  const customer_id = accountId || tokens.customer_id;
  const login_customer_id = loginCustomerId || tokens.login_customer_id || customer_id;
  if (!customer_id) throw new Error('No Google Ads customer ID selected.');
  return client.Customer({ customer_id, login_customer_id, refresh_token: tokens.refresh_token });
}

export function statusLabel(raw) {
  const map = { ENABLED: 'Active', PAUSED: 'Paused', REMOVED: 'Removed', UNKNOWN: 'Unknown', UNSPECIFIED: 'Unspecified', 2: 'Active', 3: 'Paused', 4: 'Removed' };
  return map[String(raw)] ?? String(raw);
}

export function handleApiError(err, context) {
  console.error(`[${context}] Google Ads API error:`, err?.errors ?? err?.message ?? err);
  const msg = err?.errors?.[0]?.message ?? err?.message ?? `Failed: ${context}`;
  return { error: msg };
}

export function parseDateRange(dateRange) {
  if (dateRange && VALID_DATE_RANGES.includes(dateRange)) return dateRange;
  return 'LAST_30_DAYS';
}
