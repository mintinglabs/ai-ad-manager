import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, RefreshCw, ChevronRight, ChevronDown, Image as ImageIcon, Loader2, Sparkles, X, Send, Pause, Play, Trash2, BarChart3, Layers } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

// ── Platform Icons ──
const MetaIcon = () => <img src="/meta-icon.svg" alt="Meta" className="w-4 h-4 shrink-0" />;
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
);
const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.46V13a8.28 8.28 0 005.58 2.17V11.7a4.84 4.84 0 01-3.77-1.81V6.69h3.77z"/></svg>
);

// ── Column definitions with format and API field mapping ──
const ALL_COLUMNS = [
  // Basic
  { id: 'status', label: 'Status', group: 'Basic', format: 'text' },
  { id: 'budget', label: 'Budget', group: 'Basic', format: 'budget' },
  { id: 'objective', label: 'Objective', group: 'Basic', format: 'objective' },
  // Performance
  { id: 'spent', label: 'Amount spent', group: 'Performance', format: 'currency', apiField: 'spend' },
  { id: 'results', label: 'Results', group: 'Performance', format: 'action', actionKey: 'primary' },
  { id: 'cpa', label: 'Cost per result', group: 'Performance', format: 'currency', actionKey: 'cost_primary' },
  { id: 'roas', label: 'ROAS', group: 'Performance', format: 'roas' },
  { id: 'purchase_roas', label: 'Purchase ROAS', group: 'Performance', format: 'roas_array', apiField: 'purchase_roas' },
  { id: 'conversions', label: 'Conversions', group: 'Performance', format: 'action', actionKey: 'primary' },
  { id: 'conv_value', label: 'Conv. Value', group: 'Performance', format: 'currency', actionKey: 'value_primary' },
  // Delivery
  { id: 'impressions', label: 'Impressions', group: 'Delivery', format: 'number', apiField: 'impressions' },
  { id: 'reach', label: 'Reach', group: 'Delivery', format: 'number', apiField: 'reach' },
  { id: 'frequency', label: 'Frequency', group: 'Delivery', format: 'decimal', apiField: 'frequency' },
  { id: 'social_spend', label: 'Social Spend', group: 'Delivery', format: 'currency', apiField: 'social_spend' },
  // Clicks
  { id: 'clicks', label: 'Clicks (All)', group: 'Clicks', format: 'number', apiField: 'clicks' },
  { id: 'ctr', label: 'CTR (All)', group: 'Clicks', format: 'percent', apiField: 'ctr' },
  { id: 'cpc', label: 'CPC (All)', group: 'Clicks', format: 'currency', apiField: 'cpc' },
  { id: 'link_clicks', label: 'Link Clicks', group: 'Clicks', format: 'action', actionKey: 'link_click' },
  { id: 'unique_clicks', label: 'Unique Clicks', group: 'Clicks', format: 'number', apiField: 'unique_clicks' },
  { id: 'unique_ctr', label: 'Unique CTR', group: 'Clicks', format: 'percent', apiField: 'unique_ctr' },
  { id: 'cost_per_unique_click', label: 'Cost / Unique Click', group: 'Clicks', format: 'currency', apiField: 'cost_per_unique_click' },
  { id: 'inline_link_clicks', label: 'Inline Link Clicks', group: 'Clicks', format: 'number', apiField: 'inline_link_clicks' },
  { id: 'inline_link_click_ctr', label: 'Inline Link CTR', group: 'Clicks', format: 'percent', apiField: 'inline_link_click_ctr' },
  { id: 'cost_per_inline_link_click', label: 'Cost / Inline Link Click', group: 'Clicks', format: 'currency', apiField: 'cost_per_inline_link_click' },
  { id: 'outbound_clicks', label: 'Outbound Clicks', group: 'Clicks', format: 'outbound', apiField: 'outbound_clicks' },
  { id: 'cost_per_outbound_click', label: 'Cost / Outbound Click', group: 'Clicks', format: 'outbound_cost', apiField: 'cost_per_outbound_click' },
  // Cost
  { id: 'cpm', label: 'CPM', group: 'Cost', format: 'currency', apiField: 'cpm' },
  // Video
  { id: 'video_views', label: 'ThruPlays', group: 'Video', format: 'video_action', apiField: 'video_thruplay_watched_actions' },
  { id: 'cost_per_thruplay', label: 'Cost / ThruPlay', group: 'Video', format: 'cost_action', actionKey: 'video_view' },
  { id: 'video_p25', label: 'Video 25%', group: 'Video', format: 'video_metric', apiField: 'video_p25_watched_actions' },
  { id: 'video_p50', label: 'Video 50%', group: 'Video', format: 'video_metric', apiField: 'video_p50_watched_actions' },
  { id: 'video_p75', label: 'Video 75%', group: 'Video', format: 'video_metric', apiField: 'video_p75_watched_actions' },
  { id: 'video_p95', label: 'Video 95%', group: 'Video', format: 'video_metric', apiField: 'video_p95_watched_actions' },
  { id: 'video_p100', label: 'Video 100%', group: 'Video', format: 'video_metric', apiField: 'video_p100_watched_actions' },
  // Quality
  { id: 'quality_ranking', label: 'Quality Ranking', group: 'Quality', format: 'text', apiField: 'quality_ranking' },
  { id: 'engagement_rate_ranking', label: 'Engagement Rate Ranking', group: 'Quality', format: 'text', apiField: 'engagement_rate_ranking' },
  { id: 'conversion_rate_ranking', label: 'Conversion Rate Ranking', group: 'Quality', format: 'text', apiField: 'conversion_rate_ranking' },
];

const COLUMN_MAP = Object.fromEntries(ALL_COLUMNS.map(c => [c.id, c]));

// ── Metric Templates (Meta-style presets) ──
const BUILT_IN_TEMPLATES = [
  { id: 'performance', label: 'Performance', cols: ['status', 'budget', 'spent', 'results', 'cpa', 'roas', 'impressions', 'reach'] },
  { id: 'performance_clicks', label: 'Performance & Clicks', cols: ['status', 'budget', 'spent', 'results', 'clicks', 'cpc', 'ctr', 'link_clicks', 'unique_clicks'] },
  { id: 'engagement', label: 'Engagement', cols: ['status', 'budget', 'spent', 'impressions', 'reach', 'clicks', 'ctr', 'results', 'frequency'] },
  { id: 'delivery', label: 'Delivery', cols: ['status', 'budget', 'spent', 'impressions', 'reach', 'frequency', 'cpm', 'social_spend'] },
  { id: 'video', label: 'Video Engagement', cols: ['status', 'budget', 'spent', 'video_views', 'cost_per_thruplay', 'video_p25', 'video_p50', 'video_p100'] },
  { id: 'setup', label: 'Setup', cols: ['status', 'budget', 'objective'] },
];

// Load/save custom templates from localStorage
const getCustomTemplates = () => {
  try { return JSON.parse(localStorage.getItem('aam_metric_templates') || '[]'); } catch { return []; }
};
const saveCustomTemplates = (templates) => localStorage.setItem('aam_metric_templates', JSON.stringify(templates));

// ── Breakdown definitions ──
const BREAKDOWNS = [
  { id: 'none', label: 'No Breakdown', group: null },
  { id: 'age', label: 'Age', group: 'Demographic', apiValue: 'age' },
  { id: 'gender', label: 'Gender', group: 'Demographic', apiValue: 'gender' },
  { id: 'country', label: 'Country', group: 'Delivery', apiValue: 'country' },
  { id: 'publisher_platform', label: 'Platform', group: 'Delivery', apiValue: 'publisher_platform' },
  { id: 'platform_position', label: 'Placement', group: 'Delivery', apiValue: 'platform_position' },
  { id: 'device_platform', label: 'Device', group: 'Delivery', apiValue: 'device_platform' },
  { id: 'hourly_stats_aggregated_by_advertiser_time_zone', label: 'Time of Day', group: 'Time', apiValue: 'hourly_stats_aggregated_by_advertiser_time_zone' },
];

