import { useState, useEffect, useCallback, useRef } from 'react';
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
  // Check if audience is pending/populating with no size data
  const opCode = aud?.operation_status?.code;
  if (opCode === 411 || opCode === 412 || opCode === 415) {
    return { text: 'Pending', sub: 'Size temporarily unavailable' };
  }
  if (!lower && !upper) return null;
  if (lower && lower < 1000 && (!upper || upper < 1000)) return { text: `Below 1,000` };
  const fmt = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(0).replace(/\.0$/, '') + ',000,000';
    if (n >= 1_000) return n.toLocaleString();
    return n.toLocaleString();
  };
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

// Get availability display matching Meta's UI
const getAvailability = (aud) => {
  const op = aud.operation_status;
  const opCode = op?.code;
  // Meta operation_status codes: 200=Normal, 300=Expired, 400+=issues
  // delivery_status code 200 = active delivery
  if (opCode === 200) {
    const lastEdited = aud.time_updated ? `Last edited on\n${new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date((aud.time_updated < 1e12 ? aud.time_updated * 1000 : aud.time_updated)))}` : null;
    return { label: 'Ready', color: 'text-emerald-600', dot: 'bg-emerald-500', sub: lastEdited };
  }
  if (opCode === 411 || opCode === 412 || opCode === 415) {
    return { label: 'Populating', color: 'text-amber-600', dot: 'bg-amber-500', sub: 'Available for use' };
  }
  if (opCode === 300) return { label: 'Expired', color: 'text-slate-400', dot: 'bg-slate-400', sub: null };
  if (opCode >= 400) return { label: 'Error', color: 'text-red-500', dot: 'bg-red-500', sub: op?.description || null };
  // Fallback for saved audiences or unknown
  if (aud._isSaved) return { label: 'Ready', color: 'text-emerald-600', dot: 'bg-emerald-500', sub: null };
  return { label: 'Ready', color: 'text-emerald-600', dot: 'bg-emerald-500', sub: null };
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
  { id: 'mobile_app', label: 'Mobile App', icon: Smartphone },
  { id: 'offline', label: 'Offline events', icon: Database },
];
const META_SOURCES = [
  { id: 'video', label: 'Video', icon: Film },
  { id: 'ig', label: 'Instagram account', icon: Hash },
  { id: 'fb_page', label: 'Facebook Page', icon: FileText },
  { id: 'lead_ad', label: 'Lead Ad', icon: ClipboardCopy },
  { id: 'fb_event', label: 'Facebook event', icon: CalendarDays },
  { id: 'shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'catalogue', label: 'Catalogue', icon: BookOpen },
  { id: 'ar', label: 'Augmented reality', icon: Sparkles },
];
const OTHER_SOURCES = [
  { id: 'lookalike', label: 'Lookalike audience', icon: Copy },
];
const SOURCE_LIST = [...YOUR_SOURCES, ...META_SOURCES, ...OTHER_SOURCES];

const INPUT_CLS = 'w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100';

const CreateAudienceModal = ({ onClose, onCreateViaChat, adAccountId, defaultTab = 'website' }) => {
  const [tab, setTab] = useState(defaultTab);
  const [name, setName] = useState('');
  const [retentionDays, setRetentionDays] = useState(30);

  // Website
  const [pixels, setPixels] = useState([]);
  const [selectedPixelId, setSelectedPixelId] = useState('');
  const [websiteEvent, setWebsiteEvent] = useState('all_visitors');
  const [urlFilter, setUrlFilter] = useState('');

  // Video
  const [videoSource, setVideoSource] = useState('fb_page');
  const [videoSourcePage, setVideoSourcePage] = useState('');
  const [videoSourceIg, setVideoSourceIg] = useState('');
  const [videoIdInput, setVideoIdInput] = useState('');
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [engagementType, setEngagementType] = useState('');

  // Customer List
  const [customerFile, setCustomerFile] = useState(null); // { name, rows, preview }
  const [customerDataType, setCustomerDataType] = useState('email');
  const customerFileRef = useRef(null);

  // Instagram
  const [igAccounts, setIgAccounts] = useState([]);
  const [selectedIgId, setSelectedIgId] = useState('');
  const [igEngagement, setIgEngagement] = useState('');

  // FB Page
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [pageEngagement, setPageEngagement] = useState('');

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
      if (!pages.length) api.get('/meta/pages').then(r => setPages(r.data || [])).catch(() => {});
      if (!igAccounts.length) api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`).then(r => setIgAccounts(r.data || [])).catch(() => {});
      // Videos loaded by separate effect below
    }
    if (tab === 'ig' && !igAccounts.length) {
      api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`).then(r => setIgAccounts(r.data || [])).catch(() => {});
    }
    if ((tab === 'fb_page') && !pages.length) {
      api.get('/meta/pages').then(r => setPages(r.data || [])).catch(() => {});
    }
    if (tab === 'lookalike' && !existingAudiences.length) {
      api.get('/meta/customaudiences', { params: { adAccountId } }).then(r => {
        const data = Array.isArray(r.data) ? r.data : r.data?.data || [];
        setExistingAudiences(data.filter(a => a.subtype !== 'LOOKALIKE'));
      }).catch(() => {});
    }
  }, [tab, adAccountId]);

  // Fetch videos when video source changes
  useEffect(() => {
    if (tab !== 'video' || !adAccountId) return;
    if (videoSource === 'video_id') { setVideos([]); return; }
    setVideosLoading(true);
    setVideos([]);
    setSelectedVideoIds([]);
    // All sources use the ad account videos endpoint — Meta returns all videos associated with the account
    api.get(`/meta/adaccounts/${adAccountId}/videos`).then(r => { setVideos(r.data || []); setVideosLoading(false); }).catch(() => setVideosLoading(false));
  }, [tab, videoSource, adAccountId]);

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
    if (tab === 'website') {
      const pixelName = pixels.find(p => p.id === selectedPixelId)?.name || '';
      const webEventLabels = {
        all_visitors: 'all website visitors',
        specific_pages: `visitors to pages containing "${urlFilter}"`,
        time_spent: 'visitors by time spent (top 25%)',
        purchase: 'people who completed a purchase',
        add_to_cart: 'people who added to cart',
        lead: 'people who completed a lead form',
        view_content: 'people who viewed content',
      };
      const eventDesc = webEventLabels[websiteEvent] || 'all website visitors';
      return `Create a website custom audience${audName ? ` called ${audName}` : ''} using pixel "${pixelName}" (ID: ${selectedPixelId}), targeting ${eventDesc}, ${retentionDays} day retention`;
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
      return `Create a video engagement custom audience${audName ? ` called ${audName}` : ''} for people who ${engDesc} of these videos: ${vidNames} (IDs: ${videoIds.join(', ')}), ${retentionDays} day retention`;
    }
    if (tab === 'customer_list') {
      if (customerFile) {
        const typeLabel = { email: 'emails', phone: 'phone numbers', fn_ln: 'first + last names', madid: 'mobile advertiser IDs' }[customerDataType] || customerDataType;
        return `Create a customer list custom audience${audName ? ` called ${audName}` : ''} using ${customerFile.rows} ${typeLabel} from file "${customerFile.name}"`;
      }
      return `Create a customer list custom audience${audName ? ` called ${audName}` : ''}. I will provide the customer data.`;
    }
    if (tab === 'ig') {
      const igName = igAccounts.find(a => a.id === selectedIgId)?.username || selectedIgId;
      const igEngLabels = {
        ig_profile_visit: 'visited your profile',
        ig_profile_engaged: 'engaged with your profile',
        ig_ad_interact: 'engaged with any post or ad',
        ig_message_sent: 'sent a message to your account',
        ig_post_saved: 'saved any post or ad',
      };
      const igEngDesc = igEngLabels[igEngagement] || '';
      return `Create an Instagram engagement custom audience${audName ? ` called ${audName}` : ''} from Instagram account @${igName} (ID: ${selectedIgId})${igEngDesc ? `, targeting people who ${igEngDesc}` : ''}, ${retentionDays} day retention`;
    }
    if (tab === 'fb_page') {
      const pageName = pages.find(p => p.id === selectedPageId)?.name || selectedPageId;
      const pageEngLabels = {
        page_liked: 'currently like or follow your Page',
        page_engaged: 'engaged with any post or ad',
        page_cta_clicked: 'clicked any call-to-action button',
        page_message_sent: 'sent a message to your Page',
        page_visited: 'visited your Page',
      };
      const pageEngDesc = pageEngLabels[pageEngagement] || '';
      return `Create a Facebook Page engagement custom audience${audName ? ` called ${audName}` : ''} from page "${pageName}" (ID: ${selectedPageId})${pageEngDesc ? `, targeting people who ${pageEngDesc}` : ''}, ${retentionDays} day retention`;
    }
    if (tab === 'lead_ad') {
      return `Create a lead ad custom audience${audName ? ` called ${audName}` : ''} from people who opened or completed a lead form, ${retentionDays} day retention`;
    }
    if (tab === 'offline') {
      return `Create an offline events custom audience${audName ? ` called ${audName}` : ''} from offline conversion data, ${retentionDays} day retention`;
    }
    if (tab === 'fb_event') {
      return `Create a Facebook event custom audience${audName ? ` called ${audName}` : ''} from people who interacted with your events, ${retentionDays} day retention`;
    }
    if (tab === 'mobile_app') {
      return `Create a mobile app custom audience${audName ? ` called ${audName}` : ''} from app activity, ${retentionDays} day retention`;
    }
    if (tab === 'shopping') {
      return `Create a shopping custom audience${audName ? ` called ${audName}` : ''} from people who interacted with your shop, ${retentionDays} day retention`;
    }
    if (tab === 'catalogue') {
      return `Create a catalogue custom audience${audName ? ` called ${audName}` : ''} from people who interacted with items in your catalogue, ${retentionDays} day retention`;
    }
    if (tab === 'ar') {
      return `Create an augmented reality custom audience${audName ? ` called ${audName}` : ''} from people who interacted with your AR experience, ${retentionDays} day retention`;
    }
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
    if (tab === 'video' && videoSource !== 'video_id' && selectedVideoIds.length === 0) return 'Please select at least one video';
    if (tab === 'video' && videoSource === 'video_id' && !videoIdInput.trim()) return 'Please enter at least one video ID';
    if (tab === 'video' && !engagementType) return 'Please choose an engagement type';
    if (tab === 'ig' && !selectedIgId) return 'Please select an Instagram account';
    if (tab === 'fb_page' && !selectedPageId) return 'Please select a Facebook Page';
    if (tab === 'lookalike' && !sourceAudienceId) return 'Please select a source audience';
    return null;
  };
  const validationError = getValidationError();

  const handleCreate = () => {
    if (validationError) return;
    const prompt = buildPrompt();
    setPendingPrompt(prompt);
    setShowConfirm(true);
  };

  const handleConfirmCreate = () => {
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
              <button key={s.id} onClick={() => setTab(s.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors
                  ${tab === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <s.icon size={14} className={tab === s.id ? 'text-blue-500' : 'text-slate-400'} />
                {s.label}
              </button>
            ))}
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Meta Sources</p>
            {META_SOURCES.map(s => (
              <button key={s.id} onClick={() => setTab(s.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors
                  ${tab === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                <s.icon size={14} className={tab === s.id ? 'text-blue-500' : 'text-slate-400'} />
                {s.label}
              </button>
            ))}
            <div className="border-t border-slate-100 mt-2 pt-1">
              {OTHER_SOURCES.map(s => (
                <button key={s.id} onClick={() => setTab(s.id)}
                  className={`w-full flex items-center gap-2.5 px-4 py-2 text-xs text-left transition-colors
                    ${tab === s.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <s.icon size={14} className={tab === s.id ? 'text-blue-500' : 'text-slate-400'} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Config panel */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Name — always shown */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Audience Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Optional — auto-generated if empty" className={INPUT_CLS} />
            </div>

          {/* ── Website ── */}
          {tab === 'website' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Pixel</label>
                {pixels.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Loading pixels...</p>
                ) : (
                  <select value={selectedPixelId} onChange={e => setSelectedPixelId(e.target.value)} className={INPUT_CLS}>
                    <option value="">Select a pixel</option>
                    {pixels.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Website Event</label>
                <select value={websiteEvent} onChange={e => setWebsiteEvent(e.target.value)} className={INPUT_CLS}>
                  <option value="all_visitors">All website visitors</option>
                  <option value="specific_pages">People who visited specific web pages</option>
                  <option value="time_spent">Visitors by time spent (top 25%)</option>
                  <option value="purchase">People who completed a purchase</option>
                  <option value="add_to_cart">People who added to cart</option>
                  <option value="lead">People who completed a lead form</option>
                  <option value="view_content">People who viewed content</option>
                </select>
              </div>
              {websiteEvent === 'specific_pages' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">URL Contains</label>
                  <input value={urlFilter} onChange={e => setUrlFilter(e.target.value)} placeholder="e.g., /products or /checkout" className={INPUT_CLS} />
                  <p className="text-[10px] text-slate-400 mt-1">Only include visitors to URLs containing this text</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={180} className={INPUT_CLS} />
              </div>
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
                    {pages.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Loading...</p>
                    ) : (
                      <select value={videoSourcePage} onChange={e => setVideoSourcePage(e.target.value)} className={INPUT_CLS}>
                        <option value="">All pages</option>
                        {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    )}
                  </div>
                )}
                {videoSource === 'ig_account' && (
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Instagram Account</label>
                    {igAccounts.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-2">Loading...</p>
                    ) : (
                      <select value={videoSourceIg} onChange={e => setVideoSourceIg(e.target.value)} className={INPUT_CLS}>
                        <option value="">Select account</option>
                        {igAccounts.map(a => <option key={a.id} value={a.id}>@{a.username}</option>)}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Video ID manual input */}
              {videoSource === 'video_id' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Video IDs</label>
                  <input value={videoIdInput} onChange={e => setVideoIdInput(e.target.value)} placeholder="Paste video IDs, comma separated" className={INPUT_CLS} />
                  <p className="text-[10px] text-slate-400 mt-1">Enter one or more video IDs separated by commas</p>
                </div>
              ) : (
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
                  ) : (
                    <div className="max-h-[200px] overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
                      {videos.map(v => (
                        <button key={v.id} onClick={() => toggleVideo(v.id)}
                          className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors
                            ${selectedVideoIds.includes(v.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
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
                            <p className="text-[11px] font-medium text-slate-700 truncate">{v.title || `Video ${v.id}`}</p>
                            <p className="text-[10px] text-slate-400">{v.id}</p>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                            ${selectedVideoIds.includes(v.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                            {selectedVideoIds.includes(v.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
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
                {igAccounts.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Loading Instagram accounts...</p>
                ) : (
                  <div className="space-y-1.5">
                    {igAccounts.map(a => (
                      <button key={a.id} onClick={() => setSelectedIgId(a.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors
                          ${selectedIgId === a.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        {a.profile_pic ? (
                          <img src={a.profile_pic} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xs font-bold shrink-0">{a.username?.[0]?.toUpperCase()}</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${selectedIgId === a.id ? 'text-blue-700' : 'text-slate-700'}`}>@{a.username}</p>
                          <p className="text-[10px] text-slate-400">{a.id}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedIgId === a.id ? 'border-blue-600' : 'border-slate-300'}`}>
                          {selectedIgId === a.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Engagement Type</label>
                <select value={igEngagement} onChange={e => setIgEngagement(e.target.value)} className={INPUT_CLS}>
                  <option value="">Choose an engagement type</option>
                  <option value="ig_profile_visit">People who visited your profile</option>
                  <option value="ig_profile_engaged">People who engaged with your profile</option>
                  <option value="ig_ad_interact">People who engaged with any post or ad</option>
                  <option value="ig_message_sent">People who sent a message to your account</option>
                  <option value="ig_post_saved">People who saved any post or ad</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={365} className={INPUT_CLS} />
              </div>
            </>
          )}

          {/* ── Facebook Page ── */}
          {tab === 'fb_page' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Facebook Page</label>
                {pages.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Loading pages...</p>
                ) : (
                  <div className="space-y-1.5">
                    {pages.map(p => (
                      <button key={p.id} onClick={() => setSelectedPageId(p.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors
                          ${selectedPageId === p.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold shrink-0">{p.name?.[0]?.toUpperCase()}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium ${selectedPageId === p.id ? 'text-blue-700' : 'text-slate-700'}`}>{p.name}</p>
                          <p className="text-[10px] text-slate-400">{p.category} · {p.fan_count?.toLocaleString() || 0} fans</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedPageId === p.id ? 'border-blue-600' : 'border-slate-300'}`}>
                          {selectedPageId === p.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Engagement Type</label>
                <select value={pageEngagement} onChange={e => setPageEngagement(e.target.value)} className={INPUT_CLS}>
                  <option value="">Choose an engagement type</option>
                  <option value="page_liked">People who currently like or follow your Page</option>
                  <option value="page_engaged">People who engaged with any post or ad</option>
                  <option value="page_cta_clicked">People who clicked any call-to-action button</option>
                  <option value="page_message_sent">People who sent a message to your Page</option>
                  <option value="page_visited">People who visited your Page</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={365} className={INPUT_CLS} />
              </div>
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
          </div>{/* end config panel */}
        </div>{/* end flex wrapper (sidebar + config) */}

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100">
          <div className="mx-5 my-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">Audiences created via API won't appear in Ads Manager's audience picker, but work perfectly when assigned to ad sets through this tool.</p>
          </div>
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
              <tr className="text-[11px] font-semibold text-slate-500 border-b border-slate-200">
                <th className="text-left py-2.5 px-4 font-semibold cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('name')}>
                  <span className="inline-flex items-center gap-1">Name <SortIcon col="name" /></span>
                </th>
                <th className="text-left py-2.5 px-3 font-semibold w-[160px] cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('subtype')}>
                  <span className="inline-flex items-center gap-1">Type <SortIcon col="subtype" /></span>
                </th>
                <th className="text-right py-2.5 px-3 font-semibold w-[180px] cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('size')}>
                  <span className="inline-flex items-center gap-1 justify-end">Estimated audience size <SortIcon col="size" /></span>
                </th>
                <th className="text-left py-2.5 px-3 font-semibold w-[150px]">
                  Availability
                </th>
                <th className="text-left py-2.5 px-3 font-semibold w-[120px]">
                  Audience ID
                </th>
                <th className="text-right py-2.5 px-3 font-semibold w-[100px] cursor-pointer hover:text-slate-700 select-none" onClick={() => toggleSort('time_created')}>
                  <span className="inline-flex items-center gap-1 justify-end">Date Created <SortIcon col="time_created" /></span>
                </th>
                <th className="w-[100px]"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(aud => {
                const subtype = aud.subtype || 'CUSTOM';
                const typeInfo = getTypeDisplay(aud);
                const sizeInfo = fmtSize(aud.approximate_count_lower_bound, aud.approximate_count_upper_bound, aud);
                const avail = getAvailability(aud);
                return (
                  <tr key={aud.id} className="group border-t border-slate-100 hover:bg-blue-50/30 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4">
                      <p className="text-[13px] font-medium text-blue-700 truncate max-w-[350px] group-hover:underline cursor-pointer">{aud.name}</p>
                    </td>
                    {/* Type */}
                    <td className="py-3 px-3">
                      <p className="text-[12px] text-slate-700">{typeInfo.main}</p>
                      {typeInfo.detail && <p className="text-[11px] text-slate-400">{typeInfo.detail}</p>}
                    </td>
                    {/* Size */}
                    <td className="py-3 px-3 text-right">
                      {sizeInfo ? (
                        <div>
                          <span className="text-[12px] text-slate-700 tabular-nums">{sizeInfo.text}</span>
                          {sizeInfo.sub && <p className="text-[10px] text-slate-400">{sizeInfo.sub}</p>}
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Availability */}
                    <td className="py-3 px-3">
                      <div className="flex items-start gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${avail.dot} mt-1 shrink-0`} />
                        <div>
                          <p className={`text-[12px] font-medium ${avail.color}`}>{avail.label}</p>
                          {avail.sub && <p className="text-[10px] text-slate-400 whitespace-pre-line">{avail.sub}</p>}
                        </div>
                      </div>
                    </td>
                    {/* Audience ID */}
                    <td className="py-3 px-3">
                      <CopyableId id={aud.id} />
                    </td>
                    {/* Date Created */}
                    <td className="py-3 px-3 text-right">
                      <span className="text-[11px] text-slate-500 whitespace-pre-line">{fmtDate(aud.time_created)}</span>
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleUse(aud)} title="Use in campaign"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                          <Target size={10} /> Use
                        </button>
                        {subtype !== 'LOOKALIKE' && !aud._isSaved && (
                          <button onClick={() => handleCreateLookalike(aud)} title="Create lookalike"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200">
                            <Copy size={10} /> LAL
                          </button>
                        )}
                        <button onClick={() => handleDelete(aud)} title="Delete"
                          className="p-1 rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
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
