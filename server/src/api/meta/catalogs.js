import { Router } from 'express';
import * as metaClient from '../../services/metaClient.js';

const router = Router();


// GET / - List catalogs
router.get('/', async (req, res) => {
  try {
    const { businessId } = req.query;
    if (!businessId) return res.status(400).json({ error: 'businessId is required' });
    const token = req.token;
    const data = await metaClient.getCatalogs(token, businessId);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] GET / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id - Get catalog
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.getCatalog(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] GET /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST / - Create catalog
router.post('/', async (req, res) => {
  try {
    const { businessId, name, vertical } = req.body;
    if (!businessId || !name || !vertical) {
      return res.status(400).json({ error: 'businessId, name, and vertical are required' });
    }
    const token = req.token;
    const data = await metaClient.createCatalog(token, businessId, { name, vertical });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] POST / error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /:id - Update catalog
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const token = req.token;
    const data = await metaClient.updateCatalog(token, id, updates);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] PATCH /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /:id - Delete catalog
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.deleteCatalog(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] DELETE /:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/products - List products
router.get('/:id/products', async (req, res) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit || 50;
    const token = req.token;
    const data = await metaClient.getCatalogProducts(token, id, { limit });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] GET /:id/products error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /:id/products/batch - Batch create/update products
router.post('/:id/products/batch', async (req, res) => {
  try {
    const { id } = req.params;
    const { requests } = req.body;
    if (!requests) return res.status(400).json({ error: 'requests array is required' });
    const token = req.token;
    const data = await metaClient.batchCatalogProducts(token, id, requests);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] POST /:id/products/batch error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/product-sets - List product sets
router.get('/:id/product-sets', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.getCatalogProductSets(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] GET /:id/product-sets error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /:id/product-sets - Create product set
router.post('/:id/product-sets', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, filter } = req.body;
    if (!name || !filter) return res.status(400).json({ error: 'name and filter are required' });
    const token = req.token;
    const data = await metaClient.createProductSet(token, id, { name, filter });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] POST /:id/product-sets error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /product-sets/:id - Update product set
router.patch('/product-sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const token = req.token;
    const data = await metaClient.updateProductSet(token, id, updates);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] PATCH /product-sets/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /product-sets/:id - Delete product set
router.delete('/product-sets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.deleteProductSet(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] DELETE /product-sets/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/feeds - List product feeds
router.get('/:id/feeds', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.getCatalogProductFeeds(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] GET /:id/feeds error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// POST /:id/feeds - Create product feed
router.post('/:id/feeds', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, schedule } = req.body;
    if (!name || !schedule) return res.status(400).json({ error: 'name and schedule are required' });
    const token = req.token;
    const data = await metaClient.createProductFeed(token, id, { name, schedule });
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] POST /:id/feeds error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// PATCH /feeds/:id - Update feed
router.patch('/feeds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const token = req.token;
    const data = await metaClient.updateProductFeed(token, id, updates);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] PATCH /feeds/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// DELETE /feeds/:id - Delete feed
router.delete('/feeds/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.deleteProductFeed(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] DELETE /feeds/:id error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

// GET /:id/diagnostics - Get catalog diagnostics
router.get('/:id/diagnostics', async (req, res) => {
  try {
    const { id } = req.params;
    const token = req.token;
    const data = await metaClient.getCatalogDiagnostics(token, id);
    res.json(data);
  } catch (err) {
    const metaErr = err.response?.data?.error;
    console.error('[catalogs] GET /:id/diagnostics error:', metaErr || err.message);
    res.status(err.response?.status || 500).json({ error: metaErr?.message || err.message, code: metaErr?.code });
  }
});

export default router;