// Objective display formatting
const OBJECTIVE_LABELS = {
  'OUTCOME_SALES': 'Sales', 'OUTCOME_LEADS': 'Leads', 'OUTCOME_TRAFFIC': 'Traffic',
  'OUTCOME_ENGAGEMENT': 'Engagement', 'OUTCOME_AWARENESS': 'Awareness', 'OUTCOME_APP_PROMOTION': 'App Promotion',
  'CONVERSIONS': 'Conversions', 'LEAD_GENERATION': 'Leads', 'LINK_CLICKS': 'Traffic',
  'MESSAGES': 'Messages', 'PRODUCT_CATALOG_SALES': 'Sales', 'POST_ENGAGEMENT': 'Engagement',
  'VIDEO_VIEWS': 'Video Views', 'REACH': 'Reach', 'BRAND_AWARENESS': 'Awareness', 'APP_INSTALLS': 'App Installs',
};
const OBJECTIVE_COLORS = {
  'Sales': 'bg-emerald-50 text-emerald-600', 'Leads': 'bg-blue-50 text-blue-600', 'Traffic': 'bg-cyan-50 text-cyan-600',
  'Engagement': 'bg-violet-50 text-violet-600', 'Awareness': 'bg-amber-50 text-amber-600', 'App Promotion': 'bg-pink-50 text-pink-600',
  'Conversions': 'bg-emerald-50 text-emerald-600', 'Messages': 'bg-indigo-50 text-indigo-600',
  'Video Views': 'bg-purple-50 text-purple-600', 'Reach': 'bg-amber-50 text-amber-600', 'App Installs': 'bg-pink-50 text-pink-600',
};
const fmtObjective = (obj) => OBJECTIVE_LABELS[obj] || obj?.replace(/_/g, ' ') || '';

// ── Helpers ──
const fmtNum = (n) => n != null ? Number(n).toLocaleString() : '—';
const fmtCurrency = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtPct = (n) => n != null ? `${Number(n).toFixed(2)}%` : '—';
const fmtBudget = (daily, lifetime) => {
  if (daily) return { amount: `$${(Number(daily) / 100).toFixed(2)}`, type: 'Daily' };
  if (lifetime) return { amount: `$${(Number(lifetime) / 100).toFixed(2)}`, type: 'Lifetime' };
  return { amount: 'Using ad set budget', type: null };
};

// Map campaign objective to the primary result metric.
// `actionTypes` is a priority list — try each in order until one is found in the data.
// `source` determines where to look: 'actions', 'thruplay', or 'reach'.
const OBJECTIVE_ACTION_MAP = {
  'OUTCOME_SALES':         { actionTypes: ['offsite_conversion.fb_pixel_purchase', 'web_in_store_purchase', 'omni_purchase', 'purchase'], label: 'Purchases', source: 'actions' },
  'OUTCOME_LEADS':         { actionTypes: ['lead', 'leadgen_grouped', 'onsite_conversion.lead_grouped'], label: 'Leads', source: 'actions' },
  'OUTCOME_ENGAGEMENT':    { actionTypes: ['landing_page_view', 'link_click', 'post_engagement'], label: 'Landing Page Views', source: 'actions' },
  'OUTCOME_AWARENESS':     { actionTypes: ['video_view'], label: 'ThruPlays', source: 'thruplay' },
  'OUTCOME_TRAFFIC':       { actionTypes: ['link_click', 'landing_page_view'], label: 'Link Clicks', source: 'actions' },
  'OUTCOME_APP_PROMOTION': { actionTypes: ['app_install', 'mobile_app_install'], label: 'App Installs', source: 'actions' },
  'CONVERSIONS':           { actionTypes: ['offsite_conversion.fb_pixel_purchase', 'web_in_store_purchase', 'omni_purchase'], label: 'Purchases', source: 'actions' },
  'LEAD_GENERATION':       { actionTypes: ['lead', 'leadgen_grouped'], label: 'Leads', source: 'actions' },
  'LINK_CLICKS':           { actionTypes: ['link_click'], label: 'Link Clicks', source: 'actions' },
  'POST_ENGAGEMENT':       { actionTypes: ['post_engagement'], label: 'Post Engagements', source: 'actions' },
  'VIDEO_VIEWS':           { actionTypes: ['video_view'], label: 'ThruPlays', source: 'thruplay' },
  'REACH':                 { actionTypes: [], label: 'Reach', source: 'reach' },
  'BRAND_AWARENESS':       { actionTypes: ['video_view'], label: 'ThruPlays', source: 'thruplay' },
  'APP_INSTALLS':          { actionTypes: ['app_install'], label: 'App Installs', source: 'actions' },
  'MESSAGES':              { actionTypes: ['onsite_conversion.messaging_conversation_started_7d', 'onsite_conversion.total_messaging_connection'], label: 'Messaging Conversations', source: 'actions' },
  'PRODUCT_CATALOG_SALES': { actionTypes: ['offsite_conversion.fb_pixel_purchase', 'omni_purchase'], label: 'Purchases', source: 'actions' },
};

const getResultLabel = (objective) => OBJECTIVE_ACTION_MAP[objective]?.label || 'Results';

// Find the first matching action from a priority list
const findAction = (actionsArr, actionTypes) => {
  for (const at of actionTypes) {
    const found = actionsArr.find(a => a.action_type === at);
    if (found) return found;
  }
  return null;
};

