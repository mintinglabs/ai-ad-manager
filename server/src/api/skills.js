import { Router } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.resolve(__dirname, '../../skills');
const DEFAULT_DIR = path.join(SKILLS_DIR, 'default');
const CUSTOM_DIR = path.join(SKILLS_DIR, 'custom');

// Parse .md frontmatter (---\nkey: value\n---) + body
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

// Build .md file from data
const buildMd = (data) => {
  let frontmatter = `---\nname: ${data.name}\ndescription: ${data.description || ''}\nicon: ${data.icon || 'sparkles'}`;
  if (data.type) frontmatter += `\ntype: ${data.type}`;
  if (data.preview) frontmatter += `\npreview: ${data.preview}`;
  frontmatter += `\n---`;
  return `${frontmatter}\n\n${data.content || ''}`;
};

// Ensure custom dir exists
const ensureCustomDir = async () => {
  try { await fs.mkdir(CUSTOM_DIR, { recursive: true }); } catch {}
};

// POST /api/skills/generate — AI-powered skill generation from raw text
router.post('/generate', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });

    const { rawText } = req.body;
    if (!rawText?.trim()) return res.status(400).json({ error: 'rawText is required' });

    const truncated = rawText.slice(0, 8000);
    const ai = new GoogleGenAI({ apiKey });

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts: [{ text: `You are a skill generator for an AI Ad Manager that helps marketers analyze Facebook/Meta ad performance.

Given the raw input below, convert it into a structured analysis strategy skill. The skill tells the AI how to analyze ad data differently from the default approach.

Return a JSON object with:
- "name": Short descriptive name (2-5 words, e.g. "ROAS-First Analysis")
- "description": One sentence explaining what this strategy focuses on
- "preview": 2-3 lines of example output showing what analysis looks like with this strategy (use emoji markers like 📊 🚨 🚀)
- "content": Well-structured markdown instructions that tell the AI how to analyze data. Include: role definition, what metrics to prioritize, how to classify/diagnose campaigns, what output format to use, and any specific frameworks or thresholds.

Raw input:
${truncated}` }] }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            description: { type: 'string' },
            preview: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['name', 'description', 'content'],
        },
      },
    });

    const text = result.text || result.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    res.json({ name: parsed.name, description: parsed.description, preview: parsed.preview || '', content: parsed.content });
  } catch (err) {
    console.error('[skills/generate] error:', err.message);
    res.status(500).json({ error: 'Failed to generate skill: ' + err.message });
  }
});

// GET /api/skills — list all skills (default + custom)
router.get('/', async (_req, res) => {
  try {
    const skills = [];

    // Read default skills (scan subfolders: analytical, strategic, operational)
    try {
      const entries = await fs.readdir(DEFAULT_DIR, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subDir = path.join(DEFAULT_DIR, entry.name);
          const files = await fs.readdir(subDir);
          for (const file of files.filter(f => f.endsWith('.md'))) {
            const content = await fs.readFile(path.join(subDir, file), 'utf-8');
            const skill = parseMd(content, file);
            skill.isDefault = true;
            skill.layer = entry.name;
            skills.push(skill);
          }
        } else if (entry.name.endsWith('.md')) {
          // Also support flat .md files in default/ for backwards compat
          const content = await fs.readFile(path.join(DEFAULT_DIR, entry.name), 'utf-8');
          const skill = parseMd(content, entry.name);
          skill.isDefault = true;
          skills.push(skill);
        }
      }
    } catch {}

    // Read custom skills
    try {
      await ensureCustomDir();
      const customFiles = await fs.readdir(CUSTOM_DIR);
      for (const file of customFiles.filter(f => f.endsWith('.md'))) {
        const content = await fs.readFile(path.join(CUSTOM_DIR, file), 'utf-8');
        const skill = parseMd(content, file);
        skill.isDefault = false;
        skills.push(skill);
      }
    } catch {}

    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/skills/:id — get a single skill's full content
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filename = `${id}.md`;

    // Search default subfolders (analytical, strategic, operational), then custom
    const searchDirs = [
      path.join(DEFAULT_DIR, 'analytical'),
      path.join(DEFAULT_DIR, 'strategic'),
      path.join(DEFAULT_DIR, 'operational'),
      DEFAULT_DIR, // flat fallback
      CUSTOM_DIR,
    ];
    for (const dir of searchDirs) {
      try {
        const content = await fs.readFile(path.join(dir, filename), 'utf-8');
        const skill = parseMd(content, filename);
        skill.isDefault = dir !== CUSTOM_DIR;
        skill.layer = dir.includes('analytical') ? 'analytical' : dir.includes('strategic') ? 'strategic' : dir.includes('operational') ? 'operational' : undefined;
        return res.json(skill);
      } catch {}
    }

    res.status(404).json({ error: 'Skill not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/skills — create a new custom skill
router.post('/', async (req, res) => {
  try {
    const { name, description, content, icon } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await ensureCustomDir();

    // Generate filename from name
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    const filename = `${id}.md`;
    const filepath = path.join(CUSTOM_DIR, filename);

    // Check if exists
    try {
      await fs.access(filepath);
      return res.status(409).json({ error: 'A skill with this name already exists' });
    } catch {} // File doesn't exist — good

    const type = req.body.type || 'strategy';
    const preview = req.body.preview || '';
    const md = buildMd({ name, description: description || '', content: content || '', icon: icon || 'sparkles', type, preview });
    await fs.writeFile(filepath, md, 'utf-8');

    res.json({ id, name, description: description || '', content: content || '', icon: icon || 'sparkles', type, preview, isDefault: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/skills/:id — update a skill (default or custom)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, content, icon } = req.body;

    // Check if it's a default or custom skill
    let filepath = path.join(CUSTOM_DIR, `${id}.md`);
    let isDefault = false;
    try { await fs.access(filepath); } catch {
      // Not in custom — check default
      filepath = path.join(DEFAULT_DIR, `${id}.md`);
      try { await fs.access(filepath); isDefault = true; } catch {
        return res.status(404).json({ error: 'Skill not found' });
      }
    }

    const type = req.body.type || 'strategy';
    const preview = req.body.preview || '';
    const md = buildMd({ name: name || id, description: description || '', content: content || '', icon: icon || 'sparkles', type, preview });
    await fs.writeFile(filepath, md, 'utf-8');

    res.json({ id, name: name || id, description: description || '', content: content || '', icon: icon || 'sparkles', type, preview, isDefault });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/skills/:id — delete a custom skill
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const filepath = path.join(CUSTOM_DIR, `${id}.md`);

    // Only allow deleting custom skills
    try { await fs.access(filepath); } catch {
      return res.status(403).json({ error: 'Cannot delete default skills' });
    }

    await fs.unlink(filepath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
