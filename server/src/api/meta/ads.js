import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET / - List ads for an ad account
router.get('/', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) {
      return res.status(400).json({ error: 'adAccountId is required' });
    }
    const ads = await metaClient.getAds(req.token, adAccountId);
    res.json(ads);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get single ad
router.get('/:id', async (req, res) => {
  try {
    const ad = await metaClient.getAd(req.token, req.params.id);
    res.json(ad);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create ad
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name, adset_id, creative, status, tracking_specs, conversion_domain } = req.body;
    if (!adAccountId || !name || !adset_id || !creative) {
      return res.status(400).json({ error: 'adAccountId, name, adset_id, and creative are required' });
    }
    const params = {
      name,
      adset_id,
      creative: JSON.stringify(creative),
      status: status || 'PAUSED',
    };
    if (tracking_specs) params.tracking_specs = JSON.stringify(tracking_specs);
    if (conversion_domain) params.conversion_domain = conversion_domain;

    const result = await metaClient.createAd(req.token, adAccountId, params);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update ad
router.patch('/:id', async (req, res) => {
  try {
    const { name, status, creative, tracking_specs, conversion_domain } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (creative !== undefined) updates.creative = JSON.stringify(creative);
    if (tracking_specs !== undefined) updates.tracking_specs = JSON.stringify(tracking_specs);
    if (conversion_domain !== undefined) updates.conversion_domain = conversion_domain;

    const result = await metaClient.updateAd(req.token, req.params.id, updates);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete ad
router.delete('/:id', async (req, res) => {
  try {
    const result = await metaClient.deleteAd(req.token, req.params.id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /:id/copies - Copy ad
router.post('/:id/copies', async (req, res) => {
  try {
    const { deep_copy, rename_strategy, status_option } = req.body;
    const result = await metaClient.copyAd(req.token, req.params.id, { deep_copy, rename_strategy, status_option });
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] POST /:id/copies error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/leads - Get leads for ad
router.get('/:id/leads', async (req, res) => {
  try {
    const leads = await metaClient.getAdLeads(req.token, req.params.id);
    res.json(leads);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] GET /:id/leads error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/previews - Preview ad
router.get('/:id/previews', async (req, res) => {
  try {
    const { ad_format } = req.query;
    if (!ad_format) {
      return res.status(400).json({ error: 'ad_format query parameter is required' });
    }
    const preview = await metaClient.getAdPreview(req.token, req.params.id, ad_format);
    res.json(preview);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[ads] GET /:id/previews error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
