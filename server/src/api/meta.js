import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();

// Token is provided by requireToken middleware as req.token

// Triggers: ads_read — returns ad accounts with business info
router.get('/adaccounts', async (req, res, next) => {
  try {
    const raw = await metaClient.getAdAccounts(req.token);
    const normalized = raw.map(acc => ({
      id:             acc.id,
      account_id:     acc.account_id,
      name:           acc.name,
      account_status: acc.account_status,
      currency:       acc.currency,
      business_id:    acc.business?.id   || null,
      business_name:  acc.business?.name || 'Other',
    }));
    res.json(normalized);
  } catch (err) {
    next(err);
  }
});

// Triggers: business_management
router.get('/businesses', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinesses(req.token);
    console.log(`[meta] /businesses → found ${data.length} businesses`);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[meta] /businesses error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({
      error: metaErr?.message || err.message,
      code:  metaErr?.code,
    });
  }
});

// Returns ad accounts owned by a specific business
router.get('/businesses/:id/adaccounts', async (req, res, next) => {
  try {
    const raw = await metaClient.getOwnedAdAccounts(req.token, req.params.id);
    console.log(`[meta] /businesses/${req.params.id}/adaccounts → found ${raw.length} accounts`);
    const normalized = raw.map(acc => ({
      id:             acc.id,
      account_id:     acc.account_id,
      name:           acc.name,
      account_status: acc.account_status,
      currency:       acc.currency,
      business_id:    req.params.id,
    }));
    res.json(normalized);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[meta] /businesses/:id/adaccounts error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({
      error: metaErr?.message || err.message,
      code:  metaErr?.code,
    });
  }
});

