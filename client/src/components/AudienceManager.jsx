import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, RefreshCw, Trash2, Copy, Target, Globe, Hash, X, AlertTriangle, Search, Film, ClipboardCopy } from 'lucide-react';
import api from '../services/api.js';

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
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  };
  if (lower === upper || !upper) return fmt(lower || 0);
  if (!lower) return fmt(upper);
  return `${fmt(lower)} – ${fmt(upper)}`;
};

// ── Audience Row ────────────────────────────────────────────────────────────
const AudienceRow = ({ audience, onUse, onCreateLookalike, onDelete }) => {
  const [copied, setCopied] = useState(false);
  const subtype = audience.subtype || 'CUSTOM';
  const colorCls = SUBTYPE_COLORS[subtype] || 'bg-slate-100 text-slate-600';
  const status = audience.operation_status?.status || audience.delivery_status?.status || 'ready';
  const size = fmtSize(audience.approximate_count_lower_bound, audience.approximate_count_upper_bound);
  const audienceId = audience.id?.replace('act_', '');

  const copyId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(audience.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 hover:shadow-md hover:border-slate-300 transition-all group">
      {/* Top: Name + Size */}
      <div className="flex items-start justify-between gap-4 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-slate-800 leading-snug">{audience.name}</p>
          {audience.description && (
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{audience.description}</p>
          )}
        </div>
        {size && (
          <div className="text-right shrink-0">
            <p className="text-xl font-bold text-slate-900 leading-none">{size}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">people</p>
          </div>
        )}
      </div>

      {/* Middle: Tags row */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${colorCls}`}>
          {SUBTYPE_LABELS[subtype] || subtype}
        </span>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md capitalize
          ${status === 'ready' ? 'bg-emerald-50 text-emerald-600' :
            status === 'too_small' ? 'bg-amber-50 text-amber-600' :
            'bg-slate-50 text-slate-400'}`}>
          {status.replace(/_/g, ' ')}
        </span>
        <span className="text-[10px] text-slate-400 ml-auto">
          {fmtDate(audience.time_created)}
        </span>
      </div>

      {/* Bottom: ID + Actions */}
      <div className="flex items-center justify-between">
        <button onClick={copyId} title="Copy audience ID"
          className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 hover:text-slate-600 transition-colors">
          <ClipboardCopy size={11} />
          <span>{copied ? 'Copied!' : audienceId}</span>
        </button>
        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onUse(audience)} title="Use in campaign"
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm">
            <Target size={11} /> Use
          </button>
          {subtype !== 'LOOKALIKE' && (
            <button onClick={() => onCreateLookalike(audience)} title="Create lookalike"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200">
              <Copy size={11} /> Lookalike
            </button>
          )}
          <button onClick={() => onDelete(audience)} title="Delete"
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Filter Tabs ─────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'WEBSITE', label: 'Website' },
  { id: 'ENGAGEMENT', label: 'Engagement' },
  { id: 'LOOKALIKE', label: 'Lookalike' },
  { id: 'CUSTOM', label: 'Customer List' },
  { id: 'IG', label: 'Instagram' },
];

// ── Create Audience Modal ───────────────────────────────────────────────────
const CREATE_TABS = [
  { id: 'website', label: 'Website', icon: Globe },
  { id: 'video', label: 'Video', icon: Film },
  { id: 'engagement', label: 'Engagement', icon: Hash },
  { id: 'lookalike', label: 'Lookalike', icon: Users },
];

