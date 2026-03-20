import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/ping', (_req, res) => res.json({ ok: true }));
app.get('/api/debug', (_req, res) => res.json({
  hasGeminiKey: !!process.env.GEMINI_API_KEY,
  hasGenaiKey: !!process.env.GOOGLE_GENAI_API_KEY,
  hasDemoToken: !!process.env.META_DEMO_TOKEN,
  nodeVersion: process.version,
}));
// Test audience creation directly to see exact Meta error
app.post('/api/debug/test-audience', async (req, res) => {
  try {
    const { default: metaClient } = await import('./services/metaClient.js');
    const { adAccountId, pixel_id, name = 'Debug Test' } = req.body;
    const token = process.env.META_DEMO_TOKEN;
    if (!token) return res.status(500).json({ error: 'No META_DEMO_TOKEN' });
    if (!adAccountId) return res.status(400).json({ error: 'adAccountId required' });
    const result = await metaClient.createCustomAudience(token, adAccountId, {
      name,
      subtype: 'WEBSITE',
      pixel_id: pixel_id || 'none',
      retention_days: 30,
    });
    res.json({ success: true, result });
  } catch (err) {
    const metaErr = err.response?.data?.error;
    res.status(err.response?.status || 500).json({
      error: metaErr || err.message,
      fullResponse: err.response?.data,
      status: err.response?.status,
    });
  }
});
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/meta', metaRouter);
app.use('/api/adsets', adsetsRouter);
app.use('/api/ads', adsRouter);
app.use('/api/creatives', creativesRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/targeting', targetingRouter);
app.use('/api/rules', rulesRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/pixels', pixelsRouter);
app.use('/api/conversions', conversionsRouter);
app.use('/api/leads', leadsRouter);
app.use('/api/catalogs', catalogsRouter);
app.use('/api/previews', previewsRouter);
app.use('/api/chat', chatRouter);

app.use((err, _req, res, _next) => {
  console.error('EXPRESS ERROR:', err?.message, err?.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
