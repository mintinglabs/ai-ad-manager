import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, RefreshCw, Plus, Loader2, Trash2, X, Play, Pause, ChevronDown, ChevronRight, Clock, AlertTriangle, CheckCircle, Settings2, Edit3, Sparkles, ArrowRight, TrendingUp, Zap, Target, BarChart3, Shield, DollarSign, Eye } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

// ── Helpers ──
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Meta rule constants ──
const ENTITY_TYPES = [
  { value: 'CAMPAIGN', label: 'Campaigns' },
  { value: 'ADSET', label: 'Ad Sets' },
  { value: 'AD', label: 'Ads' },
];

const ACTION_TYPES = [
  { value: 'PAUSE', label: 'Pause', desc: 'Pause the campaign, ad set, or ad', icon: Pause },
  { value: 'UNPAUSE', label: 'Activate', desc: 'Turn on the campaign, ad set, or ad', icon: Play },
  { value: 'CHANGE_BUDGET', label: 'Adjust budget', desc: 'Increase or decrease daily budget', icon: DollarSign },
  { value: 'CHANGE_BID', label: 'Adjust bid', desc: 'Change bid amount', icon: BarChart3 },
  { value: 'SEND_NOTIFICATION', label: 'Notify me', desc: 'Send email notification only', icon: AlertTriangle },
];

const METRIC_FIELDS = [
  // Cost metrics
  { value: 'spent', label: 'Amount spent' },
  { value: 'cost_per_result', label: 'Cost per result (CPA)' },
  { value: 'cost_per_action_type', label: 'Cost per action' },
  { value: 'cpm', label: 'CPM' },
  { value: 'cpc', label: 'CPC (cost per click)' },
  { value: 'cost_per_15_sec_video_view', label: 'Cost per 15s video view' },
  { value: 'cost_per_thruplay', label: 'Cost per ThruPlay' },
  // Rate metrics
  { value: 'ctr', label: 'CTR (click-through rate)' },
  { value: 'website_ctr', label: 'Website CTR' },
  // Volume metrics
  { value: 'impressions', label: 'Impressions' },
  { value: 'lifetime_impressions', label: 'Lifetime impressions' },
  { value: 'reach', label: 'Reach' },
  { value: 'clicks', label: 'Clicks' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'results', label: 'Results' },
  { value: 'leads', label: 'Leads' },
  { value: 'app_installs', label: 'App installs' },
  // Value metrics
  { value: 'roas', label: 'ROAS' },
  { value: 'purchase_roas', label: 'Purchase ROAS' },
  { value: 'revenue', label: 'Revenue' },
  // Video metrics
  { value: 'video_views', label: 'Video views' },
  { value: 'video_thruplay_watched_actions', label: 'ThruPlays' },
  { value: 'video_p75_watched_actions', label: 'Video watched 75%' },
  // Delivery metrics
  { value: 'active_time', label: 'Active time (seconds)' },
  { value: 'daily_budget', label: 'Daily budget' },
  { value: 'lifetime_budget', label: 'Lifetime budget' },
  { value: 'budget_remaining', label: 'Budget remaining' },
  // Quality metrics
  { value: 'quality_score', label: 'Quality ranking' },
  { value: 'engagement_rate_ranking', label: 'Engagement rate ranking' },
  { value: 'conversion_rate_ranking', label: 'Conversion rate ranking' },
  // Name filters
  { value: 'campaign.name', label: 'Campaign name' },
  { value: 'adset.name', label: 'Ad set name' },
  { value: 'ad.name', label: 'Ad name' },
  // ID filters
  { value: 'campaign.id', label: 'Campaign ID' },
  { value: 'adset.id', label: 'Ad set ID' },
  { value: 'ad.id', label: 'Ad ID' },
];

const OPERATORS = [
  { value: 'GREATER_THAN', label: 'is greater than' },
  { value: 'LESS_THAN', label: 'is less than' },
  { value: 'IN_RANGE', label: 'is between' },
  { value: 'NOT_IN_RANGE', label: 'is not between' },
  { value: 'CONTAIN', label: 'contains' },
  { value: 'NOT_CONTAIN', label: 'does not contain' },
  { value: 'IN', label: 'is one of' },
  { value: 'NOT_IN', label: 'is not one of' },
  { value: 'EQUAL', label: 'equals' },
  { value: 'NOT_EQUAL', label: 'does not equal' },
];

