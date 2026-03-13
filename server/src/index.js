import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './api/auth.js';
import campaignsRouter from './api/campaigns.js';
import insightsRouter from './api/insights.js';
import metaRouter from './api/meta.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: true }));
app.use(express.json());

app.get('/api/ping', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/insights', insightsRouter);
app.use('/api/meta', metaRouter);

app.use((err, _req, res, _next) => {
  console.error('EXPRESS ERROR:', err?.message, err?.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
}

export default app;
