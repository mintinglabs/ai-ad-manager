import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { requireToken, optionalToken } from './middleware/requireToken.js';
import { devOnly, devRoutesAllowed } from './middleware/devOnly.js';
import { limitAi, limitAiDaily, limitDefault } from './middleware/rateLimit.js';
import authRouter from './api/auth.js';
import campaignsRouter from './api/meta/campaigns.js';
import insightsRouter from './api/meta/insights.js';
import metaRouter from './api/meta/meta.js';
import adsetsRouter from './api/meta/adsets.js';
import adsRouter from './api/meta/ads.js';
import creativesRouter from './api/meta/creatives.js';
import assetsRouter from './api/meta/assets.js';
import targetingRouter from './api/meta/targeting.js';
import rulesRouter from './api/meta/rules.js';
import labelsRouter from './api/meta/labels.js';
import pixelsRouter from './api/meta/pixels.js';
import conversionsRouter from './api/meta/conversions.js';
import leadsRouter from './api/meta/leads.js';
import catalogsRouter from './api/meta/catalogs.js';
import previewsRouter from './api/meta/previews.js';
import chatRouter, { chatStreamRouter } from './api/chat.js';
import chatHistoryRouter from './api/chatHistory.js';
import creditsRouter from './api/credits.js';
import { resolveAppUser } from './middleware/resolveAppUser.js';
import confirmationsRouter from './api/confirmations.js';
import skillsRouter from './api/skills.js';
import brandLibraryRouter from './api/brandLibrary.js';
import creativeSetsRouter from './api/creativeSets.js';
import uploadsRouter from './api/uploads.js';
import googleAccountsRouter from './api/google/accounts.js';
import googleCampaignsRouter from './api/google/campaigns.js';
import googleReportsRouter from './api/google/reports.js';
import googleAudiencesRouter from './api/google/audiences.js';
import googleKeywordsRouter from './api/google/keywords.js';
import googleAuthRouter from './api/google/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — we now ship credentials (HttpOnly session cookie) on every request,
// so we can't use `origin: '*'` or a blanket reflector. CLIENT_ORIGIN can be
// a comma-separated allowlist (e.g. prod + preview domains). Same-origin
// fetches don't trigger CORS at all, so a missing list still works for the
// production deployment where /api is a Vercel rewrite of the same domain.
const allowedOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);                     // same-origin / curl
    if (allowedOrigins.length === 0) return cb(null, true); // permissive in dev
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));

// Resolve Supabase auth user (req.appUserId) globally — any route that
// needs to key data on the app account (credits / billing / future
// per-account settings) can read it without a per-router mount.
app.use(resolveAppUser);

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

// Dev-only routes — /api/dev-config and /api/debug were leaking secrets
// (META_DEMO_TOKEN, env presence flags, internal tool catalog) on production.
// `devOnly` returns 404 in prod so the routes look non-existent. See
// middleware/devOnly.js for the override knob (ALLOW_DEV_ROUTES).

// Dev config — lets localhost skip login by seeding token + ad account.
// Returns the team's META_DEMO_TOKEN; MUST never be reachable in prod.
app.get('/api/dev-config', devOnly, (_req, res) => {
  if (!process.env.META_DEMO_TOKEN) return res.json({ enabled: false });
  res.json({
    enabled: true,
    token: process.env.META_DEMO_TOKEN,
    adAccountId: process.env.AD_ACCOUNT_ID || null,
  });
});

