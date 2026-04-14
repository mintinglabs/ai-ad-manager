import { useState, useCallback, useEffect, useRef } from 'react';
import { Search, RefreshCw, Plus, Loader2, Trash2, X, Play, Pause, ChevronDown, ChevronRight, Clock, AlertTriangle, CheckCircle, Settings2, Edit3, Sparkles, ArrowRight, TrendingUp, Zap, Target, BarChart3, Shield, DollarSign } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
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
  { value: 'PAUSE', label: 'Turn off', desc: 'Pause the campaign, ad set, or ad' },
  { value: 'UNPAUSE', label: 'Turn on', desc: 'Activate the campaign, ad set, or ad' },
  { value: 'CHANGE_BUDGET', label: 'Adjust budget', desc: 'Increase or decrease daily budget' },
  { value: 'CHANGE_BID', label: 'Adjust bid', desc: 'Increase or decrease bid amount' },
  { value: 'SEND_NOTIFICATION', label: 'Send notification', desc: 'Send email notification only' },
];

const METRIC_FIELDS = [
  { value: 'cost_per_result', label: 'Cost per result (CPA)' },
  { value: 'cpm', label: 'CPM' },
  { value: 'cpc', label: 'CPC (cost per click)' },
  { value: 'ctr', label: 'CTR (click-through rate)' },
  { value: 'spend', label: 'Amount spent' },
  { value: 'impressions', label: 'Impressions' },
  { value: 'reach', label: 'Reach' },
  { value: 'frequency', label: 'Frequency' },
  { value: 'results', label: 'Results' },
  { value: 'roas', label: 'ROAS' },
];

const OPERATORS = [
  { value: 'GREATER_THAN', label: 'is greater than' },
  { value: 'LESS_THAN', label: 'is less than' },
  { value: 'IN_RANGE', label: 'is between' },
  { value: 'NOT_IN_RANGE', label: 'is not between' },
];

