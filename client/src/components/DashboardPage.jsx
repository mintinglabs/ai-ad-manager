import { useState, useEffect, useCallback } from 'react';
import { Sparkles, RefreshCw, Loader2, AlertCircle, ArrowRight, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle, Eye, MousePointerClick, ShoppingCart, DollarSign, Target, Users, Megaphone, FileText, Search, Zap, BarChart3, Shield, Lightbulb, TrendingUp, Palette, Globe, ChevronLeft } from 'lucide-react';
import api from '../services/api.js';

// ── Funnel stage classification ──────────────────────────────────────────────
const TOFU_OBJECTIVES = ['OUTCOME_AWARENESS', 'BRAND_AWARENESS', 'REACH', 'VIDEO_VIEWS', 'POST_ENGAGEMENT'];
const MOFU_OBJECTIVES = ['OUTCOME_TRAFFIC', 'OUTCOME_ENGAGEMENT', 'TRAFFIC', 'ENGAGEMENT', 'LEAD_GENERATION', 'MESSAGES'];
const BOFU_OBJECTIVES = ['OUTCOME_SALES', 'OUTCOME_LEADS', 'CONVERSIONS', 'CATALOG_SALES', 'STORE_VISITS', 'PRODUCT_CATALOG_SALES'];

const classifyStage = (objective) => {
  const obj = (objective || '').toUpperCase();
  if (TOFU_OBJECTIVES.some(o => obj.includes(o))) return 'tofu';
  if (BOFU_OBJECTIVES.some(o => obj.includes(o))) return 'bofu';
  if (MOFU_OBJECTIVES.some(o => obj.includes(o))) return 'mofu';
  if (obj.includes('CONVERSION') || obj.includes('SALE') || obj.includes('PURCHASE')) return 'bofu';
  return 'mofu';
};

const fmtMoney = (n) => {
  if (n === null || n === undefined || isNaN(n)) return '$0';
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};
const fmtPct = (n) => (n === null || n === undefined || isNaN(n)) ? '0%' : Math.round(n) + '%';

