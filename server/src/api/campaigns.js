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

export default router;
