import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Plus, Loader2, X, Activity, Radio, Clock, CheckCircle, AlertTriangle, XCircle, Zap, ChevronDown, Copy, Check, BarChart3, Hash, Sparkles, ArrowRight } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtNumber = (n) => n != null ? Number(n).toLocaleString() : '—';

// ── Pixel status badge ──
const PixelStatus = ({ pixel }) => {
  const lastFired = pixel.last_fired_time ? new Date(pixel.last_fired_time) : null;
  const hoursAgo = lastFired ? (Date.now() - lastFired) / 3600000 : Infinity;
  const isActive = hoursAgo < 24;
  const isStale = hoursAgo >= 24 && hoursAgo < 72;

  return (
    <div className="flex items-center gap-1.5">
      {isActive ? (
        <><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /><span className="text-[11px] font-medium text-emerald-600">Active</span></>
      ) : isStale ? (
        <><span className="w-2 h-2 rounded-full bg-amber-400" /><span className="text-[11px] font-medium text-amber-600">Stale</span></>
      ) : (
        <><span className="w-2 h-2 rounded-full bg-red-400" /><span className="text-[11px] font-medium text-red-500">Inactive</span></>
      )}
    </div>
  );
};

// ── Copy code button ──
const CopyCodeButton = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-md transition-colors">
      {copied ? <><Check size={10} className="text-emerald-500" /><span className="text-emerald-600">Copied!</span></> : <><Copy size={10} /> Copy Code</>}
    </button>
  );
};

// ── Event color mapping ──
const EVENT_COLORS = {
  PageView: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: '🌐' },
  ViewContent: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', icon: '👁' },
  AddToCart: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: '🛒' },
  InitiateCheckout: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: '💳' },
  Purchase: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: '💰' },
  Lead: { bg: 'bg-violet-50', text: 'text-violet-600', border: 'border-violet-200', icon: '📋' },
  CompleteRegistration: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', icon: '✅' },
  Search: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', icon: '🔍' },
  AddPaymentInfo: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', icon: '💳' },
  Contact: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', icon: '📞' },
  Subscribe: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: '🔔' },
};
const getEventColor = (name) => EVENT_COLORS[name] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200', icon: '📊' };

// ── Pixel card with inline events ──
// ── Diagnostic check result ──
const DIAG_ICONS = { passed: '✅', failed: '❌', warning: '⚠️' };
const DIAG_COLORS = {
  passed: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  failed: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
};

