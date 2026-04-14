import { Router } from 'express';
import * as tokenService from '../services/tokenService.js';

const router = Router();

router.post('/token', async (req, res, next) => {
  const { shortLivedToken } = req.body;
  if (!shortLivedToken) {
    return res.status(400).json({ error: 'shortLivedToken is required' });
  }
  try {
    const result = await tokenService.exchangeToken(shortLivedToken);
    res.json({
      longLivedToken: result.longLivedToken,
      expiresAt: result.expiresAt,
      tokenType: result.tokenType
    });
  } catch (err) {
    const metaError = err.response?.data?.error;
    const error = new Error(metaError?.message || 'Token exchange failed');
    error.status = 502;
    next(error);
  }
});

// Dev-only: return the demo token so the client can sync it
router.get('/demo-token', (req, res) => {
  const token = process.env.META_DEMO_TOKEN;
  if (!token) return res.status(404).json({ error: 'No demo token configured' });
  res.json({ longLivedToken: token });
});

export default router;
