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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json({ limit: '50mb' }));

app.get('/api/ping', (_req, res) => res.json({ ok: true }));
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

app.use((err, _req, res, _next) => {
  console.error('EXPRESS ERROR:', err?.message, err?.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
