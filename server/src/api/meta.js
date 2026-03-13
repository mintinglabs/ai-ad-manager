import { Router } from 'express';
import { getAdAccounts, getBusinesses, getOwnedAdAccounts, getPages, getCustomAudiences } from '../services/metaClient.js';

const router = Router();

// Always use META_DEMO_TOKEN — FB Login is authentication only, not data access.
// Login for Business returns a system user token (not personal), which doesn't
// work with personal-user endpoints like /me/businesses.
const token = () => process.env.META_DEMO_TOKEN;

// Triggers: ads_read — returns ad accounts with business info
router.get('/adaccounts', async (req, res, next) => {
  try {
    const raw = await getAdAccounts(token());
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
    const data = await getBusinesses(token());
    console.log(`[meta] /businesses → found ${data.length} businesses`);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[meta] /businesses error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({
      error: metaErr?.message || err.message,
      code:  metaErr?.code,
    });
  }
});

// Returns ad accounts owned by a specific business
router.get('/businesses/:id/adaccounts', async (req, res, next) => {
  try {
    const raw = await getOwnedAdAccounts(token(), req.params.id);
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
    const metaErr = err.response?.data?.error;
    console.error('[meta] /businesses/:id/adaccounts error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({
      error: metaErr?.message || err.message,
      code:  metaErr?.code,
    });
  }
});

// Triggers: pages_read_engagement
router.get('/pages', async (req, res, next) => {
  try {
    const data = await getPages(token());
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
    const data = await getCustomAudiences(token(), adAccountId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