// Triggers: pages_read_engagement
router.get('/pages', async (req, res, next) => {
  try {
    const data = await metaClient.getPages(req.token);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Triggers: ads_management — lists custom audiences for an ad account
router.get('/customaudiences', async (req, res, next) => {
  try {
    const adAccountId = req.query.adAccountId;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await metaClient.getCustomAudiences(req.token, adAccountId);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// Triggers: ads_management — creates a custom audience for an ad account
router.post('/customaudiences', async (req, res, next) => {
  try {
    const { adAccountId, name, subtype } = req.body;
    if (!adAccountId || !name) return res.status(400).json({ error: 'adAccountId and name are required' });
    const data = await metaClient.createCustomAudience(req.token, adAccountId, {
      name,
      subtype: subtype || 'WEBSITE',
      description: `Created via AI Ad Manager`,
    });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[meta] POST /customaudiences error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({
      error: metaErr?.message || err.message,
      code:  metaErr?.code,
    });
  }
});

// Triggers: pages_manage_ads — lists ads associated with a specific Page
router.get('/pages/:id/ads', async (req, res, next) => {
  try {
    const data = await metaClient.getPageAds(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({
      error: metaErr?.message || err.message,
      code:  metaErr?.code,
    });
  }
});

// Page videos — videos uploaded to a specific Facebook Page
router.get('/pages/:id/videos', async (req, res, next) => {
  try {
    const data = await metaClient.getPageVideos(req.token, req.params.id, req.query.adAccountId, { after: req.query.after });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Instagram media (videos) for a connected IG account
router.get('/instagram/:id/media', async (req, res, next) => {
  try {
    const data = await metaClient.getIgMedia(req.token, req.params.id, { pageId: req.query.pageId, adAccountId: req.query.adAccountId, after: req.query.after });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Lightweight campaign list for pickers (no insights)
router.get('/adaccounts/:id/campaigns-list', async (req, res, next) => {
  try {
    const data = await metaClient.getCampaignsList(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Ad Account Details ---
router.get('/adaccounts/:id/details', async (req, res, next) => {
  try {
    const data = await metaClient.getAdAccountDetails(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Ad account activity log
router.get('/adaccounts/:id/activities', async (req, res, next) => {
  try {
    const data = await metaClient.getAdAccountActivities(req.token, req.params.id, req.query);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Ad account users
router.get('/adaccounts/:id/users', async (req, res, next) => {
  try {
    const data = await metaClient.getAdAccountUsers(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Minimum budgets
router.get('/adaccounts/:id/minimum-budgets', async (req, res, next) => {
  try {
    const data = await metaClient.getMinimumBudgets(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Connected Instagram accounts
router.get('/adaccounts/:id/instagram-accounts', async (req, res, next) => {
  try {
    const data = await metaClient.getConnectedInstagramAccounts(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Ad videos for an ad account
router.get('/adaccounts/:id/videos', async (req, res, next) => {
  try {
    const data = await metaClient.getAdVideos(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Pixels for an ad account
router.get('/adaccounts/:id/pixels', async (req, res, next) => {
  try {
    const data = await metaClient.getPixels(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Permission Trigger ---
// Explicitly calls Meta API endpoints that require specific permissions
// so they show as "triggered" in FB App Review dashboard
router.post('/trigger-permissions', async (req, res) => {
  const { adAccountId, igAccountId, pageId } = req.body;
  const results = {};

  // 1. read_insights — GET /{ad_account}/insights
  if (adAccountId) {
    try {
      const { data } = await metaClient.metaApi.get(`/${adAccountId}/insights`, {
        params: { access_token: req.token, fields: 'impressions,spend', date_preset: 'last_7d' }
      });
      results.read_insights = { ok: true, data: data.data?.length ?? 0 };
    } catch (err) {
      results.read_insights = { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 2. instagram_basic — GET /{ig_account}?fields=id,username,media_count
  if (igAccountId) {
    try {
      const { data } = await metaClient.metaApi.get(`/${igAccountId}`, {
        params: { access_token: req.token, fields: 'id,username,media_count,profile_picture_url' }
      });
      results.instagram_basic = { ok: true, username: data.username, media_count: data.media_count };
    } catch (err) {
      results.instagram_basic = { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 3. instagram_manage_insights — GET /{ig_account}/insights
  if (igAccountId) {
    try {
      const { data } = await metaClient.metaApi.get(`/${igAccountId}/insights`, {
        params: { access_token: req.token, metric: 'reach,follower_count', period: 'day', since: Math.floor(Date.now()/1000) - 86400*2, until: Math.floor(Date.now()/1000) }
      });
      results.instagram_manage_insights = { ok: true, metrics: data.data?.length ?? 0 };
    } catch (err) {
      results.instagram_manage_insights = { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 4. pages_read_engagement — GET /{page}?fields=engagement
  if (pageId) {
    try {
      const { data } = await metaClient.metaApi.get(`/${pageId}`, {
        params: { access_token: req.token, fields: 'id,name,engagement' }
      });
      results.pages_read_engagement = { ok: true, name: data.name };
    } catch (err) {
      results.pages_read_engagement = { ok: false, error: err.response?.data?.error?.message || err.message };
    }
  }

  // 5. pages_show_list — GET /me/accounts
  try {
    const { data } = await metaClient.metaApi.get('/me/accounts', {
      params: { access_token: req.token, limit: 1 }
    });
    results.pages_show_list = { ok: true, pages: data.data?.length ?? 0 };
  } catch (err) {
    results.pages_show_list = { ok: false, error: err.response?.data?.error?.message || err.message };
  }

  res.json(results);
});

// --- Extended Business Manager ---
router.get('/businesses/:id/details', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessDetails(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/users', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessUsers(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/system-users', async (req, res, next) => {
  try {
    const data = await metaClient.getSystemUsers(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/owned-pages', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessOwnedPages(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/owned-pixels', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessOwnedPixels(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/owned-catalogs', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessOwnedCatalogs(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/owned-instagram', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessOwnedIGAccounts(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.get('/businesses/:id/client-adaccounts', async (req, res, next) => {
  try {
    const data = await metaClient.getBusinessClientAdAccounts(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.post('/businesses/:id/claim-adaccount', async (req, res, next) => {
  try {
    const { adaccount_id } = req.body;
    if (!adaccount_id) return res.status(400).json({ error: 'adaccount_id required' });
    const data = await metaClient.claimAdAccount(req.token, req.params.id, adaccount_id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// Saved audiences for an ad account
router.get('/saved-audiences', async (req, res, next) => {
  try {
    const adAccountId = req.query.adAccountId;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await metaClient.getSavedAudiences(req.token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Extended Audiences ---
router.get('/customaudiences/:id', async (req, res, next) => {
  try {
    const data = await metaClient.getCustomAudience(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.patch('/customaudiences/:id', async (req, res, next) => {
  try {
    const data = await metaClient.updateCustomAudience(req.token, req.params.id, req.body);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.delete('/customaudiences/:id', async (req, res, next) => {
  try {
    const data = await metaClient.deleteCustomAudience(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.post('/customaudiences/:id/users', async (req, res, next) => {
  try {
    // If raw: true, server will normalize + SHA256 hash the data before sending to Meta
    const { raw, ...payload } = req.body;
    const data = await metaClient.addUsersToAudience(req.token, req.params.id, payload, { raw: !!raw });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.delete('/customaudiences/:id/users', async (req, res, next) => {
  try {
    const data = await metaClient.removeUsersFromAudience(req.token, req.params.id, req.body);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.post('/lookalike-audiences', async (req, res, next) => {
  try {
    const { adAccountId, name, origin_audience_id, lookalike_spec } = req.body;
    if (!adAccountId || !name || !origin_audience_id || !lookalike_spec) {
      return res.status(400).json({ error: 'adAccountId, name, origin_audience_id, and lookalike_spec required' });
    }
    const data = await metaClient.createLookalikeAudience(req.token, adAccountId, { name, origin_audience_id, lookalike_spec });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Batch API ---
router.post('/batch', async (req, res, next) => {
  try {
    const { batch } = req.body;
    if (!batch || !Array.isArray(batch)) return res.status(400).json({ error: 'batch array required' });
    const data = await metaClient.batchRequest(req.token, batch);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Ad Library ---
router.get('/ad-library', async (req, res, next) => {
  try {
    const data = await metaClient.searchAdLibrary(req.token, req.query);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Reach & Frequency ---
router.post('/reach-frequency', async (req, res, next) => {
  try {
    const { adAccountId, ...params } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await metaClient.createReachFrequencyPrediction(req.token, adAccountId, params);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Publisher Block Lists ---
router.get('/block-lists', async (req, res, next) => {
  try {
    const adAccountId = req.query.adAccountId;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await metaClient.getPublisherBlockLists(req.token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.post('/block-lists', async (req, res, next) => {
  try {
    const { adAccountId, name } = req.body;
    if (!adAccountId || !name) return res.status(400).json({ error: 'adAccountId and name required' });
    const data = await metaClient.createPublisherBlockList(req.token, adAccountId, name);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.delete('/block-lists/:id', async (req, res, next) => {
  try {
    const data = await metaClient.deletePublisherBlockList(req.token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// --- Custom Audience TOS ---
router.get('/tos/custom-audience', async (req, res, next) => {
  try {
    const adAccountId = req.query.adAccountId;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await metaClient.checkCustomAudienceTos(req.token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

router.post('/tos/custom-audience', async (req, res, next) => {
  try {
    const { adAccountId } = req.body;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const data = await metaClient.acceptCustomAudienceTos(req.token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
