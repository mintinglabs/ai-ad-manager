import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();
// Token is provided by requireToken middleware as req.token

// ── Images ──────────────────────────────────────────────────────────

// GET /images - List ad images
router.get('/images', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });

    const data = await metaClient.getAdImages(req.token, adAccountId);
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

    const data = await metaClient.uploadAdImage(req.token, adAccountId, { bytes, name });
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

    const data = await metaClient.deleteAdImage(req.token, adAccountId, hash);
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

    const data = await metaClient.getAdVideos(req.token, adAccountId, { viewsMap: {} });
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

    const data = await metaClient.uploadAdVideo(req.token, adAccountId, params);
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
    const data = await metaClient.getAdVideoStatus(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] GET /videos/:id/status error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// ── Bulk Upload (for chat attachments) ────────────────────────────
// POST /bulk-upload - Upload multiple images/videos at once
// Body: { adAccountId, files: [{ name, type, base64 }] }
router.post('/bulk-upload', async (req, res) => {
  try {
    const { adAccountId, files } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    if (!files?.length) return res.status(400).json({ error: 'files array is required' });

    const token = req.token;
    const results = [];

    for (const file of files) {
      try {
        if (file.type?.startsWith('image/')) {
          const data = await metaClient.uploadAdImage(token, adAccountId, {
            bytes: file.base64,
            name: file.name,
          });
          // Meta returns { images: { [name]: { hash, url, ... } } }
          const imgKey = Object.keys(data.images || {})[0];
          const imgData = data.images?.[imgKey] || {};
          results.push({
            name: file.name,
            type: 'image',
            status: 'success',
            image_hash: imgData.hash,
            url: imgData.url,
            width: imgData.width,
            height: imgData.height,
          });
        } else if (file.type?.startsWith('video/')) {
          // Convert base64 to Buffer and upload via multipart/form-data
          const videoBuffer = Buffer.from(file.base64, 'base64');
          const data = await metaClient.uploadAdVideo(token, adAccountId, {
            source: videoBuffer,
            title: file.name,
          });
          results.push({
            name: file.name,
            type: 'video',
            status: 'success',
            video_id: data.id,
          });
        } else {
          results.push({ name: file.name, type: 'unknown', status: 'error', message: 'Unsupported file type' });
        }
      } catch (err) {
        const metaErr = err.response?.data?.error;
        console.error(`[assets] bulk-upload error for ${file.name}:`, metaErr || err.message);
        results.push({
          name: file.name,
          type: file.type?.startsWith('image/') ? 'image' : 'video',
          status: 'error',
          message: metaErr?.message || err.message,
        });
      }
    }

    res.json({ results });
  } catch (err) {
    console.error('[assets] POST /bulk-upload error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
