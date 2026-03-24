import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, RefreshCw, Trash2, Copy, Target, Globe, Hash, X, AlertTriangle, Search, Film, ClipboardCopy, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, SlidersHorizontal, FolderOpen, Smartphone, ShoppingBag, BookOpen, Sparkles, CalendarDays, Database, FileText } from 'lucide-react';
import api from '../services/api.js';

// ── Confirm Dialog ──────────────────────────────────────────────────────────
const ConfirmDialog = ({ title, message, details, confirmLabel, confirmColor = 'blue', onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-900 mb-1">{title}</h3>
        <p className="text-xs text-slate-500">{message}</p>
        {details && (
          <div className="mt-3 bg-slate-50 rounded-lg px-3 py-2 text-[11px] text-slate-600 space-y-0.5">
            {details.map((d, i) => <p key={i}>{d}</p>)}
          </div>
        )}
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm}
          className={`px-4 py-2 rounded-lg text-xs font-semibold text-white transition-colors
            ${confirmColor === 'red' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ── Constants ───────────────────────────────────────────────────────────────
const SUBTYPE_LABELS = {
  WEBSITE: 'Website', ENGAGEMENT: 'Engagement', CUSTOM: 'Customer List',
  LOOKALIKE: 'Lookalike', OFFLINE_CONVERSION: 'Offline',
  IG_BUSINESS: 'Instagram', IG_BUSINESS_PROFILE: 'Instagram',
  APP: 'Mobile App', VIDEO: 'Video', LEAD_AD: 'Lead Ad',
  SHOPPING: 'Shopping', CATALOGUE: 'Catalogue', AR_EXPERIENCE: 'AR',
  FB_EVENT: 'FB Event', PAGE: 'Page',
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  const ms = ts < 1e12 ? ts * 1000 : ts;
  const d = new Date(ms);
  const date = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
  const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
  return `${date}\n${time}`;
};

const fmtSize = (lower, upper, aud) => {
  // No size data at all
  if (!lower && !upper) {
    // Check if audience is still populating
    const opCode = aud?.operation_status?.code;
    if (opCode && opCode !== 200) return { text: 'Pending', sub: 'Size temporarily unavailable' };
    return null;
  }
  // Meta shows "Below 1,000" when upper bound <= 1000
  if ((!upper || upper <= 1000) && (!lower || lower <= 1000)) return { text: 'Below 1,000' };
  const fmt = (n) => n.toLocaleString();
  if (lower && upper && lower !== upper) return { text: `${fmt(lower)} - ${fmt(upper)}` };
  return { text: fmt(lower || upper || 0) };
};

// Map subtypes to Meta's two-line Type display
const getTypeDisplay = (aud) => {
  const sub = aud.subtype || 'CUSTOM';
  if (sub === 'LOOKALIKE') return { main: 'Lookalike Audience', detail: null };
  if (sub === 'SAVED' || aud._isSaved) return { main: 'Saved Audience', detail: null };
  // Custom audiences — show subtype detail
  const detailMap = {
    WEBSITE: 'Website',
    VIDEO: 'Video engagement',
    IG_BUSINESS: 'Engagement – Instagram',
    IG_BUSINESS_PROFILE: 'Engagement – Instagram',
    PAGE: 'Engagement – Page',
    ENGAGEMENT: 'Engagement',
    CUSTOM: 'Customer list',
    LEAD_AD: 'Lead ad',
    OFFLINE_CONVERSION: 'Offline',
    APP: 'Mobile app',
    SHOPPING: 'Shopping',
    CATALOGUE: 'Catalogue',
    AR_EXPERIENCE: 'Augmented reality',
    FB_EVENT: 'Facebook event',
  };
  return { main: 'Custom Audience', detail: detailMap[sub] || null };
};

// Get availability display matching Meta's real UI
const getAvailability = (aud) => {
  const op = aud.operation_status;
  const opCode = op?.code;
  const fmtEdited = (ts) => {
    if (!ts) return null;
    const ms = ts < 1e12 ? ts * 1000 : ts;
    return `Last edited on\n${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ms))}`;
  };
  // Meta operation_status codes: 200=Normal/Ready, 300=Expired, 411/412/415=Populating, 400+=Error
  if (opCode === 200) {
    return { label: 'Ready', color: 'text-emerald-600', dot: 'bg-emerald-500', sub: fmtEdited(aud.time_updated), tooltip: null };
  }
  if (opCode === 411 || opCode === 412 || opCode === 415) {
    return { label: 'Ready', color: 'text-emerald-600', dot: 'bg-emerald-500', sub: fmtEdited(aud.time_updated), tooltip: null };
  }
  if (opCode === 300) {
    return { label: 'Expired', color: 'text-slate-400', dot: 'bg-slate-400', sub: null, tooltip: op?.description || null };
  }
  if (opCode >= 400) {
    return { label: 'Error', color: 'text-red-500', dot: 'bg-red-500', sub: null, tooltip: op?.description || 'Something went wrong with this audience' };
  }
  // Fallback — treat as Ready (saved audiences, unknown states, etc.)
  return { label: 'Ready', color: 'text-emerald-600', dot: 'bg-emerald-500', sub: fmtEdited(aud.time_updated), tooltip: null };
};

// ── Audience Table Row ──────────────────────────────────────────────────────
const CopyableId = ({ id }) => {
  const [copied, setCopied] = useState(false);
  const copyId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button onClick={copyId} title="Copy audience ID"
      className="text-[10px] font-mono text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1">
      <ClipboardCopy size={9} />
      {copied ? 'Copied!' : id}
    </button>
  );
};

// ── Filter Options (matching Meta's Audience Manager) ──────────────────────
const STATUS_FILTERS = [
  { id: 'in_active_ads', label: 'In Active Ads' },
  { id: 'recently_used', label: 'Recently Used' },
  { id: 'shared', label: 'Shared' },
  { id: 'action_needed', label: 'Action Needed' },
];
const TYPE_FILTERS = [
  { id: 'CUSTOM', label: 'Custom Audience' },
  { id: 'LOOKALIKE', label: 'Lookalike Audience' },
  { id: 'SAVED', label: 'Saved Audience' },
];
const AVAILABILITY_FILTERS = [
  { id: 'ready', label: 'Ready' },
  { id: 'not_ready', label: 'Not Ready' },
  { id: 'error', label: 'Error' },
];

// ── Create Audience Modal ───────────────────────────────────────────────────
const YOUR_SOURCES = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'customer_list', label: 'Customer list', icon: Users },
  { id: 'mobile_app', label: 'Mobile App', icon: Smartphone, developing: true },
  { id: 'offline', label: 'Offline events', icon: Database, developing: true },
];
const META_SOURCES = [
  { id: 'video', label: 'Video', icon: Film },
  { id: 'ig', label: 'Instagram account', icon: Hash, developing: true },
  { id: 'fb_page', label: 'Facebook Page', icon: FileText },
  { id: 'lead_ad', label: 'Lead Ad', icon: ClipboardCopy, developing: true },
  { id: 'fb_event', label: 'Facebook event', icon: CalendarDays, developing: true },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag, developing: true },
  { id: 'catalogue', label: 'Catalogue', icon: BookOpen, developing: true },
  { id: 'ar', label: 'Augmented reality', icon: Sparkles, developing: true },
];
const OTHER_SOURCES = [
  { id: 'lookalike', label: 'Lookalike audience', icon: Copy, developing: true },
];
const SOURCE_LIST = [...YOUR_SOURCES, ...META_SOURCES, ...OTHER_SOURCES];

const INPUT_CLS = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

// ── Include/Exclude Rule Component ──────────────────────────────────────────
const WEBSITE_EVENTS = [
  { value: 'all_visitors', label: 'All website visitors', desc: 'Includes people who have visited any of your websites.' },
  { value: 'specific_pages', label: 'People who visited specific web pages', desc: 'Includes people who have visited specific websites or web pages.' },
  { value: 'time_spent', label: 'Visitors by time spent', desc: 'Include people in the top percentile of time spent on your website.' },
];

const TIME_SPENT_PERCENTILES = [
  { value: '25', label: 'Top 25%' },
  { value: '10', label: 'Top 10%' },
  { value: '5', label: 'Top 5%' },
];

const URL_CONDITIONS = [
  { value: 'contains', label: 'Contains' },
  { value: 'not_contains', label: "Doesn't contain" },
  { value: 'equals', label: 'Equals' },
];

const MAX_RETENTION_DAYS = 180;

const PAGE_ENGAGEMENTS = [
  { value: 'page_visited', label: 'Anyone who visited your Page', desc: 'Includes people who visited your Page, regardless of the actions they took.' },
  { value: 'page_engaged', label: 'People who engaged with any post or ad', desc: 'Includes people who have taken an action on a post or ad, such as reactions, shares, comments, link clicks or carousel swipes.' },
  { value: 'page_cta_clicked', label: 'People who clicked on any call-to-action button', desc: 'Includes people who clicked on a call-to-action button on your Page, such as "Call" or "Message".' },
  { value: 'page_message_sent', label: 'People who sent a message to your Page', desc: 'Includes only the people who send a message to your Page.' },
  { value: 'page_whatsapp_lead', label: 'People who became a lead after messaging your Page in WhatsApp', desc: 'Only includes people who messaged your Page on WhatsApp and then became leads.' },
  { value: 'page_saved_post', label: 'People who saved any post', desc: 'Includes only the people who saved a post on your Page.' },
  { value: 'page_liked', label: 'People who currently like or follow your Page', desc: 'Includes people who currently like or follow your Page.' },
];

const IG_ENGAGEMENTS = [
  { value: 'ig_profile_engaged', label: 'Everyone who engaged with your professional account', desc: 'Includes people who have visited your profile or taken an action on your content or ads.' },
  { value: 'ig_profile_visit', label: 'Anyone who visited your professional account\'s profile', desc: 'Includes people who have visited your profile.' },
  { value: 'ig_ad_interact', label: 'People who engaged with any post or ad', desc: 'Includes people who have engaged with a post or ad, such as reactions, shares, comments, or saves.' },
  { value: 'ig_message_sent', label: 'People who sent a message to your professional account', desc: 'Includes only the people who sent a message to your professional account.' },
  { value: 'ig_post_saved', label: 'People who saved any post or ad', desc: 'Includes only the people who saved a post or ad.' },
];

const WebsiteRuleCard = ({ rule, onChange, onRemove, isOnly, type, pixelEvents = [] }) => {
  const retentionExceeded = rule.retentionDays > MAX_RETENTION_DAYS;

  return (
    <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white relative">
      {!isOnly && (
        <button onClick={onRemove} className="absolute top-2 right-2 text-slate-300 hover:text-red-400 transition-colors"><X size={14} /></button>
      )}
      <div className="flex items-center gap-1.5 mb-1">
        <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${type === 'include' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
          {type === 'include' ? 'Include' : 'Exclude'}
        </span>
      </div>

      {/* Radio-style event selector like Meta UI */}
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {WEBSITE_EVENTS.map((ev, i) => (
          <button key={ev.value} onClick={() => onChange({ ...rule, event: ev.value })}
            className={`w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors
              ${rule.event === ev.value ? 'bg-blue-50' : 'hover:bg-slate-50'}
              ${i > 0 ? 'border-t border-slate-100' : ''}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
              ${rule.event === ev.value ? 'border-blue-600' : 'border-slate-300'}`}>
              {rule.event === ev.value && <div className="w-2 h-2 rounded-full bg-blue-600" />}
            </div>
            <div>
              <p className={`text-xs font-medium ${rule.event === ev.value ? 'text-blue-700' : 'text-slate-700'}`}>{ev.label}</p>
              {ev.desc && <p className="text-[10px] text-slate-400 mt-0.5">{ev.desc}</p>}
            </div>
          </button>
        ))}
        {/* Custom pixel events section */}
        {pixelEvents.length > 0 && (
          <>
            <div className="border-t border-slate-200 px-3 py-2 bg-slate-50">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">From your events</p>
            </div>
            {pixelEvents.map(ev => (
              <button key={ev} onClick={() => onChange({ ...rule, event: `custom:${ev}` })}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-left border-t border-slate-100 transition-colors
                  ${rule.event === `custom:${ev}` ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                  ${rule.event === `custom:${ev}` ? 'border-blue-600' : 'border-slate-300'}`}>
                  {rule.event === `custom:${ev}` && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                </div>
                <p className={`text-xs font-medium ${rule.event === `custom:${ev}` ? 'text-blue-700' : 'text-slate-700'}`}>{ev}</p>
              </button>
            ))}
          </>
        )}
      </div>

      {/* Time spent percentile */}
      {rule.event === 'time_spent' && (
        <div>
          <label className="block text-[10px] font-semibold text-slate-500 mb-1">Percentile</label>
          <select value={rule.percentile || '25'} onChange={e => onChange({ ...rule, percentile: e.target.value })} className={INPUT_CLS}>
            {TIME_SPENT_PERCENTILES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
      )}

      {/* URL filter for specific pages */}
      {rule.event === 'specific_pages' && (
        <div className="flex gap-2">
          <select value={rule.urlCondition || 'contains'} onChange={e => onChange({ ...rule, urlCondition: e.target.value })} className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 w-36 shrink-0">
            {URL_CONDITIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input value={rule.urlFilter || ''} onChange={e => onChange({ ...rule, urlFilter: e.target.value })} placeholder="e.g., /products or /checkout" className={INPUT_CLS} />
        </div>
      )}

      {/* Retention days with validation */}
      <div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] text-slate-500 shrink-0">In the past</label>
          <input type="number" value={rule.retentionDays}
            onChange={e => onChange({ ...rule, retentionDays: Number(e.target.value) })}
            min={1} max={180}
            className={`w-16 px-2 py-1.5 rounded-lg border text-xs focus:outline-none focus:ring-2
              ${retentionExceeded ? 'border-red-300 focus:ring-red-100 text-red-600' : 'border-slate-200 focus:ring-blue-100'}`} />
          <span className="text-[10px] text-slate-500">days</span>
        </div>
        {retentionExceeded && (
          <p className="text-[10px] text-red-500 font-medium mt-1 flex items-center gap-1">
            <AlertTriangle size={10} /> Maximum retention is {MAX_RETENTION_DAYS} days for website audiences. Please reduce to proceed.
          </p>
        )}
      </div>
    </div>
  );
};

