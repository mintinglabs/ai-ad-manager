import { useState, useCallback } from 'react';

const STORAGE_KEY = 'aam_strategists';

const DEFAULT_STRATEGISTS = [
  {
    id: 'inception_funnel',
    name: 'Inception Funnel Auditor',
    instructions: `You are an Inception Funnel Auditor. Analyze ALL campaigns through the marketing funnel framework:

- **TOFU (Top of Funnel):** Awareness & Reach campaigns — measure impressions, reach, CPM, frequency
- **MOFU (Middle of Funnel):** Consideration & Engagement — measure clicks, CTR, engagement rate, video views
- **BOFU (Bottom of Funnel):** Conversion & Sales — measure purchases, ROAS, CPA, conversion rate

For every analysis:
1. Classify each campaign into TOFU/MOFU/BOFU based on its objective
2. Score each funnel stage (0-100) based on performance vs benchmarks
3. Calculate spend allocation across funnel stages
4. Identify gaps: where is the funnel leaking? Which stage is underfunded?
5. Recommend specific budget shifts to optimize the full funnel
6. Flag campaigns in the wrong funnel stage (e.g., awareness campaign optimizing for conversions)

Always present findings as: Funnel Score → Stage Breakdown → Gaps → Action Plan`,
    documents: [],
    isBuiltIn: true,
    isActive: false,
    order: 0,
  },
  {
    id: 'performance_analyst',
    name: 'Performance Analyst',
    instructions: '',
    documents: [],
    isBuiltIn: true,
    isActive: false,
    comingSoon: true,
    order: 1,
  },
  {
    id: 'creative_strategist',
    name: 'Creative Strategist',
    instructions: '',
    documents: [],
    isBuiltIn: true,
    isActive: false,
    comingSoon: true,
    order: 2,
  },
];

const loadStrategists = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return [...DEFAULT_STRATEGISTS];
    // Ensure built-in strategists always exist
    const result = [...saved];
    for (const def of DEFAULT_STRATEGISTS) {
      if (!result.find(s => s.id === def.id)) result.push(def);
    }
    return result;
  } catch { return [...DEFAULT_STRATEGISTS]; }
};

const saveStrategists = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export const useStrategists = () => {
  const [strategists, setStrategists] = useState(loadStrategists);

  const updateAndSave = useCallback((updater) => {
    setStrategists(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveStrategists(next);
      return next;
    });
  }, []);

  // Toggle a strategist on/off (only one active at a time)
  const toggleStrategist = useCallback((id) => {
    updateAndSave(prev => prev.map(s => ({
      ...s,
      isActive: s.id === id ? !s.isActive : false, // only one active
    })));
  }, [updateAndSave]);

  // Update strategist config (name, instructions, documents)
  const updateStrategist = useCallback((id, updates) => {
    updateAndSave(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, [updateAndSave]);

  // Add a document to a strategist
  const addDocument = useCallback((strategistId, doc) => {
    updateAndSave(prev => prev.map(s =>
      s.id === strategistId
        ? { ...s, documents: [...(s.documents || []), doc] }
        : s
    ));
  }, [updateAndSave]);

  // Remove a document from a strategist
  const removeDocument = useCallback((strategistId, docIndex) => {
    updateAndSave(prev => prev.map(s =>
      s.id === strategistId
        ? { ...s, documents: s.documents.filter((_, i) => i !== docIndex) }
        : s
    ));
  }, [updateAndSave]);

  // Create a new custom strategist
  const createStrategist = useCallback((name) => {
    const newStrat = {
      id: `strat_${Date.now()}`,
      name,
      instructions: '',
      documents: [],
      isBuiltIn: false,
      isActive: false,
      order: strategists.length,
    };
    updateAndSave(prev => [...prev, newStrat]);
    return newStrat;
  }, [updateAndSave, strategists.length]);

  // Delete a custom strategist (not built-in)
  const deleteStrategist = useCallback((id) => {
    updateAndSave(prev => prev.filter(s => s.id !== id || s.isBuiltIn));
  }, [updateAndSave]);

  // Get the currently active strategist (if any)
  const activeStrategist = strategists.find(s => s.isActive && !s.comingSoon) || null;

  // Build context string for the active strategist
  const getStrategistContext = useCallback(() => {
    if (!activeStrategist) return null;
    const parts = [];
    if (activeStrategist.instructions) {
      parts.push(`[STRATEGIST MODE: ${activeStrategist.name}]\n${activeStrategist.instructions}`);
    }
    if (activeStrategist.documents?.length) {
      for (const doc of activeStrategist.documents) {
        if (doc.text) {
          parts.push(`[KNOWLEDGE BASE: ${doc.name}]\n${doc.text}`);
        }
      }
    }
    return parts.length ? parts.join('\n\n') : null;
  }, [activeStrategist]);

  return {
    strategists,
    activeStrategist,
    toggleStrategist,
    updateStrategist,
    addDocument,
    removeDocument,
    createStrategist,
    deleteStrategist,
    getStrategistContext,
  };
};