// ── Data-driven metric extraction ──
const extractMetrics = (item) => {
  const ins = item.insights?.data?.[0] || {};
  const actions = ins.actions || [];
  const actionValues = ins.action_values || [];
  const costPerAction = ins.cost_per_action_type || [];
  const thruplayActions = ins.video_thruplay_watched_actions || [];
  const costPerThruplayArr = ins.cost_per_thruplay || [];

  const objective = item.objective;
  const mapped = OBJECTIVE_ACTION_MAP[objective];

  // Determine primary result, cost per result, and conversion value
  let resultCount = null;
  let resultCost = null;
  let resultValueAmt = null;

  if (mapped?.source === 'thruplay') {
    // ThruPlays from dedicated video_thruplay_watched_actions field
    const tp = thruplayActions.find(a => a.action_type === 'video_view') || thruplayActions[0];
    const cpt = costPerThruplayArr.find(a => a.action_type === 'video_view') || costPerThruplayArr[0];
    resultCount = tp?.value;
    resultCost = cpt?.value;
  } else if (mapped?.source === 'reach') {
    // Reach objective: result = reach, cost per result = spend / reach
    resultCount = ins.reach;
    resultCost = ins.reach && ins.spend ? (Number(ins.spend) / Number(ins.reach)) : null;
  } else if (mapped?.actionTypes?.length) {
    // Actions-based: find first matching action type from priority list (do NOT fallback to actions[0])
    const resultAction = findAction(actions, mapped.actionTypes);
    if (resultAction) {
      resultCount = resultAction.value;
      const cpa = costPerAction.find(a => a.action_type === resultAction.action_type);
      resultCost = cpa?.value;
      const rv = actionValues.find(a => a.action_type === resultAction.action_type);
      resultValueAmt = rv?.value;
    }
  }

  const linkClicks = actions.find(a => a.action_type === 'link_click');

  // Build metrics object from raw insights
  const m = {};

  // Direct API fields
  for (const col of ALL_COLUMNS) {
    if (col.apiField && ins[col.apiField] != null) {
      const raw = ins[col.apiField];
      if (col.format === 'currency') m[col.id] = fmtCurrency(raw);
      else if (col.format === 'number') m[col.id] = fmtNum(raw);
      else if (col.format === 'percent') m[col.id] = fmtPct(raw);
      else if (col.format === 'decimal') m[col.id] = Number(raw).toFixed(2);
      else if (col.format === 'text') m[col.id] = raw;
      else if (col.format === 'roas_array') {
        if (Array.isArray(raw) && raw.length > 0) m[col.id] = Number(raw[0].value).toFixed(2) + 'x';
        else m[col.id] = '—';
      }
      else if (col.format === 'video_action' || col.format === 'video_metric') {
        if (Array.isArray(raw) && raw.length > 0) m[col.id] = fmtNum(raw[0].value);
        else m[col.id] = '—';
      }
      else if (col.format === 'outbound') {
        if (Array.isArray(raw) && raw.length > 0) m[col.id] = fmtNum(raw[0].value);
        else m[col.id] = '—';
      }
      else if (col.format === 'outbound_cost') {
        if (Array.isArray(raw) && raw.length > 0) m[col.id] = fmtCurrency(raw[0].value);
        else m[col.id] = '—';
      }
    }
  }

  // Primary result metrics (objective-aware, no fallback to wrong actions)
  // Store both value and sub-label (like Meta's UI: value on top, label below)
  const resultLabel = mapped?.label || 'Results';
  const costLabel = mapped?.source === 'thruplay' ? 'Cost per ThruPlay'
    : mapped?.source === 'reach' ? 'Cost per Reach'
    : resultLabel ? `Cost per ${resultLabel.replace(/s$/, '')}` : 'Cost per Result';

  m.results = resultCount ? fmtNum(resultCount) : '—';
  m._resultsLabel = resultLabel;
  m.cpa = resultCost ? fmtCurrency(resultCost) : '—';
  m._cpaLabel = costLabel;
  m.conversions = resultCount ? fmtNum(resultCount) : '—';
  m.conv_value = resultValueAmt ? fmtCurrency(resultValueAmt) : '—';

  // ROAS: use purchase_roas from API (the official Meta field)
  if (ins.purchase_roas && Array.isArray(ins.purchase_roas) && ins.purchase_roas.length > 0) {
    m.roas = Number(ins.purchase_roas[0].value).toFixed(2) + 'x';
  } else {
    m.roas = '—';
  }

  // Link clicks from actions array
  m.link_clicks = linkClicks ? fmtNum(linkClicks.value) : '—';

  // Cost per thruplay from dedicated field
  const cptEntry = costPerThruplayArr.find(a => a.action_type === 'video_view') || costPerThruplayArr[0];
  m.cost_per_thruplay = cptEntry ? fmtCurrency(cptEntry.value) : '—';

  // Fill any remaining columns that weren't set
  for (const col of ALL_COLUMNS) {
    if (!(col.id in m)) m[col.id] = '—';
  }
  return m;
};

const mapStatus = (s, es) => {
  if (s === 'PAUSED' || es === 'PAUSED' || es === 'CAMPAIGN_PAUSED' || es === 'ADSET_PAUSED') return 'Paused';
  if (es === 'WITH_ISSUES') return 'Error';
  if (s === 'ACTIVE') return 'Active';
  return s?.charAt(0) + s?.slice(1).toLowerCase() || 'Unknown';
};

// ── Status dot ──
const StatusDot = ({ status }) => {
  const colors = { Active: 'bg-emerald-500', Learning: 'bg-amber-400', Paused: 'bg-slate-300', Error: 'bg-red-500' };
  return <span className={`w-2 h-2 rounded-full ${colors[status] || 'bg-slate-300'} shrink-0`} />;
};

// ── Toggle ──
const Toggle = ({ active, onChange, loading }) => (
  <button onClick={(e) => { e.stopPropagation(); if (!loading) onChange(!active); }}
    disabled={loading}
    className={`w-8 h-[18px] rounded-full transition-colors duration-200 relative ${loading ? 'opacity-50' : ''} ${active ? 'bg-orange-500' : 'bg-slate-200'}`}>
    <span className={`absolute top-[2px] left-[2px] w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${active ? 'translate-x-[14px]' : ''}`} />
  </button>
);

// ── Budget editor ──
const BudgetEditor = ({ value, onSave, onCancel }) => {
  const [draft, setDraft] = useState(value?.replace(/[^0-9.]/g, '') || '');
  return (
    <div className="absolute top-full left-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-52" onClick={e => e.stopPropagation()}>
      <p className="text-[10px] text-slate-400 font-medium mb-1.5">Daily Budget</p>
      <div className="flex items-center gap-1.5">
        <span className="text-sm text-slate-400">$</span>
        <input autoFocus type="number" value={draft} onChange={e => setDraft(e.target.value)}
          className="flex-1 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          onKeyDown={e => { if (e.key === 'Enter') onSave(draft); if (e.key === 'Escape') onCancel(); }} />
        <span className="text-[11px] text-slate-400">/day</span>
      </div>
      <div className="flex justify-end gap-1.5 mt-2">
        <button onClick={onCancel} className="px-2.5 py-1 text-[11px] text-slate-500 hover:bg-slate-50 rounded-md">Cancel</button>
        <button onClick={() => onSave(draft)} className="px-2.5 py-1 text-[11px] text-white bg-blue-500 hover:bg-blue-600 rounded-md font-medium">Update</button>
      </div>
    </div>
  );
};

