import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();
const getToken = () => process.env.META_DEMO_TOKEN;

// GET /search - Search targeting options by keyword
router.get('/search', async (req, res) => {
  try {
    const { adAccountId, q } = req.query;
    if (!adAccountId || !q) return res.status(400).json({ error: 'adAccountId and q are required' });
    const token = getToken();
    const data = await metaClient.targetingSearch(token, adAccountId, q);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] search error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /browse - Browse all targeting categories
router.get('/browse', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = getToken();
    const data = await metaClient.targetingBrowse(token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] browse error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /suggestions - Get targeting suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { adAccountId, targeting_list } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = getToken();
    const data = await metaClient.targetingSuggestions(token, adAccountId, targeting_list);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] suggestions error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /validate - Validate targeting spec
router.post('/validate', async (req, res) => {
  try {
    const { adAccountId, targeting_spec } = req.body;
    if (!adAccountId || !targeting_spec) return res.status(400).json({ error: 'adAccountId and targeting_spec are required' });
    const token = getToken();
    const data = await metaClient.targetingValidation(token, adAccountId, targeting_spec);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] validate error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /reach-estimate - Estimate audience reach
router.post('/reach-estimate', async (req, res) => {
  try {
    const { adAccountId, targeting_spec } = req.body;
    if (!adAccountId || !targeting_spec) return res.status(400).json({ error: 'adAccountId and targeting_spec are required' });
    const token = getToken();
    const data = await metaClient.getReachEstimate(token, adAccountId, targeting_spec);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] reach-estimate error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /delivery-estimate - Estimate delivery
router.post('/delivery-estimate', async (req, res) => {
  try {
    const { adAccountId, targeting_spec, optimization_goal } = req.body;
    if (!adAccountId || !targeting_spec || !optimization_goal) return res.status(400).json({ error: 'adAccountId, targeting_spec, and optimization_goal are required' });
    const token = getToken();
    const data = await metaClient.getDeliveryEstimate(token, adAccountId, { targeting_spec, optimization_goal });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] delivery-estimate error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /broad-categories - Get broad targeting categories
router.get('/broad-categories', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = getToken();
    const data = await metaClient.getBroadTargetingCategories(token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] broad-categories error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /saved-audiences - List saved audiences
router.get('/saved-audiences', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = getToken();
    const data = await metaClient.getSavedAudiences(token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] saved-audiences error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /saved-audiences - Create saved audience
router.post('/saved-audiences', async (req, res) => {
  try {
    const { adAccountId, name, targeting } = req.body;
    if (!adAccountId || !name || !targeting) return res.status(400).json({ error: 'adAccountId, name, and targeting are required' });
    const token = getToken();
    const data = await metaClient.createSavedAudience(token, adAccountId, { name, targeting: JSON.stringify(targeting) });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] create saved-audience error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /saved-audiences/:id - Delete saved audience
router.delete('/saved-audiences/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = getToken();
    const data = await metaClient.deleteSavedAudience(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[targeting] delete saved-audience error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
