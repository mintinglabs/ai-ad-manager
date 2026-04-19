import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';

// Manages Google Ads OAuth connection state.
// - On mount: polls /api/google/auth/status to discover existing connection
// - connect(): opens OAuth URL in a popup, listens for postMessage from callback, then refreshes status
// - disconnect(): calls POST /disconnect
// - selectAccount(customerId, loginCustomerId): persists selection on server, updates local state
// - Reacts to window "google_connected=1" query param on initial load (after OAuth callback redirect)

export const useGoogleAuth = () => {
  const [connected, setConnected] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [loginCustomerId, setLoginCustomerId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const mounted = useRef(true);

  const fetchStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/google/auth/status');
      if (!mounted.current) return;
      setConnected(!!data.connected);
      setCustomerId(data.customerId || '');
      setLoginCustomerId(data.loginCustomerId || '');
      setError(null);
    } catch (e) {
      if (!mounted.current) return;
      setConnected(false);
      setError(e.response?.data?.error || e.message);
    } finally {
      if (mounted.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    fetchStatus();

    // If the OAuth callback redirected us here, clean up the URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('google_connected') === '1') {
        params.delete('google_connected');
        const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
        window.history.replaceState({}, '', clean);
        fetchStatus();
      }
    }
    return () => { mounted.current = false; };
  }, [fetchStatus]);

  // connect: opens OAuth popup. Parent polls status when popup closes.
  const connect = useCallback(async () => {
    try {
      const { data } = await api.get('/google/auth/connect');
      if (!data.url) throw new Error('No OAuth URL returned');
      const popup = window.open(data.url, 'google-ads-auth', 'width=500,height=700');
      if (!popup) {
        // Popup blocked — fall back to redirect
        window.location.href = data.url;
        return;
      }
      const poll = setInterval(async () => {
        if (popup.closed) {
          clearInterval(poll);
          await fetchStatus();
          window.dispatchEvent(new CustomEvent('google_token_changed'));
        }
      }, 500);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, [fetchStatus]);

  const disconnect = useCallback(async () => {
    try {
      await api.post('/google/auth/disconnect');
      setConnected(false);
      setCustomerId('');
      setLoginCustomerId('');
      window.dispatchEvent(new CustomEvent('google_token_changed'));
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, []);

  const selectAccount = useCallback(async (newCustomerId, newLoginCustomerId = null) => {
    setCustomerId(newCustomerId);
    setLoginCustomerId(newLoginCustomerId || '');
    try {
      await api.post('/google/auth/select-account', { customerId: newCustomerId, loginCustomerId: newLoginCustomerId });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }, []);

  return { connected, customerId, loginCustomerId, isLoading, error, connect, disconnect, selectAccount, refresh: fetchStatus };
};
