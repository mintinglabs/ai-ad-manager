import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { supabase } from '../lib/supabase.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills');
const OFFICIAL_DIR = path.join(SKILLS_DIR, 'official');

// Lazy-load multer and pdf-parse
let upload, pdfParse;
try {
  const { default: multer } = await import('multer');
  upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
} catch { upload = null; }
try {
  const { createRequire } = await import('module');
  const req = createRequire(import.meta.url);
  pdfParse = req('pdf-parse');
} catch { pdfParse = null; }

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseMd = (content, filename) => {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { id: filename.replace('.md', ''), name: filename.replace('.md', ''), description: '', content, icon: 'sparkles' };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
  });
  return {
    id: filename.replace('.md', ''),
    name: meta.name || filename.replace('.md', ''),
    description: meta.description || '',
    icon: meta.icon || 'sparkles',
    type: meta.type || 'workflow',
    preview: meta.preview || '',
    content: match[2].trim(),
  };
};

// Read all .md skills from a directory
const readSkillsFrom = async (dir, extraProps = {}) => {
  const skills = [];
  try {
    const files = await fs.readdir(dir);
    for (const file of files.filter(f => f.endsWith('.md'))) {
      const content = await fs.readFile(path.join(dir, file), 'utf-8');
      const skill = parseMd(content, file);
      const stat = await fs.stat(path.join(dir, file));
      Object.assign(skill, { updatedAt: stat.mtime.toISOString(), ...extraProps });
      skills.push(skill);
    }
  } catch {}
  return skills;
};

// ── FB User ID extraction (cached) ──────────────────────────────────────────
const userIdCache = new Map();

const getFbUserId = async (token) => {
  if (!token) return null;
  if (userIdCache.has(token)) return userIdCache.get(token);
  try {
    const { data } = await axios.get(`https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`);
    if (data?.id) { userIdCache.set(token, data.id); return data.id; }
  } catch (err) { console.error('[skills] FB user ID error:', err.message); }
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

// ── Routes ───────────────────────────────────────────────────────────────────

// POST /api/skills/generate
router.post('/generate', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'AI generation not configured' });
    const genAI = new GoogleGenAI({ apiKey });
    const raw = (req.body.rawText || '').slice(0, 8000);
    if (!raw.trim()) return res.status(400).json({ error: 'No text provided' });

    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `You are an expert at creating AI analysis strategies for Facebook ad data. Convert the following text into a structured analysis strategy.\n\nReturn ONLY valid JSON with these fields:\n- name (string, 2-5 words)\n- description (string, one sentence)\n- preview (string, 2-3 lines showing sample output)\n- content (string, full markdown instructions for the AI)\n\nText:\n${raw}`,
      config: { responseMimeType: 'application/json', responseSchema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, preview: { type: 'string' }, content: { type: 'string' } }, required: ['name', 'description', 'content'] } },
    });

    const parsed = JSON.parse(result.text);
    if (!parsed?.name || !parsed?.content) return res.status(500).json({ error: 'AI returned invalid structure' });
    res.json({ name: parsed.name, description: parsed.description, preview: parsed.preview || '', content: parsed.content });
  } catch (err) {
    console.error('[skills/generate] error:', err.message);
    res.status(500).json({ error: 'Failed to generate skill: ' + err.message });
  }
});

