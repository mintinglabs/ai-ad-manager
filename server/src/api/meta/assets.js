import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

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
    // Support both body and query params (some clients strip body from DELETE)
    const adAccountId = req.body?.adAccountId || req.query?.adAccountId;
    const hash = req.body?.hash || req.query?.hash;
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

// DELETE /videos/:id - Delete ad video
router.delete('/videos/:id', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });

    // Meta doesn't have a direct video delete API — videos are managed at the ad level
    // But we can try to delete via the video node
    const { data } = await metaClient.metaApi.delete(`/${req.params.id}`, {
      params: { access_token: req.token }
    });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] DELETE /videos/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// ── Asset Usage — which assets are used in which ads ──────────────
// GET /usage - Returns { imageHashes: { hash: [{adId, adName, status}] }, videoIds: { id: [{adId, adName, status}] } }
const usageCache = new Map();
const USAGE_CACHE_TTL = 5 * 60 * 1000; // 5 min

router.get('/usage', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });

    // Check cache
    const cacheKey = `${adAccountId}:${req.token?.slice(-8)}`;
    const cached = usageCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < USAGE_CACHE_TTL) return res.json(cached.data);

    // Fetch all ads with full creative data to find all asset references
    const fields = 'id,name,effective_status,creative{id,image_hash,video_id,object_story_spec,asset_feed_spec}';
    let allAds = [];
    let after = null;
    // Paginate up to 200 ads
    for (let i = 0; i < 2; i++) {
      const params = { access_token: req.token, fields, limit: 100 };
      if (after) params.after = after;
      const { data } = await metaClient.metaApi.get(`/${adAccountId}/ads`, { params });
      const ads = data?.data || [];
      allAds.push(...ads);
      after = data?.paging?.cursors?.after;
      if (!after || ads.length < 100) break;
    }

    // Build usage maps — extract all image hashes and video IDs from all nesting levels
    const imageUsage = {};  // hash → [{adId, adName, status}]
    const videoUsage = {};  // videoId → [{adId, adName, status}]

    const addImage = (hash, entry) => {
      if (!hash) return;
      if (!imageUsage[hash]) imageUsage[hash] = [];
      imageUsage[hash].push(entry);
    };
    const addVideo = (vid, entry) => {
      if (!vid) return;
      if (!videoUsage[vid]) videoUsage[vid] = [];
      videoUsage[vid].push(entry);
    };

    for (const ad of allAds) {
      const c = ad.creative || {};
      const oss = c.object_story_spec || {};
      const ld = oss.link_data || {};
      const vd = oss.video_data || {};
      const afs = c.asset_feed_spec || {};
      const entry = { adId: ad.id, adName: ad.name, status: ad.effective_status };

      // Top-level creative fields
      addImage(c.image_hash, entry);
      addVideo(c.video_id, entry);

      // object_story_spec.link_data
      addImage(ld.image_hash, entry);
      addVideo(ld.video_id, entry);
      // Carousel child attachments
      if (ld.child_attachments) {
        for (const child of ld.child_attachments) {
          addImage(child.image_hash, entry);
          addVideo(child.video_id, entry);
        }
      }

      // object_story_spec.video_data
      addVideo(vd.video_id, entry);

      // asset_feed_spec (dynamic creative)
      if (afs.images) for (const img of afs.images) addImage(img.hash, entry);
      if (afs.videos) for (const vid of afs.videos) addVideo(vid.video_id, entry);
    }

    const result = { imageUsage, videoUsage };
    usageCache.set(cacheKey, { data: result, ts: Date.now() });
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[assets] GET /usage error:', metaErr || err.message);
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
    if (files.length > 20) return res.status(413).json({ error: 'Maximum 20 files per upload' });

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
