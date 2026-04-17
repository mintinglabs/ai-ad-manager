import { Router } from 'express';
import axios from 'axios';
import multer from 'multer';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdf = require('pdf-parse');
import { GoogleGenAI } from '@google/genai';
import { supabase } from '../lib/supabase.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } }); // 20MB max

// ── FB User ID extraction (cached) ──
const userIdCache = new Map();

const getFbUserId = async (token) => {
  if (!token) return null;
  if (userIdCache.has(token)) return userIdCache.get(token);
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`);
    if (data?.id) { userIdCache.set(token, data.id); return data.id; }
  } catch (err) { console.error('[brand-library] FB user ID error:', err.message); }
  return null;
};

// Middleware: resolve user
const resolveUser = async (req, _res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.token = auth.slice(7);
    req.fbUserId = await getFbUserId(req.token);
  }
  next();
};

router.use(resolveUser);

// ── GET /api/brand-library — list all items for user ──
router.get('/', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    const fbUserId = req.fbUserId || '_anonymous';
    const adAccountId = req.query.adAccountId;

    let query = supabase
      .from('brand_library')
      .select('*')
      .eq('fb_user_id', fbUserId);
    if (adAccountId) query = query.eq('ad_account_id', adAccountId);
    const { data, error } = await query.order('updated_at', { ascending: false });

    // Gracefully handle missing table
    if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
      console.warn('[brand-library] Table not found — run the SQL in Supabase dashboard to create it.');
      return res.json([]);
    }
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/brand-library — create item ──
router.post('/', async (req, res) => {
  try {
    const { name, type, content, metadata, adAccountId } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') + '_' + Date.now().toString(36);

    const row = {
      id,
      fb_user_id: fbUserId,
      ad_account_id: adAccountId || null,
      name,
      type: type || 'guidelines',
      content: content || '',
      metadata: metadata || {},
      enabled: true,
    };

    const { error } = await supabase.from('brand_library').insert(row);
    if (error?.code === 'PGRST205' || error?.message?.includes('schema cache')) {
      return res.status(500).json({ error: 'Brand Library table not created yet. Please run the setup SQL in your Supabase dashboard. See server/sql/brand_library.sql' });
    }
    if (error) return res.status(500).json({ error: error.message });

    console.log('[brand-library] Created:', row.id, row.name);
    res.json({ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/brand-library/:id — update item ──
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, content, metadata } = req.body;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (content !== undefined) updates.content = content;
    if (metadata !== undefined) updates.metadata = metadata;
    updates.updated_at = new Date().toISOString();

    const { error } = await supabase
      .from('brand_library')
      .update(updates)
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, ...updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/brand-library/:id ──
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const { error } = await supabase
      .from('brand_library')
      .delete()
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/brand-library/:id/toggle — toggle enabled ──
router.patch('/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const { error } = await supabase
      .from('brand_library')
      .update({ enabled: !!enabled, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ id, enabled: !!enabled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/brand-library/crawl-url — AI crawl website ──
router.post('/crawl-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

    // Fetch page content
    let pageText = '';
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BrandCrawler/1.0)' },
        timeout: 15000,
        maxContentLength: 500000,
      });
      // Strip HTML tags, keep text
      pageText = response.data
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);
    } catch (err) {
      return res.status(400).json({ error: `Failed to fetch URL: ${err.message}` });
    }

    if (!pageText || pageText.length < 50) {
      return res.status(400).json({ error: 'Could not extract meaningful content from URL' });
    }

    // AI extract brand info
    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analyze this website content and extract brand information. Return JSON with:\n- name (brand name)\n- description (one-line brand summary)\n- content (detailed markdown with sections: Brand Voice, Key Messages, Tone of Voice, Taglines, Target Audience)\n- metadata (object with: colors array of hex codes found, source_url)\n\nWebsite content:\n${pageText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object', properties: { colors: { type: 'array', items: { type: 'string' } }, source_url: { type: 'string' } } },
          },
          required: ['name', 'content'],
        },
      },
    });

    const parsed = JSON.parse(result.text);
    if (parsed.metadata) parsed.metadata.source_url = url;
    else parsed.metadata = { source_url: url };

    res.json({ ...parsed, type: 'crawled' });
  } catch (err) {
    console.error('[brand-library/crawl-url] error:', err.message);
    res.status(500).json({ error: 'Failed to crawl: ' + err.message });
  }
});

// ── POST /api/brand-library/crawl-social — AI crawl Meta page ──
router.post('/crawl-social', async (req, res) => {
  try {
    const { pageId } = req.body;
    if (!pageId || !req.token) return res.status(400).json({ error: 'Page ID and token required' });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI not configured' });

    // Fetch page info + recent posts
    const [pageRes, postsRes] = await Promise.all([
      axios.get(`https://graph.facebook.com/v25.0/${pageId}?fields=name,about,description,category,website&access_token=${req.token}`),
      axios.get(`https://graph.facebook.com/v25.0/${pageId}/posts?fields=message,created_time&limit=20&access_token=${req.token}`),
    ]);

    const page = pageRes.data;
    const posts = (postsRes.data?.data || []).filter(p => p.message).map(p => p.message).join('\n---\n');

    if (!posts && !page.about) {
      return res.status(400).json({ error: 'No content found on this page' });
    }

    const context = `Page: ${page.name}\nCategory: ${page.category || ''}\nAbout: ${page.about || ''}\nDescription: ${page.description || ''}\nWebsite: ${page.website || ''}\n\nRecent Posts:\n${posts.slice(0, 8000)}`;

    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analyze this Facebook page and its posts to extract brand patterns. Return JSON with:\n- name (brand name)\n- description (one-line brand summary)\n- content (detailed markdown with: Brand Voice Analysis, Content Themes, Messaging Patterns, Tone & Style, Recommended Guidelines)\n- metadata (object with: source_url as the page URL)\n\nPage data:\n${context}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            content: { type: 'string' },
            metadata: { type: 'object', properties: { source_url: { type: 'string' } } },
          },
          required: ['name', 'content'],
        },
      },
    });

    const parsed = JSON.parse(result.text);
    if (!parsed.metadata) parsed.metadata = {};
    parsed.metadata.source_url = `https://facebook.com/${pageId}`;
    parsed.metadata.page_name = page.name;

    res.json({ ...parsed, type: 'crawled' });
  } catch (err) {
    console.error('[brand-library/crawl-social] error:', err.message);
    res.status(500).json({ error: 'Failed to crawl: ' + err.message });
  }
});

// ── File Upload — extract text from PDF, TXT, MD ──
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { originalname, mimetype, buffer } = req.file;
    let text = '';

    if (mimetype === 'application/pdf') {
      // Parse PDF
      const data = await pdf(buffer);
      text = data.text || '';
    } else {
      // TXT, MD, DOC (plain text fallback)
      text = buffer.toString('utf-8');
    }

    // Clean up — collapse whitespace, trim
    text = text.replace(/\s+/g, ' ').trim();

    // Truncate to 50,000 chars
    const truncated = text.length > 50000;
    if (truncated) text = text.slice(0, 50000);

    const name = originalname.replace(/\.(pdf|txt|md|doc|docx|ppt|pptx)$/i, '');

    res.json({
      name,
      content: text,
      charCount: text.length,
      truncated,
      metadata: { source_file: originalname, file_type: mimetype },
    });
  } catch (err) {
    console.error('[brand-library/upload] error:', err.message);
    res.status(500).json({ error: 'Failed to parse file: ' + err.message });
  }
});

export default router;
