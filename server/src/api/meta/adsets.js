import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET / - List ad sets for an ad account
router.get('/', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) {
      return res.status(400).json({ error: 'adAccountId is required' });
    }
    const token = req.token;
    const adSets = await metaClient.getAdSets(token, adAccountId);
    res.json(adSets);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get single ad set
router.get('/:id', async (req, res) => {
  try {
    const token = req.token;
    const adSet = await metaClient.getAdSet(token, req.params.id);
    res.json(adSet);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create ad set
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name, campaign_id, optimization_goal, billing_event } = req.body;
    if (!adAccountId || !name || !campaign_id || !optimization_goal || !billing_event) {
      return res.status(400).json({ error: 'adAccountId, name, campaign_id, optimization_goal, and billing_event are required' });
    }
    const params = {
      name,
      campaign_id,
      optimization_goal,
      billing_event,
      status: req.body.status || 'PAUSED',
    };
    if (req.body.bid_amount !== undefined) params.bid_amount = req.body.bid_amount;
    if (req.body.daily_budget !== undefined) params.daily_budget = req.body.daily_budget;
    if (req.body.lifetime_budget !== undefined) params.lifetime_budget = req.body.lifetime_budget;
    if (req.body.targeting !== undefined) params.targeting = req.body.targeting;
    if (req.body.start_time !== undefined) params.start_time = req.body.start_time;
    if (req.body.end_time !== undefined) params.end_time = req.body.end_time;
    if (req.body.promoted_object !== undefined) params.promoted_object = req.body.promoted_object;
    if (req.body.adset_schedule !== undefined) params.adset_schedule = req.body.adset_schedule;

    const token = req.token;
    const result = await metaClient.createAdSet(token, adAccountId, params);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update ad set
router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    const updatableFields = ['name', 'status', 'daily_budget', 'lifetime_budget', 'bid_amount', 'targeting', 'end_time', 'adset_schedule'];
    for (const field of updatableFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }
    const token = req.token;
    const result = await metaClient.updateAdSet(token, req.params.id, updates);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete ad set
router.delete('/:id', async (req, res) => {
  try {
    const token = req.token;
    const result = await metaClient.deleteAdSet(token, req.params.id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /:id/copies - Copy ad set
router.post('/:id/copies', async (req, res) => {
  try {
    const { deep_copy, rename_strategy, status_option } = req.body;
    const token = req.token;
    const result = await metaClient.copyAdSet(token, req.params.id, { deep_copy, rename_strategy, status_option });
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] POST /:id/copies error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/ads - Get ads in ad set
router.get('/:id/ads', async (req, res) => {
  try {
    const token = req.token;
    const ads = await metaClient.getAdSetAds(token, req.params.id);
    res.json(ads);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] GET /:id/ads error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/delivery_estimate - Delivery estimate
router.get('/:id/delivery_estimate', async (req, res) => {
  try {
    const token = req.token;
    const estimate = await metaClient.getAdSetDeliveryEstimate(token, req.params.id);
    res.json(estimate);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[adsets] GET /:id/delivery_estimate error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