const TIME_PRESETS = [
  { value: 'TODAY', label: 'Today' },
  { value: 'YESTERDAY', label: 'Yesterday' },
  { value: 'LAST_3_DAYS', label: 'Last 3 days' },
  { value: 'LAST_7_DAYS', label: 'Last 7 days' },
  { value: 'LAST_14_DAYS', label: 'Last 14 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LIFETIME', label: 'Lifetime' },
];

const SCHEDULE_OPTIONS = [
  { value: 'SEMI_HOURLY', label: 'Every 30 minutes' },
  { value: 'HOURLY', label: 'Every hour' },
  { value: 'DAILY', label: 'Once daily' },
  { value: 'CUSTOM', label: 'Custom schedule' },
];

// ── Rule Templates ──
const RULE_TEMPLATES = [
  {
    id: 'waste', icon: Shield, category: 'Protection', gradient: 'from-red-500/10 to-orange-500/5', borderColor: 'border-red-200/60', iconBg: 'bg-red-100 text-red-600',
    name: 'Pause low performers', desc: 'Spending money but no results',
    stat: 'Most popular rule',
    prefill: { name: 'Pause Low Performers', actionType: 'PAUSE', conditions: [{ field: 'spend', operator: 'GREATER_THAN', value: '50', time_preset: 'LAST_7_DAYS' }, { field: 'results', operator: 'LESS_THAN', value: '1', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'cpa', icon: AlertTriangle, category: 'Protection', gradient: 'from-amber-500/10 to-red-500/5', borderColor: 'border-amber-200/60', iconBg: 'bg-amber-100 text-amber-600',
    name: 'Pause high CPA', desc: 'Cost per result too expensive',
    stat: 'Avg. saves 23% budget',
    prefill: { name: 'Pause High CPA', actionType: 'PAUSE', conditions: [{ field: 'cost_per_result', operator: 'GREATER_THAN', value: '50', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'scale', icon: TrendingUp, category: 'Growth', gradient: 'from-emerald-500/10 to-teal-500/5', borderColor: 'border-emerald-200/60', iconBg: 'bg-emerald-100 text-emerald-600',
    name: 'Scale top campaigns', desc: 'Increase budget on strong ROAS',
    stat: 'Top performers only',
    prefill: { name: 'Scale Top Campaigns', actionType: 'CHANGE_BUDGET', budgetAction: 'INCREASE', budgetAmount: '20', budgetUnit: 'PERCENTAGE', conditions: [{ field: 'roas', operator: 'GREATER_THAN', value: '3', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'fatigue', icon: Target, category: 'Protection', gradient: 'from-violet-500/10 to-blue-500/5', borderColor: 'border-violet-200/60', iconBg: 'bg-orange-100 text-orange-600',
    name: 'Pause fatigued ads', desc: 'Audience seeing ads too often',
    stat: 'Keeps creatives fresh',
    prefill: { name: 'Pause Fatigued Ads', actionType: 'PAUSE', conditions: [{ field: 'frequency', operator: 'GREATER_THAN', value: '4', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'overspend', icon: DollarSign, category: 'Safety', gradient: 'from-blue-500/10 to-indigo-500/5', borderColor: 'border-blue-200/60', iconBg: 'bg-blue-100 text-blue-600',
    name: 'Alert overspend', desc: 'Daily spend exceeds your limit',
    stat: 'Real-time alerts',
    prefill: { name: 'Alert Overspend', actionType: 'SEND_NOTIFICATION', conditions: [{ field: 'spend', operator: 'GREATER_THAN', value: '500', time_preset: 'TODAY' }], schedule: 'HOURLY' },
  },
];

// ── Template Cards (full size for empty state) ──
const TemplateCards = ({ onSelect }) => (
  <div className="grid grid-cols-2 gap-4 mb-8">
    {RULE_TEMPLATES.map(t => {
      const Icon = t.icon;
      return (
        <button key={t.id} onClick={() => onSelect(t)}
          className={`relative overflow-hidden bg-gradient-to-br ${t.gradient} rounded-2xl border ${t.borderColor} p-6 text-left group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200`}>
          <div className="flex items-start justify-between mb-4">
            <div className={`w-11 h-11 rounded-xl ${t.iconBg} flex items-center justify-center shadow-sm`}>
              <Icon size={20} />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-white/60 backdrop-blur-sm px-2 py-1 rounded-full">
              {t.category}
            </span>
          </div>
          <h4 className="text-[14px] font-bold text-slate-900 mb-1 group-hover:text-orange-700 transition-colors">{t.name}</h4>
          <p className="text-[12px] text-slate-500 leading-relaxed mb-3">{t.desc}</p>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 font-medium">{t.stat}</span>
            <span className="flex items-center gap-1 text-[11px] font-semibold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
              Set up <ArrowRight size={12} />
            </span>
          </div>
        </button>
      );
    })}
  </div>
);

// ── Template Chips (compact for rules-exist state) ──
const TemplateChips = ({ onSelect, onCreateAI }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Plus size={13} className="text-orange-500" />
        <span className="text-[12px] font-semibold text-slate-700">Add a rule from template</span>
      </div>
      <span className="text-[10px] text-slate-400">or <button onClick={onCreateAI} className="text-orange-600 font-semibold hover:underline">create with AI</button></span>
    </div>
    <div className="flex flex-wrap gap-2">
      {RULE_TEMPLATES.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => onSelect(t)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-orange-50 hover:border-orange-200 text-left transition-all group">
            <div className={`w-6 h-6 rounded-md ${t.iconBg} flex items-center justify-center shrink-0`}>
              <Icon size={12} />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 group-hover:text-orange-700 transition-colors">{t.name}</span>
          </button>
        );
      })}
    </div>
  </div>
);

// ── Styled form components ──
const FormSelect = ({ label, value, options, onChange, className = '' }) => (
  <div className={className}>
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>}
    <select value={value || ''} onChange={e => onChange(e.target.value)}
      className="w-full text-[13px] font-medium text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 transition-all appearance-none cursor-pointer"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2364748b' viewBox='0 0 24 24'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  </div>
);

const FormInput = ({ label, value, onChange, type = 'text', placeholder, className = '' }) => (
  <div className={className}>
    {label && <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-[13px] font-medium text-slate-800 bg-white border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300 transition-all" />
  </div>
);

// ── Build summary sentence ──
const buildSummary = ({ actionType, budgetAction, budgetAmount, budgetUnit, conditions, entityType, schedule }) => {
  const scheduleLabel = { SEMI_HOURLY: 'every 30 minutes', HOURLY: 'every hour', DAILY: 'once daily', CUSTOM: 'on a custom schedule' }[schedule] || 'once daily';
  const entityLabel = { CAMPAIGN: 'campaigns', ADSET: 'ad sets', AD: 'ads' }[entityType] || 'campaigns';
  const condParts = conditions.map(c => {
    const fieldLabel = METRIC_FIELDS.find(f => f.value === c.field)?.label || c.field;
    const opLabel = { GREATER_THAN: 'above', LESS_THAN: 'below', IN_RANGE: 'between', NOT_IN_RANGE: 'outside' }[c.operator] || c.operator;
    return `${fieldLabel} is ${opLabel} ${c.value || '___'}`;
  }).join(' and ');
  let actionLabel = '';
  if (actionType === 'PAUSE') actionLabel = `pause ${entityLabel}`;
  else if (actionType === 'UNPAUSE') actionLabel = `activate ${entityLabel}`;
  else if (actionType === 'CHANGE_BUDGET') actionLabel = `${(budgetAction || 'increase').toLowerCase()} budget by ${budgetAmount || '___'}${budgetUnit === 'PERCENTAGE' ? '%' : '$'}`;
  else if (actionType === 'SEND_NOTIFICATION') actionLabel = 'send a notification';
  else actionLabel = actionType?.toLowerCase() || '___';
  return `Check ${scheduleLabel} — ${actionLabel} when ${condParts}.`;
};

// ── Configuration Modal ──
const RuleModal = ({ rule, onSave, onClose }) => {
  const isEdit = !!rule?.id;
  const templateMatch = !isEdit && rule?.name ? RULE_TEMPLATES.find(t => t.prefill.name === rule.name) : null;

  const [name, setName] = useState(rule?.name || '');
  const [entityType, setEntityType] = useState('CAMPAIGN');
  const [actionType, setActionType] = useState('PAUSE');
  const [budgetAction, setBudgetAction] = useState(rule?._budgetAction || 'INCREASE');
  const [budgetAmount, setBudgetAmount] = useState(rule?._budgetAmount || '20');
  const [budgetUnit, setBudgetUnit] = useState(rule?._budgetUnit || 'PERCENTAGE');
  const [conditions, setConditions] = useState([{ field: 'cost_per_result', operator: 'GREATER_THAN', value: '', time_preset: 'LAST_7_DAYS' }]);
  const [schedule, setSchedule] = useState('DAILY');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rule) return;
    if (rule.evaluation_spec?.filters?.length) {
      const filters = rule.evaluation_spec.filters;
      // First pass: extract entity_type and time_preset
      let tp = 'LAST_7_DAYS';
      filters.forEach(f => {
        if (f.field === 'entity_type') setEntityType(f.value || 'CAMPAIGN');
        if (f.field === 'time_preset') tp = f.value === 'MAXIMUM' ? 'LIFETIME' : (f.value || 'LAST_7_DAYS');
      });
      // Second pass: build conditions (skip entity_type and time_preset)
      const conds = filters.filter(f => f.field !== 'entity_type' && f.field !== 'time_preset').map(f => {
        let val = f.value || '';
        if (CURRENCY_FIELDS.has(f.field) && val) val = String(Number(val) / 100);
        return { field: f.field, operator: f.operator || 'GREATER_THAN', value: val, time_preset: tp };
      });
      if (conds.length) setConditions(conds);
      else setConditions([{ field: 'cost_per_result', operator: 'GREATER_THAN', value: '', time_preset: tp }]);
    }
    if (rule.execution_spec?.execution_type) setActionType(rule.execution_spec.execution_type);
    if (rule.schedule_spec?.schedule_type) setSchedule(rule.schedule_spec.schedule_type);
    if (rule._budgetAction) setBudgetAction(rule._budgetAction);
    if (rule._budgetAmount) setBudgetAmount(rule._budgetAmount);
    if (rule._budgetUnit) setBudgetUnit(rule._budgetUnit);
  }, [rule]);

  const updateCondition = (idx, key, val) => setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  const addCondition = () => setConditions(prev => [...prev, { field: 'spend', operator: 'GREATER_THAN', value: '', time_preset: conditions[0]?.time_preset || 'LAST_7_DAYS' }]);
  const removeCondition = (idx) => { if (conditions.length > 1) setConditions(prev => prev.filter((_, i) => i !== idx)); };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const evaluation_spec = {
        evaluation_type: 'SCHEDULE',
        filters: conditions.map(c => ({
          field: c.field, operator: c.operator,
          // Convert dollars back to cents for currency fields
          value: CURRENCY_FIELDS.has(c.field) ? String(Math.round(Number(c.value) * 100)) : c.value,
        })),
        time_preset: conditions[0]?.time_preset || 'LAST_7_DAYS',
        entity_type: entityType,
      };
      const execution_spec = { execution_type: actionType };
      if (actionType === 'CHANGE_BUDGET') {
        execution_spec.execution_options = [{ field: 'daily_budget', operator: budgetAction, value: Number(budgetAmount) || 0, unit: budgetUnit }];
      }
      await onSave({ id: rule?.id, name: name.trim(), evaluation_spec, execution_spec, schedule_spec: { schedule_type: schedule } });
      onClose();
    } catch (err) { console.error('Save failed:', err); }
    finally { setSaving(false); }
  };

  const summary = buildSummary({ actionType, budgetAction, budgetAmount, budgetUnit, conditions, entityType, schedule });

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Compact header */}
        <div className={`relative overflow-hidden ${templateMatch ? `bg-gradient-to-br ${templateMatch.gradient}` : ''} px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            {templateMatch && (
              <div className={`w-9 h-9 rounded-xl ${templateMatch.iconBg} flex items-center justify-center shadow-sm`}>
                <templateMatch.icon size={17} />
              </div>
            )}
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{templateMatch ? templateMatch.name : isEdit ? 'Edit Rule' : 'Create Rule'}</h3>
              {templateMatch && <p className="text-[11px] text-slate-500">{templateMatch.desc}</p>}
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-white/50 hover:bg-white/80 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all">
            <X size={14} />
          </button>
        </div>

        {/* Compact form */}
        <div className="px-6 py-4 space-y-4">
          {/* Rule name */}
          <FormInput label="Rule name" value={name} onChange={setName} placeholder="e.g. Pause high CPA campaigns" />

          {/* Trigger — conditions + time window inline */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">When this happens</label>
            <div className="space-y-2">
              {conditions.map((cond, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {idx > 0 && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">AND</span>}
                  <FormSelect value={cond.field} options={METRIC_FIELDS} onChange={v => updateCondition(idx, 'field', v)} className="flex-1" />
                  <FormSelect value={cond.operator} options={OPERATORS} onChange={v => updateCondition(idx, 'operator', v)} className="flex-1" />
                  <div className={`relative ${cond.field?.includes('.name') ? 'w-36' : 'w-28'}`}>
                    {CURRENCY_FIELDS.has(cond.field) && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-slate-400">$</span>}
                    <FormInput
                      type={cond.field?.includes('.name') || cond.field?.includes('.id') || cond.operator === 'CONTAIN' || cond.operator === 'NOT_CONTAIN' ? 'text' : 'number'}
                      value={cond.value} onChange={v => updateCondition(idx, 'value', v)}
                      placeholder={cond.field?.includes('.name') ? 'Name...' : CURRENCY_FIELDS.has(cond.field) ? '0.00' : 'Value'}
                      className={`w-full ${CURRENCY_FIELDS.has(cond.field) ? 'pl-7' : ''}`} />
                  </div>
                  {conditions.length > 1 && (
                    <button onClick={() => removeCondition(idx)} className="w-6 h-6 rounded-md hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2">
              <button onClick={addCondition} className="text-[10px] font-semibold text-orange-600 hover:text-orange-700 flex items-center gap-1">
                <Plus size={11} /> Add condition
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400">in the</span>
                <select value={conditions[0]?.time_preset || 'LAST_7_DAYS'} onChange={e => setConditions(prev => prev.map(c => ({ ...c, time_preset: e.target.value })))}
                  className="text-[11px] font-medium text-slate-700 border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
                  {TIME_PRESETS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Action — compact row, not grid */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Then do this</label>
            <div className="flex items-center gap-2">
              <FormSelect value={actionType} options={ACTION_TYPES.map(a => ({ value: a.value, label: a.label }))} onChange={setActionType} className="flex-1" />
              {actionType === 'CHANGE_BUDGET' && (
                <>
                  <FormSelect value={budgetAction} options={[{ value: 'INCREASE', label: 'Increase' }, { value: 'DECREASE', label: 'Decrease' }]} onChange={setBudgetAction} className="w-28" />
                  <FormInput type="number" value={budgetAmount} onChange={setBudgetAmount} placeholder="20" className="w-20" />
                  <FormSelect value={budgetUnit} options={[{ value: 'PERCENTAGE', label: '%' }, { value: 'ABSOLUTE', label: '$' }]} onChange={setBudgetUnit} className="w-16" />
                </>
              )}
            </div>
          </div>

          {/* Apply to + Schedule — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <FormSelect label="Apply to" value={entityType} options={ENTITY_TYPES} onChange={setEntityType} />
            <FormSelect label="Check frequency" value={schedule} options={SCHEDULE_OPTIONS} onChange={setSchedule} />
          </div>

          {/* Compact summary */}
          <div className="bg-slate-900 rounded-xl px-4 py-3 flex items-center gap-3">
            <Sparkles size={13} className="text-orange-400 shrink-0" />
            <p className="text-[11px] text-white/80 leading-relaxed">{summary}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-50 rounded-lg font-medium transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim() || !conditions[0]?.value || saving}
            className="flex items-center gap-1.5 px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 rounded-lg font-bold shadow-md shadow-orange-500/20 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none transition-all">
            <Zap size={13} />
            {saving ? 'Creating...' : isEdit ? 'Update Rule' : 'Enable Rule'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Rule Card (existing rules) ──
// ── Human-readable rule summary (Meta-style: action line + condition line) ──
const CURRENCY_FIELDS = new Set(['spent', 'spend', 'cost_per_action_type', 'cost_per_result', 'cpm', 'cpc', 'cost_per_15_sec_video_view', 'cost_per_thruplay', 'revenue', 'daily_budget', 'lifetime_budget', 'budget_remaining', 'action_values:offsite_conversion.fb_pixel_purchase']);

const fmtField = (field) => METRIC_FIELDS.find(m => m.value === field)?.label || field?.replace(/\./g, ' ')?.replace(/_/g, ' ') || field;
const fmtOp = (op) => OPERATORS.find(o => o.value === op)?.label || op?.toLowerCase()?.replace(/_/g, ' ') || op;
const fmtVal = (field, val) => CURRENCY_FIELDS.has(field) && val ? '$' + (Number(val) / 100).toFixed(2) : val;

const buildHumanSummary = (rule) => {
  const action = rule.execution_spec?.execution_type || '';
  const filters = rule.evaluation_spec?.filters || [];
  const budgetOpts = rule.execution_spec?.execution_options;

  const conditionFilters = [];
  let timeWindow = '';

  filters.forEach(f => {
    if (f.field === 'entity_type') return;
    if (f.field === 'time_preset') {
      timeWindow = { TODAY: 'Today', YESTERDAY: 'Yesterday', LAST_3_DAYS: 'Last 3 days', LAST_7_DAYS: 'Last 7 days', LAST_14_DAYS: 'Last 14 days', LAST_30_DAYS: 'Last 30 days', LIFETIME: 'Lifetime', MAXIMUM: 'Lifetime' }[f.value] || f.value;
      return;
    }
    conditionFilters.push(f);
  });

  // Action line — match Meta style
  let actionLine = {
    PAUSE: 'Turn off campaigns', UNPAUSE: 'Turn on campaigns',
    CHANGE_BUDGET: 'Adjust budget', CHANGE_BID: 'Adjust bid',
    SEND_NOTIFICATION: 'Send notification only',
    PING_ENDPOINT: 'Run automation',
  }[action] || action;

  if (action === 'CHANGE_BUDGET' && budgetOpts) {
    const opt = Array.isArray(budgetOpts) ? budgetOpts[0] : budgetOpts;
    if (opt) {
      const dir = opt.operator === 'INCREASE' ? 'Increase' : 'Decrease';
      const unit = opt.unit === 'PERCENTAGE' ? '%' : '$';
      actionLine = `${dir} budget by ${opt.value}${unit}`;
    }
  }

  // Condition line — match Meta: "If Spent is less than $50.00 and Campaign name contains ECC"
  const condParts = conditionFilters.map(f => `${fmtField(f.field)} ${fmtOp(f.operator)} ${fmtVal(f.field, f.value)}`);
  let conditionLine = condParts.length ? `If ${condParts.join(' and ')}` : '';
  if (timeWindow) conditionLine = conditionLine ? `${conditionLine} · ${timeWindow}` : timeWindow;

  return { actionLine, conditionLine };
};

// ── Toggle switch ──
const Toggle = ({ active, onChange, loading }) => (
  <button onClick={(e) => { e.stopPropagation(); if (!loading) onChange(!active); }}
    disabled={loading}
    className={`w-9 h-[20px] rounded-full transition-colors duration-200 relative shrink-0 ${loading ? 'opacity-50' : ''} ${active ? 'bg-emerald-500' : 'bg-slate-200'}`}>
    <span className={`absolute top-[2px] left-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${active ? 'translate-x-[16px]' : ''}`} />
  </button>
);

const RuleCard = ({ rule, onToggle, onEdit, onDelete, onViewHistory, updating }) => {
  const isActive = rule.status === 'ENABLED';
  const isInvalid = rule.status === 'INVALID' || rule.status === 'HAS_ISSUES';
  const action = rule.execution_spec?.execution_type || '';
  const { actionLine, conditionLine } = buildHumanSummary(rule);

  // Extract entity type from filters
  const entityFilter = (rule.evaluation_spec?.filters || []).find(f => f.field === 'entity_type');
  const appliedTo = entityFilter ? { CAMPAIGN: 'All active campaigns', ADSET: 'All active ad sets', AD: 'All active ads' }[entityFilter.value] || 'All active campaigns' : 'All active campaigns';

  // Schedule
  const scheduleLabel = SCHEDULE_OPTIONS.find(s => s.value === rule.schedule_spec?.schedule_type)?.label || 'Daily';

  return (
    <div className={`group bg-white rounded-xl border transition-all hover:shadow-md ${isInvalid ? 'border-red-200' : 'border-slate-200'}`}>
      <div className="px-5 py-4">
        {/* Top row: toggle + name + status + actions */}
        <div className="flex items-center gap-3 mb-2">
          <Toggle active={isActive && !isInvalid} onChange={() => onToggle(rule.id, isActive)} loading={updating} />
          <h4 className="text-[14px] font-bold text-slate-800 truncate flex-1">{rule.name}</h4>
          {isInvalid ? (
            <span className="relative group/tip text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0 cursor-help">
              Invalid
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-3 py-2 bg-slate-900 text-white text-[10px] font-normal normal-case tracking-normal rounded-lg whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none shadow-lg">
                This rule has issues and is not being checked. Edit to fix.
              </span>
            </span>
          ) : (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {isActive ? 'Active' : 'Paused'}
            </span>
          )}
          {/* Actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={() => onEdit(rule)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              Edit
            </button>
            <button onClick={() => onViewHistory(rule.id)} title="Execution history"
              className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-300 hover:text-slate-600 transition-colors">
              <Clock size={13} />
            </button>
            <button onClick={() => onDelete(rule.id)} title="Delete rule"
              className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Action & condition — Meta-style two lines */}
        <div className="ml-12 mb-2.5">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              action === 'PAUSE' ? 'bg-amber-50 text-amber-700' :
              action === 'UNPAUSE' ? 'bg-emerald-50 text-emerald-700' :
              action === 'CHANGE_BUDGET' || action === 'CHANGE_BID' ? 'bg-blue-50 text-blue-700' :
              action === 'SEND_NOTIFICATION' ? 'bg-violet-50 text-violet-700' :
              'bg-slate-100 text-slate-600'
            }`}>{actionLine}</span>
          </div>
          {conditionLine && <p className="text-[12px] text-slate-600 leading-relaxed">{conditionLine}</p>}
        </div>

        {/* Info row */}
        <div className="flex items-center gap-4 text-[10px] ml-12">
          <div className="flex items-center gap-1.5 text-slate-400">
            <Target size={10} className="shrink-0" />
            <span>{appliedTo}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <Clock size={10} className="shrink-0" />
            <span>{scheduleLabel}</span>
          </div>
          {rule.created_time && (
            <span className="text-slate-300">Created {fmtDate(rule.created_time)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ── History modal ──
const HistoryModal = ({ ruleId, onClose }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ruleId) return;
    setLoading(true);
    api.get(`/rules/${ruleId}/history`).then(({ data }) => setHistory(data || []))
      .catch(console.error).finally(() => setLoading(false));
  }, [ruleId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="text-[14px] font-bold text-slate-800">Execution History</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-400">No execution history yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((entry, i) => (
                <div key={i} className="px-6 py-3 flex items-center gap-3">
                  {entry.result === 'SUCCESS' ? <CheckCircle size={14} className="text-emerald-500 shrink-0" /> : <AlertTriangle size={14} className="text-amber-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-slate-700">{entry.description || 'Rule executed'}</p>
                    <p className="text-[10px] text-slate-400">{fmtDate(entry.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ── Main Component ──
export const AutomationRules = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onBack, onSendToChat, onPrefillChat }) => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [historyRuleId, setHistoryRuleId] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(new Set());

  const fetchRules = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/rules', { params: { adAccountId } });
      setRules(data || []);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  }, [adAccountId]);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const handleSave = useCallback(async (ruleData) => {
    if (ruleData.id) {
      const { data } = await api.patch(`/rules/${ruleData.id}`, ruleData);
      setRules(prev => prev.map(r => r.id === ruleData.id ? { ...r, ...data } : r));
    } else {
      const { data } = await api.post('/rules', { adAccountId, ...ruleData });
      setRules(prev => [...prev, data]);
    }
  }, [adAccountId]);

  const handleToggle = useCallback(async (id, isActive) => {
    setUpdatingIds(prev => new Set(prev).add(id));
    try {
      await api.patch(`/rules/${id}`, { status: isActive ? 'DISABLED' : 'ENABLED' });
      setRules(prev => prev.map(r => r.id === id ? { ...r, status: isActive ? 'DISABLED' : 'ENABLED' } : r));
    } catch (err) { console.error('Toggle failed:', err); }
    finally { setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this rule? This cannot be undone.')) return;
    try { await api.delete(`/rules/${id}`); setRules(prev => prev.filter(r => r.id !== id)); }
    catch (err) { console.error('Delete failed:', err); }
  }, []);

  // Filter out third-party webhook rules (PING_ENDPOINT) — not user-created
  const userRules = rules.filter(r => r.execution_spec?.execution_type !== 'PING_ENDPOINT');

  const filtered = userRules.filter(r => {
    if (statusFilter === 'active' && r.status !== 'ENABLED') return false;
    if (statusFilter === 'paused' && r.status === 'ENABLED') return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = userRules.filter(r => r.status === 'ENABLED').length;
  const pausedCount = userRules.filter(r => r.status !== 'ENABLED').length;

  const handleTemplateSelect = (t) => {
    setEditingRule({
      name: t.prefill.name,
      execution_spec: { execution_type: t.prefill.actionType },
      evaluation_spec: { filters: t.prefill.conditions },
      schedule_spec: { schedule_type: t.prefill.schedule || 'DAILY' },
      _budgetAction: t.prefill.budgetAction,
      _budgetAmount: t.prefill.budgetAmount,
      _budgetUnit: t.prefill.budgetUnit,
    });
    setShowCreate(true);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
                  <Zap size={14} className="text-white" />
                </div>
                Automation Rules
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : userRules.length > 0 ? `${activeCount} active · ${pausedCount} paused` : 'Automate your ad management'}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <button onClick={fetchRules} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-6">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : userRules.length === 0 && !loading ? (
          /* Empty state — hero + full template cards */
          <>
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/20">
                <Zap size={28} className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Put your campaigns on autopilot</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Set up rules that automatically optimize your ads 24/7 — pause losers, scale winners, and protect your budget while you sleep.
              </p>
            </div>
            <TemplateCards onSelect={handleTemplateSelect} />
          </>
        ) : (
          <>
            {/* Chat input — ask AI to create a rule */}
            <div className="mb-5">
              <div className="bg-white rounded-2xl border border-orange-200 shadow-sm ring-1 ring-orange-500/10 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:border-orange-300 transition-all overflow-hidden">
                <input data-rule-input
                  placeholder="Describe a rule you want... e.g. 'Pause campaigns spending over $100 with no results'"
                  className="w-full px-5 pt-4 pb-2 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      onPrefillChat?.(e.target.value.trim());
                      e.target.value = '';
                    }
                  }}
                />
                <div className="flex items-center justify-between px-4 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Sparkles size={10} /> AI will set up your rule
                    </span>
                  </div>
                  <button onClick={() => {
                    const input = document.querySelector('[data-rule-input]');
                    if (input?.value?.trim()) {
                      onPrefillChat?.(input.value.trim());
                      input.value = '';
                    }
                  }}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 flex items-center justify-center text-white shadow-sm transition-all">
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick-add template chips */}
            <div className="flex flex-wrap items-center gap-2 mb-5">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Quick add:</span>
              {RULE_TEMPLATES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} onClick={() => handleTemplateSelect(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-orange-50 hover:border-orange-200 transition-all group">
                    <div className={`w-5 h-5 rounded-md ${t.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon size={11} />
                    </div>
                    <span className="text-[11px] font-medium text-slate-600 group-hover:text-orange-700 transition-colors">{t.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Rules list header — search left, filters right */}
            <div className="flex items-center justify-between mb-3">
              <div className="relative flex-1 max-w-sm">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..."
                  className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
              </div>
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                {[['all', `All (${userRules.length})`], ['active', `Active (${activeCount})`], ['paused', `Paused (${pausedCount})`]].map(([val, label]) => (
                  <button key={val} onClick={() => setStatusFilter(val)}
                    className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rules list */}
            {loading && userRules.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-[13px] text-slate-400">
                {search ? 'No matching rules found' : 'No rules in this filter'}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(rule => (
                  <RuleCard key={rule.id} rule={rule} onToggle={handleToggle}
                    onEdit={(r) => { setEditingRule(r); setShowCreate(true); }}
                    onDelete={handleDelete} onViewHistory={setHistoryRuleId} updating={updatingIds.has(rule.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showCreate && <RuleModal rule={editingRule} onSave={handleSave} onClose={() => { setShowCreate(false); setEditingRule(null); }} />}
      {historyRuleId && <HistoryModal ruleId={historyRuleId} onClose={() => setHistoryRuleId(null)} />}
    </div>
  );
};
