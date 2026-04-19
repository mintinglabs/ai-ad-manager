import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET / - List labels
router.get('/', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId is required' });
    const token = req.token;
    const result = await metaClient.getAdLabels(token, adAccountId);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Labels] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create label
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name } = req.body;
    if (!adAccountId || !name) return res.status(400).json({ error: 'adAccountId and name are required' });
    const token = req.token;
    const result = await metaClient.createAdLabel(token, adAccountId, name);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Labels] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update label
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const token = req.token;
    const result = await metaClient.updateAdLabel(token, id, name);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Labels] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete label
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const result = await metaClient.deleteAdLabel(token, id);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Labels] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /assign - Assign label to object
router.post('/assign', async (req, res) => {
  try {
    const { objectId, labelId } = req.body;
    if (!objectId || !labelId) return res.status(400).json({ error: 'objectId and labelId are required' });
    const token = req.token;
    const result = await metaClient.assignLabel(token, objectId, labelId);
    res.json(result);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[Labels] POST /assign error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