// ── Column Picker (for Custom template) ──
const ColumnPicker = ({ columns, onSetColumns, onClose }) => {
  const [selected, setSelected] = useState(new Set(columns));
  const [customTemplates, setCustomTemplates] = useState(getCustomTemplates);
  const [savingName, setSavingName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const grouped = useMemo(() => {
    const g = {};
    ALL_COLUMNS.forEach(c => { (g[c.group] = g[c.group] || []).push(c); });
    return g;
  }, []);
  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const handleSaveTemplate = () => {
    if (!savingName.trim()) return;
    const newTemplate = { id: `custom_${Date.now()}`, label: savingName.trim(), cols: [...selected] };
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
    setSavingName('');
    setShowSave(false);
  };

  const handleDeleteTemplate = (id) => {
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    saveCustomTemplates(updated);
  };

  return (
    <div className="absolute top-full right-0 mt-1 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 w-96 overflow-hidden" onClick={e => e.stopPropagation()}>
      {/* My templates */}
      {customTemplates.length > 0 && (
        <div className="px-4 pt-3 pb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">My Templates</p>
          <div className="flex flex-wrap gap-1.5">
            {customTemplates.map(t => (
              <div key={t.id} className="flex items-center gap-0.5">
                <button onClick={() => setSelected(new Set(t.cols))}
                  className={`px-3 py-1.5 text-[11px] font-medium rounded-l-lg border transition-all
                    ${[...selected].join(',') === t.cols.join(',') ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
                  {t.label}
                </button>
                <button onClick={() => handleDeleteTemplate(t.id)}
                  className="px-1 py-1.5 text-[11px] rounded-r-lg border border-l-0 border-slate-200 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="px-4 py-3 max-h-[320px] overflow-y-auto border-t border-slate-100">
        {Object.entries(grouped).map(([group, cols]) => (
          <div key={group} className="mb-3 last:mb-0">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">{group}</p>
            <div className="flex flex-wrap gap-1.5">
              {cols.map(col => (
                <button key={col.id} onClick={() => toggle(col.id)}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all
                    ${selected.has(col.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  {col.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50">
        {showSave ? (
          <div className="flex items-center gap-2 mb-2">
            <input autoFocus value={savingName} onChange={e => setSavingName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSaveTemplate(); if (e.key === 'Escape') setShowSave(false); }}
              placeholder="Template name..."
              className="flex-1 px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
            <button onClick={handleSaveTemplate} className="px-2.5 py-1.5 text-[11px] text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium">Save</button>
            <button onClick={() => setShowSave(false)} className="px-2 py-1.5 text-[11px] text-slate-400 hover:text-slate-600">
              <X size={12} />
            </button>
          </div>
        ) : null}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">{selected.size} columns</span>
            {!showSave && (
              <button onClick={() => setShowSave(true)} className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">
                Save as Template
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={() => { onSetColumns([...selected]); onClose(); }}
              className="px-3 py-1.5 text-[11px] text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium shadow-sm">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Cell value ──
const CellValue = ({ value, subLabel }) => (
  <div>
    <span className={`text-[12px] tabular-nums ${!value || value === '—' ? 'text-slate-300' : 'text-slate-600'}`}>{value || '—'}</span>
    {subLabel && value && value !== '—' && (
      <p className="text-[9px] text-slate-400 mt-0.5">{subLabel}</p>
    )}
  </div>
);

// ── Bulk action bar ──
const BulkActionBar = ({ count, onPause, onActivate, onDelete, onAskAI, onClear }) => (
  <div className="flex items-center gap-3 px-6 py-2.5 bg-blue-600 text-white">
    <span className="text-[12px] font-semibold">{count} selected</span>
    <div className="flex items-center gap-1.5 ml-4">
      <button onClick={onActivate} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
        <Play size={12} /> Activate
      </button>
      <button onClick={onPause} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
        <Pause size={12} /> Pause
      </button>
      <button onClick={onDelete} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white/20 hover:bg-red-500/60 rounded-lg transition-colors">
        <Trash2 size={12} /> Delete
      </button>
      <button onClick={onAskAI} className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
        <Sparkles size={12} /> Ask AI
      </button>
    </div>
    <button onClick={onClear} className="ml-auto text-white/70 hover:text-white transition-colors">
      <X size={16} />
    </button>
  </div>
);

// ── Ask AI Agent popup ──
const AskAIPopup = ({ onSubmit, onClose, selectedIds, level }) => {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const handleSubmit = () => {
    if (!text.trim()) return;
    const prefix = selectedIds?.length
      ? `[Selected ${level}s: ${selectedIds.join(', ')}]\n`
      : '';
    onSubmit(prefix + text.trim());
    onClose();
  };
  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="relative flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
          <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
          <div className="relative flex items-center gap-2">
            <Sparkles size={16} className="text-orange-400" />
            <h3 className="text-sm font-bold text-white">Ask AI Agent</h3>
            {selectedIds?.length > 0 && (
              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full font-medium">{selectedIds.length} selected</span>
            )}
          </div>
          <button onClick={onClose} className="relative w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
        <div className="p-5 bg-white/95 backdrop-blur-xl">
          <p className="text-[12px] text-slate-400 mb-3">What would you like the AI agent to do?</p>
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            placeholder="e.g. Pause all campaigns with CPA above $100, Scale budget by 15% for top performers..."
            className="w-full h-24 text-sm text-slate-700 border border-slate-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 placeholder:text-slate-300"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={!text.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:shadow-orange-500/50 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            <Send size={12} /> Send to AI
          </button>
        </div>
      </div>
    </>
  );
};

// ── Google Campaigns Panel ──
const GoogleCampaignsPanel = ({ googleCustomerId, onOpenSettings }) => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!googleCustomerId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/google/campaigns?accountId=${googleCustomerId}&dateRange=LAST_30_DAYS`)
      .then(r => r.json())
      .then(data => { if (data.error) throw new Error(data.error); setCampaigns(data.campaigns || []); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [googleCustomerId]);

  if (!googleCustomerId) return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center text-xl font-bold text-red-500">G</div>
      <p className="text-sm font-semibold text-slate-700">Connect Google Ads</p>
      <p className="text-xs text-slate-400">Go to Settings → Account to connect your Google Ads account.</p>
      <button onClick={onOpenSettings} className="text-xs font-medium px-4 py-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">Open Settings</button>
    </div>
  );

  if (loading) return <div className="flex-1 flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-slate-400" /><span className="ml-2 text-sm text-slate-400">Loading campaigns…</span></div>;
  if (error) return <div className="flex-1 flex items-center justify-center py-20 text-sm text-red-500">{error}</div>;

  return (
    <div className="flex-1 overflow-auto px-6 py-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              {['Campaign', 'Status', 'Budget/day', 'Clicks', 'Spend', 'ROAS', 'Conversions'].map(h => (
                <th key={h} className="text-left py-2.5 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {campaigns.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-slate-400">No campaigns found</td></tr>
            ) : campaigns.map(c => (
              <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="py-2.5 px-3 text-[13px] font-medium text-slate-800 max-w-[240px] truncate">{c.name}</td>
                <td className="py-2.5 px-3">
                  <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                    <span className={`w-1 h-1 rounded-full ${c.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />{c.status}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-[13px] text-slate-600">{c.dailyBudget ? `$${c.dailyBudget.toFixed(2)}` : '—'}</td>
                <td className="py-2.5 px-3 text-[13px] text-slate-600">{c.clicks?.toLocaleString() ?? '—'}</td>
                <td className="py-2.5 px-3 text-[13px] text-slate-600">{c.spend != null ? `$${c.spend.toFixed(2)}` : '—'}</td>
                <td className="py-2.5 px-3 text-[13px] text-slate-600">{c.roas != null ? c.roas.toFixed(2) : '—'}</td>
                <td className="py-2.5 px-3 text-[13px] text-slate-600">{c.conversions ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ── Main Component ──
export const CampaignManager = ({ adAccountId, onBack, onSendToChat, onPrefillChat, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, googleCustomerId, onOpenSettings }) => {
  const [platform, setPlatform] = useState('meta');
  const [showAskAI, setShowAskAI] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTemplate, setActiveTemplate] = useState('performance');
  const [columns, setColumns] = useState(BUILT_IN_TEMPLATES[0].cols);
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [sortKey, setSortKey] = useState('spent');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [updatingIds, setUpdatingIds] = useState(new Set());

  // Breakdown
  const [breakdown, setBreakdown] = useState('none');
  const [breakdownData, setBreakdownData] = useState({}); // { [campaignId]: [...rows] }
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [expandedBreakdowns, setExpandedBreakdowns] = useState(new Set());
  const breakdownRef = useRef(null);
  const [showBreakdownDropdown, setShowBreakdownDropdown] = useState(false);

  // Tab-based navigation
  const [activeTab, setActiveTab] = useState('campaigns');
  const [checkedCampaignIds, setCheckedCampaignIds] = useState([]);
  const [checkedAdSetIds, setCheckedAdSetIds] = useState([]);

  // Date range
  const [datePreset, setDatePreset] = useState('last_7d');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Data
  const [campaigns, setCampaigns] = useState([]);
  const [adSets, setAdSets] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Client-side pagination (20 per page)
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (breakdownRef.current && !breakdownRef.current.contains(e.target)) setShowBreakdownDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Normalize — pass objective down to ad sets/ads so extractMetrics knows the result type
  const normCampaign = (c) => ({ ...c, _active: c.status === 'ACTIVE', _status: mapStatus(c.status, c.effective_status), _budget: fmtBudget(c.daily_budget, c.lifetime_budget), _metrics: extractMetrics(c), _level: 'campaign', _resultLabel: getResultLabel(c.objective) });
  const normAdSet = (as, objective) => {
    const withObj = objective ? { ...as, objective } : as;
    return { ...withObj, _active: as.status === 'ACTIVE', _status: mapStatus(as.status, as.effective_status), _budget: fmtBudget(as.daily_budget, as.lifetime_budget), _metrics: extractMetrics(withObj), _level: 'adset', _campaignName: as._campaignName, _resultLabel: getResultLabel(objective || as.objective) };
  };
  const normAd = (ad, objective) => {
    const withObj = objective ? { ...ad, objective } : ad;
    return { ...withObj, _active: ad.status === 'ACTIVE', _status: mapStatus(ad.status, ad.effective_status), _budget: { amount: '—', type: null }, _metrics: extractMetrics(withObj), _level: 'ad', thumbnail: ad.creative?.thumbnail_url || ad.creative?.image_url || null, _resultLabel: getResultLabel(objective || ad.objective) };
  };

  // Fetch ALL campaigns (auto-paginate through all pages)
  const fetchCampaigns = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true); setError(null); setPage(1);
    try {
      let allItems = [];
      let after = null;
      do {
        const params = { limit: 100, date_preset: datePreset };
        if (after) params.after = after;
        const { data } = await api.get(`/meta/adaccounts/${adAccountId}/campaigns-tree`, { params });
        const items = (data.data || []).map(normCampaign);
        allItems = [...allItems, ...items];
        after = data.paging?.cursors?.after;
        if (!data.paging?.next) after = null;
      } while (after);
      setCampaigns(allItems);
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, datePreset]);

  // Fetch ALL ad sets for a campaign
  const fetchAdSets = useCallback(async (campaignId) => {
    if (!campaignId) return;
    setLoading(true); setError(null); setPage(1);
    try {
      const campaign = campaigns.find(c => c.id === campaignId);
      let allItems = [];
      let after = null;
      do {
        const params = { limit: 100, date_preset: datePreset };
        if (after) params.after = after;
        const { data } = await api.get(`/meta/campaigns/${campaignId}/adsets`, { params });
        const items = (data.data || []).map(as => normAdSet({ ...as, _campaignName: campaign?.name }, campaign?.objective));
        allItems = [...allItems, ...items];
        after = data.paging?.cursors?.after;
        if (!data.paging?.next) after = null;
      } while (after);
      setAdSets(allItems);
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [campaigns, datePreset]);

  // Fetch ALL ads for an ad set
  const fetchAds = useCallback(async (adSetId) => {
    if (!adSetId) return;
    setLoading(true); setError(null); setPage(1);
    try {
      const adSet = adSets.find(a => a.id === adSetId);
      let allItems = [];
      let after = null;
      do {
        const params = { limit: 100, date_preset: datePreset };
        if (after) params.after = after;
        const { data } = await api.get(`/meta/adsets/${adSetId}/ads`, { params });
        const items = (data.data || []).map(ad => normAd(ad, adSet?.objective));
        allItems = [...allItems, ...items];
        after = data.paging?.cursors?.after;
        if (!data.paging?.next) after = null;
      } while (after);
      setAds(allItems);
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, [datePreset, adSets]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);


  // Helper: fetch ad sets for multiple campaign IDs in parallel
  const fetchAdSetsMulti = useCallback(async (campaignIds) => {
    if (!campaignIds.length) return;
    setLoading(true); setError(null);
    try {
      const results = await Promise.all(campaignIds.map(id =>
        api.get(`/meta/campaigns/${id}/adsets`, { params: { limit: 100, date_preset: datePreset } }).then(r => r.data)
      ));
      const allItems = results.flatMap((r, i) => {
        const campaign = campaigns.find(c => c.id === campaignIds[i]);
        return (r.data || r || []).map(as => normAdSet(as, campaign?.objective));
      });
      setAdSets(allItems);
      // all loaded
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally { setLoading(false); }
  }, [datePreset]);

  // Helper: fetch ads for multiple ad set IDs in parallel
  const fetchAdsMulti = useCallback(async (adSetIds) => {
    if (!adSetIds.length) return;
    setLoading(true); setError(null);
    try {
      const results = await Promise.all(adSetIds.map(id =>
        api.get(`/meta/adsets/${id}/ads`, { params: { limit: 100, date_preset: datePreset } }).then(r => r.data)
      ));
      const allItems = results.flatMap((r, i) => {
        const adSet = adSets.find(a => a.id === adSetIds[i]);
        return (r.data || r || []).map(ad => normAd(ad, adSet?.objective));
      });
      setAds(allItems);
      // all loaded
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally { setLoading(false); }
  }, [datePreset]);

  // Navigate to ad sets by clicking a single campaign name
  const drillIntoCampaign = useCallback((campaign) => {
    setCheckedCampaignIds([campaign.id]);
    setCheckedAdSetIds([]);
    setActiveTab('adsets');
    setSelectedIds(new Set());
    setSearch('');
    fetchAdSets(campaign.id);
  }, [fetchAdSets]);

  // Navigate to ads by clicking a single ad set name
  const drillIntoAdSet = useCallback((adSet) => {
    setCheckedAdSetIds([adSet.id]);
    setActiveTab('ads');
    setSelectedIds(new Set());
    setSearch('');
    fetchAds(adSet.id);
  }, [fetchAds]);

  // Tab click handler
  const handleTabClick = useCallback((tab) => {
    setSearch('');
    if (tab === 'campaigns') {
      setActiveTab('campaigns');
      setCheckedCampaignIds([]);
      setCheckedAdSetIds([]);
      setSelectedIds(new Set());
      fetchCampaigns();
    } else if (tab === 'adsets') {
      const ids = [...selectedIds];
      setCheckedCampaignIds(ids);
      setCheckedAdSetIds([]);
      setActiveTab('adsets');
      setSelectedIds(new Set());
      if (ids.length > 0) fetchAdSetsMulti(ids);
      else {
        setLoading(true); setError(null);
        api.get(`/meta/adaccounts/${adAccountId}/adsets`, { params: { limit: 200, date_preset: datePreset } })
          .then(({ data }) => { setAdSets((data.data || data || []).map(as => normAdSet(as))); })
          .catch(err => setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message))
          .finally(() => setLoading(false));
      }
    } else if (tab === 'ads') {
      const ids = [...selectedIds];
      setCheckedAdSetIds(ids);
      setActiveTab('ads');
      setSelectedIds(new Set());
      if (ids.length > 0) fetchAdsMulti(ids);
      else {
        setLoading(true); setError(null);
        api.get(`/meta/adaccounts/${adAccountId}/ads`, { params: { limit: 200, date_preset: datePreset } })
          .then(({ data }) => { setAds((data.data || data || []).map(normAd)); })
          .catch(err => setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message))
          .finally(() => setLoading(false));
      }
    }
  }, [selectedIds, adAccountId, datePreset, fetchCampaigns, fetchAdSetsMulti, fetchAdsMulti]);

  // Reset page when tab/filter changes
  useEffect(() => { setPage(1); }, [activeTab, statusFilter, search]);

  // Current data based on active tab
  const currentData = activeTab === 'campaigns' ? campaigns : activeTab === 'adsets' ? adSets : ads;

  // Fetch breakdown data per visible item
  useEffect(() => {
    if (breakdown === 'none' || !adAccountId) {
      setBreakdownData({});
      setExpandedBreakdowns(new Set());
      return;
    }
    const bd = BREAKDOWNS.find(b => b.id === breakdown);
    if (!bd?.apiValue) return;
    if (!currentData.length) return;

    const itemIds = currentData.map(it => it.id);
    setBreakdownLoading(true);
    const fields = 'spend,impressions,clicks,ctr,cpm,cpc,reach,frequency,actions,action_values,cost_per_action_type,purchase_roas,unique_clicks,unique_ctr,video_thruplay_watched_actions,cost_per_thruplay';

    Promise.all(itemIds.map(id =>
      api.get(`/insights/${id}`, {
        params: { fields, breakdowns: bd.apiValue, date_preset: datePreset, limit: 50 }
      }).then(r => {
        const rows = Array.isArray(r.data) ? r.data : r.data?.data || [];
        return { id, rows };
      }).catch(() => ({ id, rows: [] }))
    )).then(results => {
      const grouped = {};
      results.forEach(({ id, rows }) => {
        if (rows.length > 0) grouped[id] = rows;
      });
      setBreakdownData(grouped);
      setExpandedBreakdowns(new Set(Object.keys(grouped)));
    }).catch(err => {
      console.error('Breakdown fetch error:', err);
      setBreakdownData({});
    }).finally(() => setBreakdownLoading(false));
  }, [breakdown, adAccountId, datePreset, currentData]);

  // ── API calls for status toggle ──
  const toggleActive = useCallback(async (id, val) => {
    const status = val ? 'ACTIVE' : 'PAUSED';
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      const endpoint = activeTab === 'campaigns' ? `/meta/campaigns/${id}`
        : activeTab === 'adsets' ? `/meta/adsets/${id}`
        : `/meta/ads/${id}`;
      await api.patch(endpoint, { status });
      const updater = (items) => items.map(item =>
        item.id === id ? { ...item, _active: val, _status: val ? 'Active' : 'Paused', status } : item
      );
      if (activeTab === 'campaigns') setCampaigns(updater);
      else if (activeTab === 'adsets') setAdSets(updater);
      else setAds(updater);
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [activeTab]);

  // ── API call for budget save ──
  const handleSaveBudget = useCallback(async (id, value) => {
    setEditingBudget(null);
    const cents = Math.round(Number(value) * 100);
    if (!cents || cents <= 0) return;
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      const endpoint = activeTab === 'campaigns' ? `/meta/campaigns/${id}`
        : `/meta/adsets/${id}`;
      await api.patch(endpoint, { daily_budget: cents });
      const updater = (items) => items.map(item =>
        item.id === id ? { ...item, _budget: `$${value}/d`, daily_budget: String(cents) } : item
      );
      if (activeTab === 'campaigns') setCampaigns(updater);
      else setAdSets(updater);
    } catch (err) {
      console.error('Failed to update budget:', err);
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [activeTab]);

  // ── Bulk operations ──
  const bulkUpdateStatus = useCallback(async (status) => {
    const ids = [...selectedIds];
    setUpdatingIds(new Set(ids));
    try {
      await Promise.all(ids.map(id => {
        const ep = activeTab === 'campaigns' ? `/meta/campaigns/${id}`
          : activeTab === 'adsets' ? `/meta/adsets/${id}`
          : `/meta/ads/${id}`;
        return api.patch(ep, { status });
      }));
      const val = status === 'ACTIVE';
      const updater = (items) => items.map(item =>
        selectedIds.has(item.id) ? { ...item, _active: val, _status: val ? 'Active' : 'Paused', status } : item
      );
      if (activeTab === 'campaigns') setCampaigns(updater);
      else if (activeTab === 'adsets') setAdSets(updater);
      else setAds(updater);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk update failed:', err);
    } finally {
      setUpdatingIds(new Set());
    }
  }, [selectedIds, activeTab]);

  const bulkDelete = useCallback(async () => {
    if (!confirm(`Delete ${selectedIds.size} items? This cannot be undone.`)) return;
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => {
        const ep = activeTab === 'campaigns' ? `/meta/campaigns/${id}`
          : activeTab === 'adsets' ? `/meta/adsets/${id}`
          : `/meta/ads/${id}`;
        return api.delete(ep);
      }));
      const updater = (items) => items.filter(item => !selectedIds.has(item.id));
      if (activeTab === 'campaigns') setCampaigns(updater);
      else if (activeTab === 'adsets') setAdSets(updater);
      else setAds(updater);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('Bulk delete failed:', err);
    }
  }, [selectedIds, activeTab]);

  // ── Selection ──
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === currentData.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(currentData.map(d => d.id)));
    }
  }, [currentData, selectedIds]);

  // ── Sort & filter ──
  const handleSort = useCallback((colId) => {
    if (sortKey === colId) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(colId); setSortDir('desc'); }
  }, [sortKey]);

  const parseNumeric = (val) => {
    if (!val || val === '—') return -Infinity;
    const cleaned = String(val).replace(/[^0-9.\-]/g, '');
    return cleaned ? Number(cleaned) : -Infinity;
  };

  const filtered = useMemo(() => {
    let list = currentData.filter(c => {
      if (statusFilter === 'active' && !c._active) return false;
      if (statusFilter === 'paused' && c._active) return false;
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    if (sortKey) {
      list = [...list].sort((a, b) => {
        if (sortKey === 'name') {
          const aVal = a.name?.toLowerCase() || '';
          const bVal = b.name?.toLowerCase() || '';
          return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (sortKey === 'status') {
          return sortDir === 'asc' ? (a._status || '').localeCompare(b._status || '') : (b._status || '').localeCompare(a._status || '');
        }
        const aVal = sortKey === 'budget' ? parseNumeric(a._budget?.amount) : parseNumeric(a._metrics?.[sortKey]);
        const bVal = sortKey === 'budget' ? parseNumeric(b._budget?.amount) : parseNumeric(b._metrics?.[sortKey]);
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [currentData, statusFilter, search, sortKey, sortDir]);

  // Client-side pagination
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const activeCount = currentData.filter(c => c._active).length;
  const pausedCount = currentData.filter(c => !c._active).length;
  const levelLabel = activeTab === 'campaigns' ? 'Campaign' : activeTab === 'adsets' ? 'Ad Set' : 'Ad';

  // Dynamic result label for column headers
  const dynamicResultLabel = useMemo(() => {
    if (activeTab !== 'campaigns' || filtered.length === 0) return null;
    const counts = {};
    filtered.forEach(item => {
      const label = item._resultLabel || 'Results';
      counts[label] = (counts[label] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || null;
  }, [filtered, activeTab]);

  // Template selection handler
  const handleTemplateSelect = (templateId) => {
    setActiveTemplate(templateId);
    if (templateId === 'custom') {
      setShowColumnPicker(true);
    } else {
      const tpl = BUILT_IN_TEMPLATES.find(t => t.id === templateId);
      if (tpl) setColumns(tpl.cols);
    }
  };

  // Get breakdown label for a row
  const getBreakdownLabel = (row) => {
    const bd = BREAKDOWNS.find(b => b.id === breakdown);
    if (!bd?.apiValue) return '';
    return row[bd.apiValue] || row.age || row.gender || row.country || row.publisher_platform || row.platform_position || row.device_platform || '';
  };

  // Format a breakdown row's metrics
  const formatBreakdownMetrics = (row) => {
    const m = {};
    m.spent = row.spend ? fmtCurrency(row.spend) : '—';
    m.impressions = row.impressions ? fmtNum(row.impressions) : '—';
    m.reach = row.reach ? fmtNum(row.reach) : '—';
    m.clicks = row.clicks ? fmtNum(row.clicks) : '—';
    m.ctr = row.ctr ? fmtPct(row.ctr) : '—';
    m.cpm = row.cpm ? fmtCurrency(row.cpm) : '—';
    m.cpc = row.cpc ? fmtCurrency(row.cpc) : '—';
    m.frequency = row.frequency ? Number(row.frequency).toFixed(2) : '—';
    m.unique_clicks = row.unique_clicks ? fmtNum(row.unique_clicks) : '—';
    m.unique_ctr = row.unique_ctr ? fmtPct(row.unique_ctr) : '—';
    // Actions
    const actions = row.actions || [];
    const actionValues = row.action_values || [];
    const costPerAction = row.cost_per_action_type || [];
    const resultAction = actions[0];
    const resultValue = actionValues.find(a => a.action_type === resultAction?.action_type);
    const resultCpa = costPerAction.find(a => a.action_type === resultAction?.action_type);
    m.results = resultAction ? fmtNum(resultAction.value) : '—';
    m.cpa = resultCpa ? fmtCurrency(resultCpa.value) : '—';
    m.roas = resultValue && row.spend ? (Number(resultValue.value) / Number(row.spend)).toFixed(1) + 'x' : '—';
    m.conversions = m.results;
    m.conv_value = resultValue ? fmtCurrency(resultValue.value) : '—';
    const linkClicks = actions.find(a => a.action_type === 'link_click');
    m.link_clicks = linkClicks ? fmtNum(linkClicks.value) : '—';
    if (row.purchase_roas && Array.isArray(row.purchase_roas) && row.purchase_roas.length > 0) {
      m.purchase_roas = Number(row.purchase_roas[0].value).toFixed(2) + 'x';
    } else { m.purchase_roas = '—'; }
    return m;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white">Campaigns</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${currentData.length} ${levelLabel.toLowerCase()}s · ${activeCount} active · ${pausedCount} paused`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
              <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
                selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (activeTab === 'campaigns') fetchCampaigns(); else if (activeTab === 'adsets') { checkedCampaignIds.length ? fetchAdSetsMulti(checkedCampaignIds) : handleTabClick('adsets'); } else { checkedAdSetIds.length ? fetchAdsMulti(checkedAdSetIds) : handleTabClick('ads'); } }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => onPrefillChat?.('I want to create new ads for my campaigns.', 'Campaign')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:shadow-orange-500/50 transition-all shadow-lg shadow-orange-500/30">
              <Sparkles size={13} /> Ask AI Agent
            </button>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="relative flex items-center gap-0 px-6">
          <button onClick={() => setPlatform('meta')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${platform === 'meta' ? 'border-orange-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
            <MetaIcon /> Meta Ads
          </button>
          <button onClick={() => setPlatform('google')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${platform === 'google' ? 'border-orange-400 text-white' : 'border-transparent text-slate-400 hover:text-slate-300'}`}>
            <GoogleIcon /> Google Ads
          </button>
          <button disabled className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-500 cursor-not-allowed">
            <TikTokIcon /> TikTok Ads <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
          </button>
        </div>
      </div>

      {/* Level tabs (Campaigns | Ad Sets | Ads) + Breadcrumb */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-0">
            {['campaigns', 'adsets', 'ads'].map(tab => (
              <button key={tab} onClick={() => handleTabClick(tab)}
                className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {tab === 'campaigns' ? 'Campaigns' : tab === 'adsets' ? 'Ad Sets' : 'Ads'}
              </button>
            ))}
          </div>
          {/* Breadcrumb */}
          {(checkedCampaignIds.length > 0 || checkedAdSetIds.length > 0) && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <button onClick={() => handleTabClick('campaigns')} className="hover:text-blue-600 transition-colors">All Campaigns</button>
              {checkedCampaignIds.length > 0 && (
                <>
                  <ChevronRight size={12} />
                  <span className={`${activeTab === 'adsets' ? 'text-slate-700 font-medium' : ''}`}>
                    {checkedCampaignIds.length === 1
                      ? (campaigns.find(c => c.id === checkedCampaignIds[0])?.name?.slice(0, 30) || checkedCampaignIds[0])
                      : `${checkedCampaignIds.length} campaigns`}
                  </span>
                </>
              )}
              {checkedAdSetIds.length > 0 && (
                <>
                  <ChevronRight size={12} />
                  <span className="text-slate-700 font-medium">
                    {checkedAdSetIds.length === 1
                      ? (adSets.find(a => a.id === checkedAdSetIds[0])?.name?.slice(0, 30) || checkedAdSetIds[0])
                      : `${checkedAdSetIds.length} ad sets`}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar removed — checkboxes kept for multi-select drill-down */}

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white/80 backdrop-blur-sm border-b border-slate-100 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400/60" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${levelLabel.toLowerCase()}s...`}
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div className="flex rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden">
            {[['all', 'All'], ['active', 'Active'], ['paused', 'Paused']].map(([val, label]) => (
              <button key={val} onClick={() => setStatusFilter(val)}
                className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${statusFilter === val ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-orange-600'}`}>
                {label}
              </button>
            ))}
          </div>
          {/* Date range */}
          <div className="relative">
            <select value={datePreset} onChange={e => {
              const v = e.target.value;
              if (v === 'custom') { setShowDatePicker(true); setDatePreset('custom'); }
              else { setDatePreset(v); setShowDatePicker(false); }
            }}
              className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm text-[11px] font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 appearance-none pr-7 cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_3d">Last 3 Days</option>
              <option value="last_7d">Last 7 Days</option>
              <option value="last_14d">Last 14 Days</option>
              <option value="last_30d">Last 30 Days</option>
              <option value="this_month">This Month</option>
              <option value="last_month">Last Month</option>
              <option value="maximum">Lifetime</option>
              <option value="custom">{customDateFrom && customDateTo ? `${customDateFrom} – ${customDateTo}` : 'Custom Range'}</option>
            </select>
            {showDatePicker && (
              <div className="absolute top-full right-0 mt-1 z-30 bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl shadow-orange-500/5 border border-slate-200/60 p-4 w-64 animate-[fadeSlideUp_0.15s_ease-out]" onClick={e => e.stopPropagation()}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom Date Range</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">From</label>
                    <input type="date" value={customDateFrom} onChange={e => setCustomDateFrom(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-medium">To</label>
                    <input type="date" value={customDateTo} onChange={e => setCustomDateTo(e.target.value)}
                      className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-3">
                  <button onClick={() => setShowDatePicker(false)} className="px-2.5 py-1.5 text-[11px] text-slate-500 hover:bg-slate-50 rounded-lg">Cancel</button>
                  <button onClick={() => { setShowDatePicker(false); }} disabled={!customDateFrom || !customDateTo}
                    className="px-3 py-1.5 text-[11px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 rounded-lg font-bold shadow-sm disabled:opacity-50">Apply</button>
                </div>
              </div>
            )}
          </div>
          {/* Column Presets (template dropdown) */}
          <div className="relative">
            <select value={activeTemplate} onChange={e => handleTemplateSelect(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm text-[11px] font-semibold text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 appearance-none pr-7 cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}>
            <optgroup label="Column Presets">
              {BUILT_IN_TEMPLATES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </optgroup>
            <option value="custom">Custom Columns</option>
          </select>
          {showColumnPicker && activeTemplate === 'custom' && (
            <ColumnPicker columns={columns} onSetColumns={(cols) => { setColumns(cols); setActiveTemplate('custom'); }} onClose={() => setShowColumnPicker(false)} />
          )}
        </div>
        {/* Breakdown dropdown */}
        <div className="relative" ref={breakdownRef}>
          <button onClick={() => setShowBreakdownDropdown(!showBreakdownDropdown)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-[11px] font-medium transition-all ${breakdown !== 'none' ? 'border-violet-300 bg-violet-50 text-violet-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
            <Layers size={13} /> Breakdown{breakdown !== 'none' ? `: ${BREAKDOWNS.find(b => b.id === breakdown)?.label}` : ''}
            <ChevronDown size={11} />
          </button>
          {showBreakdownDropdown && (
            <div className="absolute top-full right-0 mt-1 z-30 bg-white rounded-xl shadow-xl border border-slate-200 w-52 overflow-hidden">
              <div className="py-1">
                {(() => {
                  let lastGroup = null;
                  return BREAKDOWNS.map(bd => {
                    const showGroupHeader = bd.group && bd.group !== lastGroup;
                    lastGroup = bd.group;
                    return (
                      <div key={bd.id}>
                        {showGroupHeader && (
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 pt-2 pb-1">{bd.group}</p>
                        )}
                        <button onClick={() => { setBreakdown(bd.id); setShowBreakdownDropdown(false); }}
                          className={`w-full text-left px-3 py-2 text-[11px] font-medium transition-colors
                            ${breakdown === bd.id ? 'bg-violet-50 text-violet-600' : 'text-slate-600 hover:bg-slate-50'}`}>
                          {bd.label}
                        </button>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Google Ads Panel */}
      {platform === 'google' && (
        <GoogleCampaignsPanel googleCustomerId={googleCustomerId} onOpenSettings={onOpenSettings} />
      )}

      {/* Content */}
      {platform === 'meta' && <div className="flex-1 overflow-auto px-6 py-4">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : loading && currentData.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading {levelLabel.toLowerCase()}s...</span>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 shadow-sm overflow-x-auto hover:shadow-lg hover:shadow-orange-500/5 transition-shadow">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-2.5 px-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === currentData.length && currentData.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                  </th>
                  <th className="py-2.5 px-3 w-14"></th>
                  <th className="py-2.5 pl-4 pr-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none"
                    onClick={() => handleSort('name')}>
                    {levelLabel} Name {sortKey === 'name' && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  {columns.map(colId => {
                    const col = COLUMN_MAP[colId];
                    if (!col) return null;
                    let label = col.label;
                    // Column headers stay fixed like Meta (sub-labels shown per row instead)
                    return (
                      <th key={colId} onClick={() => handleSort(colId)}
                        className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-600 select-none">
                        {label} {sortKey === colId && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map(item => (
                  <React.Fragment key={item.id}>
                    <tr
                      className={`border-b border-slate-100 hover:bg-orange-50/30 hover:shadow-lg hover:shadow-orange-500/5 transition-all group ${selectedIds.has(item.id) ? 'bg-orange-50/50' : ''}`}>
                      {/* Checkbox */}
                      <td className="py-3 px-3" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(item.id)}
                          onChange={() => toggleSelect(item.id)}
                          className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                      </td>
                      {/* Toggle */}
                      <td className="py-3 px-3">
                        <Toggle active={item._active} loading={updatingIds.has(item.id)} onChange={(v) => toggleActive(item.id, v)} />
                      </td>
                      {/* Name (clickable for drill-down) */}
                      <td className="py-3 pl-4 pr-4">
                        <div className="flex items-center gap-2.5">
                          {activeTab === 'ads' && item.thumbnail ? (
                            <img src={item.thumbnail} alt="" className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0" />
                          ) : activeTab === 'ads' ? (
                            <span className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <ImageIcon size={14} className="text-slate-400" />
                            </span>
                          ) : null}
                          <div className="min-w-0">
                            {activeTab !== 'ads' ? (
                              <button onClick={() => activeTab === 'campaigns' ? drillIntoCampaign(item) : drillIntoAdSet(item)}
                                className="text-[12px] font-medium text-slate-800 hover:text-blue-600 hover:underline decoration-blue-300 underline-offset-2 transition-colors truncate max-w-[300px] block text-left">
                                {item.name}
                              </button>
                            ) : (
                              <p className="text-[12px] font-medium text-slate-800 truncate max-w-[300px]">{item.name}</p>
                            )}
                            {activeTab === 'campaigns' && item.objective && (
                              <span className={`inline-block text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 ${OBJECTIVE_COLORS[fmtObjective(item.objective)] || 'bg-slate-50 text-slate-400'}`}>
                                {fmtObjective(item.objective)}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Metric columns */}
                      {columns.map(colId => {
                        const col = COLUMN_MAP[colId];
                        if (!col) return null;
                        if (colId === 'status') {
                          return (
                            <td key={colId} className="py-3 px-3 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <StatusDot status={item._status} />
                                <span className={`text-[11px] font-medium ${
                                  item._status === 'Active' ? 'text-emerald-600' : item._status === 'Paused' ? 'text-slate-400' : item._status === 'Error' ? 'text-red-500' : 'text-amber-600'
                                }`}>{item._status}</span>
                              </div>
                            </td>
                          );
                        }
                        if (colId === 'budget') {
                          if (activeTab === 'ads') return <td key={colId} className="py-3 px-3"><span className="text-[11px] text-slate-300">—</span></td>;
                          const budgetObj = item._budget;
                          return (
                            <td key={colId} className="py-3 px-3 relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                              {budgetObj?.type ? (
                                <div>
                                  <button onClick={() => setEditingBudget(item.id)}
                                    className="text-[12px] font-medium text-slate-600 hover:text-blue-600 hover:underline decoration-blue-300 underline-offset-2 transition-colors tabular-nums">
                                    {budgetObj.amount}
                                  </button>
                                  <p className="text-[9px] text-slate-400 mt-0.5">{budgetObj.type}</p>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">{budgetObj?.amount || '—'}</span>
                              )}
                              {editingBudget === item.id && (
                                <BudgetEditor value={budgetObj?.amount} onSave={(v) => handleSaveBudget(item.id, v)} onCancel={() => setEditingBudget(null)} />
                              )}
                            </td>
                          );
                        }
                        if (colId === 'objective') {
                          const obj = fmtObjective(item.objective);
                          return (
                            <td key={colId} className="py-3 px-3 whitespace-nowrap">
                              {obj ? (
                                <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full ${OBJECTIVE_COLORS[obj] || 'bg-slate-50 text-slate-400'}`}>
                                  {obj}
                                </span>
                              ) : <span className="text-[11px] text-slate-300">—</span>}
                            </td>
                          );
                        }
                        {/* Results and CPA show sub-labels like Meta */}
                        const subLabel = colId === 'results' ? item._metrics?._resultsLabel
                          : colId === 'cpa' ? item._metrics?._cpaLabel
                          : null;
                        return <td key={colId} className="py-3 px-3 whitespace-nowrap"><CellValue value={item._metrics?.[colId]} subLabel={subLabel} /></td>;
                      })}
                    </tr>
                    {/* Breakdown sub-rows */}
                    {breakdown !== 'none' && breakdownData[item.id] && expandedBreakdowns.has(item.id) && (
                      breakdownData[item.id].map((bdRow, i) => {
                        const bdMetrics = formatBreakdownMetrics(bdRow);
                        return (
                          <tr key={`${item.id}_bd_${i}`} className="border-b border-slate-50 bg-slate-50/40">
                            <td className="py-2 px-3"></td>
                            <td className="py-2 px-3"></td>
                            <td className="py-2 pl-8 pr-4">
                              <span className="text-[11px] text-slate-500 font-medium">{getBreakdownLabel(bdRow)}</span>
                            </td>
                            {columns.map(colId => {
                              if (colId === 'status' || colId === 'budget' || colId === 'objective') {
                                return <td key={colId} className="py-2 px-3"></td>;
                              }
                              return <td key={colId} className="py-2 px-3 whitespace-nowrap"><CellValue value={bdMetrics[colId]} /></td>;
                            })}
                          </tr>
                        );
                      })
                    )}
                  </React.Fragment>
                ))}
                {paginatedData.length === 0 && !loading && (
                  <tr><td colSpan={columns.length + 3} className="py-12 text-center text-[13px] text-slate-400">
                    No {levelLabel.toLowerCase()}s found
                  </td></tr>
                )}
              </tbody>
            </table>
            {breakdownLoading && (
              <div className="flex items-center justify-center py-3 border-t border-slate-100">
                <Loader2 size={14} className="animate-spin text-violet-400 mr-2" />
                <span className="text-[11px] text-slate-400">Loading breakdown data...</span>
              </div>
            )}
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-4">
            <span className="text-[11px] text-slate-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} {levelLabel.toLowerCase()}s
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                First
              </button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 2)
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === '...' ? (
                  <span key={`dots-${i}`} className="px-1 text-[11px] text-slate-300">...</span>
                ) : (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 text-[11px] font-medium rounded-lg border transition-colors ${p === page ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    {p}
                  </button>
                ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                Next
              </button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2.5 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                Last
              </button>
            </div>
          </div>
        )}
      </div>}

      {/* Ask AI Agent popup */}
      {showAskAI && (
        <AskAIPopup
          onSubmit={(msg) => onSendToChat?.(msg)}
          onClose={() => setShowAskAI(false)}
          selectedIds={selectedIds.size > 0 ? [...selectedIds] : null}
          level={levelLabel}
        />
      )}
    </div>
  );
};
