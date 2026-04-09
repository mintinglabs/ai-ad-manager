import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Search, RefreshCw, ChevronRight, Settings2, Image as ImageIcon, Loader2, Sparkles, X, Send, Pause, Play, Trash2, DollarSign, ChevronDown } from 'lucide-react';
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

// ── Column definitions ──
const ALL_COLUMNS = [
  { id: 'status', label: 'Status', group: 'Basic' },
  { id: 'budget', label: 'Budget', group: 'Basic' },
  { id: 'spent', label: 'Spent', group: 'Basic' },
  { id: 'results', label: 'Results', group: 'Performance' },
  { id: 'cpa', label: 'Cost / Result', group: 'Performance' },
  { id: 'roas', label: 'ROAS', group: 'Performance' },
  { id: 'impressions', label: 'Impressions', group: 'Delivery' },
  { id: 'reach', label: 'Reach', group: 'Delivery' },
  { id: 'clicks', label: 'Clicks', group: 'Engagement' },
  { id: 'ctr', label: 'CTR', group: 'Engagement' },
  { id: 'cpm', label: 'CPM', group: 'Cost' },
  { id: 'frequency', label: 'Frequency', group: 'Delivery' },
  { id: 'conversions', label: 'Conversions', group: 'Performance' },
  { id: 'conv_value', label: 'Conv. Value', group: 'Performance' },
];

const COLUMN_PRESETS = [
  { id: 'performance', label: 'Performance', cols: ['status', 'budget', 'spent', 'results', 'cpa'] },
  { id: 'full_performance', label: 'Full Performance', cols: ['status', 'budget', 'spent', 'results', 'cpa', 'roas', 'conv_value'] },
  { id: 'delivery', label: 'Delivery', cols: ['status', 'budget', 'spent', 'impressions', 'reach', 'frequency'] },
  { id: 'engagement', label: 'Engagement', cols: ['status', 'impressions', 'clicks', 'ctr', 'cpm'] },
  { id: 'ecommerce', label: 'E-commerce', cols: ['status', 'budget', 'spent', 'results', 'cpa', 'roas', 'conversions', 'conv_value'] },
];

// ── Helpers ──
const fmtNum = (n) => n != null ? Number(n).toLocaleString() : '—';
const fmtCurrency = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
const fmtPct = (n) => n != null ? `${Number(n).toFixed(2)}%` : '—';
const fmtBudget = (daily, lifetime) => {
  if (daily) return `$${(Number(daily) / 100).toFixed(0)}/d`;
  if (lifetime) return `$${(Number(lifetime) / 100).toFixed(0)} LT`;
  return '—';
};

