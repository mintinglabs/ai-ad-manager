import { Router } from 'express';
import { aggregateMetrics } from '../services/mockData.js';
import * as metaClient from '../services/metaClient.js';

const router = Router();
const USE_MOCK = process.env.USE_MOCK_DATA === 'true';


// Account-level aggregated insights (existing)
router.get('/', async (req, res, next) => {
  try {
    if (USE_MOCK) {
      return res.json(aggregateMetrics);
    }
    const token = req.token;
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

// --- Async reports (must be before /:objectId to avoid route collision) ---

// Create async report
router.post('/async', async (req, res, next) => {
  try {
    const { adAccountId, fields, date_preset, time_range, time_increment, breakdowns, level, filtering, sort, action_attribution_windows, limit } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });

    const params = {};
    if (fields) params.fields = fields;
    else params.fields = 'spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,conversions,cost_per_action_type,purchase_roas,reach,frequency';
    if (date_preset) params.date_preset = date_preset;
    if (time_range) params.time_range = typeof time_range === 'string' ? time_range : JSON.stringify(time_range);
    if (time_increment) params.time_increment = time_increment;
    if (breakdowns) params.breakdowns = breakdowns;
    if (level) params.level = level;
    if (filtering) params.filtering = typeof filtering === 'string' ? filtering : JSON.stringify(filtering);
    if (sort) params.sort = sort;
    if (action_attribution_windows) params.action_attribution_windows = action_attribution_windows;
    if (limit) params.limit = limit;

    const data = await metaClient.createAsyncReport(req.token, adAccountId, params);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[insights] POST /async error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Check async report status
router.get('/async/:reportRunId/status', async (req, res, next) => {
  try {
    const data = await metaClient.getAsyncReportStatus(req.token, req.params.reportRunId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Download async report results
router.get('/async/:reportRunId/results', async (req, res, next) => {
  try {
    const data = await metaClient.getAsyncReportResults(req.token, req.params.reportRunId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Flexible insights for any object (campaign, adset, ad, or account) ---
// Must be LAST because /:objectId is a catch-all param
router.get('/:objectId', async (req, res, next) => {
  try {
    const { objectId } = req.params;
    const params = {};

    if (req.query.fields) params.fields = req.query.fields;
    else params.fields = 'spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,conversions,cost_per_action_type,purchase_roas,reach,frequency';

    if (req.query.date_preset) params.date_preset = req.query.date_preset;
    if (req.query.time_range) params.time_range = req.query.time_range;
    if (req.query.time_increment) params.time_increment = req.query.time_increment;
    if (req.query.breakdowns) params.breakdowns = req.query.breakdowns;
    if (req.query.level) params.level = req.query.level;
    if (req.query.filtering) params.filtering = req.query.filtering;
    if (req.query.sort) params.sort = req.query.sort;
    if (req.query.action_attribution_windows) params.action_attribution_windows = req.query.action_attribution_windows;
    if (req.query.limit) params.limit = req.query.limit;
    if (req.query.action_report_time) params.action_report_time = req.query.action_report_time;

    const data = await metaClient.getObjectInsights(req.token, objectId, params);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[insights] GET /:objectId error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