// ── Score Ring ───────────────────────────────────────────────────────────────
const ScoreRing = ({ score, max = 100, size = 120, strokeWidth = 8 }) => {
  const pct = Math.min((score / max) * 100, 100);
  const color = pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-amber-500' : 'text-red-500';
  const ringColor = pct >= 70 ? 'stroke-emerald-500' : pct >= 40 ? 'stroke-amber-400' : 'stroke-red-500';
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={strokeWidth} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" className={ringColor} strokeWidth={strokeWidth}
          strokeLinecap="round" strokeDasharray={`${(pct / 100) * circumference} ${circumference}`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-3xl font-extrabold ${color} tracking-tight`}>{Math.round(score)}</span>
        <span className="text-[10px] text-slate-400 font-medium">/ {max}</span>
      </div>
    </div>
  );
};

// ── Status Dot ───────────────────────────────────────────────────────────────
const StatusDot = ({ status }) => {
  const config = {
    good: { icon: <CheckCircle2 size={16} />, color: 'text-emerald-500' },
    warning: { icon: <AlertTriangle size={16} />, color: 'text-amber-500' },
    critical: { icon: <XCircle size={16} />, color: 'text-red-500' },
  };
  const cfg = config[status] || config.warning;
  return <span className={cfg.color}>{cfg.icon}</span>;
};

// ── Compute funnel metrics ───────────────────────────────────────────────────
const computeFunnelMetrics = (campaigns, insights) => {
  const stages = { tofu: [], mofu: [], bofu: [] };
  campaigns.forEach(c => { stages[classifyStage(c.objective)].push(c); });
  const totalBudget = campaigns.reduce((s, c) => s + ((c.daily_budget || 0) / 100), 0);

  const computeStage = (list, stage) => {
    const active = list.filter(c => (c.effective_status || c.status) === 'ACTIVE');
    const budget = list.reduce((s, c) => s + ((c.daily_budget || 0) / 100), 0);
    const budgetPct = totalBudget > 0 ? (budget / totalBudget * 100) : 0;
    let score = 0;
    if (list.length > 0) score += 30;
    if (list.length > 0) score += Math.min(30, (active.length / list.length) * 30);
    if (budgetPct > 5) score += Math.min(20, budgetPct * 0.8);
    if (list.length >= 2) score += 10;
    if (list.length >= 4) score += 10;
    const uniqueObj = new Set(list.map(c => c.objective));
    const contentMatch = Math.min(100, list.length > 0
      ? 30 + (uniqueObj.size * 15) + (active.length > 0 ? 25 : 0) + Math.min(15, list.length * 5) : 0);

    let keyMetricLabel, keyMetricValue;
    if (stage === 'tofu') { keyMetricLabel = 'Reach Focus'; keyMetricValue = active.length > 0 ? `${active.length} active` : 'No reach'; }
    else if (stage === 'mofu') { keyMetricLabel = 'Engagement'; keyMetricValue = active.length > 0 ? `${active.length} nurturing` : 'No nurture'; }
    else { keyMetricLabel = 'ROAS'; keyMetricValue = insights?.roas ? `${Number(insights.roas).toFixed(1)}x` : '—'; }

    return { campaignCount: list.length, activeCount: active.length, budget, budgetPct, score: Math.round(Math.min(100, score)), contentMatch: Math.round(contentMatch), keyMetricLabel, keyMetricValue };
  };

  const tofu = computeStage(stages.tofu, 'tofu');
  const mofu = computeStage(stages.mofu, 'mofu');
  const bofu = computeStage(stages.bofu, 'bofu');
  return { tofu, mofu, bofu, overallScore: Math.round((tofu.score + mofu.score + bofu.score) / 3), totalBudget };
};

// ── Strategist Role Cards (the main dashboard) ──────────────────────────────
const STRATEGIST_ROLES = [
  {
    id: 'funnel',
    title: 'Inceptional Funnel Auditor',
    subtitle: 'Full-Funnel Strategy Analysis',
    desc: 'Analyze your TOFU → MOFU → BOFU pipeline. Find gaps, optimize budget allocation, and build a full-funnel campaign blueprint.',
    icon: BarChart3,
    gradient: 'from-indigo-500 to-violet-600',
    shadowColor: 'shadow-indigo-200/50',
    hasDetailView: true,
  },
  {
    id: 'budget',
    title: 'Budget Optimizer',
    subtitle: 'Smart Budget Allocation',
    desc: 'Reallocate spend to top performers, pause underperforming campaigns, and find wasted budget across your account.',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-teal-600',
    shadowColor: 'shadow-emerald-200/50',
    prompt: 'Act as my Budget Optimizer strategist. Analyze my entire ad account budget allocation. Show me: (1) which campaigns are overspending vs underperforming, (2) where budget is being wasted, (3) which campaigns deserve more budget based on ROAS and efficiency, (4) a specific reallocation plan with exact dollar amounts.',
  },
  {
    id: 'creative',
    title: 'Creative Director',
    subtitle: 'Ad Creative & Copy Analysis',
    desc: 'Identify creative fatigue, winning ad formats, copy patterns that convert, and fresh creative suggestions based on your data.',
    icon: Palette,
    gradient: 'from-pink-500 to-rose-600',
    shadowColor: 'shadow-pink-200/50',
    prompt: 'Act as my Creative Director strategist. Analyze all my ad creatives across campaigns. Show me: (1) which creatives have fatigue signals (high frequency, declining CTR), (2) top-performing creative formats and copy patterns, (3) A/B test ideas based on what\'s working, (4) fresh creative suggestions for each funnel stage.',
  },
  {
    id: 'audience',
    title: 'Audience Architect',
    subtitle: 'Targeting & Audience Intelligence',
    desc: 'Map your audience segments, find overlap issues, discover untapped lookalikes, and optimize targeting precision.',
    icon: Target,
    gradient: 'from-blue-500 to-cyan-600',
    shadowColor: 'shadow-blue-200/50',
    prompt: 'Act as my Audience Architect strategist. Analyze all my audiences and targeting. Show me: (1) all custom audiences with sizes and overlap percentages, (2) which audiences are saturated (high frequency), (3) lookalike expansion opportunities, (4) targeting gaps I\'m missing, (5) a recommended audience strategy with specific segments.',
  },
  {
    id: 'competitor',
    title: 'Competitor Scout',
    subtitle: 'Ad Library & Market Intelligence',
    desc: 'Research competitor ads, identify market trends, benchmark your performance, and discover new positioning angles.',
    icon: Globe,
    gradient: 'from-orange-500 to-amber-600',
    shadowColor: 'shadow-orange-200/50',
    prompt: 'Act as my Competitor Scout strategist. Search the Meta Ad Library for competitor activity in my industry. Show me: (1) what competitors are running and their creative styles, (2) trends in ad messaging and offers, (3) gaps in the market I can exploit, (4) positioning angles that differentiate my brand. Ask me about my main competitors if you need names.',
  },
  {
    id: 'health',
    title: 'Account Doctor',
    subtitle: 'Full Account Health Audit',
    desc: 'Diagnose pixel issues, CAPI setup, campaign structure problems, exclusion gaps, and scaling constraints.',
    icon: Shield,
    gradient: 'from-red-500 to-rose-600',
    shadowColor: 'shadow-red-200/50',
    prompt: 'Act as my Account Doctor strategist. Run a comprehensive health audit on my ad account. Check: (1) pixel and CAPI setup status, (2) campaign structure quality (naming, hierarchy, organization), (3) audience exclusion gaps (are converters excluded from prospecting?), (4) frequency and saturation issues, (5) attribution and conversion tracking accuracy. Give me a health score and prioritized fix list.',
  },
];

const StrategistCard = ({ role, onClick }) => {
  const Icon = role.icon;
  return (
    <button
      onClick={onClick}
      className="flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden text-left shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
    >
      <div className="px-5 pt-5 pb-0">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${role.gradient} flex items-center justify-center shadow-md ${role.shadowColor} mb-3`}>
          <Icon size={20} className="text-white" />
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[15px] font-bold text-slate-900 leading-snug">{role.title}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{role.subtitle}</p>
          </div>
          <ArrowUpRight size={14} className="text-slate-200 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
        </div>
      </div>
      <div className="px-5 pt-2 pb-5 flex-1">
        <p className="text-xs text-slate-500 leading-relaxed">{role.desc}</p>
      </div>
    </button>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Funnel Strategist Detail View — Visual Funnel
// ══════════════════════════════════════════════════════════════════════════════

const STAGE_CONFIG = {
  tofu: {
    title: 'TOFU', subtitle: '(Awareness: The Seed)',
    borderColor: 'border-emerald-500/40', bgGradient: 'from-emerald-950 to-slate-900',
    headerGlow: 'bg-emerald-500/10', statusColor: 'emerald',
    actions: [
      { icon: FileText, label: 'Content Gap Analysis' },
      { icon: Users, label: "Broad Audience Targeting (e.g., 'Curious Minds')" },
      { icon: Megaphone, label: 'Educational Ad Creative Suggestion' },
    ],
    auditPrompt: 'Run a Top-of-Funnel (TOFU) audit on my ad account. Analyze my awareness campaigns — check reach, frequency, CPM, video view rates, and brand lift metrics. Identify content gaps and suggest broad audience targeting improvements.',
    auditLabel: 'View Top Funnel Audit',
  },
  mofu: {
    title: 'MOFU', subtitle: '(Consideration: Nurture)',
    borderColor: 'border-amber-500/40', bgGradient: 'from-amber-950/80 to-slate-900',
    headerGlow: 'bg-amber-500/10', statusColor: 'amber',
    actions: [
      { icon: Target, label: 'Retargeting Sequences' },
      { icon: FileText, label: 'Nurture Content (e.g., Guide)' },
      { icon: Search, label: "Intermediate Audience Targeting (e.g., 'Video Viewers')" },
    ],
    auditPrompt: 'Run a Middle-of-Funnel (MOFU) audit on my ad account. Analyze my consideration campaigns — check CTR, engagement rates, landing page views, lead quality, and retargeting sequences. Suggest nurture content and intermediate audience improvements.',
    auditLabel: 'View Mid Funnel Audit',
  },
  bofu: {
    title: 'BOFU', subtitle: '(Conversion: Harvest)',
    borderColor: 'border-red-500/40', bgGradient: 'from-red-950/80 to-slate-900',
    headerGlow: 'bg-red-500/10', statusColor: 'red',
    actions: [
      { icon: ShoppingCart, label: 'Conversion Offers' },
      { icon: Users, label: "High-Intent Audience (e.g., 'Cart Abandoners')" },
      { icon: Megaphone, label: 'Direct Response Creative' },
    ],
    auditPrompt: 'Run a Bottom-of-Funnel (BOFU) audit on my ad account. Analyze my conversion campaigns — check ROAS, CPA, conversion rates, purchase frequency, and attribution. Suggest high-intent audience targeting and direct response creative improvements.',
    auditLabel: 'View Bottom Funnel Audit',
  },
};

const FunnelStageVisual = ({ stage, stageData, widthPct, onAudit }) => {
  const cfg = STAGE_CONFIG[stage];
  const status = stageData.score >= 70 ? 'good' : stageData.score >= 40 ? 'warning' : 'critical';
  const statusIcon = status === 'good'
    ? <CheckCircle2 size={18} className="text-emerald-400" />
    : status === 'warning'
    ? <AlertTriangle size={18} className="text-amber-400" />
    : <XCircle size={18} className="text-red-400" />;

  return (
    <div className="flex flex-col items-center" style={{ width: `${widthPct}%` }}>
      <div className={`w-full rounded-2xl border ${cfg.borderColor} bg-gradient-to-b ${cfg.bgGradient} overflow-hidden shadow-lg`}>
        {/* Header */}
        <div className={`${cfg.headerGlow} px-5 py-4 flex items-center justify-between`}>
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">{cfg.title}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{cfg.subtitle}</p>
          </div>
          {statusIcon}
        </div>

        {/* Action items */}
        <div className="px-4 py-3 space-y-2">
          {cfg.actions.map((action, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="w-8 h-8 rounded-lg bg-slate-700/80 flex items-center justify-center shrink-0">
                <action.icon size={15} className="text-slate-300" />
              </div>
              <p className="text-[12px] font-medium text-slate-200 leading-snug">{action.label}</p>
            </div>
          ))}
        </div>

        {/* Metrics strip */}
        <div className="grid grid-cols-3 divide-x divide-slate-700/50 border-t border-slate-700/50 px-1 py-2.5">
          <div className="text-center">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Budget</p>
            <p className="text-sm font-bold text-white">{fmtMoney(stageData.budget)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Match</p>
            <p className="text-sm font-bold text-white">{fmtPct(stageData.contentMatch)}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Score</p>
            <p className={`text-sm font-bold ${stageData.score >= 70 ? 'text-emerald-400' : stageData.score >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {stageData.score}/100
            </p>
          </div>
        </div>

        {/* Audit button */}
        <div className="px-4 py-3">
          <button onClick={() => onAudit(cfg.auditPrompt)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600/50 text-white text-xs font-semibold transition-colors">
            {cfg.auditLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// SVG connector arrows between funnel stages
const FunnelConnector = () => (
  <div className="flex items-center justify-center -my-2 relative z-10">
    <svg width="40" height="32" viewBox="0 0 40 32" className="text-slate-400">
      <path d="M12 8 L20 24 L28 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      <polygon points="17,24 20,30 23,24" fill="currentColor" />
    </svg>
  </div>
);

const FunnelDetailView = ({ campaigns, insights, onNavigateToChat, onBack }) => {
  const funnel = computeFunnelMetrics(campaigns, insights);

  return (
    <div className="max-w-5xl mx-auto px-6 py-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-200/50">
          <BarChart3 size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Inceptional Funnel Auditor</h2>
          <p className="text-xs text-slate-500">Inception Marketing Funnel Audit</p>
        </div>
        {/* Overall Score */}
        <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
          <ScoreRing score={funnel.overallScore} size={48} strokeWidth={4} />
          <div>
            <p className="text-xs font-bold text-slate-700">Funnel Health</p>
            <p className="text-[10px] text-slate-400">
              {funnel.overallScore >= 70 ? 'Healthy' : funnel.overallScore >= 40 ? 'Needs work' : 'Critical'}
            </p>
          </div>
        </div>
      </div>

      {/* Budget allocation strip */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">Budget Allocation</span>
          <span className="text-[10px] text-slate-400">Total: {fmtMoney(funnel.totalBudget)}/day</span>
        </div>
        <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 mb-2">
          {funnel.totalBudget > 0 && <>
            <div className="bg-emerald-500" style={{ width: `${funnel.tofu.budgetPct}%` }} />
            <div className="bg-amber-400" style={{ width: `${funnel.mofu.budgetPct}%` }} />
            <div className="bg-red-400" style={{ width: `${funnel.bofu.budgetPct}%` }} />
          </>}
        </div>
        <div className="flex items-center gap-5">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500" /><span className="text-[10px] font-medium text-slate-500">TOFU {fmtPct(funnel.tofu.budgetPct)}</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-400" /><span className="text-[10px] font-medium text-slate-500">MOFU {fmtPct(funnel.mofu.budgetPct)}</span></span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-400" /><span className="text-[10px] font-medium text-slate-500">BOFU {fmtPct(funnel.bofu.budgetPct)}</span></span>
        </div>
      </div>

      {/* ═══ VISUAL FUNNEL ═══ */}
      <div className="flex flex-col items-center mb-8 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-800 rounded-3xl p-8 shadow-xl border border-slate-700/50">
        {/* TOFU — widest */}
        <FunnelStageVisual stage="tofu" stageData={funnel.tofu} widthPct={100} onAudit={onNavigateToChat} />
        <FunnelConnector />
        {/* MOFU — narrower */}
        <FunnelStageVisual stage="mofu" stageData={funnel.mofu} widthPct={78} onAudit={onNavigateToChat} />
        <FunnelConnector />
        {/* BOFU — narrowest */}
        <FunnelStageVisual stage="bofu" stageData={funnel.bofu} widthPct={58} onAudit={onNavigateToChat} />
      </div>

      {/* Blueprint CTA */}
      <div className="flex justify-center">
        <button
          onClick={() => onNavigateToChat(
            "Create a full-funnel 'Inception' Marketing Campaign Blueprint for my ad account. " +
            "Analyze my current TOFU (awareness), MOFU (consideration), and BOFU (conversion) campaigns. " +
            "Identify gaps in each funnel stage, suggest new campaigns to fill those gaps, " +
            "recommend budget reallocation across stages, and provide a step-by-step action plan. " +
            "Include specific audience targeting, creative suggestions, and KPI targets for each stage."
          )}
          className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold shadow-lg shadow-indigo-200/50 transition-all hover:shadow-xl hover:-translate-y-0.5"
        >
          <Sparkles size={16} />
          Create 'Inception' Marketing Campaign Blueprint
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// Main Page — Strategist Roles Dashboard
// ══════════════════════════════════════════════════════════════════════════════
export const DashboardPage = ({ adAccountId, onNavigateToChat }) => {
  const [insights, setInsights] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeRole, setActiveRole] = useState(null); // null = grid, 'funnel' = detail

  const fetchData = useCallback(async () => {
    if (!adAccountId) return;
    setLoading(true);
    setError(null);
    try {
      const [insRes, campRes] = await Promise.all([
        api.get('/insights', { params: { adAccountId, date_preset: 'last_7d' } }),
        api.get('/campaigns', { params: { adAccountId } }),
      ]);
      setInsights(insRes.data);
      setCampaigns(Array.isArray(campRes.data) ? campRes.data : []);

      // Fire-and-forget: trigger read_insights, instagram_basic, instagram_manage_insights
      // so they register in FB App Review dashboard
      api.get(`/meta/adaccounts/${adAccountId}/instagram-accounts`).then(igRes => {
        const igId = igRes.data?.[0]?.id;
        api.get('/meta/pages').then(pgRes => {
          const pageId = pgRes.data?.[0]?.id;
          api.post('/meta/trigger-permissions', { adAccountId, igAccountId: igId, pageId })
            .then(r => console.log('[Permission trigger]', r.data))
            .catch(() => {});
        }).catch(() => {});
      }).catch(() => {});
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [adAccountId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!adAccountId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Select an ad account to access your strategists.</p>
        </div>
      </div>
    );
  }

  const handleRoleClick = (role) => {
    if (role.hasDetailView) {
      setActiveRole(role.id);
    } else if (role.prompt) {
      onNavigateToChat(role.prompt);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto">
      {loading && !campaigns.length ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <Loader2 size={32} className="text-indigo-400 animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500">Loading account data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
        </div>
      ) : activeRole === 'funnel' ? (
        <FunnelDetailView
          campaigns={campaigns}
          insights={insights}
          onNavigateToChat={onNavigateToChat}
          onBack={() => setActiveRole(null)}
        />
      ) : (
        /* Strategist Roles Grid */
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-md">
                <Sparkles size={20} className="text-amber-400" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">My Strategist</h1>
                <p className="text-xs text-slate-500 mt-0.5">Choose a strategist to analyze your campaigns</p>
              </div>
            </div>
            <button onClick={fetchData} disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 transition-colors">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* Role Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STRATEGIST_ROLES.map(role => (
              <StrategistCard key={role.id} role={role} onClick={() => handleRoleClick(role)} />
            ))}
          </div>

          {/* Hint */}
          <div className="mt-8 text-center">
            <p className="text-xs text-slate-400">
              Each strategist analyzes your campaigns from a different angle. More roles coming soon.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
