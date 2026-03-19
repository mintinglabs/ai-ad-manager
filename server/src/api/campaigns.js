import { Router } from 'express';
import { getCampaigns, updateCampaign } from '../services/mockData.js';
import * as metaClient from '../services/metaClient.js';

const router = Router();
const USE_MOCK = process.env.USE_MOCK_DATA === 'true';

const getToken = () => process.env.META_DEMO_TOKEN;

router.get('/', async (req, res, next) => {
  try {
    if (USE_MOCK) {
      return res.json(getCampaigns());
    }
    const token = getToken();
    const adAccountId = req.query.adAccountId || process.env.AD_ACCOUNT_ID;
    const campaigns = await metaClient.getCampaigns(token, adAccountId);
    res.json(campaigns);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, daily_budget } = req.body;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (daily_budget !== undefined) updates.daily_budget = String(daily_budget);

    if (USE_MOCK) {
      const updated = updateCampaign(id, updates);
      if (!updated) return res.status(404).json({ error: 'Campaign not found' });
      return res.json(updated);
    }
    const token = getToken();
    const result = await metaClient.updateCampaign(token, id, updates);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { adAccountId, name, objective, special_ad_categories, bid_strategy, daily_budget, lifetime_budget, spend_cap, start_time, stop_time } = req.body;
    if (!adAccountId || !name || !objective) {
      return res.status(400).json({ error: 'adAccountId, name, and objective are required' });
    }
    const params = { name, objective, status: 'PAUSED', special_ad_categories: special_ad_categories || '[]' };
    if (bid_strategy) params.bid_strategy = bid_strategy;
    if (daily_budget) params.daily_budget = String(daily_budget);
    if (lifetime_budget) params.lifetime_budget = String(lifetime_budget);
    if (spend_cap) params.spend_cap = String(spend_cap);
    if (start_time) params.start_time = start_time;
    if (stop_time) params.stop_time = stop_time;
    const result = await metaClient.createCampaign(getToken(), adAccountId, params);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Delete campaign
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await metaClient.deleteCampaign(getToken(), req.params.id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[campaigns] DELETE error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Copy campaign
router.post('/:id/copies', async (req, res, next) => {
  try {
    const { deep_copy, rename_strategy, status_option } = req.body;
    const result = await metaClient.copyCampaign(getToken(), req.params.id, { deep_copy, rename_strategy, status_option });
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[campaigns] COPY error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Get ad sets in campaign
router.get('/:id/adsets', async (req, res, next) => {
  try {
    const data = await metaClient.getCampaignAdSets(getToken(), req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Get ads in campaign
router.get('/:id/ads', async (req, res, next) => {
  try {
    const data = await metaClient.getCampaignAds(getToken(), req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
