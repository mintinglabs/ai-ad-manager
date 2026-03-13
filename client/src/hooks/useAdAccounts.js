import { useState, useEffect } from 'react';
import api from '../services/api.js';

export const useAdAccounts = (_token) => {
  const [adAccounts, setAdAccounts] = useState([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    api.get('/meta/adaccounts')
      .then(({ data }) => { setAdAccounts(Array.isArray(data) ? data : []); setError(null); })
      .catch(err => { setAdAccounts([]); setError(err.message || 'Data load error'); })
      .finally(() => setIsLoading(false));
  }, []);

  return { adAccounts, isLoading, error };
};