const TIME_PRESETS = [
  { value: 'TODAY', label: 'Today' },
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

// ── Rule Templates (problem-oriented, with prefill for quick apply) ──
const RULE_TEMPLATES = [
  {
    id: 'waste', icon: Shield, category: 'Protection', categoryColor: 'text-red-600 bg-red-50 border-red-100',
    name: 'Stop Wasting Budget',
    desc: 'Auto-pause campaigns that are spending money but generating zero results',
    prefill: { name: 'Stop Wasting Budget', actionType: 'PAUSE', conditions: [{ field: 'spent', operator: 'GREATER_THAN', value: '50', time_preset: 'LAST_7_DAYS' }, { field: 'results', operator: 'LESS_THAN', value: '1', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'cpa', icon: AlertTriangle, category: 'Protection', categoryColor: 'text-red-600 bg-red-50 border-red-100',
    name: 'Protect Your CPA',
    desc: 'Auto-pause when your cost per result spikes above your target',
    prefill: { name: 'Protect Your CPA', actionType: 'PAUSE', conditions: [{ field: 'cost_per_result', operator: 'GREATER_THAN', value: '50', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'scale', icon: TrendingUp, category: 'Growth', categoryColor: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    name: 'Scale What\'s Working',
    desc: 'Auto-increase budget on your best performing campaigns when ROAS is strong',
    prefill: { name: 'Scale Winners', actionType: 'CHANGE_BUDGET', budgetAction: 'INCREASE', budgetAmount: '20', budgetUnit: 'PERCENTAGE', conditions: [{ field: 'roas', operator: 'GREATER_THAN', value: '3', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'fatigue', icon: Target, category: 'Protection', categoryColor: 'text-red-600 bg-red-50 border-red-100',
    name: 'Fight Ad Fatigue',
    desc: 'Pause ads automatically before your audience gets tired of seeing them',
    prefill: { name: 'Anti-Fatigue Guard', actionType: 'PAUSE', conditions: [{ field: 'frequency', operator: 'GREATER_THAN', value: '4', time_preset: 'LAST_7_DAYS' }], schedule: 'DAILY' },
  },
  {
    id: 'overspend', icon: DollarSign, category: 'Safety', categoryColor: 'text-blue-600 bg-blue-50 border-blue-100',
    name: 'Budget Overspend Guard',
    desc: 'Get notified immediately when daily spend exceeds your budget limit',
    prefill: { name: 'Overspend Alert', actionType: 'SEND_NOTIFICATION', conditions: [{ field: 'spent', operator: 'GREATER_THAN', value: '500', time_preset: 'TODAY' }], schedule: 'HOURLY' },
  },
];

// ── Quick Setup Templates ──
const QuickTemplates = ({ onSelect }) => (
  <div className="mb-6">
    <div className="mb-4">
      <h3 className="text-[13px] font-bold text-slate-800 mb-1">Quick Setup</h3>
      <p className="text-[11px] text-slate-400">Pick a template, adjust the threshold, and enable — takes under 30 seconds.</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {RULE_TEMPLATES.map(t => {
        const Icon = t.icon;
        return (
          <button key={t.id} onClick={() => onSelect(t)}
            className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-lg hover:border-violet-300 transition-all text-left group">
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl ${t.categoryColor} border flex items-center justify-center shrink-0`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.categoryColor}`}>
                    {t.category}
                  </span>
                </div>
                <h4 className="text-[13px] font-bold text-slate-800 mb-1 group-hover:text-violet-600 transition-colors">{t.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{t.desc}</p>
              </div>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-violet-500 transition-colors shrink-0 mt-1" />
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

// ── Select dropdown ──
const Select = ({ value, options, onChange, placeholder, className = '' }) => (
  <select value={value || ''} onChange={e => onChange(e.target.value)}
    className={`text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 ${className}`}>
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ── Inline value editor ──
const InlineInput = ({ value, onChange, type = 'number', className = '' }) => (
  <input type={type} value={value} onChange={e => onChange(e.target.value)}
    className={`inline-block w-20 text-center text-[14px] font-bold text-violet-700 border-b-2 border-violet-300 bg-violet-50/50 rounded-md px-2 py-1.5 focus:outline-none focus:border-violet-500 focus:bg-violet-50 transition-colors ${className}`} />
);

const InlineSelect = ({ value, options, onChange }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className="inline-block text-[13px] font-semibold text-violet-700 border-b-2 border-violet-300 bg-violet-50/50 rounded-md px-2 py-1.5 focus:outline-none focus:border-violet-500 appearance-none cursor-pointer">
    {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ── Build summary sentence ──
const buildSummary = ({ actionType, budgetAction, budgetAmount, budgetUnit, conditions, entityType, schedule }) => {
  const scheduleLabel = { SEMI_HOURLY: 'Every 30 minutes', HOURLY: 'Every hour', DAILY: 'Every day', CUSTOM: 'On a custom schedule' }[schedule] || 'Every day';
  const entityLabel = { CAMPAIGN: 'campaigns', ADSET: 'ad sets', AD: 'ads' }[entityType] || 'campaigns';
  const condParts = conditions.map(c => {
    const fieldLabel = METRIC_FIELDS.find(f => f.value === c.field)?.label || c.field;
    const opLabel = { GREATER_THAN: 'above', LESS_THAN: 'below', IN_RANGE: 'between', NOT_IN_RANGE: 'outside' }[c.operator] || c.operator;
    return `${fieldLabel} is ${opLabel} ${c.value || '...'}`;
  }).join(' and ');
  let actionLabel = '';
  if (actionType === 'PAUSE') actionLabel = `pause ${entityLabel}`;
  else if (actionType === 'UNPAUSE') actionLabel = `activate ${entityLabel}`;
  else if (actionType === 'CHANGE_BUDGET') actionLabel = `${(budgetAction || 'INCREASE').toLowerCase()} budget by ${budgetAmount || '...'}${budgetUnit === 'PERCENTAGE' ? '%' : ' $'}`;
  else if (actionType === 'SEND_NOTIFICATION') actionLabel = 'send you a notification';
  else actionLabel = actionType?.toLowerCase() || '...';
  return `${scheduleLabel}, ${actionLabel} where ${condParts}`;
};

// ── Create/Edit Rule Modal (Option A: inline sentence style) ──
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

  // Parse existing rule for editing
  useEffect(() => {
    if (!rule) return;
    if (rule.evaluation_spec?.filters) {
      const filters = rule.evaluation_spec.filters;
      if (filters.length) {
        setConditions(filters.map(f => ({
          field: f.field || 'cost_per_result',
          operator: f.operator || 'GREATER_THAN',
          value: f.value || '',
          time_preset: f.time_preset || rule.evaluation_spec?.time_preset || 'LAST_7_DAYS',
        })));
      }
    }
    if (rule.execution_spec?.execution_type) setActionType(rule.execution_spec.execution_type);
    if (rule.schedule_spec?.schedule_type) setSchedule(rule.schedule_spec.schedule_type);
    if (rule._budgetAction) setBudgetAction(rule._budgetAction);
    if (rule._budgetAmount) setBudgetAmount(rule._budgetAmount);
    if (rule._budgetUnit) setBudgetUnit(rule._budgetUnit);
  }, [rule]);

  const updateCondition = (idx, key, val) => {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [key]: val } : c));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const evaluation_spec = {
        evaluation_type: 'SCHEDULE',
        filters: conditions.map(c => ({ field: c.field, operator: c.operator, value: c.value })),
        time_preset: conditions[0]?.time_preset || 'LAST_7_DAYS',
        entity_type: entityType,
      };
      const execution_spec = { execution_type: actionType };
      if (actionType === 'CHANGE_BUDGET') {
        execution_spec.execution_options = [{
          field: 'daily_budget',
          operator: budgetAction === 'INCREASE' ? 'INCREASE' : 'DECREASE',
          value: Number(budgetAmount) || 0,
          unit: budgetUnit,
        }];
      }
      const schedule_spec = { schedule_type: schedule };
      await onSave({ id: rule?.id, name: name.trim(), evaluation_spec, execution_spec, schedule_spec });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Template header */}
        {templateMatch && (
          <div className={`px-6 py-4 border-b ${templateMatch.categoryColor} flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl border ${templateMatch.categoryColor} flex items-center justify-center`}>
              <templateMatch.icon size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-slate-800">{templateMatch.name}</h3>
                <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${templateMatch.categoryColor}`}>
                  {templateMatch.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">{templateMatch.desc}</p>
            </div>
          </div>
        )}
        {!templateMatch && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800">{isEdit ? 'Edit Rule' : 'Create Automation Rule'}</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Inline sentence config */}
        <div className="px-6 py-6 space-y-5">
          {/* Rule name (compact) */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Rule Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full text-[13px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300" />
          </div>

          {/* Sentence-style config */}
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <div className="space-y-4 text-[13px] text-slate-600 leading-relaxed">
              {/* When condition */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-slate-800 font-semibold">When</span>
                <InlineSelect value={conditions[0]?.field || 'cost_per_result'} options={METRIC_FIELDS}
                  onChange={v => updateCondition(0, 'field', v)} />
                <span>is</span>
                <InlineSelect value={conditions[0]?.operator || 'GREATER_THAN'} options={OPERATORS}
                  onChange={v => updateCondition(0, 'operator', v)} />
                <InlineInput value={conditions[0]?.value || ''} onChange={v => updateCondition(0, 'value', v)} />
              </div>

              {/* Time window */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-slate-800 font-semibold">in the last</span>
                <InlineSelect value={conditions[0]?.time_preset || 'LAST_7_DAYS'} options={TIME_PRESETS}
                  onChange={v => setConditions(prev => prev.map(c => ({ ...c, time_preset: v })))} />
              </div>

              {/* Action */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-slate-800 font-semibold">Then</span>
                <InlineSelect value={actionType} options={ACTION_TYPES.map(a => ({ value: a.value, label: a.label.toLowerCase() }))}
                  onChange={setActionType} />
                {actionType === 'CHANGE_BUDGET' && (
                  <>
                    <span>by</span>
                    <InlineInput value={budgetAmount} onChange={setBudgetAmount} className="w-16" />
                    <InlineSelect value={budgetUnit} options={[{ value: 'PERCENTAGE', label: '%' }, { value: 'ABSOLUTE', label: '$' }]}
                      onChange={setBudgetUnit} />
                  </>
                )}
              </div>

              {/* Scope */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-slate-800 font-semibold">on all active</span>
                <InlineSelect value={entityType} options={ENTITY_TYPES} onChange={setEntityType} />
              </div>

              {/* Schedule */}
              <div className="flex items-center flex-wrap gap-2">
                <span className="text-slate-800 font-semibold">Check</span>
                <InlineSelect value={schedule} options={SCHEDULE_OPTIONS} onChange={setSchedule} />
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="flex items-start gap-2 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-100">
            <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
            <p className="text-[12px] text-emerald-700 leading-relaxed">
              {buildSummary({ actionType, budgetAction, budgetAmount, budgetUnit, conditions, entityType, schedule })}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !conditions[0]?.value || saving}
            className="flex items-center gap-1.5 px-5 py-2.5 text-[12px] text-white bg-violet-600 hover:bg-violet-500 rounded-lg font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Zap size={13} />
            {saving ? 'Creating...' : isEdit ? 'Update Rule' : 'Enable Rule'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Rule card ──
const RuleCard = ({ rule, onToggle, onEdit, onDelete, onViewHistory, updating }) => {
  const isActive = rule.status === 'ENABLED';
  const actionType = rule.execution_spec?.execution_type || '';
  const actionLabel = ACTION_TYPES.find(a => a.value === actionType)?.label || actionType || 'Unknown';
  const scheduleLabel = SCHEDULE_OPTIONS.find(s => s.value === rule.schedule_spec?.schedule_type)?.label || rule.schedule_spec?.schedule_type || 'Custom';

  return (
    <div className={`bg-white rounded-xl border overflow-hidden transition-all hover:shadow-md ${isActive ? 'border-slate-200' : 'border-slate-200 opacity-60'}`}>
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Colored letter avatar */}
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-bold shrink-0
              ${isActive ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-400'}`}>
              {rule.name?.charAt(0)?.toUpperCase() || 'R'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-[13px] font-bold text-slate-800 truncate">{rule.name}</h3>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                  {isActive ? 'Active' : 'Paused'}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 flex items-center gap-1">
                  <Zap size={9} /> {actionType.replace(/_/g, '_')}
                </span>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} /> {scheduleLabel}
                </span>
              </div>
              {rule.evaluation_spec?.filters?.length > 0 && (
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  {rule.evaluation_spec.filters.map((f, i) => (
                    <span key={i} className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 font-medium">
                      {METRIC_FIELDS.find(m => m.value === f.field)?.label || f.field} <span className="text-slate-400 font-normal">{OPERATORS.find(o => o.value === f.operator)?.label || f.operator}</span> {f.value}
                    </span>
                  ))}
                  {rule.evaluation_spec?.time_preset && (
                    <span className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 font-medium">
                      Time <span className="text-slate-400 font-normal">preset</span>
                    </span>
                  )}
                  <span className="text-[10px] bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 font-medium">
                    Entity <span className="text-slate-400 font-normal">type</span>
                  </span>
                  <button className="text-[10px] text-blue-500 hover:text-blue-600 font-medium flex items-center gap-0.5 px-1.5 py-0.5">
                    <Plus size={10} /> Add Filter
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => onToggle(rule.id, isActive)}
              disabled={updating}
              className={`w-10 h-[22px] rounded-full transition-colors duration-200 relative ${updating ? 'opacity-50' : ''} ${isActive ? 'bg-blue-500' : 'bg-slate-200'}`}>
              <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'translate-x-[18px]' : ''}`} />
            </button>
            <button onClick={() => onEdit(rule)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition-colors">
              <Edit3 size={13} />
            </button>
            <button onClick={() => onDelete(rule.id)}
              className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
      <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
        <span className="text-[10px] text-slate-300">
          Created {fmtDate(rule.created_time)} · Last check 2 hours ago
        </span>
        <button onClick={() => onViewHistory(rule.id)}
          className="text-[10px] font-medium text-violet-500 hover:text-violet-600 flex items-center gap-0.5 transition-colors">
          View Execution History <ChevronRight size={11} />
        </button>
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
    api.get(`/rules/${ruleId}/history`).then(({ data }) => {
      setHistory(data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [ruleId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Rule Execution History</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <div className="py-12 text-center text-[13px] text-slate-400">No execution history yet</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((entry, i) => (
                <div key={i} className="px-5 py-3 flex items-center gap-3">
                  {entry.result === 'SUCCESS' ? (
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  )}
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
  const [showAskAI, setShowAskAI] = useState(false);
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
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/rules', { params: { adAccountId } });
      setRules(data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
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
    } catch (err) {
      console.error('Toggle failed:', err);
    } finally {
      setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!confirm('Delete this rule? This cannot be undone.')) return;
    try {
      await api.delete(`/rules/${id}`);
      setRules(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

  const filtered = rules.filter(r => {
    if (statusFilter === 'active' && r.status !== 'ENABLED') return false;
    if (statusFilter === 'paused' && r.status === 'ENABLED') return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const activeCount = rules.filter(r => r.status === 'ENABLED').length;
  const pausedCount = rules.filter(r => r.status !== 'ENABLED').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Settings2 size={20} className="text-violet-500" />
                Automation Rules
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                {loading ? 'Loading...' : (<>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  {activeCount} active · {pausedCount} paused
                </>)}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchRules} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => onPrefillChat?.('I want to create a new automation rule for my campaigns. Help me set it up.')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors shadow-sm">
              <Plus size={13} /> Create Rule
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-6 py-3 shrink-0 bg-white border-b border-slate-100">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : (
          <>
            {/* Quick Setup Templates */}
            <QuickTemplates onSelect={(t) => {
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
            }} />

            {/* YOUR RULES section */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Rules</span>
              <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
                {[['all', 'All'], ['active', 'Active'], ['paused', 'Paused']].map(([val, label]) => (
                  <button key={val} onClick={() => setStatusFilter(val)}
                    className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading && rules.length === 0 ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 size={24} className="animate-spin text-slate-400" />
                <span className="ml-2 text-sm text-slate-400">Loading rules...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                  <Settings2 size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">{search ? 'No matching rules' : 'No automation rules yet'}</p>
                <p className="text-xs text-slate-400 mb-5">{search ? 'Try a different search' : 'Create rules to automatically manage your campaigns.'}</p>
                {!search && (
                  <button onClick={() => { setEditingRule(null); setShowCreate(true); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-violet-600 text-white hover:bg-violet-500 transition-colors shadow-sm">
                    <Plus size={13} /> Create Your First Rule
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map(rule => (
                  <RuleCard
                    key={rule.id}
                    rule={rule}
                    onToggle={handleToggle}
                    onEdit={(r) => { setEditingRule(r); setShowCreate(true); }}
                    onDelete={handleDelete}
                    onViewHistory={setHistoryRuleId}
                    updating={updatingIds.has(rule.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Create/Edit modal */}
      {showCreate && (
        <RuleModal
          rule={editingRule}
          onSave={handleSave}
          onClose={() => { setShowCreate(false); setEditingRule(null); }}
        />
      )}

      {/* History modal */}
      {historyRuleId && (
        <HistoryModal ruleId={historyRuleId} onClose={() => setHistoryRuleId(null)} />
      )}

    </div>
  );
};
