import { Router } from 'express';
import { getAdAccounts, getBusinesses, getOwnedAdAccounts, getPages, getCustomAudiences } from '../services/metaClient.js';

const router = Router();

const getUserToken = (req) => {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
};

const getDemoToken = () => process.env.META_DEMO_TOKEN;

// Try user token first, fall back to demo token if it fails or returns empty
const withFallback = async (fn, userToken) => {
  if (userToken) {
    try {
      const result = await fn(userToken);
      if (result && result.length > 0) return result;
      console.log('[meta] user token returned empty, trying demo token');
    } catch (err) {
      console.warn('[meta] user token failed:', err.response?.data?.error?.message || err.message, '— trying demo token');
    }
  }
  return fn(getDemoToken());
};

// Triggers: ads_read — returns ad accounts with business info
router.get('/adaccounts', async (req, res, next) => {
  try {
    const raw = await withFallback(getAdAccounts, getUserToken(req));
    const normalized = raw.map(acc => ({
      id:             acc.id,
      account_id:     acc.account_id,
      name:           acc.name,
      account_status: acc.account_status,
      currency:       acc.currency,
      business_id:    acc.business?.id   || null,
      business_name:  acc.business?.name || 'Other',
    }));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
});

// Triggers: business_management
router.get('/businesses', async (req, res, next) => {
  try {
    const data = await withFallback(getBusinesses, getUserToken(req));
    console.log(`[meta] /businesses → found ${data.length} businesses`);
    res.json(data);
  } catch (err) {
    console.error('[meta] /businesses failed completely:', err.response?.data || err.message);
    next(err);
  }
});

// Returns ad accounts owned by a specific business
router.get('/businesses/:id/adaccounts', async (req, res, next) => {
  try {
    const raw = await withFallback(
      (token) => getOwnedAdAccounts(token, req.params.id),
      getUserToken(req)
    );
    console.log(`[meta] /businesses/${req.params.id}/adaccounts → found ${raw.length} accounts`);
    const normalized = raw.map(acc => ({
      id:             acc.id,
      account_id:     acc.account_id,
      name:           acc.name,
      account_status: acc.account_status,
      currency:       acc.currency,
      business_id:    req.params.id,
    }));
    res.json(normalized);
  } catch (err) {
    console.error('[meta] /businesses/:id/adaccounts failed:', err.response?.data || err.message);
    next(err);
  }
});

// Triggers: pages_read_engagement
router.get('/pages', async (req, res, next) => {
  try {
    const data = await withFallback(getPages, getUserToken(req));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Triggers: ads_management — lists custom audiences for an ad account
router.get('/customaudiences', async (req, res, next) => {
  try {
    const adAccountId = req.query.adAccountId;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await withFallback(
      (token) => getCustomAudiences(token, adAccountId),
      getUserToken(req)
    );
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