const EngagementRuleCard = ({ rule, onChange, onRemove, isOnly, type, engagementOptions }) => (
  <div className="border border-slate-200 rounded-lg p-3 space-y-2.5 bg-white relative">
    {!isOnly && (
      <button onClick={onRemove} className="absolute top-2 right-2 text-slate-300 hover:text-red-400 transition-colors"><X size={14} /></button>
    )}
    <div className="flex items-center gap-1.5 mb-1">
      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${type === 'include' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
        {type === 'include' ? 'Include' : 'Exclude'}
      </span>
    </div>
    {/* Radio-style event selector with descriptions */}
    <div>
      <label className="block text-xs font-semibold text-slate-600 mb-1">Events</label>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        {engagementOptions.map((o, i) => (
          <button key={o.value} onClick={() => onChange({ ...rule, engagement: o.value })}
            className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors
              ${rule.engagement === o.value ? 'bg-blue-50' : 'hover:bg-slate-50'}
              ${i > 0 ? 'border-t border-slate-100' : ''}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
              ${rule.engagement === o.value ? 'border-blue-600' : 'border-slate-300'}`}>
              {rule.engagement === o.value && <div className="w-2 h-2 rounded-full bg-blue-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${rule.engagement === o.value ? 'text-blue-700' : 'text-slate-700'}`}>{o.label}</p>
              {o.desc && <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{o.desc}</p>}
            </div>
          </button>
        ))}
      </div>
    </div>
    <div className="flex items-center gap-2">
      <label className="text-[10px] text-slate-500 shrink-0">In the past</label>
      <input type="number" value={rule.retentionDays} onChange={e => onChange({ ...rule, retentionDays: Number(e.target.value) })} min={1} max={365} className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100" />
      <span className="text-[10px] text-slate-500">days</span>
    </div>
  </div>
);

