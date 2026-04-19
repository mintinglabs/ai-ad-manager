import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET /ad/:id - Preview an existing ad
router.get('/ad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ad_format } = req.query;
    if (!ad_format) return res.status(400).json({ error: 'ad_format is required' });
    const token = req.token;
    const data = await metaClient.getAdPreview(token, id, ad_format);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[previews] GET /ad/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /creative/:id - Preview an existing creative
router.get('/creative/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { ad_format } = req.query;
    if (!ad_format) return res.status(400).json({ error: 'ad_format is required' });
    const token = req.token;
    const data = await metaClient.getCreativePreview(token, id, ad_format);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[previews] GET /creative/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /generate - Generate preview from spec
router.post('/generate', async (req, res) => {
  try {
    const { adAccountId, creative, ad_format } = req.body;
    if (!adAccountId || !creative || !ad_format) {
      return res.status(400).json({ error: 'adAccountId, creative, and ad_format are required' });
    }
    const token = req.token;
    const data = await metaClient.generatePreview(token, adAccountId, JSON.stringify(creative), ad_format);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[previews] POST /generate error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
