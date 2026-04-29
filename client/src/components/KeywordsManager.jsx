// Keywords module — frontend for Google Ads keyword management.
//
// Three tabs in one screen, all driven off a shared
// (campaign, adGroup, dateRange) selection in the filter bar:
//   1. Keywords        — positive keywords inside the picked ad group(s)
//   2. Negative Keywords — campaign- or ad-group-level negatives
//   3. Search Terms    — what users actually typed; one-click "block"
//
// All data flows through useGoogleKeywords (REST endpoints under
// /api/google/keywords). Visual conventions match CampaignManager /
// AudienceManager — same header style, same connect-Google empty state,
// same card / table treatments.
import { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Hash, ChevronLeft, RefreshCw, Search, Plus, Ban, X, AlertOctagon,
  Sparkles, Filter, MessageSquare, Target, Activity, Send,
} from 'lucide-react';
import api from '../services/api.js';
import { useGoogleKeywords } from '../hooks/useGoogleKeywords.js';
import { useRequireAuth } from '../lib/authGate.jsx';
import { PlatformAccountSelector } from './PlatformAccountSelector.jsx';

// Date-range options align with what the backend accepts (parseDateRange).
const DATE_RANGES = [
  { value: 'LAST_7_DAYS',  label: 'Last 7 days' },
  { value: 'LAST_14_DAYS', label: 'Last 14 days' },
  { value: 'LAST_30_DAYS', label: 'Last 30 days' },
  { value: 'LAST_90_DAYS', label: 'Last 90 days' },
  { value: 'THIS_MONTH',   label: 'This month' },
  { value: 'LAST_MONTH',   label: 'Last month' },
];

const MATCH_TYPES = ['EXACT', 'PHRASE', 'BROAD'];

const fmtNum = (n) => (n == null ? '—' : Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 }));
const fmtMoney = (n) => (n == null ? '—' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`);
const fmtPct = (n) => (n == null ? '—' : `${(Number(n) * 100).toFixed(2)}%`);

// ── Quality-score chip ────────────────────────────────────────────────────
// Google's QS is 1-10. Visual mapping: 1-4 red, 5-7 amber, 8-10 emerald.
// Falls back to a slate dash when QS is unset (common for new keywords).
const QualityScoreChip = ({ score }) => {
  if (score == null) return <span className="text-slate-300 text-[12px]">—</span>;
  const tone = score >= 8 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200/70'
            : score >= 5 ? 'bg-amber-50 text-amber-700 ring-amber-200/70'
            : 'bg-rose-50 text-rose-700 ring-rose-200/70';
  return <span className={`inline-flex items-center justify-center w-7 h-6 rounded-md ring-1 text-[11px] font-bold tabular-nums ${tone}`}>{score}</span>;
};

// ── Match-type pill ──────────────────────────────────────────────────────
const MatchPill = ({ matchType }) => {
  const t = String(matchType || '').toUpperCase();
  const color = t === 'EXACT'  ? 'bg-blue-50 text-blue-700 ring-blue-200/70'
             : t === 'PHRASE' ? 'bg-violet-50 text-violet-700 ring-violet-200/70'
             : t === 'BROAD'  ? 'bg-slate-100 text-slate-600 ring-slate-200/70'
             : 'bg-slate-100 text-slate-500 ring-slate-200/70';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-md ring-1 text-[10px] font-semibold tracking-wide ${color}`}>{t || '—'}</span>;
};

