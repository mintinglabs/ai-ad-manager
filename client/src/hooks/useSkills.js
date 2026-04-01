import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const ACTIVE_KEY = 'aam_active_skill';

// Fallback defaults when API hasn't loaded — must match all 18 built-in skills from server/skills/default/
const DEFAULT_SKILLS = [
  // ── Analytical ──
  { id: 'insights-reporting', name: 'Insights & Reporting', description: 'Analyze Facebook ad performance with diagnostic statuses and strategic recommendations', icon: 'chart', isDefault: true },
  { id: 'data-analysis', name: 'Data Analysis', description: 'Performance analysis, diagnostics, and business intelligence — overview, cost diagnostics, capital loss, scaling', icon: 'chart', isDefault: true },
  { id: 'business-manager', name: 'Business Manager', description: 'Navigate Facebook Business Manager — view businesses, ad accounts, pages, pixels, and team members', icon: 'sparkles', isDefault: true },
  // ── Strategic ──
  { id: 'campaign-manager', name: 'Campaign Manager', description: 'Plan and configure Facebook ad campaigns — guided creation flow with diagnostic one-click fixes', icon: 'target', isDefault: true },
  { id: 'targeting-audiences', name: 'Targeting & Audiences', description: 'Plan audience targeting strategies — custom audiences, lookalikes, saved audiences, and interest targeting', icon: 'users', isDefault: true },
  { id: 'automation-rules', name: 'Automation Rules', description: 'Plan automation strategies — auto-pause, auto-scale, and notification rules with safety guardrails', icon: 'zap', isDefault: true },
  // ── Operational ──
  { id: 'ad-manager', name: 'Ad Manager', description: 'Create, update, delete, copy, and preview Facebook ads with read-first safety guardrails', icon: 'sparkles', isDefault: true },
  { id: 'adset-manager', name: 'Ad Set Manager', description: 'Create, update, delete, and copy ad sets with targeting, budgets, bidding, and scheduling', icon: 'sparkles', isDefault: true },
  { id: 'creative-manager', name: 'Creative Manager', description: 'Audit creative health — detect fatigue, analyze hook rates, recommend format pivots and copy refreshes', icon: 'palette', isDefault: true },
  { id: 'tracking-conversions', name: 'Tracking & Conversions', description: 'Set up pixels, send server-side conversion events via CAPI, and create custom conversions', icon: 'target', isDefault: true },
  { id: 'lead-ads', name: 'Lead Ads', description: 'Create lead generation forms, retrieve and export lead submissions, and connect forms to ads', icon: 'sparkles', isDefault: true },
  { id: 'product-catalogs', name: 'Product Catalogs', description: 'Manage product catalogs, feeds, product sets, and batch operations for dynamic product ads', icon: 'sparkles', isDefault: true },
  // ── Pipeline ──
  { id: 'campaign-creation', name: 'Campaign Creation', description: 'Complete campaign creation — from strategy to launch. Guided, materials-based, boost, bulk, and clone', icon: 'target', isDefault: true },
  { id: 'audience-creation', name: 'Audience Creation', description: 'Create all audience types — video, website, engagement, lookalike, saved, customer list', icon: 'users', isDefault: true },
  { id: 'campaign-setup', name: 'Campaign Setup', description: 'Stage 1-2: Collect campaign strategy settings and audience targeting configuration', icon: 'target', isDefault: true },
  { id: 'creative-assembly', name: 'Creative Assembly', description: 'Stage 3: Collect creative materials and auto-generate ad copy variations', icon: 'palette', isDefault: true },
  { id: 'ad-launcher', name: 'Ad Launcher', description: 'Execution: Final review, create campaign + ad set + creative + ad, preflight, preview, activate', icon: 'zap', isDefault: true },
  { id: 'bulk-campaign-setup', name: 'Bulk Campaign Setup', description: 'Create multiple campaigns at once from an uploaded document with campaign plan data', icon: 'zap', isDefault: true },
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

  // Generate a skill from raw text using AI
  const generateSkill = useCallback(async (rawText) => {
    const { data } = await api.post('/skills/generate', { rawText });
    return data; // { name, description, content, preview }
  }, []);

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
    generateSkill,
    getSkillContext,
    getSkillContextById,
    fetchSkills,
  };
};
