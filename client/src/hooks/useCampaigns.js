import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api.js';

export const useCampaigns = (adAccountId) => {
  const [campaigns, setCampaigns] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(new Set());
  const intervalRef = useRef(null);

  const fetchAll = useCallback(async () => {
    if (!adAccountId) return;
    try {
      const [campRes, insRes] = await Promise.all([
        api.get('/campaigns', { params: { adAccountId } }),
        api.get('/insights', { params: { adAccountId } })
      ]);
      setCampaigns(campRes.data);
      setInsights(insRes.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => {
    fetchAll();
    intervalRef.current = setInterval(fetchAll, 60_000);
    return () => clearInterval(intervalRef.current);
  }, [fetchAll]);

  const updateStatus = useCallback(async (id, status) => {
    setUpdatingIds(prev => new Set([...prev, id]));
    try {
      const { data } = await api.patch(`/campaigns/${id}`, { status });
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, []);

  const updateBudget = useCallback(async (id, dailyBudgetDollars) => {
    const cents = Math.round(dailyBudgetDollars * 100);
    setUpdatingIds(prev => new Set([...prev, id]));
    try {
      const { data } = await api.patch(`/campaigns/${id}`, { daily_budget: cents });
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
    } finally {
      setUpdatingIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }, []);

  return { campaigns, insights, isLoading, error, updatingIds, fetchAll, updateStatus, updateBudget };
};
