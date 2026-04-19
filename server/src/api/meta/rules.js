import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET / - List ad rules
router.get('/', async (req, res) => {
  try {
    const { adAccountId } = req.query;
    if (!adAccountId) {
      return res.status(400).json({ error: 'adAccountId is required' });
    }
    const token = req.token;
    const data = await metaClient.getAdRules(token, adAccountId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[rules] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get single rule
router.get('/:id', async (req, res) => {
  try {
    const token = req.token;
    const data = await metaClient.getAdRule(token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[rules] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create ad rule
router.post('/', async (req, res) => {
  try {
    const { adAccountId, name, schedule_spec, evaluation_spec, execution_spec } = req.body;
    if (!adAccountId || !name || !schedule_spec || !evaluation_spec || !execution_spec) {
      return res.status(400).json({ error: 'adAccountId, name, schedule_spec, evaluation_spec, and execution_spec are required' });
    }
    const token = req.token;
    const data = await metaClient.createAdRule(token, adAccountId, { name, schedule_spec, evaluation_spec, execution_spec });
    res.status(201).json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[rules] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update rule
router.patch('/:id', async (req, res) => {
  try {
    const { name, status, schedule_spec, evaluation_spec, execution_spec } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (status !== undefined) updates.status = status;
    if (schedule_spec !== undefined) updates.schedule_spec = schedule_spec;
    if (evaluation_spec !== undefined) updates.evaluation_spec = evaluation_spec;
    if (execution_spec !== undefined) updates.execution_spec = execution_spec;
    const token = req.token;
    const data = await metaClient.updateAdRule(token, req.params.id, updates);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[rules] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete rule
router.delete('/:id', async (req, res) => {
  try {
    const token = req.token;
    const data = await metaClient.deleteAdRule(token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[rules] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/history - Get rule execution history
router.get('/:id/history', async (req, res) => {
  try {
    const token = req.token;
    const data = await metaClient.getAdRuleHistory(token, req.params.id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[rules] GET /:id/history error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