const PixelCard = ({ pixel, expanded, onToggle, events, diagnostics, eventsLoading }) => {
  const [showCode, setShowCode] = useState(false);
  const totalEvents = events?.reduce((sum, e) => sum + (Number(e.count ?? e.value ?? 0)), 0) || 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-md transition-all">
      <button onClick={onToggle} className="w-full px-5 py-4 flex items-start justify-between text-left">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Radio size={18} className="text-blue-500" />
          </div>
          <div>
            <h3 className="text-[13px] font-bold text-slate-800">{pixel.name}</h3>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">{pixel.id}</p>
            <div className="flex items-center gap-3 mt-2">
              <PixelStatus pixel={pixel} />
              {pixel.last_fired_time && (
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Clock size={10} /> Last fired: {fmtDate(pixel.last_fired_time)}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-slate-100">
          {/* Events section */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={12} /> Events Received
              </h4>
              {totalEvents > 0 && (
                <span className="text-[10px] text-slate-400">{fmtNumber(totalEvents)} total events</span>
              )}
            </div>

            {/* Event summary stats */}
            {events && events.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-medium">Event types</p>
                  <p className="text-[15px] font-bold text-slate-800">{events.length}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-medium">Total events</p>
                  <p className="text-[15px] font-bold text-slate-800">{fmtNumber(totalEvents)}</p>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <p className="text-[10px] text-slate-400 font-medium">Status</p>
                  <p className="text-[15px] font-bold text-emerald-600">Receiving</p>
                </div>
              </div>
            )}

            {eventsLoading ? (
              <div className="flex items-center gap-2 py-4 justify-center">
                <Loader2 size={14} className="animate-spin text-slate-400" />
                <span className="text-[11px] text-slate-400">Loading events...</span>
              </div>
            ) : !events || events.length === 0 ? (
              <div className="py-2">
                <p className="text-[12px] text-slate-400 mb-3">No event data from stats API</p>
                {diagnostics && diagnostics.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Pixel Diagnostics</p>
                    <div className="space-y-1.5">
                      {diagnostics.map((d, i) => (
                        <div key={i} className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border ${DIAG_COLORS[d.result] || DIAG_COLORS.warning}`}>
                          <span className="text-[13px] mt-0.5">{DIAG_ICONS[d.result] || '?'}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-semibold">{d.title}</p>
                            <p className="text-[10px] opacity-70 mt-0.5 line-clamp-2">{d.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {(!diagnostics || diagnostics.length === 0) && (
                  <p className="text-[10px] text-slate-300">Install the pixel code on your website to start tracking events</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt, i) => {
                  const name = evt.event || evt.name || evt.event_name || 'Unknown';
                  const count = evt.count ?? evt.value ?? 0;
                  const lastReceived = evt.last_received || evt.last_fired_time || evt.timestamp;
                  const colors = getEventColor(name);
                  return (
                    <div key={i} className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${colors.bg} ${colors.border}`}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[14px]">{colors.icon}</span>
                        <div>
                          <p className={`text-[12px] font-semibold ${colors.text}`}>{name}</p>
                          {lastReceived && (
                            <p className="text-[10px] text-slate-400 mt-0.5">Last: {fmtDate(lastReceived)}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-[14px] font-bold ${colors.text} tabular-nums`}>{fmtNumber(count)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pixel code section */}
          {pixel.code && (
            <div className="px-5 pb-4 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between mb-1">
                <button onClick={() => setShowCode(!showCode)}
                  className="text-[10px] font-bold text-slate-400 uppercase tracking-wider hover:text-slate-600 flex items-center gap-1">
                  <Hash size={10} /> Pixel Code
                  <ChevronDown size={10} className={`transition-transform ${showCode ? 'rotate-180' : ''}`} />
                </button>
                <CopyCodeButton code={pixel.code} />
              </div>
              {showCode && (
                <pre className="text-[10px] text-slate-500 bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-[100px] border border-slate-200 mt-2">{pixel.code}</pre>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Custom conversion card ──
const ConversionCard = ({ conversion, onDelete }) => (
  <div className="bg-white rounded-xl border border-slate-200 px-5 py-4 hover:shadow-md transition-all">
    <div className="flex items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
          <Zap size={18} className="text-violet-500" />
        </div>
        <div>
          <h3 className="text-[13px] font-bold text-slate-800">{conversion.name}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            {conversion.custom_event_type && (
              <span className="text-[10px] bg-violet-50 text-violet-600 border border-violet-200 rounded-md px-2 py-0.5 font-medium">
                {conversion.custom_event_type}
              </span>
            )}
            {conversion.event_source_type && (
              <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-200 rounded-md px-2 py-0.5">
                {conversion.event_source_type}
              </span>
            )}
            {conversion.default_conversion_value && (
              <span className="text-[10px] text-slate-400">Value: ${conversion.default_conversion_value}</span>
            )}
          </div>
          {conversion.rule && (
            <p className="text-[10px] text-slate-400 mt-1.5 font-mono truncate max-w-[400px]">
              Rule: {typeof conversion.rule === 'string' ? conversion.rule : JSON.stringify(conversion.rule)}
            </p>
          )}
        </div>
      </div>
      <button onClick={() => onDelete(conversion.id)}
        className="text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-1">
        <X size={14} />
      </button>
    </div>
  </div>
);

// ── Main Component ──
export const EventsManager = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat }) => {
  const [showAskAI, setShowAskAI] = useState(false);
  const [activeTab, setActiveTab] = useState('pixels'); // 'pixels' | 'conversions'
  const [pixels, setPixels] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPixel, setExpandedPixel] = useState(null);
  const [pixelEvents, setPixelEvents] = useState({}); // { [pixelId]: events[] }
  const [pixelDiagnostics, setPixelDiagnostics] = useState({}); // { [pixelId]: diagnostics[] }
  const [eventsLoading, setEventsLoading] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchPixels = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/pixels', { params: { adAccountId } });
      setPixels(data || []);
      // Auto-expand first pixel
      if (data?.length && !expandedPixel) setExpandedPixel(data[0].id);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  const fetchConversions = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/conversions', { params: { adAccountId } });
      setConversions(data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchPixels(); fetchConversions(); }, [fetchPixels, fetchConversions]);

  // Fetch events + diagnostics when a pixel is expanded
  useEffect(() => {
    if (!expandedPixel || pixelEvents[expandedPixel]) return;
    setEventsLoading(prev => ({ ...prev, [expandedPixel]: true }));
    api.get(`/pixels/${expandedPixel}/stats`).then(({ data }) => {
      // New format: { events: [...], diagnostics: [...] }
      const events = Array.isArray(data) ? data : (data?.events || []);
      const diagnostics = data?.diagnostics || [];
      const valid = events.filter(e => e && (e.event || e.name || e.event_name));
      setPixelEvents(prev => ({ ...prev, [expandedPixel]: valid }));
      setPixelDiagnostics(prev => ({ ...prev, [expandedPixel]: diagnostics }));
    }).catch(err => {
      console.error('Failed to load pixel events:', err);
      setPixelEvents(prev => ({ ...prev, [expandedPixel]: [] }));
      setPixelDiagnostics(prev => ({ ...prev, [expandedPixel]: [] }));
    }).finally(() => {
      setEventsLoading(prev => ({ ...prev, [expandedPixel]: false }));
    });
  }, [expandedPixel, pixelEvents]);

  const handleTogglePixel = useCallback((pixelId) => {
    setExpandedPixel(prev => prev === pixelId ? null : pixelId);
  }, []);

  const handleDeleteConversion = useCallback(async () => {
    if (!deleteConfirm) return;
    try {
      await api.delete(`/conversions/${deleteConfirm}`);
      setConversions(prev => prev.filter(c => c.id !== deleteConfirm));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, [deleteConfirm]);

  const handleRefresh = useCallback(() => {
    setPixelEvents({});
    setPixelDiagnostics({});
    fetchPixels();
    fetchConversions();
  }, [fetchPixels, fetchConversions]);

  const currentData = activeTab === 'pixels' ? pixels : conversions;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Activity size={20} className="text-cyan-500" />
                Events Manager
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${pixels.length} pixels · ${conversions.length} conversions`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <button onClick={handleRefresh} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-0 px-6">
          {[['pixels', `Pixels (${pixels.length})`], ['conversions', `Custom Conversions (${conversions.length})`]].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chat bar — ask AI about tracking */}
      {token && adAccountId && (
        <div className="px-6 py-3 bg-white border-b border-slate-100">
          <div className="bg-white rounded-2xl border border-cyan-200 shadow-sm ring-1 ring-cyan-500/10 focus-within:ring-2 focus-within:ring-cyan-500/20 focus-within:border-cyan-300 transition-all overflow-hidden">
            <input data-event-input
              placeholder="Ask about tracking... e.g. 'Set up my Meta Pixel' or 'Check if my purchase events are firing'"
              className="w-full px-5 pt-3 pb-1.5 text-[13px] text-slate-700 placeholder:text-slate-400 focus:outline-none bg-transparent"
              onKeyDown={e => { if (e.key === 'Enter' && e.target.value.trim()) { onPrefillChat?.(e.target.value.trim()); e.target.value = ''; } }}
            />
            <div className="flex items-center justify-between px-4 pb-2.5">
              <span className="text-[10px] text-cyan-600 bg-cyan-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Sparkles size={10} /> AI will help with tracking setup
              </span>
              <button onClick={() => {
                const input = document.querySelector('[data-event-input]');
                if (input?.value?.trim()) { onPrefillChat?.(input.value.trim()); input.value = ''; }
              }}
                className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 flex items-center justify-center text-white shadow-sm transition-all">
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

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
            <span className="ml-2 text-sm text-slate-400">Loading...</span>
          </div>
        ) : activeTab === 'pixels' ? (
          pixels.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Radio size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">No pixels found</p>
              <p className="text-xs text-slate-400">Create a pixel in the chat to start tracking.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pixels.map(pixel => (
                <PixelCard key={pixel.id} pixel={pixel}
                  expanded={expandedPixel === pixel.id}
                  onToggle={() => handleTogglePixel(pixel.id)}
                  events={pixelEvents[pixel.id]}
                  diagnostics={pixelDiagnostics[pixel.id]}
                  eventsLoading={eventsLoading[pixel.id]} />
              ))}
            </div>
          )
        ) : (
          conversions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <Zap size={28} className="text-slate-300" />
              </div>
              <p className="text-sm font-semibold text-slate-700 mb-1">No custom conversions</p>
              <p className="text-xs text-slate-400">Create custom conversions to track specific actions.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversions.map(conv => (
                <ConversionCard key={conv.id} conversion={conv} onDelete={setDeleteConfirm} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setDeleteConfirm(null)} />
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[360px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h3 className="text-sm font-bold text-slate-900 mb-1">Delete this custom conversion?</h3>
              <p className="text-xs text-slate-500">This cannot be undone.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={handleDeleteConversion}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
};
