import { GoogleAdsApi } from 'google-ads-api';

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

export function getCustomer(accountId, loginCustomerId) {
  const client = getGoogleAdsClient();
  const refresh_token = process.env.GOOGLE_ADS_REFRESH_TOKEN;
  const customer_id = accountId || process.env.GOOGLE_ADS_CUSTOMER_ID;
  const login_customer_id = loginCustomerId || customer_id;
  if (!refresh_token || !customer_id) throw new Error('Missing Google Ads refresh token or customer ID.');
  console.log(`[google-ads] customer_id=${customer_id}, login_customer_id=${login_customer_id}`);
  return client.Customer({ customer_id, login_customer_id, refresh_token });
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