// Debug — reports env-var presence, Node version, AI tool catalog. Useful
// info for an attacker doing reconnaissance, so gated behind the same
// dev-only guard.
app.get('/api/debug', devOnly, async (_req, res) => {
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

if (!devRoutesAllowed) console.log('[startup] dev routes disabled (NODE_ENV=production)');

// Auth route is public (no token required — it issues tokens). Per-route
// limits live inside authRouter itself (limitAuth on /token + /demo-session)
// since the bucket needs to be IP-keyed before requireToken runs.
app.use('/api/auth', authRouter);

// All other routes require a valid Bearer token. `limitDefault` is keyed
// by fb_user_id (set by requireToken) and acts as a broad ceiling so a
// rogue script can't drain the underlying Meta/Google API quota for the
// whole team.
app.use('/api/campaigns', requireToken, limitDefault, campaignsRouter);
app.use('/api/insights', requireToken, limitDefault, insightsRouter);
app.use('/api/meta', requireToken, limitDefault, metaRouter);
app.use('/api/adsets', requireToken, limitDefault, adsetsRouter);
app.use('/api/ads', requireToken, limitDefault, adsRouter);
app.use('/api/creatives', requireToken, limitDefault, creativesRouter);
app.use('/api/assets', requireToken, limitDefault, assetsRouter);
app.use('/api/targeting', requireToken, limitDefault, targetingRouter);
app.use('/api/rules', requireToken, limitDefault, rulesRouter);
app.use('/api/labels', requireToken, limitDefault, labelsRouter);
app.use('/api/pixels', requireToken, limitDefault, pixelsRouter);
app.use('/api/conversions', requireToken, limitDefault, conversionsRouter);
app.use('/api/leads', requireToken, limitDefault, leadsRouter);
app.use('/api/catalogs', requireToken, limitDefault, catalogsRouter);
app.use('/api/previews', requireToken, limitDefault, previewsRouter);
app.use('/api/chat/history', chatHistoryRouter);  // mount BEFORE /api/chat catch-all
app.use('/api/credits', creditsRouter);
app.use('/api/confirmations', confirmationsRouter);
// Mid-stream reattach (status probe + reattach SSE). Mounted BEFORE the
// rate-limited /api/chat catch-all so a tab refresh doesn't burn the
// user's per-minute Gemini budget on a single GET. Status returns a
// tiny JSON; stream forwards events the runner already publishes — both
// are safe to leave outside limitAi.
app.use('/api/chat', optionalToken, chatStreamRouter);
// Chat is the most expensive endpoint — every message is a Gemini call.
// Stack a per-minute and a per-day limit so neither a runaway loop nor a
// leak of credentials can run up an unbounded bill overnight.
app.use('/api/chat', optionalToken, limitAi, limitAiDaily, chatRouter);
app.use('/api/skills', limitAi, skillsRouter); // skill creation also calls Gemini

// One-time cleanup: remove accidentally created custom skill_creator rows (official skill lives in filesystem)
import('./lib/supabase.js').then(({ supabase }) => {
  if (supabase) supabase.from('custom_skills').delete().eq('id', 'skill_creator').then(({ error }) => {
    if (!error) console.log('[startup] Cleaned up accidental skill_creator custom skill (if any)');
  });
}).catch(() => {});
// Brand-library has crawl-url / crawl-social / upload-doc routes that all
// hit Gemini, so the whole router shares the AI budget. List/CRUD ops are
// cheap but staying in the same bucket is fine — 30/min is plenty for UI.
app.use('/api/brand-library', limitAi, brandLibraryRouter);
app.use('/api/creative-sets', limitDefault, creativeSetsRouter);
app.use('/api/uploads', limitDefault, uploadsRouter); // GCS signed-URL uploads; auth handled internally

// Google Ads API routes (no Meta token required — uses own credentials)
app.use('/api/google/auth', googleAuthRouter);
app.use('/api/google/accounts', limitDefault, googleAccountsRouter);
app.use('/api/google/campaigns', limitDefault, googleCampaignsRouter);
app.use('/api/google/reports', limitDefault, googleReportsRouter);
app.use('/api/google/audiences', limitDefault, googleAudiencesRouter);
app.use('/api/google/keywords', limitDefault, googleKeywordsRouter);

app.use((err, _req, res, _next) => {
  console.error('EXPRESS ERROR:', err?.message, err?.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
