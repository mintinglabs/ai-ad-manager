// Extracts Bearer token from Authorization header and attaches to req.token.
// Returns 401 if no token is present.
export const requireToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) {
    req.token = auth.slice(7);
  }
  if (!req.token) {
    return res.status(401).json({ error: 'Authentication required. Please log in with Facebook.' });
  }
  next();
};
