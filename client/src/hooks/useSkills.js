import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const ACTIVE_KEY = 'aam_active_skill';

// Fallback defaults so slash picker works even if API hasn't loaded yet
const DEFAULT_SKILLS = [
  { id: 'performance_analyst', name: 'Performance Analyst', description: 'Deep-dive into campaign metrics, ROAS, CPA, CTR trends', icon: 'chart', isDefault: true,
    content: 'You are a Performance Analyst. Pull all campaign data (spend, CTR, CPC, CPA, ROAS). Compare vs benchmarks. Trend analysis week-over-week. Rank campaigns by ROAS, flag below 1.0x. Diagnose: High CPM + Low CTR = creative fatigue; High CTR + Low conversion = landing page issue; Frequency >3 = saturation. Output: Executive Summary, Key Metrics Table, Trend Analysis, Top 3 Actions.' },
  { id: 'creative_strategist', name: 'Creative Strategist', description: 'Ad copy, creative testing, fatigue detection', icon: 'palette', isDefault: true,
    content: 'You are a Creative Strategist. Audit all active ads (CTR, CPA, frequency). Identify creative fatigue (frequency >3 + declining CTR). Rank creatives. Analyze copy patterns. Suggest 3 headline + 3 primary text variations using PAS, AIDA, Before/After frameworks. Output: Creative Scorecard, Fatigue Alerts, New Copy Ideas.' },
  { id: 'budget_optimizer', name: 'Budget Optimizer', description: 'Budget allocation, spend efficiency, scaling recommendations', icon: 'dollar', isDefault: true,
    content: 'You are a Budget Optimizer. Pull budget allocation and ROAS per campaign. Identify scaling opportunities (ROAS >2x, budget <80% spent). Identify waste (ROAS <1x for 3+ days). Recommend exact dollar reallocation amounts. Scale 20% every 3 days. Never kill campaigns in learning phase. Output: Current vs Recommended Budget Table, Expected Impact, Risk Assessment.' },
  { id: 'audience_strategist', name: 'Audience Strategist', description: 'Audience analysis, targeting, lookalikes, overlap fixes', icon: 'users', isDefault: true,
    content: 'You are an Audience Strategist. Audit all audiences with sizes. Check overlap (>30% = self-competition). Analyze performance by audience. Recommend: lookalikes (1%, 3%, 5%), interest audiences, exclusions. Funnel segmentation: Cold (broad + lookalikes), Warm (visitors, engagers), Hot (cart, checkout, purchasers). Output: Audience Map, Overlap Issues, Expansion Plan.' },
  { id: 'inception_funnel_audit', name: 'Inception Funnel Audit', description: 'Full-funnel audit from awareness to conversion', icon: 'funnel', isDefault: true,
    content: 'You are an Inception Funnel Auditor. Classify campaigns into TOFU (awareness: CPM, reach), MOFU (consideration: CTR, engagement), BOFU (conversion: ROAS, CPA). Score each stage 0-100. Calculate spend allocation across stages. Identify funnel gaps and leaks. Recommend budget shifts. Output: Funnel Score, Stage Breakdown, Gaps, Action Plan.' },
];

export const useSkills = () => {
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [loading, setLoading] = useState(true);
  const [activeSkillId, setActiveSkillId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null);

  // Fetch all skills from server (replaces defaults with full data including content)
  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/skills');
      if (data?.length) setSkills(data);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      // Keep DEFAULT_SKILLS as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  // Toggle a skill active/inactive (only one active at a time)
  const toggleSkill = useCallback((id) => {
    setActiveSkillId(prev => {
      const next = prev === id ? null : id;
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      else localStorage.removeItem(ACTIVE_KEY);
      return next;
    });
  }, []);

  // Create a new custom skill
  const createSkill = useCallback(async ({ name, description, content, icon }) => {
    const { data } = await api.post('/skills', { name, description, content, icon });
    setSkills(prev => [...prev, { ...data, isDefault: false }]);
    return data;
  }, []);

  // Update a custom skill
  const updateSkill = useCallback(async (id, updates) => {
    const { data } = await api.put(`/skills/${id}`, updates);
    setSkills(prev => prev.map(s => s.id === id ? { ...data, isDefault: false } : s));
    return data;
  }, []);

  // Delete a custom skill
  const deleteSkill = useCallback(async (id) => {
    await api.delete(`/skills/${id}`);
    setSkills(prev => prev.filter(s => s.id !== id));
    if (activeSkillId === id) {
      setActiveSkillId(null);
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeSkillId]);

  // Get the currently active skill
  const activeSkill = skills.find(s => s.id === activeSkillId) || null;

  // Build context string for active skill (injected before user messages)
  const getSkillContext = useCallback(() => {
    if (!activeSkill) return null;
    return `[SKILL: ${activeSkill.name}]\n${activeSkill.content}`;
  }, [activeSkill]);

  // Build context for a specific skill by id (for slash command one-off use)
  const getSkillContextById = useCallback((id) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return null;
    return `[SKILL: ${skill.name}]\n${skill.content}`;
  }, [skills]);

  return {
    skills,
    loading,
    activeSkill,
    activeSkillId,
    toggleSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    getSkillContext,
    getSkillContextById,
    fetchSkills,
  };
};
