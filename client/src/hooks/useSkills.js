import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api.js';

const ACTIVE_KEY = 'aam_active_skills';

// Fallback defaults when API hasn't loaded — must match all 18 built-in skills from server/skills/default/
const DEFAULT_SKILLS = [
  // ── System Skills (always active, read-only) ──
  { id: 'campaigns', name: 'Campaigns', description: 'Create, edit, boost, and manage ad campaigns — launch new ads, boost posts, bulk updates', icon: 'target', isDefault: true, visibility: 'system' },
  { id: 'audiences', name: 'Audiences', description: 'Build and manage audiences — lookalikes, retargeting, custom lists, interest targeting', icon: 'users', isDefault: true, visibility: 'system' },
  { id: 'analytics-engine', name: 'Analytics & Reporting', description: 'Performance analysis, diagnostics, and strategic recommendations with dashboard', icon: 'chart', isDefault: true, visibility: 'system' },
  { id: 'automations', name: 'Automations', description: 'Create and manage automation rules — auto-pause, auto-scale, alerts, frequency caps', icon: 'zap', isDefault: true, visibility: 'system' },
  { id: 'creative-hub', name: 'Creative Hub', description: 'Upload, manage, and organize ad images and videos — asset management layer', icon: 'palette', isDefault: true, visibility: 'system' },
  { id: 'lead-forms', name: 'Lead Forms', description: 'Create and manage lead generation forms — design questions, privacy, thank-you pages', icon: 'sparkles', isDefault: true, visibility: 'system' },
  { id: 'account-infrastructure', name: 'Account & Tracking', description: 'Pixels, CAPI, custom conversions, product catalogs, automation rules setup', icon: 'target', isDefault: true, visibility: 'system' },
  { id: 'ad-gallery', name: 'Ad Gallery', description: 'Search and analyze competitor ads from Meta Ad Library — creative inspiration', icon: 'sparkles', isDefault: true, visibility: 'system' },
  { id: 'brand-memory', name: 'Brand Memory', description: 'Per-account brand knowledge base — voice, tone, guidelines, audience insights', icon: 'sparkles', isDefault: true, visibility: 'system' },
  // ── Official Skills (toggleable) ──
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
    getSkillContext,
    getSkillContextById,
    fetchSkills,
  };
};
