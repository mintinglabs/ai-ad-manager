import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Plus, Loader2, X, Activity, Radio, Clock, CheckCircle, AlertTriangle, XCircle, Zap, ChevronDown } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Pixel status badge ──
const PixelStatus = ({ pixel }) => {
  const lastFired = pixel.last_fired_time ? new Date(pixel.last_fired_time) : null;
  const hoursAgo = lastFired ? (Date.now() - lastFired) / 3600000 : Infinity;
  const isActive = hoursAgo < 24;
  const isStale = hoursAgo >= 24 && hoursAgo < 72;
  const isInactive = hoursAgo >= 72 || !lastFired;

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

// ── Pixel card ──
const PixelCard = ({ pixel, onViewStats, expanded, onToggle }) => (
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
      <div className="px-5 pb-4 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <button onClick={() => onViewStats(pixel.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 border border-blue-200 rounded-lg transition-colors">
            <Activity size={12} /> View Stats
          </button>
        </div>
        {pixel.code && (
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pixel Code</p>
            <pre className="text-[10px] text-slate-500 bg-slate-50 rounded-lg p-3 overflow-x-auto max-h-[100px] border border-slate-200">{pixel.code}</pre>
          </div>
        )}
      </div>
    )}
  </div>
);

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

// ── Stats modal ──
const StatsModal = ({ pixelId, onClose }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!pixelId) return;
    setLoading(true);
    api.get(`/pixels/${pixelId}/stats`).then(({ data }) => {
      setStats(data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [pixelId]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[500px] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Pixel Stats</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : !stats || (Array.isArray(stats) && stats.length === 0) ? (
            <div className="py-12 text-center text-[13px] text-slate-400">No stats data available</div>
          ) : (
            <pre className="text-[11px] text-slate-600 bg-slate-50 rounded-lg p-4 overflow-x-auto border border-slate-200 whitespace-pre-wrap">
              {JSON.stringify(stats, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </>
  );
};

// ── Main Component ──
export const EventsManager = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [activeTab, setActiveTab] = useState('pixels'); // 'pixels' | 'conversions'
  const [pixels, setPixels] = useState([]);
  const [conversions, setConversions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedPixel, setExpandedPixel] = useState(null);
  const [statsPixelId, setStatsPixelId] = useState(null);

  const fetchPixels = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/pixels', { params: { adAccountId } });
      setPixels(data || []);
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

  const handleDeleteConversion = useCallback(async (id) => {
    if (!confirm('Delete this custom conversion?')) return;
    try {
      await api.delete(`/conversions/${id}`);
      setConversions(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }, []);

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
          <button onClick={() => { fetchPixels(); fetchConversions(); }} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-0 px-6">
          {[['pixels', 'Pixels'], ['conversions', 'Custom Conversions']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-[12px] font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

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
                  onToggle={() => setExpandedPixel(prev => prev === pixel.id ? null : pixel.id)}
                  onViewStats={setStatsPixelId} />
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
                <ConversionCard key={conv.id} conversion={conv} onDelete={handleDeleteConversion} />
              ))}
            </div>
          )
        )}
      </div>

      {statsPixelId && <StatsModal pixelId={statsPixelId} onClose={() => setStatsPixelId(null)} />}
    </div>
  );
};
