import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';

// Shared cache across instances
let _cache = { data: null, ts: 0, promise: null };
const CACHE_TTL = 120_000; // 2 min

// Returns flattened list of Google Ads accounts.
// MCC manager accounts are expanded — their children are included inline.
// Standalone (non-manager) accounts appear at the top level.
const flatten = (accounts = []) => {
  const flat = [];
  accounts.forEach(acc => {
    if (acc.isManager && Array.isArray(acc.children)) {
      acc.children.forEach(c => flat.push({ ...c, mccId: acc.id, mccName: acc.name }));
    } else {
      flat.push(acc);
    }
  });
  return flat;
};

export const useGoogleAccounts = (connected = true) => {
  const [accounts, setAccounts] = useState(_cache.data || []);
  const [isLoading, setIsLoading] = useState(!_cache.data && connected);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetchAccounts = useCallback((force = false) => {
    if (!connected) {
      setAccounts([]);
      setIsLoading(false);
      _cache = { data: null, ts: 0, promise: null };
      return;
    }

    if (!force && _cache.data && Date.now() - _cache.ts < CACHE_TTL) {
      setAccounts(_cache.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (_cache.promise) {
      setIsLoading(true);
      _cache.promise.then(d => {
        if (mounted.current) { setAccounts(d); setIsLoading(false); setError(null); }
      }).catch(err => {
        if (mounted.current) { setAccounts([]); setIsLoading(false); setError(err.message); }
      });
      return;
    }

    setIsLoading(true);
    _cache.promise = api.get('/google/accounts')
      .then(({ data }) => {
        const flat = flatten(data.accounts || []);
        _cache = { data: flat, ts: Date.now(), promise: null };
        if (mounted.current) { setAccounts(flat); setError(null); }
        return flat;
      })
      .catch(err => {
        _cache.promise = null;
        const msg = err.response?.data?.error || err.message || 'Failed to load Google accounts';
        if (mounted.current) { setAccounts([]); setError(msg); }
        throw new Error(msg);
      })
      .finally(() => { if (mounted.current) setIsLoading(false); });
  }, [connected]);

  useEffect(() => {
    mounted.current = true;
    fetchAccounts();
    return () => { mounted.current = false; };
  }, [fetchAccounts]);

  useEffect(() => {
    const handler = () => { _cache = { data: null, ts: 0, promise: null }; fetchAccounts(true); };
    window.addEventListener('google_token_changed', handler);
    return () => window.removeEventListener('google_token_changed', handler);
  }, [fetchAccounts]);

  return { accounts, isLoading, error, refetch: () => fetchAccounts(true) };
};
