import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Plus, RefreshCw, Trash2, Copy, Target, Globe, Hash, X, AlertTriangle, Search, Film, ClipboardCopy, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronUp, SlidersHorizontal, FolderOpen } from 'lucide-react';
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
};
const SUBTYPE_COLORS = {
  WEBSITE: 'bg-blue-100 text-blue-700',
  ENGAGEMENT: 'bg-purple-100 text-purple-700',
  CUSTOM: 'bg-amber-100 text-amber-700',
  LOOKALIKE: 'bg-emerald-100 text-emerald-700',
  IG_BUSINESS: 'bg-pink-100 text-pink-700',
  IG_BUSINESS_PROFILE: 'bg-pink-100 text-pink-700',
  OFFLINE_CONVERSION: 'bg-slate-100 text-slate-600',
};

const fmtDate = (ts) => {
  if (!ts) return '—';
  // Meta returns epoch seconds (not ms) — detect and convert
  const ms = ts < 1e12 ? ts * 1000 : ts;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(ms));
};

const fmtSize = (lower, upper) => {
  if (!lower && !upper) return null;
  const fmt = (n) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1_000) return Math.round(n / 1_000) + 'K';
    return n.toLocaleString();
  };
  if (lower && upper && lower !== upper) return `${fmt(lower)} – ${fmt(upper)}`;
  return fmt(lower || upper || 0);
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
const CREATE_TABS = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'customer_list', label: 'Customer List', icon: Users },
  { id: 'ig', label: 'Instagram', icon: Hash },
  { id: 'fb_page', label: 'FB Page', icon: Globe },
  { id: 'lookalike', label: 'Lookalike', icon: Users },
];

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
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState([]);
  const [engagementType, setEngagementType] = useState('');

  // Instagram
  const [igAccounts, setIgAccounts] = useState([]);
  const [selectedIgId, setSelectedIgId] = useState('');
  const [igEngagement, setIgEngagement] = useState('');

  // FB Page
  const [pages, setPages] = useState([]);
  const [selectedPageId, setSelectedPageId] = useState('');
  const [pageEngagement, setPageEngagement] = useState('');

  // Lookalike
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
    if (tab === 'video' && !videos.length) {
      setVideosLoading(true);
      api.get(`/meta/adaccounts/${adAccountId}/videos`).then(r => { setVideos(r.data || []); setVideosLoading(false); }).catch(() => setVideosLoading(false));
    }
    if (tab === 'ig' && !igAccounts.length) {
      api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`).then(r => setIgAccounts(r.data || [])).catch(() => {});
    }
    if ((tab === 'fb_page') && !pages.length) {
      api.get('/meta/pages').then(r => setPages(r.data || [])).catch(() => {});
    }
  }, [tab, adAccountId]);

  const toggleVideo = (id) => {
    setSelectedVideoIds(prev => prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]);
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
      const vidNames = selectedVideoIds.map(id => videos.find(v => v.id === id)?.title || id).join(', ');
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
      return `Create a video engagement custom audience${audName ? ` called ${audName}` : ''} for people who ${engDesc} of these videos: ${vidNames} (IDs: ${selectedVideoIds.join(', ')}), ${retentionDays} day retention`;
    }
    if (tab === 'customer_list') {
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
    if (tab === 'lookalike') {
      return `Create a lookalike audience from audience ID ${sourceAudienceId}, targeting ${country}, ${ratio}% ratio${audName ? `, name it ${audName}` : ''}`;
    }
    return '';
  };

  const handleCreate = () => {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">Create Custom Audience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex border-b border-slate-100 shrink-0 overflow-x-auto">
          {CREATE_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center justify-center gap-1.5 px-4 py-3 text-[11px] font-semibold transition-colors whitespace-nowrap
                ${tab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <t.icon size={12} /> {t.label}
            </button>
          ))}
        </div>

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
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Select Videos <span className="text-slate-400 font-normal">({selectedVideoIds.length} selected)</span>
                </label>
                {videosLoading ? (
                  <div className="flex items-center gap-2 py-6 justify-center text-xs text-slate-400">
                    <RefreshCw size={14} className="animate-spin" /> Loading videos...
                  </div>
                ) : videos.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">No videos found in this ad account</p>
                ) : (
                  <div className="max-h-[240px] overflow-y-auto space-y-1.5 border border-slate-200 rounded-lg p-2">
                    {videos.map(v => (
                      <button key={v.id} onClick={() => toggleVideo(v.id)}
                        className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-left transition-colors
                          ${selectedVideoIds.includes(v.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50 border border-transparent'}`}>
                        {/* Thumbnail */}
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
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-slate-700 truncate">{v.title || `Video ${v.id}`}</p>
                          <p className="text-[10px] text-slate-400">{v.id}</p>
                        </div>
                        {/* Checkbox */}
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                          ${selectedVideoIds.includes(v.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {selectedVideoIds.includes(v.id) && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Engagement Type</label>
                <select value={engagementType} onChange={e => setEngagementType(e.target.value)} className={INPUT_CLS}>
                  <option value="">Choose an engagement type</option>
                  <option value="video_watched_3s">People who have viewed at least 3 seconds of your video</option>
                  <option value="video_watched_10s">People who have viewed at least 10 seconds of your video</option>
                  <option value="video_watched_15s">People who either completed or viewed at least 15 seconds of your video (ThruPlay)</option>
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
            <div className="text-center py-6">
              <Users size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-xs text-slate-500 mb-1">Customer list audiences are created via the AI agent.</p>
              <p className="text-[10px] text-slate-400">Click "Create" and the agent will guide you through uploading emails/phones.</p>
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
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source Audience ID</label>
                <input value={sourceAudienceId} onChange={e => setSourceAudienceId(e.target.value)} placeholder="Paste audience ID from the list" className={INPUT_CLS} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
                <select value={country} onChange={e => setCountry(e.target.value)} className={INPUT_CLS}>
                  <option value="SG">Singapore</option><option value="HK">Hong Kong</option><option value="US">United States</option>
                  <option value="GB">United Kingdom</option><option value="AU">Australia</option><option value="MY">Malaysia</option>
                  <option value="TW">Taiwan</option><option value="JP">Japan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ratio: {ratio}%</label>
                <input type="range" min={1} max={20} value={ratio} onChange={e => setRatio(Number(e.target.value))} className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-400"><span>1% (most similar)</span><span>20% (broadest)</span></div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-slate-100">
          <div className="mx-5 my-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700">Audiences created via API won't appear in Ads Manager's audience picker, but work perfectly when assigned to ad sets through this tool.</p>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
            <button onClick={handleCreate}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">
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
      const { data } = await api.get(`/meta/customaudiences`, { params: { adAccountId } });
      setAudiences(Array.isArray(data) ? data : data.data || []);
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
      || (filterType.includes('SAVED') && sub === 'SAVED');

    // Availability filter
    const opStatus = aud.operation_status?.status || aud.delivery_status?.status || '';
    const matchesAvail = filterAvailability.length === 0
      || (filterAvailability.includes('ready') && (!opStatus || opStatus === 'Normal' || opStatus === '200'))
      || (filterAvailability.includes('not_ready') && (opStatus === 'Not Ready' || opStatus === 'Pending'))
      || (filterAvailability.includes('error') && (opStatus === 'Error' || opStatus === 'Failed'));

    // Status filter (best-effort from available data)
    const matchesStatus = filterStatus.length === 0
      || (filterStatus.includes('in_active_ads') && aud.delivery_status?.status === '200')
      || (filterStatus.includes('recently_used') && aud.time_content_updated && (Date.now() / 1000 - aud.time_content_updated) < 30 * 86400)
      || (filterStatus.includes('action_needed') && (opStatus === 'Error' || opStatus === 'Failed'));

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
              Custom Audiences
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
                <th className="text-center py-1.5 px-2 font-semibold w-[100px] cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('subtype')}>
                  <span className="inline-flex items-center gap-1 justify-center">Type <SortIcon col="subtype" /></span>
                </th>
                <th className="text-right py-1.5 px-2 font-semibold w-[120px] cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('size')}>
                  <span className="inline-flex items-center gap-1 justify-end">Size <SortIcon col="size" /></span>
                </th>
                <th className="text-right py-1.5 px-2 font-semibold w-[90px] cursor-pointer hover:text-slate-600 select-none" onClick={() => toggleSort('time_created')}>
                  <span className="inline-flex items-center gap-1 justify-end">Created <SortIcon col="time_created" /></span>
                </th>
                <th className="w-[110px]"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(aud => {
                const subtype = aud.subtype || 'CUSTOM';
                const colorCls = SUBTYPE_COLORS[subtype] || 'bg-slate-100 text-slate-600';
                const size = fmtSize(aud.approximate_count_lower_bound, aud.approximate_count_upper_bound);
                return (
                  <tr key={aud.id} className="group border-t border-slate-100 hover:bg-blue-50/30 transition-colors">
                    <td className="py-2 px-4">
                      <p className="text-[12px] font-semibold text-slate-800 truncate max-w-[500px]">{aud.name}</p>
                      <CopyableId id={aud.id} />
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${colorCls}`}>
                        {SUBTYPE_LABELS[subtype] || subtype}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-[12px] font-bold text-slate-900 tabular-nums whitespace-nowrap">{size || '—'}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(aud.time_created)}</span>
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleUse(aud)} title="Use in campaign"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors">
                          <Target size={10} /> Use
                        </button>
                        {subtype !== 'LOOKALIKE' && (
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
