import { Router } from 'express';
import * as metaClient from '../services/metaClient.js';

const router = Router();


// GET /forms - List lead forms for a page
router.get('/forms', async (req, res) => {
  try {
    const { pageId } = req.query;
    if (!pageId) return res.status(400).json({ error: 'pageId is required' });
    const token = req.token;
    const data = await metaClient.getLeadForms(token, pageId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] GET /forms error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /forms/:id/leads - Get leads from form
router.get('/forms/:id/leads', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
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
    const token = req.token;
    const data = await metaClient.createLeadForm(token, pageId, { name, questions, privacy_policy_url });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[leads] POST /forms error:', metaErr || err.message);
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