const CreateAudienceModal = ({ onClose, onCreateViaChat, adAccountId, defaultTab = 'website' }) => {
  const [tab, setTab] = useState(defaultTab);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [retentionDays, setRetentionDays] = useState(30);

  // Website — Include/Exclude rules
  const [pixels, setPixels] = useState([]);
  const [selectedPixelId, setSelectedPixelId] = useState('');
  const [pixelEvents, setPixelEvents] = useState([]); // custom events from pixel
  const [websiteInclusions, setWebsiteInclusions] = useState([{ event: 'all_visitors', urlCondition: 'contains', urlFilter: '', retentionDays: 30 }]);
  const [websiteExclusions, setWebsiteExclusions] = useState([]);

  // Video
  const [videoSource, setVideoSource] = useState('fb_page');
  const [videoSourcePage, setVideoSourcePage] = useState('');
  const [videoSourceIg, setVideoSourceIg] = useState('');
  const [videoIdInput, setVideoIdInput] = useState('');
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [videoSearchQuery, setVideoSearchQuery] = useState('');
  const [engagementType, setEngagementType] = useState('');
  // Campaign source for video
  const [campaigns, setCampaigns] = useState([]);
  const [campaignSearch, setCampaignSearch] = useState('');
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  // Video sort & date filter
  const [videoSort, setVideoSort] = useState('updated_time'); // updated_time (last used) | created_time (upload date)
  const [videoDatePreset, setVideoDatePreset] = useState(''); // '', 'today', 'yesterday', 'last_7d', 'last_14d', 'last_28d', 'this_month', 'this_quarter', 'custom'
  const [videoDateFrom, setVideoDateFrom] = useState('');
  const [videoDateTo, setVideoDateTo] = useState('');
  const [videoPage, setVideoPage] = useState(0);
  const VIDEOS_PER_PAGE = 10;

  // Customer List
  const [customerFile, setCustomerFile] = useState(null); // { name, rows, preview }
  const [customerDataType, setCustomerDataType] = useState('email');
  const customerFileRef = useRef(null);

  // Match type: ANY or ALL
  const [matchType, setMatchType] = useState('any');

  // Instagram
  const [igAccounts, setIgAccounts] = useState([]);
  const [igAccountsLoading, setIgAccountsLoading] = useState(false);
  const [selectedIgId, setSelectedIgId] = useState('');
  // IG include/exclude
  const [igInclusions, setIgInclusions] = useState([{ engagement: '', retentionDays: 365 }]);
  const [igExclusions, setIgExclusions] = useState([]);

  // FB Page
  const [pages, setPages] = useState([]);
  const [pagesLoading, setPagesLoading] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState('');
  // FB Page include/exclude
  const [pageInclusions, setPageInclusions] = useState([{ engagement: '', retentionDays: 365 }]);
  const [pageExclusions, setPageExclusions] = useState([]);

  // Lookalike
  const [existingAudiences, setExistingAudiences] = useState([]);
  const [sourceAudienceId, setSourceAudienceId] = useState('');
  const [country, setCountry] = useState('SG');
  const [ratio, setRatio] = useState(1);

  // Confirm
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState('');

  // Fetch data when tab changes
  useEffect(() => {
    if (!adAccountId) return;
    if (tab === 'website' && !pixels.length) {
      api.get(`/meta/adaccounts/${adAccountId}/pixels`).then(r => setPixels(r.data || [])).catch(() => {});
    }
    if (tab === 'video') {
      // Load pages + IG accounts for video source picker
      if (!pages.length && !pagesLoading) {
        setPagesLoading(true);
        api.get('/meta/pages').then(r => setPages(r.data || [])).catch(() => {}).finally(() => setPagesLoading(false));
      }
      if (!igAccounts.length && !igAccountsLoading) {
        setIgAccountsLoading(true);
        api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`).then(r => { console.log('IG accounts:', r.data); setIgAccounts(r.data || []); }).catch(err => console.error('IG accounts fetch error:', err)).finally(() => setIgAccountsLoading(false));
      }
      // Videos loaded by separate effect below
    }
    if (tab === 'ig' && !igAccounts.length && !igAccountsLoading) {
      setIgAccountsLoading(true);
      api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`).then(r => { console.log('IG accounts:', r.data); setIgAccounts(r.data || []); }).catch(err => console.error('IG accounts fetch error:', err)).finally(() => setIgAccountsLoading(false));
    }
    if ((tab === 'fb_page') && !pages.length && !pagesLoading) {
      setPagesLoading(true);
      api.get('/meta/pages').then(r => setPages(r.data || [])).catch(() => {}).finally(() => setPagesLoading(false));
    }
    if (tab === 'lookalike' && !existingAudiences.length) {
      api.get('/meta/customaudiences', { params: { adAccountId } }).then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.data || [];
        setExistingAudiences(data.filter(a => a.subtype !== 'LOOKALIKE'));
      }).catch(() => {});
    }
  }, [tab, adAccountId]);

  // Fetch custom events when a pixel is selected
  useEffect(() => {
    if (tab !== 'website' || !selectedPixelId) { setPixelEvents([]); return; }
    api.get(`/pixels/${selectedPixelId}/stats`).then(r => {
      const stats = r.data || [];
      // Extract unique event names from pixel stats
      const events = [...new Set((Array.isArray(stats) ? stats : []).map(s => s.event).filter(Boolean))];
      setPixelEvents(events);
    }).catch(() => setPixelEvents([]));
  }, [tab, selectedPixelId]);

  // Fetch videos when video source changes — use correct endpoint per source
  useEffect(() => {
    if (tab !== 'video' || !adAccountId) return;
    if (videoSource === 'video_id') { setVideos([]); return; }
    if (videoSource === 'campaign') { setVideos([]); setVideosLoading(false); return; }

    // FB Page: need a page selected first
    if (videoSource === 'fb_page' && !videoSourcePage) { setVideos([]); setVideosLoading(false); return; }
    setVideosLoading(true);
    setVideos([]);
    setSelectedVideoIds([]);
    setVideoPage(0);

    let endpoint;
    if (videoSource === 'fb_page') {
      endpoint = `/meta/pages/${videoSourcePage}/videos?adAccountId=${adAccountId}`;
    } else {
      // Both 'ig_account' and default use ad account videos
      endpoint = `/meta/adaccounts/${adAccountId}/videos`;
    }

    api.get(endpoint).then(r => {
      const data = r.data || [];
      // Mark IG-sourced videos for all sources (not just ig_account)
      setVideos(data.map(v => ({ ...v, is_ig: !!v.source_instagram_media_id })));
      setVideosLoading(false);
    }).catch(err => { console.error('Video fetch error:', err); setVideosLoading(false); });
  }, [tab, videoSource, videoSourcePage, videoSourceIg, adAccountId]);

  // Fetch campaigns when video source is campaign (lightweight — no insights)
  useEffect(() => {
    if (tab !== 'video' || videoSource !== 'campaign' || !adAccountId) return;
    if (campaigns.length || campaignsLoading) return;
    setCampaignsLoading(true);
    api.get(`/meta/adaccounts/${adAccountId}/campaigns-list`).then(r => {
      setCampaigns(r.data || []);
    }).catch(err => {
      console.error('Campaign list fetch error:', err);
    }).finally(() => setCampaignsLoading(false));
  }, [tab, videoSource, adAccountId]);

  // Fetch ads/videos when a campaign is selected
  useEffect(() => {
    if (videoSource !== 'campaign' || !selectedCampaignId) return;
    setVideosLoading(true);
    setVideos([]);
    setSelectedVideoIds([]);
    api.get(`/campaigns/${selectedCampaignId}/ads`).then(r => {
      const ads = r.data || [];
      // Extract video creatives from ads
      const videoAds = ads.filter(a => a.creative?.video_id).map(a => ({
        id: a.creative.video_id,
        title: a.name || `Ad ${a.id}`,
        picture: a.creative.thumbnail_url || null,
      }));
      // Deduplicate by video ID
      const unique = [...new Map(videoAds.map(v => [v.id, v])).values()];
      setVideos(unique);
      setVideosLoading(false);
    }).catch(() => setVideosLoading(false));
  }, [videoSource, selectedCampaignId]);

  const toggleVideo = (id) => {
    setSelectedVideoIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
  };

  const handleCustomerFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      // Try to detect data type from first row
      const first = lines[0]?.toLowerCase() || '';
      let detectedType = 'email';
      if (/^[\d+\s()-]+$/.test(first) || first.includes('+')) detectedType = 'phone';
      else if (first.includes('@')) detectedType = 'email';
      else if (/^\d{10,}$/.test(first)) detectedType = 'phone';
      // If CSV header row, skip it
      const hasHeader = /email|phone|name|first|last/i.test(first);
      const dataRows = hasHeader ? lines.slice(1) : lines;
      setCustomerDataType(detectedType);
      setCustomerFile({ name: file.name, rows: dataRows.length, preview: dataRows.slice(0, 5) });
    } catch (err) {
      console.error('Failed to parse file:', err);
    }
    e.target.value = '';
  };

  const buildPrompt = () => {
    const audName = name ? `"${name}"` : '';
    const descPart = description ? `, description: "${description}"` : '';

    const fmtWebRule = (rule) => {
      let desc;
      if (rule.event === 'all_visitors') desc = 'all website visitors';
      else if (rule.event === 'specific_pages') desc = 'visitors to specific web pages';
      else if (rule.event === 'time_spent') desc = `visitors by time spent (top ${rule.percentile || 25}%)`;
      else if (rule.event?.startsWith('custom:')) desc = `people who triggered "${rule.event.replace('custom:', '')}" event`;
      else desc = rule.event;
      if (rule.urlFilter) {
        const cond = rule.urlCondition === 'not_contains' ? "doesn't contain" : rule.urlCondition === 'equals' ? 'equals' : 'contains';
        desc += ` (URL ${cond} "${rule.urlFilter}")`;
      }
      return `${desc}, ${rule.retentionDays} day retention`;
    };

    if (tab === 'website') {
      const pixelName = pixels.find(p => p.id === selectedPixelId)?.name || '';
      const inclParts = websiteInclusions.map(r => fmtWebRule(r));
      const exclParts = websiteExclusions.map(r => fmtWebRule(r));
      let prompt = `Create a website custom audience${audName ? ` called ${audName}` : ''}${descPart} using pixel "${pixelName}" (ID: ${selectedPixelId})`;
      prompt += `. Include: ${inclParts.join(' OR ')}`;
      if (exclParts.length) prompt += `. Exclude: ${exclParts.join(' OR ')}`;
      return prompt;
    }

    if (tab === 'video') {
      const videoIds = videoSource === 'video_id' ? videoIdInput.split(/[,\s]+/).filter(Boolean) : selectedVideoIds;
      const vidNames = videoIds.map(id => videos.find(v => v.id === id)?.title || id).join(', ');
      const engLabels = {
        video_watched_3s: 'viewed at least 3 seconds',
        video_watched_10s: 'viewed at least 10 seconds',
        video_watched_15s: 'completed or viewed at least 15 seconds (ThruPlay)',
        video_watched_25pct: 'viewed at least 25%',
        video_watched_50pct: 'viewed at least 50%',
        video_watched_75pct: 'viewed at least 75%',
        video_watched_95pct: 'viewed at least 95%',
      };
      const engDesc = engLabels[engagementType] || engagementType;
      return `Create a video engagement custom audience${audName ? ` called ${audName}` : ''}${descPart} for people who ${engDesc} of these videos: ${vidNames} (IDs: ${videoIds.join(', ')}), ${retentionDays} day retention`;
    }

    if (tab === 'customer_list') {
      if (customerFile) {
        const typeLabel = { email: 'emails', phone: 'phone numbers', fn_ln: 'first + last names', madid: 'mobile advertiser IDs' }[customerDataType] || customerDataType;
        return `Create a customer list custom audience${audName ? ` called ${audName}` : ''}${descPart} using ${customerFile.rows} ${typeLabel} from file "${customerFile.name}"`;
      }
      return `Create a customer list custom audience${audName ? ` called ${audName}` : ''}${descPart}. I will provide the customer data.`;
    }

    const igEngLabels = {
      ig_profile_visit: 'visited your profile',
      ig_profile_engaged: 'engaged with your profile',
      ig_ad_interact: 'engaged with any post or ad',
      ig_message_sent: 'sent a message to your account',
      ig_post_saved: 'saved any post or ad',
    };

    if (tab === 'ig') {
      const igName = igAccounts.find(a => a.id === selectedIgId)?.username || selectedIgId;
      const inclParts = igInclusions.filter(r => r.engagement).map(r => `people who ${igEngLabels[r.engagement] || r.engagement} (${r.retentionDays}d)`);
      const exclParts = igExclusions.filter(r => r.engagement).map(r => `people who ${igEngLabels[r.engagement] || r.engagement} (${r.retentionDays}d)`);
      let prompt = `Create an Instagram engagement custom audience${audName ? ` called ${audName}` : ''}${descPart} from Instagram account @${igName} (ID: ${selectedIgId})`;
      if (inclParts.length) prompt += `. Include: ${inclParts.join(' OR ')}`;
      if (exclParts.length) prompt += `. Exclude: ${exclParts.join(' OR ')}`;
      return prompt;
    }

    const pageEngLabels = {
      page_liked: 'currently like or follow your Page',
      page_engaged: 'engaged with any post or ad',
      page_cta_clicked: 'clicked any call-to-action button',
      page_message_sent: 'sent a message to your Page',
      page_visited: 'visited your Page',
    };

    if (tab === 'fb_page') {
      const pageName = pages.find(p => p.id === selectedPageId)?.name || selectedPageId;
      const inclParts = pageInclusions.filter(r => r.engagement).map(r => `people who ${pageEngLabels[r.engagement] || r.engagement} (${r.retentionDays}d)`);
      const exclParts = pageExclusions.filter(r => r.engagement).map(r => `people who ${pageEngLabels[r.engagement] || r.engagement} (${r.retentionDays}d)`);
      let prompt = `Create a Facebook Page engagement custom audience${audName ? ` called ${audName}` : ''}${descPart} from page "${pageName}" (ID: ${selectedPageId})`;
      if (inclParts.length) prompt += `. Include: ${inclParts.join(' OR ')}`;
      if (exclParts.length) prompt += `. Exclude: ${exclParts.join(' OR ')}`;
      return prompt;
    }

    if (tab === 'lead_ad') return `Create a lead ad custom audience${audName ? ` called ${audName}` : ''}${descPart} from people who opened or completed a lead form, ${retentionDays} day retention`;
    if (tab === 'offline') return `Create an offline events custom audience${audName ? ` called ${audName}` : ''}${descPart} from offline conversion data, ${retentionDays} day retention`;
    if (tab === 'fb_event') return `Create a Facebook event custom audience${audName ? ` called ${audName}` : ''}${descPart} from people who interacted with your events, ${retentionDays} day retention`;
    if (tab === 'mobile_app') return `Create a mobile app custom audience${audName ? ` called ${audName}` : ''}${descPart} from app activity, ${retentionDays} day retention`;
    if (tab === 'shopping') return `Create a shopping custom audience${audName ? ` called ${audName}` : ''}${descPart} from people who interacted with your shop, ${retentionDays} day retention`;
    if (tab === 'catalogue') return `Create a catalogue custom audience${audName ? ` called ${audName}` : ''}${descPart} from people who interacted with items in your catalogue, ${retentionDays} day retention`;
    if (tab === 'ar') return `Create an augmented reality custom audience${audName ? ` called ${audName}` : ''}${descPart} from people who interacted with your AR experience, ${retentionDays} day retention`;

    if (tab === 'lookalike') {
      const srcAud = existingAudiences.find(a => a.id === sourceAudienceId);
      const srcName = srcAud?.name || sourceAudienceId;
      return `Create a lookalike audience from "${srcName}" (ID: ${sourceAudienceId}), targeting ${country}, ${ratio}% ratio${audName ? `, name it ${audName}` : ''}`;
    }
    return '';
  };

  // Validation — returns error message or null if valid
  const MAX_RETENTION = { website: 180, video: 365, ig: 365, fb_page: 365, lead_ad: 90, offline: 180, fb_event: 365, mobile_app: 180, shopping: 365, catalogue: 365, ar: 365 };
  const getValidationError = () => {
    const maxRet = MAX_RETENTION[tab];
    if (maxRet && retentionDays > maxRet) return `Retention cannot exceed ${maxRet} days for this source`;
    if (maxRet && retentionDays < 1) return 'Retention must be at least 1 day';
    if (tab === 'website' && !selectedPixelId) return 'Please select a pixel';
    if (tab === 'website' && websiteInclusions.length === 0) return 'Please add at least one inclusion rule';
    if (tab === 'website' && [...websiteInclusions, ...websiteExclusions].some(r => r.retentionDays > 180)) return 'Website audience retention cannot exceed 180 days. Please reduce to proceed.';
    if (tab === 'website' && [...websiteInclusions, ...websiteExclusions].some(r => r.retentionDays < 1)) return 'Retention must be at least 1 day';
    if (tab === 'video' && videoSource === 'fb_page' && !videoSourcePage) return 'Please select a Facebook Page';
    if (tab === 'video' && videoSource === 'campaign' && !selectedCampaignId) return 'Please select a campaign';
    if (tab === 'video' && videoSource !== 'video_id' && videoSource !== 'campaign' && selectedVideoIds.length === 0) return 'Please select at least one video';
    if (tab === 'video' && videoSource === 'campaign' && selectedCampaignId && selectedVideoIds.length === 0 && !videosLoading) return 'Please select at least one video';
    if (tab === 'video' && videoSource === 'video_id' && !videoIdInput.trim()) return 'Please enter at least one video ID';
    if (tab === 'video' && !engagementType) return 'Please choose an engagement type';
    if (tab === 'ig' && !selectedIgId) return 'Please select an Instagram account';
    if (tab === 'ig' && igInclusions.every(r => !r.engagement)) return 'Please choose at least one engagement type';
    if (tab === 'fb_page' && !selectedPageId) return 'Please select a Facebook Page';
    if (tab === 'fb_page' && pageInclusions.every(r => !r.engagement)) return 'Please choose at least one engagement type';
    if (tab === 'lookalike' && !sourceAudienceId) return 'Please select a source audience';
    return null;
  };
  const validationError = getValidationError();

  // Build a bullet-point summary of the audience configuration for the details panel
  const buildSummaryBullets = () => {
    const bullets = [];
    const srcLabel = SOURCE_LIST.find(s => s.id === tab)?.label || tab;
    bullets.push(`Source: ${srcLabel}`);
    if (name) bullets.push(`Name: ${name}`);
    if (description) bullets.push(`Description: ${description}`);
    bullets.push(`Match type: ${matchType.toUpperCase()}`);

    if (tab === 'website') {
      const pixelName = pixels.find(p => p.id === selectedPixelId)?.name || selectedPixelId;
      bullets.push(`Pixel: ${pixelName}`);
      websiteInclusions.forEach(r => {
        const eventLabel = WEBSITE_EVENTS.find(e => e.value === r.event)?.label || r.event;
        let detail = `Include: ${eventLabel} (${r.retentionDays}d)`;
        if (r.urlFilter) detail += ` — URL ${r.urlCondition} "${r.urlFilter}"`;
        bullets.push(detail);
      });
      websiteExclusions.forEach(r => {
        const eventLabel = WEBSITE_EVENTS.find(e => e.value === r.event)?.label || r.event;
        let detail = `Exclude: ${eventLabel} (${r.retentionDays}d)`;
        if (r.urlFilter) detail += ` — URL ${r.urlCondition} "${r.urlFilter}"`;
        bullets.push(detail);
      });
    }

    if (tab === 'video') {
      const engLabels = { video_watched_3s: '3 seconds', video_watched_10s: '10 seconds', video_watched_15s: '15 seconds (ThruPlay)', video_watched_25pct: '25%', video_watched_50pct: '50%', video_watched_75pct: '75%', video_watched_95pct: '95%' };
      bullets.push(`Engagement: Viewed at least ${engLabels[engagementType] || engagementType}`);
      bullets.push(`Retention: ${retentionDays} days`);
      const videoIds = videoSource === 'video_id' ? videoIdInput.split(/[,\s]+/).filter(Boolean) : selectedVideoIds;
      const vidNames = videoIds.map(id => videos.find(v => v.id === id)?.title || id);
      if (vidNames.length <= 3) bullets.push(`Videos: ${vidNames.join(', ')}`);
      else bullets.push(`Videos: ${vidNames.length} selected`);
    }

    if (tab === 'fb_page') {
      const pageName = pages.find(p => p.id === selectedPageId)?.name || selectedPageId;
      bullets.push(`Page: ${pageName}`);
      const pageEngLabels = { page_liked: 'Like or follow Page', page_engaged: 'Engaged with any post/ad', page_cta_clicked: 'Clicked any CTA', page_message_sent: 'Sent a message', page_visited: 'Visited Page' };
      pageInclusions.filter(r => r.engagement).forEach(r => {
        bullets.push(`Include: ${pageEngLabels[r.engagement] || r.engagement} (${r.retentionDays}d)`);
      });
      pageExclusions.filter(r => r.engagement).forEach(r => {
        bullets.push(`Exclude: ${pageEngLabels[r.engagement] || r.engagement} (${r.retentionDays}d)`);
      });
    }

    if (tab === 'customer_list' && customerFile) {
      const typeLabel = { email: 'Emails', phone: 'Phone numbers', fn_ln: 'First + last names', madid: 'Mobile advertiser IDs' }[customerDataType] || customerDataType;
      bullets.push(`Data type: ${typeLabel}`);
      bullets.push(`File: ${customerFile.name} (${customerFile.rows} rows)`);
    }

    if (tab === 'lookalike') {
      const srcAud = existingAudiences.find(a => a.id === sourceAudienceId);
      bullets.push(`Source audience: ${srcAud?.name || sourceAudienceId}`);
      bullets.push(`Country: ${country}`);
      bullets.push(`Ratio: ${ratio}%`);
    }

    return bullets;
  };

  // Save audience config summary to localStorage
  const saveAudienceSummary = (name, bullets) => {
    try {
      const stored = JSON.parse(localStorage.getItem('audience_summaries') || '{}');
      stored[name] = { bullets, createdAt: new Date().toISOString() };
      localStorage.setItem('audience_summaries', JSON.stringify(stored));
    } catch (_) {}
  };

  const handleCreate = () => {
    if (validationError) return;
    const prompt = buildPrompt();
    setPendingPrompt(prompt);
    setShowConfirm(true);
  };

  const handleConfirmCreate = () => {
    // Save the bullet-point summary before sending to chat
    const bullets = buildSummaryBullets();
    const audName = name || `${SOURCE_LIST.find(s => s.id === tab)?.label || tab} audience`;
    saveAudienceSummary(audName, bullets);
    onCreateViaChat(pendingPrompt);
    onClose();
  };

  const fmtDuration = (sec) => {
    if (!sec) return '';
    const m = Math.floor(sec / 60), s = Math.round(sec % 60);
    return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `0:${String(s).padStart(2, '0')}`;
  };

  // Sources that use a simple retention-only config via chat
  const SIMPLE_SOURCES = ['lead_ad', 'offline', 'fb_event', 'mobile_app', 'shopping', 'catalogue', 'ar'];
  const simpleSourceLabel = SOURCE_LIST.find(s => s.id === tab)?.label || tab;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">Create Custom Audience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Source sidebar */}
          <div className="w-52 shrink-0 border-r border-slate-100 overflow-y-auto py-1">
            <p className="px-4 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Your Sources</p>
            {YOUR_SOURCES.map(s => (
              <button key={s.id} onClick={() => !s.developing && setTab(s.id)} disabled={s.developing}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors
                  ${s.developing ? 'text-slate-300 cursor-not-allowed' : tab === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <s.icon size={14} className={s.developing ? 'text-slate-300' : tab === s.id ? 'text-blue-500' : 'text-slate-400'} />
                {s.label}
                {s.developing && <span className="ml-auto text-[9px] font-medium text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">Soon</span>}
              </button>
            ))}
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Sources</p>
            {META_SOURCES.map(s => (
              <button key={s.id} onClick={() => !s.developing && setTab(s.id)} disabled={s.developing}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors
                  ${s.developing ? 'text-slate-300 cursor-not-allowed' : tab === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <s.icon size={14} className={s.developing ? 'text-slate-300' : tab === s.id ? 'text-blue-500' : 'text-slate-400'} />
                {s.label}
                {s.developing && <span className="ml-auto text-[9px] font-medium text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">Soon</span>}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-1">
              {OTHER_SOURCES.map(s => (
                <button key={s.id} onClick={() => !s.developing && setTab(s.id)} disabled={s.developing}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors
                    ${s.developing ? 'text-slate-300 cursor-not-allowed' : tab === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <s.icon size={14} className={s.developing ? 'text-slate-300' : tab === s.id ? 'text-blue-500' : 'text-slate-400'} />
                  {s.label}
                  {s.developing && <span className="ml-auto text-[9px] font-medium text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">Soon</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Config panel */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Website ── */}
          {tab === 'website' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source</label>
                {pixels.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Loading pixels...</p>
                ) : (
                  <select value={selectedPixelId} onChange={e => setSelectedPixelId(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select a pixel</option>
                    {pixels.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                  </select>
                )}
              </div>

              {/* Include rules */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">Include people who meet
                  <select value={matchType} onChange={e => setMatchType(e.target.value)} className="px-2 py-0.5 rounded border border-slate-200 text-xs font-bold text-blue-700 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-200">
                    <option value="any">ANY</option>
                    <option value="all">ALL</option>
                  </select>
                  of the following criteria</label>
                <div className="space-y-2">
                  {websiteInclusions.map((rule, i) => (
                    <WebsiteRuleCard key={`inc-${i}`} rule={rule} type="include" pixelEvents={pixelEvents}
                      isOnly={websiteInclusions.length === 1 && websiteExclusions.length === 0}
                      onChange={updated => setWebsiteInclusions(prev => prev.map((r, j) => j === i ? updated : r))}
                      onRemove={() => setWebsiteInclusions(prev => prev.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <button onClick={() => setWebsiteInclusions(prev => [...prev, { event: 'all_visitors', urlCondition: 'contains', urlFilter: '', retentionDays: 30 }])}
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                  <Plus size={12} /> Include More People
                </button>
              </div>

              {/* Exclude rules */}
              {websiteExclusions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exclude people who meet</label>
                  <div className="space-y-2">
                    {websiteExclusions.map((rule, i) => (
                      <WebsiteRuleCard key={`exc-${i}`} rule={rule} type="exclude" pixelEvents={pixelEvents}
                        isOnly={false}
                        onChange={updated => setWebsiteExclusions(prev => prev.map((r, j) => j === i ? updated : r))}
                        onRemove={() => setWebsiteExclusions(prev => prev.filter((_, j) => j !== i))} />
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setWebsiteExclusions(prev => [...prev, { event: 'all_visitors', urlCondition: 'contains', urlFilter: '', retentionDays: 30 }])}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600">
                <Plus size={12} /> Exclude People
              </button>
            </>
          )}

          {/* ── Video ── */}
          {tab === 'video' && (
            <>
              {/* Video source selector */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Video Sources</label>
                  <select value={videoSource} onChange={e => setVideoSource(e.target.value)} className={INPUT_CLS}>
                    <option value="fb_page">Facebook Page</option>
                    <option value="ig_account">Instagram professional account</option>
                    <option value="campaign">Campaign</option>
                    <option value="video_id">Video ID</option>
                  </select>
                </div>
                {videoSource === 'fb_page' && (
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Facebook Page</label>
                    {pagesLoading ? (
                      <p className="text-xs text-slate-400 italic py-2">Loading...</p>
                    ) : pages.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">No pages found</p>
                    ) : (
                      <select value={videoSourcePage} onChange={e => setVideoSourcePage(e.target.value)} className={INPUT_CLS}>
                        <option value="">Select a page</option>
                        {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                )}
                {videoSource === 'campaign' && (
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Campaign</label>
                    {campaignsLoading ? (
                      <p className="text-xs text-slate-400 italic py-2">Loading...</p>
                    ) : (
                      <>
                        <input value={campaignSearch} onChange={e => setCampaignSearch(e.target.value)} placeholder="Search campaigns..." className={INPUT_CLS} />
                        <div className="max-h-[120px] overflow-y-auto mt-1 border border-slate-200 rounded-lg">
                          {campaigns.filter(c => !campaignSearch || c.name?.toLowerCase().includes(campaignSearch.toLowerCase())).map(c => (
                            <button key={c.id} onClick={() => setSelectedCampaignId(c.id)}
                              className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${selectedCampaignId === c.id ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-slate-50 text-slate-600'}`}>
                              {c.name}
                            </button>
                          ))}
                          {campaigns.length === 0 && <p className="text-xs text-slate-400 italic py-3 text-center">No campaigns found</p>}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Empty state prompts */}
              {videoSource === 'fb_page' && !videoSourcePage && (
                <p className="text-xs text-slate-400 italic text-center py-4">Select a Facebook Page to see its videos</p>
              )}
              {videoSource === 'campaign' && !selectedCampaignId && (
                <p className="text-xs text-slate-400 italic text-center py-4">Select a campaign to see its video ads</p>
              )}

              {/* Video ID manual input */}
              {videoSource === 'video_id' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Video IDs</label>
                  <input value={videoIdInput} onChange={e => setVideoIdInput(e.target.value)} placeholder="Paste video IDs, comma separated" className={INPUT_CLS} />
                  <p className="text-[10px] text-slate-400 mt-1">Enter one or more video IDs separated by commas</p>
                </div>
              ) : (videoSource === 'fb_page' && !videoSourcePage) || (videoSource === 'campaign' && !selectedCampaignId) ? null : (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Select Videos <span className="text-slate-400 font-normal">({selectedVideoIds.length} selected)</span>
                  </label>
                  {videosLoading ? (
                    <div className="flex items-center gap-2 py-6 justify-center text-xs text-slate-400">
                      <RefreshCw size={14} className="animate-spin" /> Loading videos...
                    </div>
                  ) : videos.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No videos found</p>
                  ) : (() => {
                      const fmtVDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
                      // Filter out auto-generated videos with no title and no description
                      const filtered = videos
                        .filter(v => v.title || v.name || v.description || v.source_instagram_media_id)
                        .filter(v => !videoSearchQuery || (v.title || v.name || v.description || v.id || '').toLowerCase().includes(videoSearchQuery.toLowerCase()))
                        .filter(v => {
                          if (!videoDateFrom && !videoDateTo) return true;
                          const dateField = videoSort === 'created_time' ? v.created_time : (v.updated_time || v.created_time);
                          const vDate = dateField ? new Date(dateField).toISOString().slice(0, 10) : '';
                          if (videoDateFrom && vDate < videoDateFrom) return false;
                          if (videoDateTo && vDate > videoDateTo) return false;
                          return true;
                        })
                        .sort((a, b) => {
                          const field = videoSort === 'created_time' ? 'created_time' : 'updated_time';
                          return (b[field] || b.created_time || '').localeCompare(a[field] || a.created_time || '');
                        });
                      const totalPages = Math.max(1, Math.ceil(filtered.length / VIDEOS_PER_PAGE));
                      const safePage = Math.min(videoPage, totalPages - 1);
                      const pageVideos = filtered.slice(safePage * VIDEOS_PER_PAGE, (safePage + 1) * VIDEOS_PER_PAGE);
                      return <>
                    {/* Search + Sort + Date filters */}
                    <div className="relative mb-1.5">
                      <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={videoSearchQuery} onChange={e => { setVideoSearchQuery(e.target.value); setVideoPage(0); }}
                        placeholder="Search videos..." className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300" />
                    </div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <select value={videoSort} onChange={e => { setVideoSort(e.target.value); setVideoPage(0); }}
                        className="px-2 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-200">
                        <option value="updated_time">Last used date</option>
                        <option value="created_time">Uploaded date</option>
                      </select>
                      <select value={videoDatePreset} onChange={e => {
                        const v = e.target.value;
                        setVideoDatePreset(v);
                        setVideoPage(0);
                        const today = new Date(); today.setHours(0,0,0,0);
                        const fmt = d => d.toISOString().slice(0, 10);
                        if (v === 'today') { setVideoDateFrom(fmt(today)); setVideoDateTo(fmt(today)); }
                        else if (v === 'yesterday') { const y = new Date(today); y.setDate(y.getDate()-1); setVideoDateFrom(fmt(y)); setVideoDateTo(fmt(y)); }
                        else if (v === 'last_7d') { const d = new Date(today); d.setDate(d.getDate()-6); setVideoDateFrom(fmt(d)); setVideoDateTo(fmt(today)); }
                        else if (v === 'last_14d') { const d = new Date(today); d.setDate(d.getDate()-13); setVideoDateFrom(fmt(d)); setVideoDateTo(fmt(today)); }
                        else if (v === 'last_28d') { const d = new Date(today); d.setDate(d.getDate()-27); setVideoDateFrom(fmt(d)); setVideoDateTo(fmt(today)); }
                        else if (v === 'this_month') { const d = new Date(today.getFullYear(), today.getMonth(), 1); setVideoDateFrom(fmt(d)); setVideoDateTo(fmt(today)); }
                        else if (v === 'this_quarter') { const qm = Math.floor(today.getMonth()/3)*3; const d = new Date(today.getFullYear(), qm, 1); setVideoDateFrom(fmt(d)); setVideoDateTo(fmt(today)); }
                        else { setVideoDateFrom(''); setVideoDateTo(''); }
                      }}
                        className="px-2 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-200">
                        <option value="">All dates</option>
                        <option value="last_7d">Last 7 days</option>
                        <option value="last_14d">Last 14 days</option>
                        <option value="last_28d">Last 28 days</option>
                        <option value="this_month">This month</option>
                        <option value="this_quarter">This quarter</option>
                        <option value="custom">Custom</option>
                      </select>
                      {videoDatePreset === 'custom' && (
                        <div className="flex items-center gap-1">
                          <input type="date" value={videoDateFrom} onChange={e => { setVideoDateFrom(e.target.value); setVideoPage(0); }}
                            className="px-1.5 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-200" />
                          <span className="text-[10px] text-slate-400">to</span>
                          <input type="date" value={videoDateTo} onChange={e => { setVideoDateTo(e.target.value); setVideoPage(0); }}
                            className="px-1.5 py-1 rounded-md border border-slate-200 text-[11px] text-slate-600 focus:outline-none focus:ring-1 focus:ring-blue-200" />
                        </div>
                      )}
                      {(videoDateFrom || videoDateTo) && videoDatePreset !== 'custom' && (
                        <button onClick={() => { setVideoDatePreset(''); setVideoDateFrom(''); setVideoDateTo(''); setVideoPage(0); }}
                          className="text-[11px] text-blue-500 hover:text-blue-600 font-medium">Clear dates</button>
                      )}
                    </div>

                    {/* Video table header */}
                    <div className="flex items-center gap-3 px-2 py-1.5 border-b-2 border-blue-600 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                      <span className="w-16 shrink-0">Thumbnail</span>
                      <span className="flex-1">Video details</span>
                      <span className="w-24 text-center shrink-0" title="3-second video views">3s views</span>
                      <span className="w-20 text-right shrink-0">Last used</span>
                      <span className="w-4 shrink-0"></span>
                    </div>

                    {/* Video list */}
                    <div className="space-y-0 border border-slate-200 rounded-b-lg divide-y divide-slate-100">
                      {pageVideos.length === 0 ? (
                        <p className="text-xs text-slate-400 italic py-4 text-center">No videos match the filter</p>
                      ) : pageVideos.map(v => (
                        <button key={v.id} onClick={() => toggleVideo(v.id)}
                          className={`w-full flex items-center gap-3 px-2 py-2.5 text-left transition-colors
                            ${selectedVideoIds.includes(v.id) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                          <div className="w-16 h-10 rounded-md bg-slate-100 overflow-hidden shrink-0 relative">
                            {v.picture ? (
                              <img src={v.picture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Film size={14} className="text-slate-300" /></div>
                            )}
                            {v.length && (
                              <span className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded">{fmtDuration(v.length)}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-slate-700 truncate">
                              {v.title || v.name || v.description?.slice(0, 60)}
                            </p>
                            <p className="text-[10px] text-slate-400">{v.length ? `${fmtDuration(v.length)} · Uploaded: ${fmtVDate(v.created_time)}` : fmtVDate(v.created_time)}</p>
                          </div>
                          <div className="w-24 text-center shrink-0 flex items-center justify-center gap-1">
                            <span className="text-[11px] text-slate-600 font-medium">{v.three_second_views > 0 ? v.three_second_views.toLocaleString() : '—'}</span>
                            {v.is_ig ? (
                              <svg width="14" height="14" viewBox="0 0 24 24" className="text-slate-400 shrink-0"><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M16.5 7.5h-9A1.5 1.5 0 006 9v6a1.5 1.5 0 001.5 1.5h9A1.5 1.5 0 0018 15V9a1.5 1.5 0 00-1.5-1.5z" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.2"/><circle cx="15.5" cy="8.5" r="0.8" fill="currentColor"/></svg>
                            ) : (
                              <svg width="14" height="14" viewBox="0 0 24 24" className="text-blue-500 shrink-0"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M13.5 8H15V6h-2.5C11.12 6 10 7.12 10 8.5V10H8.5v2H10v6h2v-6h2l.5-2H12V8.5c0-.28.22-.5.5-.5h1z" fill="white"/></svg>
                            )}
                          </div>
                          <span className="w-20 text-[10px] text-slate-400 text-right shrink-0">{fmtVDate(v.updated_time)}</span>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                            ${selectedVideoIds.includes(v.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {selectedVideoIds.includes(v.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-2 px-1">
                        <button onClick={() => setVideoPage(p => Math.max(0, p - 1))} disabled={safePage === 0}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${safePage === 0 ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          ◀ Prev
                        </button>
                        <span className="text-[10px] text-slate-400">Page {safePage + 1} of {totalPages}</span>
                        <button onClick={() => setVideoPage(p => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1}
                          className={`px-2.5 py-1 rounded-md text-[11px] font-medium border ${safePage >= totalPages - 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                          Next ▶
                        </button>
                      </div>
                    )}
                    </>;
                    })()}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Engagement Type</label>
                <select value={engagementType} onChange={e => setEngagementType(e.target.value)} className={INPUT_CLS}>
                  <option value="">Choose an engagement type</option>
                  <option value="video_watched_3s">People who have viewed at least 3 seconds of your video</option>
                  <option value="video_watched_10s">People who have viewed at least 10 seconds of your video</option>
                  <option value="video_watched_15s">People who either completed or viewed at least 15 seconds (ThruPlay)</option>
                  <option value="video_watched_25pct">People who have viewed at least 25% of your video</option>
                  <option value="video_watched_50pct">People who have viewed at least 50% of your video</option>
                  <option value="video_watched_75pct">People who have viewed at least 75% of your video</option>
                  <option value="video_watched_95pct">People who have viewed at least 95% of your video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={365} className={INPUT_CLS} />
              </div>
            </>
          )}

          {/* ── Customer List ── */}
          {tab === 'customer_list' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Data Type</label>
                <select value={customerDataType} onChange={e => setCustomerDataType(e.target.value)} className={INPUT_CLS}>
                  <option value="email">Emails</option>
                  <option value="phone">Phone Numbers</option>
                  <option value="fn_ln">First Name + Last Name</option>
                  <option value="madid">Mobile Advertiser IDs</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Upload Customer File
                  <span className="text-slate-400 font-normal ml-1.5">CSV or TXT</span>
                </label>
                {customerFile ? (
                  <div className="border border-slate-200 rounded-lg px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <ClipboardCopy size={14} className="text-blue-500" />
                        <span className="text-xs font-medium text-slate-700">{customerFile.name}</span>
                      </div>
                      <button onClick={() => setCustomerFile(null)} className="text-slate-300 hover:text-red-400 transition-colors">
                        <X size={14} />
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-2">{customerFile.rows.toLocaleString()} rows detected</p>
                    {customerFile.preview.length > 0 && (
                      <div className="bg-slate-50 rounded-md px-3 py-2">
                        <p className="text-[10px] font-semibold text-slate-400 mb-1">Preview:</p>
                        {customerFile.preview.map((row, i) => (
                          <p key={i} className="text-[11px] font-mono text-slate-600 truncate">{row}</p>
                        ))}
                        {customerFile.rows > 5 && <p className="text-[10px] text-slate-400 mt-1">...and {customerFile.rows - 5} more</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <button onClick={() => customerFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border-2 border-dashed border-slate-200 text-sm font-medium text-slate-400 hover:text-blue-500 hover:border-blue-300 transition-colors">
                    <Plus size={16} />
                    Choose CSV or TXT file
                  </button>
                )}
                <input ref={customerFileRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleCustomerFile} />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5">
                <p className="text-[11px] font-semibold text-blue-700 mb-1">Supported formats:</p>
                <ul className="text-[11px] text-blue-600 space-y-0.5 list-disc list-inside">
                  <li>CSV with one column (email, phone, etc.) — header row optional</li>
                  <li>TXT with one entry per line</li>
                  <li>Emails: user@example.com</li>
                  <li>Phones: include country code, e.g. +852XXXXXXXX</li>
                </ul>
              </div>
            </div>
          )}

          {/* ── Instagram ── */}
          {tab === 'ig' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Instagram Account</label>
                {igAccountsLoading ? (
                  <p className="text-xs text-slate-400 italic">Loading Instagram accounts...</p>
                ) : igAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No Instagram accounts found</p>
                ) : (
                  <select value={selectedIgId} onChange={e => setSelectedIgId(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select an account</option>
                    {igAccounts.map(a => <option key={a.id} value={a.id}>{a.username?.includes(' ') || !a.username ? `📄 ${a.username || a.id}` : `@${a.username}`}</option>)}
                  </select>
                )}
              </div>

              {/* Include rules */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">Include people who meet
                  <select value={matchType} onChange={e => setMatchType(e.target.value)} className="px-2 py-0.5 rounded border border-slate-200 text-xs font-bold text-blue-700 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-200">
                    <option value="any">ANY</option>
                    <option value="all">ALL</option>
                  </select>
                  of the following criteria</label>
                <div className="space-y-2">
                  {igInclusions.map((rule, i) => (
                    <EngagementRuleCard key={`ig-inc-${i}`} rule={rule} type="include"
                      isOnly={igInclusions.length === 1 && igExclusions.length === 0}
                      engagementOptions={IG_ENGAGEMENTS}
                      onChange={updated => setIgInclusions(prev => prev.map((r, j) => j === i ? updated : r))}
                      onRemove={() => setIgInclusions(prev => prev.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <button onClick={() => setIgInclusions(prev => [...prev, { engagement: '', retentionDays: 365 }])}
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                  <Plus size={12} /> Include More People
                </button>
              </div>

              {/* Exclude rules */}
              {igExclusions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exclude people who</label>
                  <div className="space-y-2">
                    {igExclusions.map((rule, i) => (
                      <EngagementRuleCard key={`ig-exc-${i}`} rule={rule} type="exclude"
                        isOnly={false}
                        engagementOptions={[
                          { value: 'ig_profile_visit', label: 'Visited your profile' },
                          { value: 'ig_profile_engaged', label: 'Engaged with your profile' },
                          { value: 'ig_ad_interact', label: 'Engaged with any post or ad' },
                          { value: 'ig_message_sent', label: 'Sent a message to your account' },
                          { value: 'ig_post_saved', label: 'Saved any post or ad' },
                        ]}
                        onChange={updated => setIgExclusions(prev => prev.map((r, j) => j === i ? updated : r))}
                        onRemove={() => setIgExclusions(prev => prev.filter((_, j) => j !== i))} />
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setIgExclusions(prev => [...prev, { engagement: '', retentionDays: 365 }])}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600">
                <Plus size={12} /> Exclude People
              </button>
            </>
          )}

          {/* ── Facebook Page ── */}
          {tab === 'fb_page' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Page</label>
                {pagesLoading ? (
                  <p className="text-xs text-slate-400 italic">Loading pages...</p>
                ) : pages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No pages found</p>
                ) : (
                  <select value={selectedPageId} onChange={e => setSelectedPageId(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select a page</option>
                    {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                )}
              </div>
              {/* Include rules */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 mb-1.5">Include people who meet
                  <select value={matchType} onChange={e => setMatchType(e.target.value)} className="px-2 py-0.5 rounded border border-slate-200 text-xs font-bold text-blue-700 bg-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-200">
                    <option value="any">ANY</option>
                    <option value="all">ALL</option>
                  </select>
                  of the following criteria</label>
                <div className="space-y-2">
                  {pageInclusions.map((rule, i) => (
                    <EngagementRuleCard key={`pg-inc-${i}`} rule={rule} type="include"
                      isOnly={pageInclusions.length === 1 && pageExclusions.length === 0}
                      engagementOptions={PAGE_ENGAGEMENTS}
                      onChange={updated => setPageInclusions(prev => prev.map((r, j) => j === i ? updated : r))}
                      onRemove={() => setPageInclusions(prev => prev.filter((_, j) => j !== i))} />
                  ))}
                </div>
                <button onClick={() => setPageInclusions(prev => [...prev, { engagement: '', retentionDays: 365 }])}
                  className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700">
                  <Plus size={12} /> Include More People
                </button>
              </div>

              {/* Exclude rules */}
              {pageExclusions.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Exclude people who</label>
                  <div className="space-y-2">
                    {pageExclusions.map((rule, i) => (
                      <EngagementRuleCard key={`pg-exc-${i}`} rule={rule} type="exclude"
                        isOnly={false}
                        engagementOptions={PAGE_ENGAGEMENTS}
                        onChange={updated => setPageExclusions(prev => prev.map((r, j) => j === i ? updated : r))}
                        onRemove={() => setPageExclusions(prev => prev.filter((_, j) => j !== i))} />
                    ))}
                  </div>
                </div>
              )}
              <button onClick={() => setPageExclusions(prev => [...prev, { engagement: '', retentionDays: 365 }])}
                className="flex items-center gap-1 text-[11px] font-semibold text-red-500 hover:text-red-600">
                <Plus size={12} /> Exclude People
              </button>
            </>
          )}

          {/* ── Lookalike ── */}
          {tab === 'lookalike' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source Audience</label>
                {existingAudiences.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Loading your audiences...</p>
                ) : (
                  <select value={sourceAudienceId} onChange={e => setSourceAudienceId(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select a source audience</option>
                    {existingAudiences.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({SUBTYPE_LABELS[a.subtype] || a.subtype || 'Custom'})</option>
                    ))}
                  </select>
                )}
                {sourceAudienceId && (
                  <p className="text-[10px] text-slate-400 mt-1">ID: {sourceAudienceId}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Target Location</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className={INPUT_CLS}>
                  <option value="SG">Singapore</option><option value="HK">Hong Kong</option><option value="US">United States</option>
                  <option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="MY">Malaysia</option>
                  <option value="TW">Taiwan</option><option value="JP">Japan</option><option value="TH">Thailand</option>
                  <option value="PH">Philippines</option><option value="ID">Indonesia</option><option value="VN">Vietnam</option>
                  <option value="KR">South Korea</option><option value="IN">India</option><option value="CA">Canada</option>
                  <option value="DE">Germany</option><option value="FR">France</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Audience Size: {ratio}%</label>
                <input type="range" min={1} max={10} value={ratio} onChange={e => setRatio(Number(e.target.value))} className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>1% — Most similar</span>
                  <span>5%</span>
                  <span>10% — Broadest</span>
                </div>
              </div>
            </>
          )}

          {/* ── Simple sources (Lead Ad, Offline, FB Event, Mobile App, Shopping, Catalogue, AR) ── */}
          {SIMPLE_SOURCES.includes(tab) && (
            <>
              <div className="flex items-start gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  {(() => { const S = SOURCE_LIST.find(s => s.id === tab); return S ? <S.icon size={16} className="text-blue-600" /> : null; })()}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">{simpleSourceLabel}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {tab === 'lead_ad' && 'Create an audience from people who opened or completed your lead forms.'}
                    {tab === 'offline' && 'Create an audience from people in your offline event data (in-store, phone, etc.).'}
                    {tab === 'fb_event' && 'Create an audience from people who interacted with your Facebook events.'}
                    {tab === 'mobile_app' && 'Create an audience from people who used your mobile app.'}
                    {tab === 'shopping' && 'Create an audience from people who interacted with your Facebook/Instagram shop.'}
                    {tab === 'catalogue' && 'Create an audience from people who interacted with items in your product catalogue.'}
                    {tab === 'ar' && 'Create an audience from people who interacted with your augmented reality experience.'}
                  </p>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={365} className={INPUT_CLS} />
              </div>
            </>
          )}
          {/* ── Name & Description (bottom, matching Meta UI) ── */}
          <div className="border-t border-slate-100 pt-4 mt-2 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Audience Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional — auto-generated if empty" className={INPUT_CLS} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe this audience..." rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 resize-none" />
            </div>
          </div>

          </div>{/* end config panel */}
        </div>{/* end flex wrapper (sidebar + config) */}

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100">
          {validationError && (
            <div className="mx-5 mb-0 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <AlertTriangle size={13} className="text-red-400 shrink-0" />
              <p className="text-[11px] text-red-600 font-medium">{validationError}</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={handleCreate} disabled={!!validationError}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${validationError ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
              Create via AI Agent
            </button>
          </div>
        </div>

        {showConfirm && (
          <ConfirmDialog
            title="Create Audience?"
            message="The AI agent will create this audience in your ad account."
            details={[pendingPrompt]}
            confirmLabel="Create"
            onConfirm={handleConfirmCreate}
            onCancel={() => setShowConfirm(false)}
          />
        )}
      </div>
    </div>
  );
};

// ── Main Audience Manager ───────────────────────────────────────────────────
export const AudienceManager = ({ adAccountId, onSendToChat, onBack }) => {
  const [audiences, setAudiences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createDefaultTab, setCreateDefaultTab] = useState('website');
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('time_created');
  const [sortDir, setSortDir] = useState('desc');
  // Filters matching Meta's UI
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterType, setFilterType] = useState([]);
  const [filterAvailability, setFilterAvailability] = useState([]);
  const [expandedAudienceId, setExpandedAudienceId] = useState(null);
  const getAudienceSummary = (audName) => {
    try {
      const stored = JSON.parse(localStorage.getItem('audience_summaries') || '{}');
      return stored[audName]?.bullets || null;
    } catch (_) { return null; }
  };
  const createMenuRef = useRef(null);

  const fetchAudiences = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch custom + saved audiences in parallel
      const [customRes, savedRes] = await Promise.allSettled([
        api.get(`/meta/customaudiences`, { params: { adAccountId } }),
        api.get(`/meta/saved-audiences`, { params: { adAccountId } }),
      ]);
      const custom = customRes.status === 'fulfilled'
        ? (Array.isArray(customRes.value.data) ? customRes.value.data : customRes.value.data?.data || [])
        : [];
      const saved = savedRes.status === 'fulfilled'
        ? (Array.isArray(savedRes.value.data) ? savedRes.value.data : savedRes.value.data?.data || []).map(s => ({
            ...s, subtype: 'SAVED', _isSaved: true,
          }))
        : [];
      setAudiences([...custom, ...saved]);
      if (customRes.status === 'rejected') setError(customRes.reason?.response?.data?.error || customRes.reason?.message);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  // Reset and re-fetch when ad account changes
  useEffect(() => {
    setAudiences([]);
    setSearchQuery('');
    setFilterType([]);
    setFilterStatus([]);
    setFilterAvailability([]);
    fetchAudiences();
  }, [adAccountId, fetchAudiences]);

  // Close create menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (createMenuRef.current && !createMenuRef.current.contains(e.target)) setShowCreateMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter + search
  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir(key === 'name' ? 'asc' : 'desc'); }
  };

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return <ArrowUpDown size={10} className="text-slate-300" />;
    return sortDir === 'asc' ? <ArrowUp size={10} className="text-blue-500" /> : <ArrowDown size={10} className="text-blue-500" />;
  };

  const toggleFilter = (arr, setArr, val) => {
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  };

  const activeFilterCount = filterStatus.length + filterType.length + filterAvailability.length;

  const filtered = audiences.filter(aud => {
    const matchesSearch = !searchQuery || aud.name?.toLowerCase().includes(searchQuery.toLowerCase()) || aud.id?.includes(searchQuery);

    // Type filter
    const sub = aud.subtype || 'CUSTOM';
    const isCustom = sub !== 'LOOKALIKE' && sub !== 'SAVED';
    const matchesType = filterType.length === 0
      || (filterType.includes('CUSTOM') && isCustom)
      || (filterType.includes('LOOKALIKE') && sub === 'LOOKALIKE')
      || (filterType.includes('SAVED') && (sub === 'SAVED' || aud._isSaved));

    // Availability filter — uses operation_status.code (200=Normal, 300=Expired, 411/412/415=Populating, 400+=Error)
    const opCode = aud.operation_status?.code;
    const matchesAvail = filterAvailability.length === 0
      || (filterAvailability.includes('ready') && (opCode === 200 || !opCode))
      || (filterAvailability.includes('not_ready') && (opCode === 411 || opCode === 412 || opCode === 415 || opCode === 300))
      || (filterAvailability.includes('error') && (opCode >= 400 && opCode !== 411 && opCode !== 412 && opCode !== 415));

    // Status filter — uses delivery_status and timing data
    const deliveryCode = aud.delivery_status?.code;
    const matchesStatus = filterStatus.length === 0
      || (filterStatus.includes('in_active_ads') && deliveryCode === 200)
      || (filterStatus.includes('recently_used') && aud.time_updated && (Date.now() / 1000 - aud.time_updated) < 30 * 86400)
      || (filterStatus.includes('shared') && aud.is_value_based)
      || (filterStatus.includes('action_needed') && opCode >= 400 && opCode !== 411 && opCode !== 412 && opCode !== 415);

    return matchesSearch && matchesType && matchesAvail && matchesStatus;
  });

  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortKey === 'name') return dir * (a.name || '').localeCompare(b.name || '');
    if (sortKey === 'subtype') return dir * (a.subtype || '').localeCompare(b.subtype || '');
    if (sortKey === 'size') {
      const sA = a.approximate_count_lower_bound || 0;
      const sB = b.approximate_count_lower_bound || 0;
      return dir * (sA - sB);
    }
    if (sortKey === 'time_created') {
      return dir * ((a.time_created || 0) - (b.time_created || 0));
    }
    return 0;
  });

  const handleOpenCreate = (type) => {
    setShowCreateMenu(false);
    if (type === 'lookalike') setCreateDefaultTab('lookalike');
    else if (type === 'saved') {
      // Saved audiences are interest/behavior-based — send to chat
      onSendToChat('Create a saved audience with interest and behavior targeting');
      return;
    } else setCreateDefaultTab('website');
    setShowCreate(true);
  };

  const [confirmAction, setConfirmAction] = useState(null); // { title, message, details, confirmLabel, confirmColor, onConfirm }

  const handleUse = (aud) => onSendToChat(`Create an ad set targeting custom audience "${aud.name}" (ID: ${aud.id})`);

  const handleCreateLookalike = (aud) => {
    setConfirmAction({
      title: 'Create Lookalike Audience?',
      message: `This will create a 1% lookalike audience from "${aud.name}".`,
      details: [`Source: ${aud.name}`, `ID: ${aud.id}`, `Target: Singapore, 1% ratio`],
      confirmLabel: 'Create Lookalike',
      onConfirm: () => {
        onSendToChat(`Create a 1% lookalike audience from "${aud.name}" (ID: ${aud.id}) targeting Singapore`);
        setConfirmAction(null);
      },
    });
  };

  const handleDelete = (aud) => {
    setConfirmAction({
      title: 'Delete Audience?',
      message: `This will permanently delete "${aud.name}". This cannot be undone.`,
      details: [`Name: ${aud.name}`, `ID: ${aud.id}`],
      confirmLabel: 'Delete',
      confirmColor: 'red',
      onConfirm: () => {
        onSendToChat(`Delete custom audience "${aud.name}" (ID: ${aud.id})`);
        setConfirmAction(null);
      },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-blue-500" />
              Audiences
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {audiences.length} audiences
              <span className="mx-1.5 text-slate-300">·</span>
              {adAccountId || 'No account'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchAudiences} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
            {/* Create Audience dropdown */}
            <div className="relative" ref={createMenuRef}>
              <button onClick={() => setShowCreateMenu(v => !v)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm">
                Create Audience <ChevronDown size={12} />
              </button>
              {showCreateMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30">
                  <button onClick={() => handleOpenCreate('custom')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <Users size={16} className="text-slate-400" /> Custom Audience
                  </button>
                  <button onClick={() => handleOpenCreate('lookalike')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <Copy size={16} className="text-slate-400" /> Lookalike Audience
                  </button>
                  <button onClick={() => handleOpenCreate('saved')}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors text-left">
                    <FolderOpen size={16} className="text-slate-400" /> Saved Audience
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Search + Filter row */}
        {audiences.length > 0 && (
          <div className="px-6 pb-3 flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or audience ID"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50"
              />
            </div>
            <button onClick={() => setShowFilterPanel(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors
                ${showFilterPanel || activeFilterCount > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
              <SlidersHorizontal size={13} />
              Filter
              {activeFilterCount > 0 && (
                <span className="ml-1 bg-blue-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{activeFilterCount}</span>
              )}
            </button>
            {activeFilterCount > 0 && (
              <button onClick={() => { setFilterStatus([]); setFilterType([]); setFilterAvailability([]); }}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Filter panel (collapsible, like Meta) */}
        {showFilterPanel && audiences.length > 0 && (
          <div className="px-6 pb-4 border-t border-slate-100 pt-3">
            <div className="flex gap-6">
              {/* Status */}
              <div className="min-w-[150px]">
                <button onClick={() => {}} className="flex items-center justify-between w-full text-xs font-bold text-slate-700 mb-2">
                  Status <ChevronUp size={12} className="text-slate-400" />
                </button>
                <div className="space-y-1.5">
                  {STATUS_FILTERS.map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={filterStatus.includes(f.id)} onChange={() => toggleFilter(filterStatus, setFilterStatus, f.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
                      <span className="text-xs text-slate-600 group-hover:text-slate-900">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Type */}
              <div className="min-w-[150px]">
                <button onClick={() => {}} className="flex items-center justify-between w-full text-xs font-bold text-slate-700 mb-2">
                  Type <ChevronUp size={12} className="text-slate-400" />
                </button>
                <div className="space-y-1.5">
                  {TYPE_FILTERS.map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={filterType.includes(f.id)} onChange={() => toggleFilter(filterType, setFilterType, f.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
                      <span className="text-xs text-slate-600 group-hover:text-slate-900">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Availability */}
              <div className="min-w-[150px]">
                <button onClick={() => {}} className="flex items-center justify-between w-full text-xs font-bold text-slate-700 mb-2">
                  Availability <ChevronUp size={12} className="text-slate-400" />
                </button>
                <div className="space-y-1.5">
                  {AVAILABILITY_FILTERS.map(f => (
                    <label key={f.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={filterAvailability.includes(f.id)} onChange={() => toggleFilter(filterAvailability, setFilterAvailability, f.id)}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-200" />
                      <span className="text-xs text-slate-600 group-hover:text-slate-900">{f.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {!adAccountId && (
          <div className="text-center py-16 text-sm text-slate-400">Select an ad account to view audiences</div>
        )}

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
        )}

        {loading && !audiences.length && (
          <div className="text-center py-16">
            <RefreshCw size={24} className="animate-spin text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading audiences...</p>
          </div>
        )}

        {!loading && adAccountId && !audiences.length && !error && (
          <div className="text-center py-16">
            <Users size={36} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500 mb-1">No custom audiences yet</p>
            <p className="text-xs text-slate-400 mb-4">Create your first audience to start targeting</p>
            <button onClick={() => handleOpenCreate('custom')}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500">
              <Plus size={14} /> Create Audience
            </button>
          </div>
        )}

        {sorted.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="text-left py-1.5 px-4 font-semibold cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('name')}>
                  <span className="inline-flex items-center gap-1">Name <SortIcon col="name" /></span>
                </th>
                <th className="text-left py-1.5 px-3 font-semibold w-[150px] cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('subtype')}>
                  <span className="inline-flex items-center gap-1">Type <SortIcon col="subtype" /></span>
                </th>
                <th className="text-right py-1.5 px-2 font-semibold w-[160px] cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('size')}>
                  <span className="inline-flex items-center gap-1 justify-end">Est. audience size <SortIcon col="size" /></span>
                </th>
                <th className="text-left py-1.5 px-2 font-semibold w-[130px]">Availability</th>
                <th className="text-left py-1.5 px-2 font-semibold w-[110px]">Audience ID</th>
                <th className="text-right py-1.5 px-2 font-semibold w-[90px] cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('time_created')}>
                  <span className="inline-flex items-center gap-1 justify-end">Created <SortIcon col="time_created" /></span>
                </th>
                <th className="w-[110px]"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(aud => {
                const subtype = aud.subtype || 'CUSTOM';
                const typeInfo = getTypeDisplay(aud);
                const sizeInfo = fmtSize(aud.approximate_count_lower_bound, aud.approximate_count_upper_bound, aud);
                const avail = getAvailability(aud);
                const isExpanded = expandedAudienceId === aud.id;
                const bullets = isExpanded ? getAudienceSummary(aud.name) : null;
                return (
                  <React.Fragment key={aud.id}>
                  <tr onClick={() => setExpandedAudienceId(isExpanded ? null : aud.id)}
                    className="group border-t border-slate-100 hover:bg-blue-50/30 transition-colors cursor-pointer">
                    {/* Name */}
                    <td className="py-2 px-4">
                      <p className="text-[12px] font-semibold text-blue-700 truncate max-w-[320px]">{aud.name}</p>
                    </td>
                    {/* Type — two lines like Meta: "Custom Audience" + "Engagement – Page" */}
                    <td className="py-2 px-3">
                      <p className="text-[11px] text-slate-700">{typeInfo.main}</p>
                      {typeInfo.detail && <p className="text-[10px] text-slate-400">{typeInfo.detail}</p>}
                    </td>
                    {/* Size */}
                    <td className="py-2 px-2 text-right">
                      {sizeInfo ? (
                        <div>
                          <span className="text-[12px] font-bold text-slate-900 tabular-nums whitespace-nowrap">{sizeInfo.text}</span>
                          {sizeInfo.sub && <p className="text-[10px] text-slate-400">{sizeInfo.sub}</p>}
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Availability — dot + label, error reason on hover */}
                    <td className="py-2 px-2">
                      <div className="flex items-start gap-1.5 relative group/avail">
                        <span className={`w-2 h-2 rounded-full ${avail.dot} mt-1 shrink-0`} />
                        <div>
                          <p className={`text-[11px] font-medium ${avail.color}`}>{avail.label}</p>
                          {avail.sub && <p className="text-[10px] text-slate-400 whitespace-pre-line leading-tight">{avail.sub}</p>}
                        </div>
                        {avail.tooltip && (
                          <div className="absolute bottom-full left-0 mb-1 hidden group-hover/avail:block z-20 w-56 bg-slate-800 text-white text-[11px] rounded-lg px-3 py-2 shadow-lg pointer-events-none">
                            {avail.tooltip}
                          </div>
                        )}
                      </div>
                    </td>
                    {/* Audience ID */}
                    <td className="py-2 px-2">
                      <CopyableId id={aud.id} />
                    </td>
                    {/* Date Created */}
                    <td className="py-2 px-2 text-right">
                      <span className="text-[10px] text-slate-400 whitespace-pre-line">{fmtDate(aud.time_created)}</span>
                    </td>
                    {/* Actions */}
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); handleUse(aud); }} title="Use in campaign"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                          <Target size={10} /> Use
                        </button>
                        {subtype !== 'LOOKALIKE' && !aud._isSaved && (
                          <button onClick={(e) => { e.stopPropagation(); handleCreateLookalike(aud); }} title="Create lookalike"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <Copy size={10} /> LAL
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); handleDelete(aud); }} title="Delete"
                          className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-slate-50/80 border-t border-slate-100">
                      <td colSpan={7} className="px-6 py-3">
                        {bullets && bullets.length > 0 ? (
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold text-slate-600 mb-1.5">Audience Configuration</p>
                            <ul className="list-disc list-inside space-y-0.5">
                              {bullets.map((b, i) => (
                                <li key={i} className="text-[11px] text-slate-600 leading-relaxed">{b}</li>
                              ))}
                            </ul>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">No configuration details saved for this audience.</p>
                        )}
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {audiences.length > 0 && sorted.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            No audiences match your search
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateAudienceModal
          adAccountId={adAccountId}
          defaultTab={createDefaultTab}
          onClose={() => setShowCreate(false)}
          onCreateViaChat={(prompt) => onSendToChat(prompt)}
        />
      )}

      {/* Confirm Dialog */}
      {confirmAction && (
        <ConfirmDialog
          title={confirmAction.title}
          message={confirmAction.message}
          details={confirmAction.details}
          confirmLabel={confirmAction.confirmLabel}
          confirmColor={confirmAction.confirmColor}
          onConfirm={confirmAction.onConfirm}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
};
