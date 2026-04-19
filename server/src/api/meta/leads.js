import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();

// Helper: get the Page Access Token for a given pageId
const getPageToken = async (userToken, pageId) => {
  const pages = await metaClient.getPages(userToken);
  const page = pages.find(p => p.id === pageId);
  if (!page?.access_token) throw Object.assign(new Error('Page token not available. Make sure you have pages_manage_ads permission for this page.'), { status: 403 });
  return page.access_token;
};

// GET /forms - List lead forms for a page
router.get('/forms', async (req, res) => {
  try {
    const { pageId, limit, after } = req.query;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });
    const pageToken = await getPageToken(req.token, pageId);
    const result = await metaClient.getLeadForms(pageToken, pageId, { limit: limit ? parseInt(limit) : 20, after });
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] GET /forms error:', metaErr || err.message);
    res.status(err.status || err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /forms/:id/leads - Get leads from form
router.get('/forms/:id/leads', async (req, res) => {
  try {
    const { id } = req.params;
    const { pageId } = req.query;
    // If pageId provided, use page token; otherwise fall back to user token
    let token = req.token;
    if (pageId) {
      try { token = await getPageToken(req.token, pageId); } catch { /* fall back */ }
    }
    const data = await metaClient.getLeadFormLeads(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] GET /forms/:id/leads error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /forms - Create lead form
router.post('/forms', async (req, res) => {
  try {
    const { pageId, name, questions, privacy_policy_url } = req.body;
    if (!pageId || !name || !questions || !privacy_policy_url) {
      return res.status(400).json({ error: 'pageId, name, questions, and privacy_policy_url are required' });
    }
    const pageToken = await getPageToken(req.token, pageId);
    const data = await metaClient.createLeadForm(pageToken, pageId, { name, questions, privacy_policy_url });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] POST /forms error:', metaErr || err.message);
    res.status(err.status || err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /forms/:id/archive - Archive (soft-delete) a lead form
router.post('/forms/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    const { pageId } = req.body;
    let token = req.token;
    if (pageId) {
      try { token = await getPageToken(req.token, pageId); } catch { /* fall back */ }
    }
    const data = await metaClient.archiveLeadForm(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] POST /forms/:id/archive error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /ads/:id - Get leads for a specific ad
router.get('/ads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.getAdLeads(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] GET /ads/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