// ── Header / Filter Bar ──────────────────────────────────────────────────
const FilterBar = ({
  campaigns, adGroups, campaignId, setCampaignId, adGroupId, setAdGroupId,
  dateRange, setDateRange, search, setSearch, onRefresh, loading,
}) => (
  <div className="shrink-0 px-6 py-3 border-b border-slate-200 bg-white/60 backdrop-blur-sm flex items-center gap-2 flex-wrap">
    {/* Campaign — required, drives every fetch */}
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-slate-400">Campaign</span>
      <select value={campaignId} onChange={(e) => { setCampaignId(e.target.value); setAdGroupId(''); }}
        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-300 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 min-w-[180px] max-w-[280px] truncate">
        <option value="">Select campaign…</option>
        {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
    </div>
    {/* Ad Group — optional */}
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-slate-400">Ad group</span>
      <select value={adGroupId} onChange={(e) => setAdGroupId(e.target.value)} disabled={!campaignId}
        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-300 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 min-w-[160px] max-w-[260px] truncate disabled:bg-slate-50 disabled:text-slate-300">
        <option value="">All ad groups</option>
        {adGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
    {/* Date range */}
    <div className="flex items-center gap-1.5 text-[12px]">
      <span className="text-slate-400">Range</span>
      <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}
        className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-slate-300 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
        {DATE_RANGES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
      </select>
    </div>
    {/* Spacer pushes search + refresh to the right */}
    <div className="flex-1" />
    <div className="relative">
      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by text…"
        className="pl-8 pr-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[12px] text-slate-700 hover:border-slate-300 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 w-[180px]" />
    </div>
    <button onClick={onRefresh} disabled={loading || !campaignId}
      className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Refresh">
      <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
    </button>
  </div>
);

// ── KPI strip — sums across the visible keyword list ─────────────────────
const KpiStrip = ({ keywords }) => {
  const stats = useMemo(() => {
    return keywords.reduce((acc, k) => {
      acc.clicks += k.clicks || 0;
      acc.impressions += k.impressions || 0;
      acc.spend += k.spend || 0;
      acc.conversions += k.conversions || 0;
      return acc;
    }, { clicks: 0, impressions: 0, spend: 0, conversions: 0 });
  }, [keywords]);

  if (!keywords.length) return null;

  const items = [
    { Icon: Hash,            label: 'Keywords',    value: fmtNum(keywords.length),       tint: 'text-orange-500' },
    { Icon: Target,          label: 'Impressions', value: fmtNum(stats.impressions),     tint: 'text-blue-500' },
    { Icon: Activity,        label: 'Clicks',      value: fmtNum(stats.clicks),          tint: 'text-violet-500' },
    { Icon: MessageSquare,   label: 'Conversions', value: fmtNum(stats.conversions),     tint: 'text-emerald-500' },
    { Icon: Sparkles,        label: 'Spend',       value: fmtMoney(stats.spend),         tint: 'text-amber-500' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3 mb-4">
      {items.map((it, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200/70 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">{it.label}</p>
            <div className={`w-6 h-6 rounded-md bg-slate-50 flex items-center justify-center ${it.tint}`}>
              <it.Icon size={12} strokeWidth={2.25} />
            </div>
          </div>
          <p className="text-[20px] leading-none font-extrabold text-slate-900 tracking-tight">{it.value}</p>
        </div>
      ))}
    </div>
  );
};

// ── Add Keywords modal ───────────────────────────────────────────────────
// Used for both positive and negative keyword creation. `mode` flips:
//   • 'positive'        → requires adGroupId, calls addKeywords
//   • 'negative-camp'   → requires campaignId,  calls addNegativeKeywords(level=campaign)
//   • 'negative-adgrp'  → requires adGroupId,   calls addNegativeKeywords(level=adGroup)
const AddKeywordsModal = ({ mode, prefill = '', adGroups, defaultAdGroupId, defaultMatchType = 'PHRASE', onClose, onSubmit }) => {
  const [text, setText] = useState(prefill);
  const [matchType, setMatchType] = useState(defaultMatchType);
  const [adGroupId, setAdGroupId] = useState(defaultAdGroupId || (adGroups[0]?.id ?? ''));
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState(null);

  const needsAdGroup = mode === 'positive' || mode === 'negative-adgrp';

  const title = mode === 'positive'
    ? 'Add Keywords'
    : mode === 'negative-camp'
    ? 'Add Negative Keywords (Campaign)'
    : 'Add Negative Keywords (Ad Group)';

  const submit = async () => {
    setErr(null);
    const lines = text.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) { setErr('Add at least one keyword (one per line).'); return; }
    if (needsAdGroup && !adGroupId) { setErr('Pick an ad group.'); return; }
    setSubmitting(true);
    try {
      await onSubmit({ adGroupId, keywords: lines.map(t => ({ text: t, matchType })) });
      onClose();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Failed to add keywords');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <p className="text-[14px] font-bold text-slate-800">{title}</p>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"><X size={14} /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {needsAdGroup && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Ad Group</label>
              <select value={adGroupId} onChange={(e) => setAdGroupId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-700 focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100">
                <option value="">Select ad group…</option>
                {adGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Match Type</label>
            <div className="flex gap-1.5">
              {MATCH_TYPES.map(m => (
                <button key={m} onClick={() => setMatchType(m)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${matchType === m ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Keywords (one per line)</label>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6}
              placeholder={'running shoes\nleather running shoes\nbest running shoes for women'}
              className="w-full px-3 py-2 rounded-lg bg-white border border-slate-200 text-[13px] text-slate-700 leading-relaxed font-mono focus:outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 resize-none" />
          </div>
          {err && (
            <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-rose-50 border border-rose-200 text-[12px] text-rose-700">
              <AlertOctagon size={13} className="shrink-0 mt-0.5" /> <span>{err}</span>
            </div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3.5 py-1.5 rounded-lg text-[12px] font-semibold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
          <button onClick={submit} disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-sm shadow-orange-500/20 disabled:opacity-50 transition-all">
            {submitting ? <RefreshCw size={12} className="animate-spin" /> : <Plus size={12} />}
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Tab Bar ──────────────────────────────────────────────────────────────
const Tab = ({ active, onClick, children, count }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-colors flex items-center gap-1.5
      ${active ? 'bg-slate-900 text-white' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
    {children}
    {count != null && (
      <span className={`px-1.5 py-0 rounded text-[10px] font-bold ${active ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
    )}
  </button>
);

// ── Main component ───────────────────────────────────────────────────────
export const KeywordsManager = ({
  onBack, onSendToChat,
  // Meta props are forwarded straight to PlatformAccountSelector — the
  // selector is dual-platform so we accept both even though Keywords is
  // Google-only. Without these the picker can't render the Meta tab.
  token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount,
  googleConnected, googleCustomerId, googleLoginCustomerId,
  onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount,
}) => {
  const [campaignId, setCampaignId] = useState('');
  const [adGroupId, setAdGroupId] = useState('');
  const [dateRange, setDateRange] = useState('LAST_30_DAYS');
  const [tab, setTab] = useState('keywords'); // 'keywords' | 'negatives' | 'searchTerms'
  const [negativeLevel, setNegativeLevel] = useState('campaign'); // 'campaign' | 'adGroup'
  const [search, setSearch] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  // Initialised to `true` rather than toggled in the effect — see the
  // effect comment below for why. Stays `true` until the first fetch
  // finally resolves; subsequent re-fetches don't bounce it (intentional).
  const [campaignsLoading, setCampaignsLoading] = useState(true);
  const [campaignsError, setCampaignsError] = useState(null);
  const [modal, setModal] = useState(null); // { mode, prefill?, defaultMatchType? } | null

  // All three write paths (positive / negative-campaign / negative-adGroup)
  // pass through setModal({ mode }) before the user can submit. Gating the
  // modal-open call prevents an anon click from even seeing the form.
  const requireAuth = useRequireAuth();
  const openModal = requireAuth((modalProps) => setModal(modalProps));

  const {
    keywords, negativeKeywords, searchTerms, adGroups,
    loading, error,
    fetchKeywords, fetchNegatives, fetchSearchTerms,
    addKeywords, addNegativeKeywords,
  } = useGoogleKeywords({
    accountId: googleCustomerId,
    loginCustomerId: googleLoginCustomerId,
    campaignId, adGroupId, dateRange,
  });

  // Campaign list — cheap, ≤50 rows. Loads once per account / dateRange
  // change. The API call is fire-and-forget at the effect level: every
  // setState we do is inside a Promise callback (.then / .catch / .finally),
  // which the react-hooks/set-state-in-effect rule treats the same way
  // it treats event-handler setState — i.e. fine. We deliberately don't
  // toggle setCampaignsLoading(true) synchronously before kicking off
  // the request: the existing campaign list stays visible while a new
  // one loads, which is better UX than a spinner flicker on refilter.
  useEffect(() => {
    if (!googleConnected || !googleCustomerId) return;
    let cancelled = false;
    api.get('/google/campaigns', { params: { accountId: googleCustomerId, loginCustomerId: googleLoginCustomerId, dateRange } })
      .then(({ data }) => { if (!cancelled) { setCampaigns(data?.campaigns || []); setCampaignsError(null); } })
      .catch((e)      => { if (!cancelled) setCampaignsError(e?.response?.data?.error || e.message || 'Failed to load campaigns'); })
      .finally(()     => { if (!cancelled) setCampaignsLoading(false); });
    return () => { cancelled = true; };
  }, [googleConnected, googleCustomerId, googleLoginCustomerId, dateRange]);

  // Per-tab fetch — runs whenever the relevant inputs change.
  useEffect(() => {
    if (!campaignId) return;
    if (tab === 'keywords') fetchKeywords();
    if (tab === 'negatives') fetchNegatives({ level: negativeLevel });
    if (tab === 'searchTerms') fetchSearchTerms();
  }, [tab, campaignId, adGroupId, dateRange, negativeLevel, fetchKeywords, fetchNegatives, fetchSearchTerms]);

  const handleRefresh = useCallback(() => {
    if (tab === 'keywords') fetchKeywords();
    else if (tab === 'negatives') fetchNegatives({ level: negativeLevel });
    else fetchSearchTerms();
  }, [tab, negativeLevel, fetchKeywords, fetchNegatives, fetchSearchTerms]);

  // Filtered views
  const filteredKeywords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return keywords;
    return keywords.filter(k => k.text.toLowerCase().includes(q));
  }, [keywords, search]);

  const filteredNegatives = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return negativeKeywords;
    return negativeKeywords.filter(k => k.text.toLowerCase().includes(q));
  }, [negativeKeywords, search]);

  const filteredSearchTerms = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return searchTerms;
    return searchTerms.filter(t => t.searchTerm.toLowerCase().includes(q) || t.keywordText.toLowerCase().includes(q));
  }, [searchTerms, search]);

  // ── Empty / connect states ──────────────────────────────────────────────
  // Header always renders the platform selector — even on the empty
  // states — so the user has somewhere to actually click "select an
  // account". Without this, the empty-state copy ("pick a customer from
  // the platform selector") points at nothing.
  const headerPickerProps = {
    token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount,
    googleConnected, googleCustomerId, onGoogleConnect, onGoogleDisconnect, onSelectGoogleAccount,
  };

  if (!googleConnected) return (
    <div className="flex-1 flex flex-col h-full">
      <Header onBack={onBack} pickerProps={headerPickerProps} />
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-xl font-bold text-rose-500">G</div>
        <p className="text-sm font-semibold text-slate-700">Connect Google Ads</p>
        <p className="text-xs text-slate-400">Sign in with Google to manage keywords.</p>
        <button onClick={onGoogleConnect} className="text-xs font-medium px-4 py-2 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors">Connect Google Ads</button>
      </div>
    </div>
  );

  if (!googleCustomerId) return (
    <div className="flex-1 flex flex-col h-full">
      <Header onBack={onBack} pickerProps={headerPickerProps} />
      <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
        <p className="text-sm font-semibold text-slate-700">Select a Google Ads account</p>
        <p className="text-xs text-slate-400">Pick a customer from the selector in the top bar.</p>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      <Header onBack={onBack} customerId={googleCustomerId} pickerProps={headerPickerProps} />
      <FilterBar
        campaigns={campaigns} adGroups={adGroups}
        campaignId={campaignId} setCampaignId={setCampaignId}
        adGroupId={adGroupId} setAdGroupId={setAdGroupId}
        dateRange={dateRange} setDateRange={setDateRange}
        search={search} setSearch={setSearch}
        onRefresh={handleRefresh} loading={loading}
      />

      {/* Tabs row + primary action */}
      <div className="shrink-0 px-6 py-2.5 border-b border-slate-200 flex items-center gap-2 bg-white">
        <Tab active={tab === 'keywords'}    onClick={() => setTab('keywords')}    count={keywords.length || null}>Keywords</Tab>
        <Tab active={tab === 'negatives'}   onClick={() => setTab('negatives')}   count={negativeKeywords.length || null}>Negative</Tab>
        <Tab active={tab === 'searchTerms'} onClick={() => setTab('searchTerms')} count={searchTerms.length || null}>Search Terms</Tab>
        <div className="flex-1" />
        {tab === 'keywords' && (
          <button onClick={() => openModal({ mode: 'positive' })} disabled={!campaignId || !adGroups.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-sm shadow-orange-500/20 disabled:opacity-40 transition-all">
            <Plus size={12} /> Add Keywords
          </button>
        )}
        {tab === 'negatives' && (
          <>
            <div className="flex items-center gap-1 mr-1 bg-slate-100 rounded-lg p-0.5">
              <button onClick={() => setNegativeLevel('campaign')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${negativeLevel === 'campaign' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                Campaign
              </button>
              <button onClick={() => setNegativeLevel('adGroup')}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors ${negativeLevel === 'adGroup' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                Ad Group
              </button>
            </div>
            <button onClick={() => openModal({ mode: negativeLevel === 'campaign' ? 'negative-camp' : 'negative-adgrp' })}
              disabled={!campaignId || (negativeLevel === 'adGroup' && !adGroups.length)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-40 transition-colors">
              <Ban size={12} /> Add Negative
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!campaignId ? (
          <EmptyState
            icon={Filter}
            title="Pick a campaign to get started"
            subtitle={campaigns.length === 0 && !campaignsLoading
              ? 'No campaigns found in this account.'
              : 'Keyword data is scoped per-campaign — pick one from the bar above.'} />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRefresh} />
        ) : loading && tab === 'keywords' && !keywords.length ? (
          <LoadingRow label="Loading keywords…" />
        ) : tab === 'keywords' ? (
          <>
            <KpiStrip keywords={filteredKeywords} />
            <KeywordsTable
              keywords={filteredKeywords}
              onAddNegative={(text) => openModal({ mode: 'negative-camp', prefill: text })}
              onAskAI={(text) => onSendToChat?.(`Analyze the performance of this keyword and suggest improvements: "${text}"`)} />
          </>
        ) : tab === 'negatives' ? (
          loading ? <LoadingRow label="Loading negative keywords…" /> :
          <NegativeTable items={filteredNegatives} level={negativeLevel} />
        ) : (
          loading ? <LoadingRow label="Loading search terms…" /> :
          <SearchTermsTable
            items={filteredSearchTerms}
            onBlock={(text) => openModal({ mode: 'negative-camp', prefill: text, defaultMatchType: 'PHRASE' })}
            onAskAI={(text) => onSendToChat?.(`Should I add "${text}" as a negative keyword? Look at its performance and recommend.`)} />
        )}
        {campaignsError && <p className="text-[11px] text-rose-500 mt-2">Campaign list error: {campaignsError}</p>}
      </div>

      {/* Add modal */}
      {modal && (
        <AddKeywordsModal
          mode={modal.mode}
          prefill={modal.prefill || ''}
          defaultMatchType={modal.defaultMatchType}
          adGroups={adGroups}
          defaultAdGroupId={adGroupId}
          onClose={() => setModal(null)}
          onSubmit={async ({ adGroupId: targetAdGroupId, keywords: list }) => {
            if (modal.mode === 'positive') {
              await addKeywords({ adGroupId: targetAdGroupId, keywords: list });
            } else if (modal.mode === 'negative-camp') {
              await addNegativeKeywords({ level: 'campaign', campaignId, keywords: list });
            } else {
              await addNegativeKeywords({ level: 'adGroup', adGroupId: targetAdGroupId, keywords: list });
            }
          }}
        />
      )}
    </div>
  );
};

// ── Sub-views ────────────────────────────────────────────────────────────
const Header = ({ onBack, customerId, pickerProps }) => (
  <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
    <div className="flex items-center gap-3">
      <button onClick={onBack} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors">
        <ChevronLeft size={16} />
      </button>
      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-sm shadow-orange-500/20">
        <Hash size={16} className="text-white" strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[15px] font-bold text-slate-800 tracking-tight">Keywords</p>
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
          Google Ads {customerId && `· ${customerId}`}
        </p>
      </div>
    </div>
    {/* Right side: same dual-platform picker the other Google modules
        use, so the user has one consistent way to switch accounts. */}
    {pickerProps && (
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-400">Ad Account:</span>
        <PlatformAccountSelector
          platform="google"
          token={pickerProps.token}
          onLoginMeta={pickerProps.onLogin}
          onLogoutMeta={pickerProps.onLogout}
          selectedAccount={pickerProps.selectedAccount}
          selectedBusiness={pickerProps.selectedBusiness}
          onSelectMetaAccount={pickerProps.onSelectAccount}
          googleConnected={pickerProps.googleConnected}
          googleCustomerId={pickerProps.googleCustomerId}
          onGoogleConnect={pickerProps.onGoogleConnect}
          onGoogleDisconnect={pickerProps.onGoogleDisconnect}
          onSelectGoogleAccount={pickerProps.onSelectGoogleAccount}
          variant="header"
        />
      </div>
    )}
  </div>
);

// Lowercase prop name + capitalised local alias avoids both:
//   • ESLint flat-config no-unused-vars false-positive on `{ icon: Icon }`
//   • React's "JSX must start uppercase" requirement.
const EmptyState = ({ icon, title, subtitle }) => {
  const IconCmp = icon;
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
        <IconCmp size={20} strokeWidth={2.25} />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {subtitle && <p className="text-xs text-slate-400 max-w-md">{subtitle}</p>}
    </div>
  );
};

const ErrorState = ({ message, onRetry }) => {
  const isManagerErr = /manager account/i.test(message || '');
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center">
        <AlertOctagon size={20} strokeWidth={2.25} />
      </div>
      <p className="text-sm font-semibold text-slate-700">{isManagerErr ? 'This is a manager (MCC) account' : 'Could not load data'}</p>
      <p className="text-xs text-slate-400 max-w-md">{isManagerErr
        ? 'Google Ads API does not return data for manager accounts. Pick a child account from the platform selector above.'
        : message}</p>
      {onRetry && <button onClick={onRetry} className="text-[11px] font-medium px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors">Retry</button>}
    </div>
  );
};

const LoadingRow = ({ label }) => (
  <div className="flex items-center justify-center py-20 gap-2 text-slate-400">
    <RefreshCw size={16} className="animate-spin" />
    <span className="text-sm">{label}</span>
  </div>
);

// ── Tables ───────────────────────────────────────────────────────────────
const KeywordsTable = ({ keywords, onAddNegative, onAskAI }) => {
  if (!keywords.length) return <EmptyState icon={Hash} title="No keywords found" subtitle="Try a different campaign / ad group, or expand the date range." />;
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <Th>Keyword</Th>
              <Th>Match</Th>
              <Th>QS</Th>
              <Th>Ad Group</Th>
              <Th align="right">Impr.</Th>
              <Th align="right">Clicks</Th>
              <Th align="right">CTR</Th>
              <Th align="right">Avg CPC</Th>
              <Th align="right">Spend</Th>
              <Th align="right">Conv.</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {keywords.map((k) => (
              <tr key={k.criterionId} className="hover:bg-orange-50/30 transition-colors">
                <td className="py-2.5 px-3 text-[13px] font-medium text-slate-800 max-w-[280px] truncate">{k.text}</td>
                <td className="py-2.5 px-3"><MatchPill matchType={k.matchType} /></td>
                <td className="py-2.5 px-3"><QualityScoreChip score={k.qualityScore} /></td>
                <td className="py-2.5 px-3 text-[12px] text-slate-500 max-w-[180px] truncate">{k.adGroupName}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtNum(k.impressions)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtNum(k.clicks)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtPct(k.ctr)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtMoney(k.avgCpc)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-700 tabular-nums font-medium">{fmtMoney(k.spend)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-emerald-600 tabular-nums font-medium">{fmtNum(k.conversions)}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <RowAction icon={Send}  label="Ask AI"          onClick={() => onAskAI?.(k.text)} />
                    <RowAction icon={Ban}   label="Block at campaign" onClick={() => onAddNegative?.(k.text)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const NegativeTable = ({ items, level }) => {
  if (!items.length) return <EmptyState icon={Ban} title={`No ${level === 'campaign' ? 'campaign' : 'ad group'}-level negative keywords`} subtitle="Add some to filter out unwanted searches." />;
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/80">
            <Th>Negative Keyword</Th>
            <Th>Match</Th>
            <Th>{level === 'campaign' ? 'Campaign' : 'Ad Group'}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((k) => (
            <tr key={k.criterionId} className="hover:bg-rose-50/30 transition-colors">
              <td className="py-2.5 px-3 text-[13px] font-medium text-slate-800">{k.text}</td>
              <td className="py-2.5 px-3"><MatchPill matchType={k.matchType} /></td>
              <td className="py-2.5 px-3 text-[12px] text-slate-500">{k.campaignName || k.adGroupName || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SearchTermsTable = ({ items, onBlock, onAskAI }) => {
  if (!items.length) return <EmptyState icon={Search} title="No search terms" subtitle="Either nothing was searched yet, or the date range is too narrow." />;
  return (
    <div className="bg-white rounded-xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80">
              <Th>Search Term</Th>
              <Th>Matched Keyword</Th>
              <Th>Match</Th>
              <Th align="right">Impr.</Th>
              <Th align="right">Clicks</Th>
              <Th align="right">CTR</Th>
              <Th align="right">Spend</Th>
              <Th align="right">Conv.</Th>
              <Th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((t, i) => (
              <tr key={`${t.searchTerm}-${i}`} className="hover:bg-orange-50/30 transition-colors">
                <td className="py-2.5 px-3 text-[13px] font-medium text-slate-800 max-w-[280px] truncate">{t.searchTerm}</td>
                <td className="py-2.5 px-3 text-[12px] text-slate-500 max-w-[200px] truncate">{t.keywordText || '—'}</td>
                <td className="py-2.5 px-3"><MatchPill matchType={t.keywordMatchType} /></td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtNum(t.impressions)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtNum(t.clicks)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-600 tabular-nums">{fmtPct(t.ctr)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-slate-700 tabular-nums font-medium">{fmtMoney(t.spend)}</td>
                <td className="py-2.5 px-3 text-right text-[12px] text-emerald-600 tabular-nums font-medium">{fmtNum(t.conversions)}</td>
                <td className="py-2.5 px-3 text-right">
                  <div className="flex items-center justify-end gap-0.5">
                    <RowAction icon={Send} label="Ask AI"  onClick={() => onAskAI?.(t.searchTerm)} />
                    <RowAction icon={Ban}  label="Block"   onClick={() => onBlock?.(t.searchTerm)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const Th = ({ children, align = 'left' }) => (
  <th className={`text-${align} py-2.5 px-3 text-[10px] font-semibold text-slate-500 uppercase tracking-wider`}>{children}</th>
);

const RowAction = ({ icon, label, onClick }) => {
  const IconCmp = icon;
  return (
    <button onClick={onClick} title={label}
      className="p-1.5 rounded text-slate-400 hover:text-orange-500 hover:bg-orange-50 transition-colors">
      <IconCmp size={13} strokeWidth={2.25} />
    </button>
  );
};

export default KeywordsManager;
