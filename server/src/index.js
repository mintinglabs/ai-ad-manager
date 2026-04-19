import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { requireToken, optionalToken } from './middleware/requireToken.js';
import authRouter from './api/auth.js';
import campaignsRouter from './api/campaigns.js';
import insightsRouter from './api/insights.js';
import metaRouter from './api/meta.js';
import adsetsRouter from './api/adsets.js';
import adsRouter from './api/ads.js';
import creativesRouter from './api/creatives.js';
import assetsRouter from './api/assets.js';
import targetingRouter from './api/targeting.js';
import rulesRouter from './api/rules.js';
import labelsRouter from './api/labels.js';
import pixelsRouter from './api/pixels.js';
import conversionsRouter from './api/conversions.js';
import leadsRouter from './api/leads.js';
import catalogsRouter from './api/catalogs.js';
import previewsRouter from './api/previews.js';
import chatRouter from './api/chat.js';
import skillsRouter from './api/skills.js';
import brandLibraryRouter from './api/brandLibrary.js';
import creativeSetsRouter from './api/creativeSets.js';
import googleAccountsRouter from './api/google/accounts.js';
import googleCampaignsRouter from './api/google/campaigns.js';
import googleReportsRouter from './api/google/reports.js';
import googleAudiencesRouter from './api/google/audiences.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// Dev config — lets localhost skip login by seeding token + ad account
app.get('/api/dev-config', (_req, res) => {
  if (!process.env.META_DEMO_TOKEN) return res.json({ enabled: false });
  res.json({
    enabled: true,
    token: process.env.META_DEMO_TOKEN,
    adAccountId: process.env.AD_ACCOUNT_ID || null,
  });
});
app.get('/api/debug', async (_req, res) => {
  const { rootTools, analystTools } = await import('./lib/tools.js');
  res.json({
    version: '2026-03-31-v4',
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasGenaiKey: !!process.env.GOOGLE_GENAI_API_KEY,
    nodeVersion: process.version,
    rootToolCount: rootTools.length,
    rootToolNames: rootTools.map(t => t.name),
    analystToolCount: analystTools.length,
    analystToolNames: analystTools.map(t => t.name),
  });
});

// Auth route is public (no token required — it issues tokens)
app.use('/api/auth', authRouter);

// All other routes require a valid Bearer token
app.use('/api/campaigns', requireToken, campaignsRouter);
app.use('/api/insights', requireToken, insightsRouter);
app.use('/api/meta', requireToken, metaRouter);
app.use('/api/adsets', requireToken, adsetsRouter);
app.use('/api/ads', requireToken, adsRouter);
app.use('/api/creatives', requireToken, creativesRouter);
app.use('/api/assets', requireToken, assetsRouter);
app.use('/api/targeting', requireToken, targetingRouter);
app.use('/api/rules', requireToken, rulesRouter);
app.use('/api/labels', requireToken, labelsRouter);
app.use('/api/pixels', requireToken, pixelsRouter);
app.use('/api/conversions', requireToken, conversionsRouter);
app.use('/api/leads', requireToken, leadsRouter);
app.use('/api/catalogs', requireToken, catalogsRouter);
app.use('/api/previews', requireToken, previewsRouter);
app.use('/api/chat', optionalToken, chatRouter);
app.use('/api/skills', skillsRouter); // Skills API handles its own auth via resolveUser middleware

// One-time cleanup: remove accidentally created custom skill_creator rows (official skill lives in filesystem)
import('./lib/supabase.js').then(({ supabase }) => {
  if (supabase) supabase.from('custom_skills').delete().eq('id', 'skill_creator').then(({ error }) => {
    if (!error) console.log('[startup] Cleaned up accidental skill_creator custom skill (if any)');
  });
}).catch(() => {});
app.use('/api/brand-library', brandLibraryRouter);
app.use('/api/creative-sets', creativeSetsRouter);

// Google Ads API routes (no Meta token required — uses own credentials)
app.use('/api/google/accounts', googleAccountsRouter);
app.use('/api/google/campaigns', googleCampaignsRouter);
app.use('/api/google/reports', googleReportsRouter);
app.use('/api/google/audiences', googleAudiencesRouter);

app.use((err, _req, res, _next) => {
  console.error('EXPRESS ERROR:', err?.message, err?.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
