import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api.js';

const ACTIVE_KEY = 'aam_active_skills';

// Fallback defaults when API hasn't loaded — must match all 18 built-in skills from server/skills/default/
const DEFAULT_SKILLS = [
  // Only show official + custom skills in the Skills Library (system skills are background, not shown)
  { id: 'skill-creator', name: 'Skill Creator', description: 'Guide users through creating a new custom skill via structured conversation', icon: 'sparkles', isDefault: true, visibility: 'official', featured: true },
];

// Load active skill IDs from localStorage
const loadActiveIds = () => {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

export const useSkills = () => {
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [loading, setLoading] = useState(true);
  const [activeSkillIds, setActiveSkillIds] = useState(loadActiveIds);

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

  // Persist active IDs to localStorage
  const persistIds = useCallback((ids) => {
    if (ids.size === 0) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, JSON.stringify([...ids]));
  }, []);

  // Toggle a skill active/inactive (supports multiple)
  const toggleSkill = useCallback((id) => {
    setActiveSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistIds(next);
      return next;
    });
  }, [persistIds]);

  // Create a new custom skill
  const createSkill = useCallback(async ({ name, description, content, icon, preview }) => {
    const { data } = await api.post('/skills', { name, description, content, icon, preview });
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
    if (activeSkillIds.has(id)) {
      setActiveSkillIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        persistIds(next);
        return next;
      });
    }
  }, [activeSkillIds, persistIds]);

  // Generate a skill from raw text using AI
  const generateSkill = useCallback(async (rawText) => {
    const { data } = await api.post('/skills/generate', { rawText });
    return data; // { name, description, content, preview }
  }, []);

  // Enrich an existing skill with AI-generated description + preview (keeps content)
  const enrichSkill = useCallback(async (name, content) => {
    try {
      const { data } = await api.post('/skills/enrich', { name, content });
      return data; // { description, preview }
    } catch {
      return { description: '', preview: '' };
    }
  }, []);

  // Get all currently active skills
  const activeSkills = useMemo(() =>
    skills.filter(s => activeSkillIds.has(s.id)),
  [skills, activeSkillIds]);

  // Backwards-compatible: first active skill (for UI that still expects single)
  const activeSkill = activeSkills[0] || null;

  // Build context string for all active skills (injected before user messages)
  const getSkillContext = useCallback(() => {
    if (activeSkills.length === 0) return null;
    return activeSkills
      .map(s => `[SKILL: ${s.name}]\n${s.content}`)
      .join('\n\n---\n\n');
  }, [activeSkills]);

  // Build context for a specific skill by id (for slash command one-off use)
  const getSkillContextById = useCallback((id) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return null;
    return `[SKILL: ${skill.name}]\n${skill.content}`;
  }, [skills]);

  return {
    skills,
    loading,
    activeSkill,       // backwards-compatible: first active skill
    activeSkills,      // NEW: all active skills
    activeSkillId: activeSkill?.id || null,  // backwards-compatible
    activeSkillIds,    // NEW: Set of active IDs
    toggleSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    generateSkill,
    enrichSkill,
    getSkillContext,
    getSkillContextById,
    fetchSkills,
  };
};
