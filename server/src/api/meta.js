import { Router } from 'express';
import { getAdAccounts, getBusinesses, getPages, getCustomAudiences } from '../services/metaClient.js';

const router = Router();

const getToken = () => process.env.META_DEMO_TOKEN;

// Triggers: ads_read — returns ad accounts with business info
router.get('/adaccounts', async (req, res, next) => {
  try {
    const raw = await getAdAccounts(getToken(req));
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
    const data = await getBusinesses(getToken(req));
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Triggers: pages_read_engagement
router.get('/pages', async (req, res, next) => {
  try {
    const data = await getPages(getToken(req));
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
    const data = await getCustomAudiences(getToken(req), adAccountId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default router;
