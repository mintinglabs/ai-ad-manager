import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export const useCreativeSets = (adAccountId) => {
  const [sets, setSets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/creative-sets');
      setSets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[creative-sets] fetch error:', err.response?.data?.error || err.message);
      setSets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  const createSet = useCallback(async ({ name, description, tags, campaign_id }) => {
    const { data } = await api.post('/creative-sets', { name, description, adAccountId, tags, campaign_id });
    setSets(prev => [data, ...prev]);
    return data;
  }, [adAccountId]);

  const updateSet = useCallback(async (id, updates) => {
    const { data } = await api.put(`/creative-sets/${id}`, updates);
    setSets(prev => prev.map(s => s.id === id ? { ...s, ...data } : s));
    return data;
  }, []);

  const deleteSet = useCallback(async (id) => {
    await api.delete(`/creative-sets/${id}`);
    setSets(prev => prev.filter(s => s.id !== id));
  }, []);

  const addItems = useCallback(async (setId, items) => {
    const { data } = await api.post(`/creative-sets/${setId}/items`, { items });
    setSets(prev => prev.map(s => s.id === setId ? { ...s, items: data.items } : s));
    return data;
  }, []);

  const removeItem = useCallback(async (setId, itemIndex) => {
    const { data } = await api.delete(`/creative-sets/${setId}/items/${itemIndex}`);
    setSets(prev => prev.map(s => s.id === setId ? { ...s, items: data.items } : s));
    return data;
  }, []);

  return { sets, loading, error, fetchSets, createSet, updateSet, deleteSet, addItems, removeItem };
};
