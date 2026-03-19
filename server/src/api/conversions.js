import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();
const getToken = () => process.env.META_DEMO_TOKEN;

// GET / - List custom conversions
router.get('/', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = getToken();
    const result = await metaClient.getCustomConversions(token, adAccountId);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Conversions] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create custom conversion
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name, rule, event_source_type, default_conversion_value, custom_event_type, pixel } = req.body;
    if (!adAccountId || !name || !rule || !event_source_type) {
      return res.status(400).json({ error: 'adAccountId, name, rule, and event_source_type are required' });
    }
    const token = getToken();
    const params = { name, rule, event_source_type };
    if (default_conversion_value !== undefined) params.default_conversion_value = default_conversion_value;
    if (custom_event_type !== undefined) params.custom_event_type = custom_event_type;
    if (pixel !== undefined) params.pixel = pixel;
    const result = await metaClient.createCustomConversion(token, adAccountId, params);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Conversions] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update custom conversion
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const token = getToken();
    const result = await metaClient.updateCustomConversion(token, id, updates);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Conversions] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete custom conversion
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = getToken();
    const result = await metaClient.deleteCustomConversion(token, id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Conversions] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
