import { useState, useCallback, useEffect } from 'react';
import { RefreshCw, Loader2, Sparkles, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Zap, DollarSign, Users, Image as ImageIcon, Play, Pause, ChevronRight } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

const fmtCurrency = (n) => n != null ? `$${Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

// ── Severity config ──
const SEVERITY = {
  critical: { bg: 'bg-red-50', border: 'border-red-200', icon: AlertTriangle, iconColor: 'text-red-500', badge: 'bg-red-100 text-red-700' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-200', icon: AlertTriangle, iconColor: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
  opportunity: { bg: 'bg-blue-50', border: 'border-blue-200', icon: TrendingUp, iconColor: 'text-blue-500', badge: 'bg-blue-100 text-blue-700' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle, iconColor: 'text-emerald-500', badge: 'bg-emerald-100 text-emerald-700' },
};

// ── Recommendation card ──
const RecommendationCard = ({ rec, onApply }) => {
  const sev = SEVERITY[rec.severity] || SEVERITY.warning;
  const Icon = sev.icon;
  return (
    <div className={`rounded-xl border ${sev.border} ${sev.bg} bg-white/80 backdrop-blur-sm overflow-hidden transition-all hover:shadow-md hover:scale-[1.01]`}>
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <Icon size={18} className={sev.iconColor} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${sev.badge}`}>{rec.severity}</span>
              {rec.category && (
                <span className="text-[9px] font-medium text-slate-400 uppercase">{rec.category}</span>
              )}
            </div>
            <h3 className="text-[13px] font-bold text-slate-800">{rec.title}</h3>
            <p className="text-[12px] text-slate-600 mt-1 leading-relaxed">{rec.description}</p>
            {rec.impact && (
              <p className="text-[11px] text-slate-500 mt-2 flex items-center gap-1">
                <DollarSign size={11} /> Estimated impact: <strong>{rec.impact}</strong>
              </p>
            )}
            {rec.affected?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {rec.affected.slice(0, 3).map((name, i) => (
                  <span key={i} className="text-[10px] bg-white/60 border border-slate-200 rounded-md px-2 py-0.5 text-slate-600 truncate max-w-[180px]">
                    {name}
                  </span>
                ))}
                {rec.affected.length > 3 && (
                  <span className="text-[10px] text-slate-400">+{rec.affected.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      {rec.action && (
        <div className="px-5 py-2.5 border-t border-white/50 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">{rec.action_label || 'Recommended action'}</p>
          <button onClick={() => onApply(rec)}
            className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-lg transition-colors shadow-lg shadow-orange-500/30">
            {rec.action} <ArrowRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

// ── Summary stat ──
const StatCard = ({ icon: Icon, iconColor, label, value, sub }) => (
  <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 transition-all hover:shadow-md hover:scale-[1.01]">
    <div className={`w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center shrink-0`}>
      <Icon size={16} className={iconColor} />
    </div>
    <div>
      <p className="text-lg font-bold text-slate-800">{value}</p>
      <p className="text-[10px] text-slate-400">{label}</p>
    </div>
  </div>
);

// ── Main Component ──
export const Optimizations = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, activeSkills = [] }) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'critical' | 'warning' | 'opportunity'

  // Scan for optimizations — calls analyze_performance and applies active skills
  const runScan = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      // Build skill context from active skills
      const skillContext = activeSkills.length > 0
        ? activeSkills.map(s => `[SKILL: ${s.name}]\n${s.content}`).join('\n\n---\n\n')
        : '';

      const prompt = skillContext
        ? `${skillContext}\n\n---\n\nUser message: Scan my ad account and give me optimization recommendations based on the active skills above. Return as JSON array with objects: { severity: "critical"|"warning"|"opportunity"|"success", category: string, title: string, description: string, impact: string, affected: string[], action: string, action_label: string }. Only return the JSON array, no other text.`
        : 'Scan my ad account and give me optimization recommendations. Return as JSON array with objects: { severity: "critical"|"warning"|"opportunity"|"success", category: string, title: string, description: string, impact: string, affected: string[], action: string, action_label: string }. Only return the JSON array, no other text.';

      const { data } = await api.post('/chat', {
        message: prompt,
        adAccountId,
        token,
        sessionId: `opt-scan-${Date.now()}`,
      });

      // Parse the streamed response for JSON
      // The response comes as SSE events, so we need to extract the text
      // For now, set empty and let user use the chat-based flow
      setRecommendations([]);
      setLastScanned(new Date());
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId, activeSkills, token]);

  const handleApply = useCallback((rec) => {
    if (onSendToChat) {
      onSendToChat(`Apply this optimization: ${rec.title} — ${rec.description}`);
    }
  }, [onSendToChat]);

  const filtered = filter === 'all' ? recommendations : recommendations.filter(r => r.severity === filter);
  const criticalCount = recommendations.filter(r => r.severity === 'critical').length;
  const warningCount = recommendations.filter(r => r.severity === 'warning').length;
  const opportunityCount = recommendations.filter(r => r.severity === 'opportunity').length;
  const successCount = recommendations.filter(r => r.severity === 'success').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Optimizations
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {activeSkills.length > 0
                  ? `${activeSkills.length} skill${activeSkills.length > 1 ? 's' : ''} active`
                  : 'No optimization skills active'}
                {lastScanned && ` · Last scanned: ${lastScanned.toLocaleTimeString()}`}
              </p>
            </div>
            <span className="text-xs text-slate-400 font-medium">Ad Account:</span>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <button onClick={runScan} disabled={loading || !adAccountId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-colors shadow-lg shadow-orange-500/30 disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            {loading ? 'Scanning...' : 'Scan Now'}
          </button>
        </div>
      </div>

      {/* Active skills bar */}
      {activeSkills.length > 0 && (
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-100 flex items-center gap-2 shrink-0">
          <Sparkles size={13} className="text-amber-500 shrink-0" />
          <span className="text-[11px] text-amber-700 font-medium">Active optimization skills:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {activeSkills.map(s => (
              <span key={s.id} className="text-[10px] bg-white border border-amber-200 rounded-full px-2.5 py-0.5 text-amber-700 font-medium">
                {s.name}
              </span>
            ))}
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
        ) : recommendations.length === 0 && !loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
              <Zap size={36} className="text-amber-400" />
            </div>
            <h2 className="text-base font-bold text-slate-800 mb-2">Ready to optimize</h2>
            <p className="text-[13px] text-slate-400 max-w-md mx-auto text-center mb-6 leading-relaxed">
              Click <strong>Scan Now</strong> to analyze your campaigns against your active optimization skills and get actionable recommendations.
            </p>

            {activeSkills.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 max-w-md mb-6">
                <div className="flex items-start gap-3">
                  <Sparkles size={16} className="text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[12px] font-semibold text-amber-800">No optimization skills active</p>
                    <p className="text-[11px] text-amber-600 mt-1">
                      Create custom skills with your optimization rules (e.g. "budget changes should not exceed 20%") and toggle them on. The scan will apply your rules to find issues and opportunities.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 max-w-lg">
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 px-4 py-3 text-center transition-all hover:shadow-md hover:scale-[1.01]">
                <DollarSign size={20} className="text-emerald-500 mx-auto mb-1.5" />
                <p className="text-[11px] font-semibold text-slate-700">Budget</p>
                <p className="text-[10px] text-slate-400">Overspend, scaling</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 px-4 py-3 text-center transition-all hover:shadow-md hover:scale-[1.01]">
                <Users size={20} className="text-blue-500 mx-auto mb-1.5" />
                <p className="text-[11px] font-semibold text-slate-700">Audiences</p>
                <p className="text-[10px] text-slate-400">Overlap, saturation</p>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 px-4 py-3 text-center transition-all hover:shadow-md hover:scale-[1.01]">
                <ImageIcon size={20} className="text-pink-500 mx-auto mb-1.5" />
                <p className="text-[11px] font-semibold text-slate-700">Creatives</p>
                <p className="text-[10px] text-slate-400">Fatigue, format mix</p>
              </div>
            </div>

            <button onClick={runScan} disabled={loading}
              className="mt-6 flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 transition-colors shadow-lg shadow-orange-500/30">
              <Zap size={16} /> Scan Now
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3">
              <StatCard icon={AlertTriangle} iconColor="text-red-500" label="Critical" value={criticalCount} />
              <StatCard icon={AlertTriangle} iconColor="text-amber-500" label="Warnings" value={warningCount} />
              <StatCard icon={TrendingUp} iconColor="text-blue-500" label="Opportunities" value={opportunityCount} />
              <StatCard icon={CheckCircle} iconColor="text-emerald-500" label="All Good" value={successCount} />
            </div>

            {/* Filter */}
            <div className="flex rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden w-fit">
              {[['all', 'All'], ['critical', 'Critical'], ['warning', 'Warnings'], ['opportunity', 'Opportunities']].map(([val, label]) => (
                <button key={val} onClick={() => setFilter(val)}
                  className={`px-3.5 py-2 text-[11px] font-medium transition-colors ${filter === val ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
                  {label}
                </button>
              ))}
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              {filtered.map((rec, i) => (
                <RecommendationCard key={i} rec={rec} onApply={handleApply} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
