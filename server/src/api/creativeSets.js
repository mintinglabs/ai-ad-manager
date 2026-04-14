import { Router } from 'express';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── FB User ID extraction ──
const userIdCache = new Map();
const getFbUserId = async (token) => {
  if (!token) return null;
  if (userIdCache.has(token)) return userIdCache.get(token);
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`);
    if (data?.id) { userIdCache.set(token, data.id); return data.id; }
  } catch {}
  return null;
};

const resolveUser = async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.token = auth.slice(7);
    req.fbUserId = await getFbUserId(req.token);
  }
  next();
};

router.use(resolveUser);

const TABLE = 'creative_sets';
const isTableMissing = (error) => error?.code === 'PGRST205' || error?.message?.includes('schema cache');

// ── GET / — list all sets ──
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    const fbUserId = req.fbUserId || '_anonymous';
    const { data, error } = await supabase.from(TABLE).select('*').eq('fb_user_id', fbUserId).order('updated_at', { ascending: false });
    if (isTableMissing(error)) return res.json([]);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST / — create set ──
router.post('/', async (req, res) => {
  try {
    const { name, description, adAccountId, tags, campaign_id } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36);

    const row = { id, fb_user_id: fbUserId, ad_account_id: adAccountId || null, name, description: description || '', items: [], tags: tags || [], campaign_id: campaign_id || null, metadata: {} };
    const { error } = await supabase.from(TABLE).insert(row);
    if (isTableMissing(error)) return res.status(500).json({ error: 'Table not created. Run server/sql/creative_sets.sql in Supabase.' });
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /:id — update set metadata ──
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, tags, campaign_id, metadata } = req.body;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const fbUserId = req.fbUserId || '_anonymous';
    const updates = { updated_at: new Date().toISOString() };
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (campaign_id !== undefined) updates.campaign_id = campaign_id;
    if (metadata !== undefined) updates.metadata = metadata;
    const { error } = await supabase.from(TABLE).update(updates).eq('id', id).eq('fb_user_id', fbUserId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id — delete set ──
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });
    const fbUserId = req.fbUserId || '_anonymous';
    const { error } = await supabase.from(TABLE).delete().eq('id', id).eq('fb_user_id', fbUserId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /:id/items — add creatives to set ──
router.post('/:id/items', async (req, res) => {
  try {
    const { id } = req.params;
    const { items } = req.body; // array of { creative_id, image_hash, image_url, video_id, thumbnail, name, type }
    if (!items?.length) return res.status(400).json({ error: 'Items required' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const { data: existing, error: fetchErr } = await supabase.from(TABLE).select('items').eq('id', id).eq('fb_user_id', fbUserId).single();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    const currentItems = existing?.items || [];
    const newItems = items.map(item => ({ ...item, added_at: new Date().toISOString() }));
    const updatedItems = [...currentItems, ...newItems];

    const { error } = await supabase.from(TABLE).update({ items: updatedItems, updated_at: new Date().toISOString() }).eq('id', id).eq('fb_user_id', fbUserId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, items: updatedItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /:id/items/:index — remove creative from set ──
router.delete('/:id/items/:index', async (req, res) => {
  try {
    const { id, index } = req.params;
    const idx = parseInt(index, 10);
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const { data: existing, error: fetchErr } = await supabase.from(TABLE).select('items').eq('id', id).eq('fb_user_id', fbUserId).single();
    if (fetchErr) return res.status(500).json({ error: fetchErr.message });

    const items = existing?.items || [];
    if (idx < 0 || idx >= items.length) return res.status(400).json({ error: 'Invalid index' });
    items.splice(idx, 1);

    const { error } = await supabase.from(TABLE).update({ items, updated_at: new Date().toISOString() }).eq('id', id).eq('fb_user_id', fbUserId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
