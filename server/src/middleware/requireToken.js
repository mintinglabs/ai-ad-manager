// Extracts Bearer token from Authorization header and attaches to req.token.
// In development, falls back to META_DEMO_TOKEN so localhost works without login.
// Returns 401 if no token is present.
export const requireToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.token = auth.slice(7);
  }
  if (!req.token && process.env.META_DEMO_TOKEN && process.env.NODE_ENV !== 'production') {
    req.token = process.env.META_DEMO_TOKEN;
  }
  if (!req.token) {
    return res.status(401).json({ error: 'Authentication required. Please log in with Facebook.' });
  }
  next();
};

// Same as requireToken but allows requests without a token (for general chat)
export const optionalToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.token = auth.slice(7);
  }
  next();
};
