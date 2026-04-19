import { Router } from 'express';
import axios from 'axios';
import * as metaClient from '../../services/metaClient.js';

const router = Router();

// Resolve Facebook redirect image URLs to direct CDN URLs via HEAD request
async function resolveFbImageUrl(url) {
  try {
    const resp = await axios.head(url, { maxRedirects: 0, validateStatus: s => s === 302 || s === 301 });
    return resp.headers.location || url;
  } catch (err) {
    if (err.response?.headers?.location) return err.response.headers.location;
    return url;
  }
}


// GET / - List ad creatives (paginated)
router.get('/', async (req, res) => {
  try {
    const { adAccountId, limit, after } = req.query;
    if (!adAccountId) {
      return res.status(400).json({ error: 'adAccountId query parameter is required' });
    }
    const params = {
      access_token: req.token,
      limit: limit ? parseInt(limit) : 24,
      fields: 'id,name,status,body,title,image_hash,image_url,video_id,object_story_spec,object_url,call_to_action_type,url_tags,asset_feed_spec,thumbnail_url',
    };
    if (after) params.after = after;
    const { data } = await metaClient.metaApi.get(`/${adAccountId}/adcreatives`, { params });
    res.json({ data: data?.data || [], paging: data?.paging || null });
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /ad-library - Fetch ads with full creative data + campaign/adset names for the Ad Library view
router.get('/ad-library', async (req, res) => {
  try {
    const { adAccountId, limit, after } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const fields = [
      'id', 'name', 'status', 'effective_status', 'created_time',
      'campaign_id', 'campaign{id,name,objective,status}',
      'adset_id', 'adset{id,name,status}',
      'creative{id,name,title,body,image_url,image_hash,thumbnail_url,video_id,object_story_spec,call_to_action_type,asset_feed_spec}',
      'preview_shareable_link',
    ].join(',');
    const params = {
      access_token: req.token,
      fields,
      limit: limit ? parseInt(limit) : 24,
    };
    if (after) params.after = after;
    const { data } = await metaClient.metaApi.get(`/${adAccountId}/ads`, { params });
    const ads = data?.data || [];

    // Collect all image hashes that need resolving (carousel ads without image_url)
    const hashesToResolve = new Set();
    for (const ad of ads) {
      const c = ad.creative || {};
      if (c.image_url) continue; // already has full-res
      const oss = c.object_story_spec || {};
      if (oss.link_data?.picture) continue;
      // Check asset_feed_spec for carousel image hashes
      const afs = c.asset_feed_spec;
      if (afs?.images?.length) {
        for (const img of afs.images) { if (img.hash) hashesToResolve.add(img.hash); }
      }
      // Also check creative's own image_hash
      if (c.image_hash) hashesToResolve.add(c.image_hash);
    }

    // Batch resolve image hashes → full URLs in a single API call
    let hashUrlMap = {};
    if (hashesToResolve.size > 0) {
      try {
        const { data: imgData } = await metaClient.metaApi.get(`/${adAccountId}/adimages`, {
          params: { access_token: req.token, hashes: JSON.stringify([...hashesToResolve]), fields: 'hash,url' }
        });
        for (const item of (imgData?.data || [])) {
          if (item.hash && item.url) hashUrlMap[item.hash] = item.url;
        }
      } catch { /* ignore */ }
    }

    // Batch fetch high-res video thumbnails
    const videoIds = [...new Set(ads.map(a => a.creative?.video_id).filter(Boolean))];
    let videoThumbMap = {};
    if (videoIds.length > 0) {
      try {
        // Fetch in batches of 50
        for (let i = 0; i < videoIds.length; i += 50) {
          const batch = videoIds.slice(i, i + 50);
          const { data: vidData } = await metaClient.metaApi.get('/', {
            params: { ids: batch.join(','), fields: 'id,picture,thumbnails{uri,width,height}', access_token: req.token }
          });
          for (const [vid, info] of Object.entries(vidData || {})) {
            // Pick the largest thumbnail available
            const thumbs = info.thumbnails?.data || [];
            const best = thumbs.reduce((a, b) => ((b.width || 0) > (a.width || 0) ? b : a), {});
            videoThumbMap[vid] = best.uri || info.picture || null;
          }
        }
      } catch { /* ignore — fall back to existing thumbnails */ }
    }

    // Resolve blurry images
    const resolveJobs = ads.map(async (ad) => {
      const c = ad.creative || {};
      const oss = c.object_story_spec || {};
      const vd = oss.video_data || {};
      const ld = oss.link_data || {};
      const afs = c.asset_feed_spec;

      // Already has a good non-redirect image
      const isFbRedirect = (url) => url && url.includes('facebook.com/ads/image');
      if (c.image_url && !isFbRedirect(c.image_url)) return ad;
      if (ld.picture && !isFbRedirect(ld.picture) && !isFbRedirect(ld.image_url)) return ad;

      // Try image hash lookup first (works for carousel + any ad with image_hash)
      if (c.image_hash && hashUrlMap[c.image_hash]) {
        return { ...ad, creative: { ...c, _resolved_image: hashUrlMap[c.image_hash] } };
      }
      if (afs?.images?.length) {
        const firstHash = afs.images[0]?.hash;
        if (firstHash && hashUrlMap[firstHash]) {
          return { ...ad, creative: { ...c, _resolved_image: hashUrlMap[firstHash] } };
        }
      }

      // Video ads — use batch-fetched high-res thumbnail
      if (c.video_id && videoThumbMap[c.video_id]) {
        return { ...ad, creative: { ...c, _resolved_image: videoThumbMap[c.video_id] } };
      }

      // Resolve any FB redirect URL (video thumbnails, link_data pictures, etc.)
      const fbRedirect = vd.image_url || ld.image_url || ld.picture;
      if (fbRedirect && isFbRedirect(fbRedirect)) {
        try {
          const resolved = await resolveFbImageUrl(fbRedirect);
          if (resolved) return { ...ad, creative: { ...c, _resolved_image: resolved } };
        } catch { /* fall through */ }
      }

      return ad;
    });

    const enriched = await Promise.all(resolveJobs);

    // Resolve page names from page_ids in object_story_spec
    const getPageId = (ad) => {
      const c = ad.creative || {};
      const oss = c.object_story_spec || {};
      // page_id can be at different levels depending on Meta's response
      return oss.page_id || oss.instagram_actor_id || null;
    };
    const pageIds = [...new Set(enriched.map(getPageId).filter(Boolean))];

    let pageNameMap = {};
    if (pageIds.length > 0) {
      try {
        const { data: pageData } = await metaClient.metaApi.get('/', {
          params: { ids: pageIds.join(','), fields: 'id,name,picture{url}', access_token: req.token }
        });
        for (const [pid, info] of Object.entries(pageData || {})) {
          pageNameMap[pid] = { name: info.name, picture: info.picture?.data?.url };
        }
      } catch (e) { console.warn('[creatives] page name resolution failed:', e.response?.data?.error?.message || e.message); }
    }

    // Attach page info to each ad
    for (const ad of enriched) {
      const pageId = getPageId(ad);
      if (pageId && pageNameMap[pageId]) {
        ad._page = { id: pageId, ...pageNameMap[pageId] };
      }
    }
    console.log(`[creatives] page resolution: ${pageIds.length} pages found, ${Object.keys(pageNameMap).length} resolved`);

    res.json({ data: enriched, paging: data?.paging || null });
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET /ad-library error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// In-memory preview cache (creative_id:format → { html, ts })
const previewCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

function getCachedPreview(key) {
  const entry = previewCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.html;
  if (entry) previewCache.delete(key);
  return null;
}

// POST /batch-previews - Fetch previews for multiple ads/creatives in one request
// Accepts { ids: [{adId, creativeId}, ...] } — tries ad preview first, falls back to creative preview
router.post('/batch-previews', async (req, res) => {
  try {
    const { ids, ad_format = 'MOBILE_FEED_STANDARD' } = req.body;
    if (!ids?.length) return res.status(400).json({ error: 'ids array is required' });

    const results = {};
    const uncached = [];

    // Check cache first (keyed by adId)
    for (const entry of ids) {
      const key = `${entry.adId}:${ad_format}`;
      const cached = getCachedPreview(key);
      if (cached) results[entry.adId] = cached;
      else uncached.push(entry);
    }

    // Fetch uncached in parallel (max 10 concurrent to avoid rate limits)
    if (uncached.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < uncached.length; i += batchSize) {
        const batch = uncached.slice(i, i + batchSize);
        const fetches = batch.map(async (entry) => {
          try {
            // Try ad preview first (more reliable), fall back to creative preview
            let preview;
            try {
              preview = await metaClient.getAdPreview(req.token, entry.adId, ad_format);
            } catch {
              if (entry.creativeId) {
                preview = await metaClient.getCreativePreview(req.token, entry.creativeId, ad_format);
              }
            }
            const html = preview?.[0]?.body || '';
            if (html) previewCache.set(`${entry.adId}:${ad_format}`, { html, ts: Date.now() });
            return { adId: entry.adId, html };
          } catch {
            return { adId: entry.adId, html: null };
          }
        });
        const batchResults = await Promise.all(fetches);
        for (const { adId, html } of batchResults) {
          if (html) results[adId] = html;
        }
      }
    }

    res.json(results);
  } catch (err) {
    console.error('[creatives] POST /batch-previews error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /:id/previews - Preview creative (must be before /:id to avoid param collision)
router.get('/:id/previews', async (req, res) => {
  try {
    const { ad_format } = req.query;
    if (!ad_format) {
      return res.status(400).json({ error: 'ad_format query parameter is required' });
    }
    const preview = await metaClient.getCreativePreview(req.token, req.params.id, ad_format);
    res.json(preview);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET /:id/previews error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get single creative
router.get('/:id', async (req, res) => {
  try {
    const creative = await metaClient.getAdCreative(req.token, req.params.id);
    res.json(creative);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create ad creative
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name, body, title, image_hash, video_id, object_story_spec, object_url, call_to_action_type, url_tags, asset_feed_spec } = req.body;
    if (!adAccountId || !name) {
      return res.status(400).json({ error: 'adAccountId and name are required' });
    }
    const params = { name };
    if (body !== undefined) params.body = body;
    if (title !== undefined) params.title = title;
    if (image_hash !== undefined) params.image_hash = image_hash;
    if (video_id !== undefined) params.video_id = video_id;
    if (object_story_spec !== undefined) params.object_story_spec = object_story_spec;
    if (object_url !== undefined) params.object_url = object_url;
    if (call_to_action_type !== undefined) params.call_to_action_type = call_to_action_type;
    if (url_tags !== undefined) params.url_tags = url_tags;
    if (asset_feed_spec !== undefined) params.asset_feed_spec = asset_feed_spec;

    const result = await metaClient.createAdCreative(req.token, adAccountId, params);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update creative
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const result = await metaClient.updateAdCreative(req.token, req.params.id, updates);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete creative
router.delete('/:id', async (req, res) => {
  try {
    const result = await metaClient.deleteAdCreative(req.token, req.params.id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[creatives] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