const CreateAudienceModal = ({ onClose, onCreateViaChat }) => {
  const [tab, setTab] = useState('website');
  const [name, setName] = useState('');
  const [retentionDays, setRetentionDays] = useState(30);
  const [urlFilter, setUrlFilter] = useState('');
  const [sourceAudienceId, setSourceAudienceId] = useState('');
  const [country, setCountry] = useState('SG');
  const [ratio, setRatio] = useState(1);
  const [engagementType, setEngagementType] = useState('page_engagement');
  const [videoSource, setVideoSource] = useState('facebook_page');
  const [videoId, setVideoId] = useState('');
  const [videoWatchPct, setVideoWatchPct] = useState(50);

  const VIDEO_SOURCES = [
    { id: 'facebook_page', label: 'Facebook Page', desc: 'People who watched videos on your Page' },
    { id: 'instagram', label: 'Instagram professional account', desc: 'People who watched videos on your IG' },
    { id: 'campaign', label: 'Campaign', desc: 'People who watched videos from your ads' },
    { id: 'video_id', label: 'Video ID', desc: 'People who watched a specific video' },
  ];

  const handleCreate = () => {
    let prompt = '';
    if (tab === 'website') {
      prompt = `Create a website custom audience called "${name || 'Website Visitors - Last ' + retentionDays + 'd'}" with ${retentionDays} day retention${urlFilter ? `, only visitors to pages containing "${urlFilter}"` : ''}`;
    } else if (tab === 'video') {
      const srcLabel = VIDEO_SOURCES.find(s => s.id === videoSource)?.label || videoSource;
      const defaultName = `Video Viewers ${videoWatchPct}% - ${srcLabel} - Last ${retentionDays}d`;
      prompt = `Create a video engagement custom audience called "${name || defaultName}" for people who watched at least ${videoWatchPct}% of videos from ${srcLabel}${videoSource === 'video_id' && videoId ? ` (video ID: ${videoId})` : ''}, ${retentionDays} day retention`;
    } else if (tab === 'lookalike') {
      prompt = `Create a lookalike audience from audience ID ${sourceAudienceId}, targeting ${country}, ${ratio}% ratio, name it "${name || 'Lookalike ' + ratio + '% - ' + country}"`;
    } else if (tab === 'engagement') {
      prompt = `Create an engagement audience for ${engagementType.replace(/_/g, ' ')}, ${retentionDays} day retention, name it "${name || engagementType.replace(/_/g, ' ') + ' - Last ' + retentionDays + 'd'}"`;
    }
    onCreateViaChat(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Create Custom Audience</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex border-b border-slate-100">
          {CREATE_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors
                ${tab === t.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Audience Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder={tab === 'website' ? 'Website Visitors - Last 30d' : tab === 'video' ? 'Video Viewers 50% - Last 30d' : tab === 'lookalike' ? 'Lookalike 1% - SG' : 'Page Engagers - Last 30d'}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </div>

          {tab === 'website' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={180}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">URL Filter (optional)</label>
                <input value={urlFilter} onChange={e => setUrlFilter(e.target.value)} placeholder="e.g., /products or /checkout"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <p className="text-[10px] text-slate-400 mt-1">Only include visitors to URLs containing this text</p>
              </div>
            </>
          )}

          {tab === 'video' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Video Source</label>
                <div className="space-y-1.5">
                  {VIDEO_SOURCES.map(src => (
                    <button key={src.id} onClick={() => setVideoSource(src.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-colors
                        ${videoSource === src.id ? 'border-blue-300 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0
                        ${videoSource === src.id ? 'border-blue-600' : 'border-slate-300'}`}>
                        {videoSource === src.id && <div className="w-2 h-2 rounded-full bg-blue-600" />}
                      </div>
                      <div>
                        <p className={`text-xs font-medium ${videoSource === src.id ? 'text-blue-700' : 'text-slate-700'}`}>{src.label}</p>
                        <p className="text-[10px] text-slate-400">{src.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              {videoSource === 'video_id' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Video ID</label>
                  <input value={videoId} onChange={e => setVideoId(e.target.value)} placeholder="e.g., 123456789"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Watched at least: {videoWatchPct}%</label>
                <input type="range" min={25} max={95} step={25} value={videoWatchPct} onChange={e => setVideoWatchPct(Number(e.target.value))}
                  className="w-full accent-blue-500" />
                <div className="flex justify-between text-[10px] text-slate-400"><span>25%</span><span>50%</span><span>75%</span><span>95%</span></div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={365}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </>
          )}

          {tab === 'engagement' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Engagement Type</label>
                <select value={engagementType} onChange={e => setEngagementType(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="page_engagement">Facebook Page Engagement</option>
                  <option value="video_watched">Video Viewers</option>
                  <option value="ig_business_profile">Instagram Profile Visitors</option>
                  <option value="lead_form">Lead Form Openers</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Retention (days)</label>
                <input type="number" value={retentionDays} onChange={e => setRetentionDays(Number(e.target.value))} min={1} max={365}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
            </>
          )}

          {tab === 'lookalike' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Source Audience ID</label>
                <input value={sourceAudienceId} onChange={e => setSourceAudienceId(e.target.value)} placeholder="Paste audience ID from the list"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
                <select value={country} onChange={e => setCountry(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100">
                  <option value="SG">Singapore</option>
                  <option value="HK">Hong Kong</option>
                  <option value="US">United States</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="MY">Malaysia</option>
                  <option value="TW">Taiwan</option>
                  <option value="JP">Japan</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Ratio: {ratio}%</label>
                <input type="range" min={1} max={20} value={ratio} onChange={e => setRatio(Number(e.target.value))}
                  className="w-full accent-emerald-500" />
                <div className="flex justify-between text-[10px] text-slate-400"><span>1% (most similar)</span><span>20% (broadest)</span></div>
              </div>
            </>
          )}
        </div>

        <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-2">
          <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-700">Audiences created via API won't appear in Ads Manager's audience picker, but work perfectly when assigned to ad sets through this tool.</p>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleCreate}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500 transition-colors">
            Create via AI Agent
          </button>
        </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

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

  useEffect(() => { fetchAudiences(); }, [fetchAudiences]);

  // Filter + search
  const filtered = audiences.filter(aud => {
    const matchesSearch = !searchQuery || aud.name?.toLowerCase().includes(searchQuery.toLowerCase()) || aud.id?.includes(searchQuery);
    const sub = aud.subtype || 'CUSTOM';
    const matchesFilter = filterType === 'all'
      || (filterType === 'IG' && (sub === 'IG_BUSINESS' || sub === 'IG_BUSINESS_PROFILE'))
      || sub === filterType;
    return matchesSearch && matchesFilter;
  });

  // Count by type
  const typeCounts = audiences.reduce((acc, a) => {
    const sub = a.subtype || 'CUSTOM';
    acc[sub] = (acc[sub] || 0) + 1;
    if (sub === 'IG_BUSINESS' || sub === 'IG_BUSINESS_PROFILE') acc['IG'] = (acc['IG'] || 0) + 1;
    return acc;
  }, {});

  const handleUse = (aud) => onSendToChat(`Create an ad set targeting custom audience "${aud.name}" (ID: ${aud.id})`);
  const handleCreateLookalike = (aud) => onSendToChat(`Create a 1% lookalike audience from "${aud.name}" (ID: ${aud.id}) targeting Singapore`);
  const handleDelete = (aud) => {
    if (confirm(`Delete audience "${aud.name}"? This cannot be undone.`)) {
      onSendToChat(`Delete custom audience "${aud.name}" (ID: ${aud.id})`);
    }
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
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors shadow-sm">
              <Plus size={13} /> Create Audience
            </button>
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
                placeholder="Search by name or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-100 bg-slate-50"
              />
            </div>
            <div className="flex items-center gap-1">
              {FILTER_TABS.map(f => {
                const count = f.id === 'all' ? audiences.length : (typeCounts[f.id] || 0);
                if (f.id !== 'all' && !count) return null;
                return (
                  <button key={f.id} onClick={() => setFilterType(f.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                      ${filterType === f.id ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}>
                    {f.label} <span className="ml-0.5 opacity-60">{count}</span>
                  </button>
                );
              })}
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
            <button onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-500">
              <Plus size={14} /> Create Audience
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map(aud => (
              <AudienceRow key={aud.id} audience={aud}
                onUse={handleUse} onCreateLookalike={handleCreateLookalike} onDelete={handleDelete} />
            ))}
          </div>
        )}

        {audiences.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-sm text-slate-400">
            No audiences match your search
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <CreateAudienceModal
          onClose={() => setShowCreate(false)}
          onCreateViaChat={(prompt) => onSendToChat(prompt)}
        />
      )}
    </div>
  );
};
