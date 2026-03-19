import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();
const getToken = () => process.env.META_DEMO_TOKEN;

// ── Images ──────────────────────────────────────────────────────────

// GET /images - List ad images
router.get('/images', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });

    const data = await metaClient.getAdImages(getToken(), adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] GET /images error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /images - Upload ad image
router.post('/images', async (req, res) => {
  try {
    const { adAccountId, bytes, name } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    if (!bytes) return res.status(400).json({ error: 'bytes is required' });

    const data = await metaClient.uploadAdImage(getToken(), adAccountId, { bytes, name });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] POST /images error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /images - Delete ad image
router.delete('/images', async (req, res) => {
  try {
    const { adAccountId, hash } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    if (!hash) return res.status(400).json({ error: 'hash is required' });

    const data = await metaClient.deleteAdImage(getToken(), adAccountId, hash);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] DELETE /images error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// ── Videos ──────────────────────────────────────────────────────────

// GET /videos - List ad videos
router.get('/videos', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });

    const data = await metaClient.getAdVideos(getToken(), adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] GET /videos error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /videos - Upload ad video
router.post('/videos', async (req, res) => {
  try {
    const { adAccountId, file_url, source, title, description } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    if (!file_url && !source) return res.status(400).json({ error: 'file_url or source is required' });

    const params = {};
    if (file_url) params.file_url = file_url;
    if (source) params.source = source;
    if (title) params.title = title;
    if (description) params.description = description;

    const data = await metaClient.uploadAdVideo(getToken(), adAccountId, params);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] POST /videos error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /videos/:id/status - Check video upload status
router.get('/videos/:id/status', async (req, res) => {
  try {
    const data = await metaClient.getAdVideoStatus(getToken(), req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] GET /videos/:id/status error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
