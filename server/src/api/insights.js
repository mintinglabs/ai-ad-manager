import { Router } from 'express';
import { aggregateMetrics } from '../services/mockData.js';
import * as metaClient from '../services/metaClient.js';

const router = Router();
const USE_MOCK = process.env.USE_MOCK_DATA === 'true';

router.get('/', async (req, res, next) => {
  try {
    if (USE_MOCK) {
      return res.json(aggregateMetrics);
    }
    const auth = req.headers?.authorization;
    const token = (auth && auth.startsWith('Bearer ')) ? auth.slice(7) : process.env.META_DEMO_TOKEN;
    const adAccountId = req.query.adAccountId || process.env.AD_ACCOUNT_ID;
    const datePreset = req.query.date_preset || 'last_7d';
    const raw = await metaClient.getInsights(token, adAccountId, datePreset);

    const spend = parseFloat(raw.spend || 0);
    const revenue = raw.action_values?.find(a => a.action_type === 'purchase')?.value || 0;
    const conversions = raw.actions?.find(a => a.action_type === 'purchase')?.value || 0;

    res.json({
      totalSpend: spend,
      totalRevenue: parseFloat(revenue),
      roas: spend > 0 ? parseFloat(revenue) / spend : 0,
      conversions: parseInt(conversions),
      impressions: parseInt(raw.impressions || 0),
      clicks: parseInt(raw.clicks || 0),
      ctr: parseFloat(raw.ctr || 0)
    });
  } catch (err) {
    next(err);
  }
});

export default router;