// GET /api/skills — official (from files) + user's custom (from Supabase)
router.get('/', async (req, res) => {
  try {
    const skills = [];

    // 1. Official skills (from filesystem)
    const officialSkills = await readSkillsFrom(OFFICIAL_DIR, { isDefault: true, visibility: 'official' });
    skills.push(...officialSkills);

    // 2. User's custom skills (from Supabase)
    if (supabase && req.fbUserId) {
      const { data, error } = await supabase
        .from('custom_skills')
        .select('*')
        .eq('fb_user_id', req.fbUserId)
        .order('updated_at', { ascending: false });

      if (!error && data) {
        for (const row of data) {
          skills.push({
            id: row.id,
            name: row.name,
            description: row.description || '',
            content: row.content || '',
            icon: row.icon || 'sparkles',
            type: row.type || 'strategy',
            preview: row.preview || '',
            isDefault: false,
            visibility: 'custom',
            updatedAt: row.updated_at,
          });
        }
      }
    }

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check Supabase first (custom skills)
    if (supabase && req.fbUserId) {
      const { data } = await supabase
        .from('custom_skills')
        .select('*')
        .eq('id', id)
        .eq('fb_user_id', req.fbUserId)
        .single();

      if (data) {
        return res.json({
          id: data.id, name: data.name, description: data.description || '',
          content: data.content || '', icon: data.icon || 'sparkles',
          isDefault: false, visibility: 'custom', updatedAt: data.updated_at,
        });
      }
    }

    // Check official + system files
    const filename = `${id}.md`;
    const SYSTEM_DIR = path.join(SKILLS_DIR, 'system');
    for (const dir of [OFFICIAL_DIR, SYSTEM_DIR]) {
      try {
        const content = await fs.readFile(path.join(dir, filename), 'utf-8');
        const skill = parseMd(content, filename);
        skill.isDefault = dir === OFFICIAL_DIR;
        skill.visibility = dir === OFFICIAL_DIR ? 'official' : 'system';
        return res.json(skill);
      } catch {}
    }

    res.status(404).json({ error: 'Skill not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills — create custom skill (Supabase)
router.post('/', async (req, res) => {
  try {
    const { name, description, content, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

    // Check if exists
    const { data: existing } = await supabase
      .from('custom_skills')
      .select('id')
      .eq('id', id)
      .eq('fb_user_id', fbUserId)
      .single();

    if (existing) return res.status(409).json({ error: 'A skill with this name already exists' });

    const row = {
      id,
      fb_user_id: fbUserId,
      name,
      description: description || '',
      content: content || '',
      icon: icon || 'sparkles',
      type: req.body.type || 'strategy',
      preview: req.body.preview || '',
    };

    const { error } = await supabase.from('custom_skills').insert(row);
    if (error) {
      console.error('[skills] POST / insert error:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('[skills] Created skill:', row.id, row.name);
    res.json({ ...row, isDefault: false, visibility: 'custom', updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[skills] POST / error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/skills/:id — update custom skill
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, icon } = req.body;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const updates = {
      name: name || id,
      description: description || '',
      content: content || '',
      icon: icon || 'sparkles',
      type: req.body.type || 'strategy',
      preview: req.body.preview || '',
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('custom_skills')
      .update(updates)
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });

    res.json({ id, ...updates, isDefault: false, visibility: 'custom', updatedAt: updates.updated_at });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/skills/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!supabase) return res.status(500).json({ error: 'Database not configured' });

    const fbUserId = req.fbUserId || '_anonymous';
    const { error } = await supabase
      .from('custom_skills')
      .delete()
      .eq('id', id)
      .eq('fb_user_id', fbUserId);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills/upload-doc — extract text from PDF/DOC/XLS then generate skill via AI
if (upload) {
  router.post('/upload-doc', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
      const { originalname, mimetype, buffer } = req.file;
      let text = '';

      if (mimetype === 'application/pdf' && pdfParse) {
        const data = await pdfParse(buffer);
        text = data.text || '';
      } else if (
        mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimetype === 'application/vnd.ms-excel'
      ) {
        // Excel: lazy-load xlsx
        try {
          const { createRequire } = await import('module');
          const req2 = createRequire(import.meta.url);
          const XLSX = req2('xlsx');
          const wb = XLSX.read(buffer, { type: 'buffer' });
          const lines = [];
          wb.SheetNames.forEach(name => {
            const sheet = wb.Sheets[name];
            lines.push(`## Sheet: ${name}`);
            lines.push(XLSX.utils.sheet_to_csv(sheet));
          });
          text = lines.join('\n');
        } catch {
          text = buffer.toString('utf-8');
        }
      } else {
        text = buffer.toString('utf-8');
      }

      text = text.replace(/\s+/g, ' ').trim().slice(0, 12000);
      if (!text) return res.status(400).json({ error: 'Could not extract text from file' });

      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
      if (!apiKey) return res.status(500).json({ error: 'AI generation not configured' });

      const genAI = new GoogleGenAI({ apiKey });
      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: `You are an expert at creating AI analysis strategies for Facebook ad managers. The user has uploaded a document. Convert its content into a useful, reusable skill for an AI ad assistant.\n\nReturn ONLY valid JSON:\n- name (string, 2-5 words)\n- description (string, one sentence)\n- preview (string, 2-3 lines showing sample output)\n- content (string, full markdown instructions for the AI)\n\nDocument (from "${originalname}"):\n${text}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: { name: { type: 'string' }, description: { type: 'string' }, preview: { type: 'string' }, content: { type: 'string' } },
            required: ['name', 'description', 'content'],
          },
        },
      });

      const parsed = JSON.parse(result.text);
      if (!parsed?.name || !parsed?.content) return res.status(500).json({ error: 'AI returned invalid structure' });
      res.json({ name: parsed.name, description: parsed.description || '', preview: parsed.preview || '', content: parsed.content });
    } catch (err) {
      console.error('[skills/upload-doc] error:', err.message);
      res.status(500).json({ error: 'Failed to process file: ' + err.message });
    }
  });
}

export default router;
