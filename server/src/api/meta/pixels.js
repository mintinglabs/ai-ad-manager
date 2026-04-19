import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET / - List pixels
router.get('/', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = req.token;
    const result = await metaClient.getPixels(token, adAccountId);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Pixels] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get pixel
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const result = await metaClient.getPixel(token, id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Pixels] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create pixel
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name } = req.body;
    if (!adAccountId || !name) return res.status(400).json({ error: 'adAccountId and name are required' });
    const token = req.token;
    const result = await metaClient.createPixel(token, adAccountId, name);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Pixels] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update pixel
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const token = req.token;
    const result = await metaClient.updatePixel(token, id, updates);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Pixels] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/stats - Get pixel stats
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const result = await metaClient.getPixelStats(token, id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Pixels] GET /:id/stats error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /:id/events - Send conversion event
router.post('/:id/events', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, test_event_code } = req.body;
    if (!data) return res.status(400).json({ error: 'data array is required' });
    const token = req.token;
    const result = await metaClient.sendConversionEvent(token, id, { data, test_event_code });
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Pixels] POST /:id/events error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
