import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export const useBusinesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState(null);

  const fetchBusinesses = useCallback(() => {
    const token = localStorage.getItem('fb_long_lived_token');
    if (!token) {
      setBusinesses([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    api.get('/meta/businesses')
      .then(({ data }) => { setBusinesses(Array.isArray(data) ? data : []); setError(null); })
      .catch(err => { setBusinesses([]); setError(err.response?.data?.error || err.message || 'Failed to load businesses'); })
      .finally(() => setIsLoading(false));
  }, []);

  // Fetch on mount
  useEffect(() => { fetchBusinesses(); }, [fetchBusinesses]);

  // Listen for token changes (login/logout) via storage event + custom event
  useEffect(() => {
    const handleStorage = (e) => {
      if (e.key === 'fb_long_lived_token') fetchBusinesses();
    };
    const handleLogin = () => fetchBusinesses();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('fb_token_changed', handleLogin);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('fb_token_changed', handleLogin);
    };
  }, [fetchBusinesses]);

  return { businesses, isLoading, error, refetch: fetchBusinesses };
};