const extractMetrics = (item) => {
  const ins = item.insights?.data?.[0] || {};
  const actions = ins.actions || [];
  const actionValues = ins.action_values || [];
  const costPerAction = ins.cost_per_action_type || [];
  const resultAction = actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_purchase')
    || actions.find(a => a.action_type === 'offsite_conversion.fb_pixel_view_content')
    || actions.find(a => a.action_type === 'link_click')
    || actions[0];
  const resultValue = actionValues.find(a => a.action_type === resultAction?.action_type);
  const resultCpa = costPerAction.find(a => a.action_type === resultAction?.action_type);
  const roas = resultValue && ins.spend ? (Number(resultValue.value) / Number(ins.spend)).toFixed(1) + 'x' : null;
  return {
    spent: ins.spend ? fmtCurrency(ins.spend) : '—',
    impressions: ins.impressions ? fmtNum(ins.impressions) : '—',
    reach: ins.reach ? fmtNum(ins.reach) : '—',
    clicks: ins.clicks ? fmtNum(ins.clicks) : '—',
    ctr: ins.ctr ? fmtPct(ins.ctr) : '—',
    cpm: ins.cpm ? fmtCurrency(ins.cpm) : '—',
    frequency: ins.frequency ? Number(ins.frequency).toFixed(2) : '—',
    results: resultAction ? fmtNum(resultAction.value) : '—',
    cpa: resultCpa ? fmtCurrency(resultCpa.value) : '—',
    roas: roas || '—',
    conversions: resultAction ? fmtNum(resultAction.value) : '—',
    conv_value: resultValue ? fmtCurrency(resultValue.value) : '—',
  };
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
    className={`w-8 h-[18px] rounded-full transition-colors duration-200 relative ${loading ? 'opacity-50' : ''} ${active ? 'bg-blue-500' : 'bg-slate-200'}`}>
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

// ── Column dropdown ──
const ColumnDropdown = ({ columns, onSetColumns, onClose }) => {
  const [selected, setSelected] = useState(new Set(columns));
  const grouped = useMemo(() => {
    const g = {};
    ALL_COLUMNS.forEach(c => { (g[c.group] = g[c.group] || []).push(c); });
    return g;
  }, []);
  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="absolute top-full right-0 mt-1 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 w-80 overflow-hidden" onClick={e => e.stopPropagation()}>
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Quick presets</p>
        <div className="flex flex-wrap gap-1.5">
          {COLUMN_PRESETS.map(p => (
            <button key={p.id} onClick={() => setSelected(new Set(p.cols))}
              className="px-3 py-1.5 text-[11px] font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all">
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="px-4 py-3 max-h-[280px] overflow-y-auto border-t border-slate-100">
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
      <div className="px-4 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
        <span className="text-[11px] text-slate-400">{selected.size} columns</span>
        <div className="flex gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-[11px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={() => { onSetColumns([...selected]); onClose(); }}
            className="px-3 py-1.5 text-[11px] text-white bg-blue-500 hover:bg-blue-600 rounded-lg font-medium shadow-sm">Apply</button>
        </div>
      </div>
    </div>
  );
};

// ── Cell value ──
const CellValue = ({ value }) => (
  <span className={`text-[12px] tabular-nums ${!value || value === '—' ? 'text-slate-300' : 'text-slate-600'}`}>{value || '—'}</span>
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
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[480px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800">Ask AI Agent</h3>
            {selectedIds?.length > 0 && (
              <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">{selectedIds.length} selected</span>
            )}
          </div>
          <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
        <div className="p-5">
          <p className="text-[12px] text-slate-400 mb-3">What would you like the AI agent to do?</p>
          <textarea ref={inputRef} value={text} onChange={e => setText(e.target.value)}
            placeholder="e.g. Pause all campaigns with CPA above $100, Scale budget by 15% for top performers..."
            className="w-full h-24 text-sm text-slate-700 border border-slate-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder:text-slate-300"
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} />
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSubmit} disabled={!text.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-[12px] text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Send size={12} /> Send to AI
          </button>
        </div>
      </div>
    </>
  );
};

// ── Main Component ──
export const CampaignManager = ({ adAccountId, onBack, onSendToChat, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [platform, setPlatform] = useState('meta');
  const [showAskAI, setShowAskAI] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [columns, setColumns] = useState(['status', 'budget', 'spent', 'results', 'cpa']);
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [updatingIds, setUpdatingIds] = useState(new Set());

  // Tab-based navigation like Meta Ads Manager
  const [activeTab, setActiveTab] = useState('campaigns'); // 'campaigns' | 'adsets' | 'ads'
  const [selectedCampaign, setSelectedCampaign] = useState(null); // for filtering ad sets
  const [selectedAdSet, setSelectedAdSet] = useState(null); // for filtering ads

  // Data
  const [campaigns, setCampaigns] = useState([]);
  const [adSets, setAdSets] = useState([]);
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Normalize
  const normCampaign = (c) => ({ ...c, _active: c.status === 'ACTIVE', _status: mapStatus(c.status, c.effective_status), _budget: fmtBudget(c.daily_budget, c.lifetime_budget), _metrics: extractMetrics(c), _level: 'campaign' });
  const normAdSet = (as) => ({ ...as, _active: as.status === 'ACTIVE', _status: mapStatus(as.status, as.effective_status), _budget: fmtBudget(as.daily_budget, as.lifetime_budget), _metrics: extractMetrics(as), _level: 'adset', _campaignName: as._campaignName });
  const normAd = (ad) => ({ ...ad, _active: ad.status === 'ACTIVE', _status: mapStatus(ad.status, ad.effective_status), _budget: '—', _metrics: extractMetrics(ad), _level: 'ad', thumbnail: ad.creative?.thumbnail_url || ad.creative?.image_url || null });

  // Fetch campaigns
  const fetchCampaigns = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/meta/adaccounts/${adAccountId}/campaigns-tree`);
      setCampaigns((data || []).map(normCampaign));
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  // Fetch ad sets (for a campaign or all)
  const fetchAdSets = useCallback(async (campaignId) => {
    if (!adAccountId) return;
    setLoading(true);
    try {
      if (campaignId) {
        const { data } = await api.get(`/meta/campaigns/${campaignId}/adsets`);
        const campaign = campaigns.find(c => c.id === campaignId);
        setAdSets((data || []).map(as => normAdSet({ ...as, _campaignName: campaign?.name })));
      } else {
        // Fetch all ad sets for the account
        const { data } = await api.get(`/meta/adaccounts/${adAccountId}/adsets`);
        setAdSets((data || []).map(as => normAdSet(as)));
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, campaigns]);

  // Fetch ads (for an ad set or all)
  const fetchAds = useCallback(async (adSetId) => {
    if (!adAccountId) return;
    setLoading(true);
    try {
      if (adSetId) {
        const { data } = await api.get(`/meta/adsets/${adSetId}/ads`);
        setAds((data || []).map(normAd));
      } else {
        const { data } = await api.get(`/meta/adaccounts/${adAccountId}/ads`);
        setAds((data || []).map(normAd));
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  // Navigate to ad sets when clicking a campaign
  const drillIntoCampaign = useCallback((campaign) => {
    setSelectedCampaign(campaign);
    setSelectedAdSet(null);
    setActiveTab('adsets');
    setSelectedIds(new Set());
    setSearch('');
    fetchAdSets(campaign.id);
  }, [fetchAdSets]);

  // Navigate to ads when clicking an ad set
  const drillIntoAdSet = useCallback((adSet) => {
    setSelectedAdSet(adSet);
    setActiveTab('ads');
    setSelectedIds(new Set());
    setSearch('');
    fetchAds(adSet.id);
  }, [fetchAds]);

  // Tab click handler
  const handleTabClick = useCallback((tab) => {
    setActiveTab(tab);
    setSelectedIds(new Set());
    setSearch('');
    if (tab === 'campaigns') {
      setSelectedCampaign(null);
      setSelectedAdSet(null);
    } else if (tab === 'adsets') {
      setSelectedAdSet(null);
      if (selectedCampaign) fetchAdSets(selectedCampaign.id);
      else fetchAdSets();
    } else if (tab === 'ads') {
      if (selectedAdSet) fetchAds(selectedAdSet.id);
      else fetchAds();
    }
  }, [selectedCampaign, selectedAdSet, fetchAdSets, fetchAds]);

  // Current data based on active tab
  const currentData = activeTab === 'campaigns' ? campaigns : activeTab === 'adsets' ? adSets : ads;

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
      const endpoint = activeTab === 'campaigns' ? '/meta/campaigns/bulk'
        : activeTab === 'adsets' ? '/meta/adsets/bulk'
        : '/meta/ads/bulk';
      // Call individual updates (Meta API doesn't have a native bulk endpoint for this)
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
        const aVal = sortKey === 'budget' ? parseNumeric(a._budget) : parseNumeric(a._metrics?.[sortKey]);
        const bVal = sortKey === 'budget' ? parseNumeric(b._budget) : parseNumeric(b._metrics?.[sortKey]);
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    return list;
  }, [currentData, statusFilter, search, sortKey, sortDir]);

  const activeCount = currentData.filter(c => c._active).length;
  const pausedCount = currentData.filter(c => !c._active).length;
  const levelLabel = activeTab === 'campaigns' ? 'Campaign' : activeTab === 'adsets' ? 'Ad Set' : 'Ad';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                Campaigns
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${activeCount} active · ${pausedCount} paused`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { if (activeTab === 'campaigns') fetchCampaigns(); else if (activeTab === 'adsets') fetchAdSets(selectedCampaign?.id); else fetchAds(selectedAdSet?.id); }}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            <button onClick={() => setShowAskAI(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm">
              <Sparkles size={13} /> Ask AI Agent
            </button>
          </div>
        </div>

        {/* Platform tabs */}
        <div className="flex items-center gap-0 px-6">
          <button onClick={() => setPlatform('meta')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${platform === 'meta' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            <MetaIcon /> Meta Ads
          </button>
          <button disabled className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-300 cursor-not-allowed">
            <GoogleIcon /> Google Ads <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
          </button>
          <button disabled className="flex items-center gap-2 px-4 py-2.5 text-xs font-medium border-b-2 border-transparent text-slate-300 cursor-not-allowed">
            <TikTokIcon /> TikTok Ads <span className="text-[9px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full font-semibold">Soon</span>
          </button>
        </div>
      </div>

      {/* Level tabs (Campaigns | Ad Sets | Ads) + Breadcrumb */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-0">
            {['campaigns', 'adsets', 'ads'].map(tab => (
              <button key={tab} onClick={() => handleTabClick(tab)}
                className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                {tab === 'campaigns' ? 'Campaigns' : tab === 'adsets' ? 'Ad Sets' : 'Ads'}
              </button>
            ))}
          </div>
          {/* Breadcrumb */}
          {(selectedCampaign || selectedAdSet) && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <button onClick={() => handleTabClick('campaigns')} className="hover:text-blue-600 transition-colors">All Campaigns</button>
              {selectedCampaign && (
                <>
                  <ChevronRight size={12} />
                  <button onClick={() => drillIntoCampaign(selectedCampaign)}
                    className={`hover:text-blue-600 transition-colors ${activeTab === 'adsets' ? 'text-slate-700 font-medium' : ''}`}>
                    {selectedCampaign.name?.slice(0, 30)}{selectedCampaign.name?.length > 30 ? '...' : ''}
                  </button>
                </>
              )}
              {selectedAdSet && (
                <>
                  <ChevronRight size={12} />
                  <span className="text-slate-700 font-medium">
                    {selectedAdSet.name?.slice(0, 30)}{selectedAdSet.name?.length > 30 ? '...' : ''}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <BulkActionBar
          count={selectedIds.size}
          onActivate={() => bulkUpdateStatus('ACTIVE')}
          onPause={() => bulkUpdateStatus('PAUSED')}
          onDelete={bulkDelete}
          onAskAI={() => setShowAskAI(true)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white border-b border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${levelLabel.toLowerCase()}s...`}
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[['all', 'All'], ['active', 'Active'], ['paused', 'Paused']].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3.5 py-2 text-[11px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setShowColumnDropdown(!showColumnDropdown)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-[11px] font-medium transition-all ${showColumnDropdown ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}>
            <Settings2 size={13} /> Columns
          </button>
          {showColumnDropdown && (
            <ColumnDropdown columns={columns} onSetColumns={setColumns} onClose={() => setShowColumnDropdown(false)} />
          )}
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
        ) : loading && currentData.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading {levelLabel.toLowerCase()}s...</span>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-2.5 px-3 w-10">
                    <input type="checkbox" checked={selectedIds.size === filtered.length && filtered.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30" />
                  </th>
                  <th className="py-2.5 px-3 w-14"></th>
                  <th className="py-2.5 pl-4 pr-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 select-none"
                    onClick={() => handleSort('name')}>
                    {levelLabel} Name {sortKey === 'name' && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </th>
                  {columns.map(colId => {
                    const col = ALL_COLUMNS.find(c => c.id === colId);
                    return (
                      <th key={colId} onClick={() => handleSort(colId)}
                        className="py-2.5 px-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-slate-600 select-none">
                        {col?.label} {sortKey === colId && <span className="ml-0.5">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => (
                  <tr key={item.id}
                    className={`border-b border-slate-100 hover:bg-blue-50/30 transition-colors group ${selectedIds.has(item.id) ? 'bg-blue-50/50' : ''}`}>
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
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.objective?.replace(/_/g, ' ')}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    {/* Metric columns */}
                    {columns.map(colId => {
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
                        return (
                          <td key={colId} className="py-3 px-3 relative whitespace-nowrap" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setEditingBudget(item.id)}
                              className="text-[12px] font-medium text-slate-600 hover:text-blue-600 hover:underline decoration-blue-300 underline-offset-2 transition-colors tabular-nums">
                              {item._budget}
                            </button>
                            {editingBudget === item.id && (
                              <BudgetEditor value={item._budget} onSave={(v) => handleSaveBudget(item.id, v)} onCancel={() => setEditingBudget(null)} />
                            )}
                          </td>
                        );
                      }
                      return <td key={colId} className="py-3 px-3 whitespace-nowrap"><CellValue value={item._metrics?.[colId]} /></td>;
                    })}
                  </tr>
                ))}
                {filtered.length === 0 && !loading && (
                  <tr><td colSpan={columns.length + 3} className="py-12 text-center text-[13px] text-slate-400">
                    No {levelLabel.toLowerCase()}s found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
