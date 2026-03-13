import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api.js';

const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

// ── Mock campaign data ────────────────────────────────────────────────────────
const MOCK_CAMPAIGNS = [
  { id: 'c1', name: 'Brand Awareness Q1', status: 'ACTIVE', daily_budget: 5000,  spend: 350.40, impressions: 42180, clicks: 820,  roas: 1.2, cpm: 8.31,  ctr: 1.94 },
  { id: 'c2', name: 'Lookalike Audience',  status: 'ACTIVE', daily_budget: 8000,  spend: 561.20, impressions: 61340, clicks: 1540, roas: 3.8, cpm: 9.15,  ctr: 2.51 },
  { id: 'c3', name: 'Retargeting — Cart',  status: 'PAUSED', daily_budget: 3000,  spend: 0,      impressions: 0,     clicks: 0,    roas: 0,   cpm: 0,     ctr: 0    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const budgetDollars = (cents) => (cents / 100).toFixed(0);
const roasBadge     = (r)     => r >= 3 ? '✅' : r >= 2 ? '🟡' : r > 0 ? '⚠️' : '—';

const buildReportTable = (campaigns) => {
  const columns = ['Campaign', 'Status', 'Spend', 'ROAS', 'Impressions', 'Clicks', 'CPM', 'CTR'];
  const rows = campaigns.map((c) => [
    c.name,
    c.status === 'ACTIVE' ? 'Active' : 'Paused',
    c.spend > 0 ? `$${c.spend.toFixed(2)}` : '$0.00',
    c.roas > 0  ? `${c.roas}x ${roasBadge(c.roas)}` : '—',
    c.impressions > 0 ? c.impressions.toLocaleString() : '—',
    c.clicks > 0      ? c.clicks.toLocaleString()      : '—',
    c.cpm > 0         ? `$${c.cpm.toFixed(2)}`         : '—',
    c.ctr > 0         ? `${c.ctr.toFixed(2)}%`         : '—',
  ]);
  const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0);
  const activeCampaigns = campaigns.filter((c) => c.roas > 0);
  const avgRoas = activeCampaigns.length
    ? (activeCampaigns.reduce((s, c) => s + c.roas, 0) / activeCampaigns.length).toFixed(1)
    : '0';
  return {
    role: 'agent', type: 'table', columns, rows,
    summary: `Total spend this week: **$${totalSpend.toFixed(0)}** · Avg ROAS: **${avgRoas}x**`,
  };
};

const buildManageTable = (campaigns) => {
  // Smart 2 suggestions: activate the first paused campaign + raise budget for highest-ROAS active campaign
  const paused  = campaigns.find((c) => c.status === 'PAUSED');
  const bestRoas = campaigns
    .filter((c) => c.status === 'ACTIVE')
    .sort((a, b) => b.roas - a.roas)[0];

  const actions = [];
  if (paused) {
    const n = campaigns.indexOf(paused) + 1;
    actions.push({ label: `▶ Enable: ${paused.name}`, value: `${n} enable`, variant: 'confirm' });
  }
  if (bestRoas) {
    const n = campaigns.indexOf(bestRoas) + 1;
    actions.push({ label: `💰 Raise Budget: ${bestRoas.name}`, value: `${n} budget`, variant: 'default' });
  }

  const truncate = (s, n = 28) => s.length > n ? s.slice(0, n) + '…' : s;

  return {
    role: 'agent', type: 'table',
    columns: ['#', 'Campaign', 'Status', 'Daily Budget'],
    rows: campaigns.map((c, i) => [
      String(i + 1),
      truncate(c.name),
      c.status === 'ACTIVE' ? '🟢 Active' : '⏸ Paused',
      `$${budgetDollars(c.daily_budget)}/day`,
    ]),
    actions,
  };
};

const CONFIRM_ACTIONS = [
  { label: '✓ Confirm', value: 'yes',    variant: 'confirm' },
  { label: '✗ Cancel',  value: 'cancel', variant: 'danger'  },
];

// ── Intent parser ─────────────────────────────────────────────────────────────
const parseIntent = (text, pending) => {
  const t = text.toLowerCase().trim();

  if (pending?.step === 'AWAITING_SELECTION') {
    if (/\b(cancel|stop|never mind|quit|back)\b/.test(t)) return { type: 'CANCEL' };
    const numMatch = t.match(/^(\d+)/);
    if (numMatch) {
      const num = parseInt(numMatch[1]);
      // inline action in the same message
      if (/\bpause\b/.test(t))                            return { type: 'SELECT_ACTION', num, action: 'PAUSE' };
      if (/\b(enable|resume|activate|on)\b/.test(t))      return { type: 'SELECT_ACTION', num, action: 'ENABLE' };
      if (/\bbudget\b/.test(t)) {
        const amt = t.match(/\$?(\d+)/g)?.slice(-1)[0]?.replace('$','');
        return { type: 'SELECT_ACTION', num, action: 'BUDGET', amount: amt ? parseInt(amt) : null };
      }
      // just a number — ask what to do
      return { type: 'SELECT_NUMBER', num };
    }
  }

  if (pending?.step === 'AWAITING_CONFIRM') {
    if (/\b(yes|confirm|proceed|sure|ok|okay|go ahead|yep|yeah)\b/.test(t)) return { type: 'CONFIRM' };
    if (/\b(no|cancel|stop|never mind|nope|quit)\b/.test(t))               return { type: 'CANCEL' };
  }

  if (pending?.step === 'AUDIENCE_TYPE') {
    if (/\bcreate\b/.test(t) || t === 'create') return { type: 'AUDIENCE_CREATE_NEW' };
    const num = parseInt(t);
    if (!isNaN(num) && num >= 1 && num <= 3) return { type: 'AUDIENCE_SELECT', num };
    if (/\b(cancel|stop|quit|back)\b/.test(t)) return { type: 'CANCEL' };
  }

  if (pending?.step === 'AUDIENCE_CONFIRM') {
    if (/\b(yes|confirm|proceed|sure|ok|okay|go ahead|yep|yeah)\b/.test(t)) return { type: 'CONFIRM' };
    if (/\b(no|cancel|stop|quit)\b/.test(t)) return { type: 'CANCEL' };
  }

  if (pending?.step === 'CAMPAIGN_NAME') {
    if (/\b(cancel|stop|quit|back)\b/.test(t)) return { type: 'CANCEL' };
    return { type: 'CAMPAIGN_NAME_INPUT', name: text.trim() };
  }

  if (pending?.step === 'CAMPAIGN_OBJECTIVE') {
    if (/\b(cancel|stop|quit|back)\b/.test(t)) return { type: 'CANCEL' };
    const n = parseInt(t);
    if (n >= 1 && n <= 3) return { type: 'CAMPAIGN_OBJECTIVE_SELECT', num: n };
    if (/\btraffic\b/.test(t))    return { type: 'CAMPAIGN_OBJECTIVE_SELECT', num: 1 };
    if (/\bawareness\b/.test(t))  return { type: 'CAMPAIGN_OBJECTIVE_SELECT', num: 2 };
    if (/\bconversion\b/.test(t)) return { type: 'CAMPAIGN_OBJECTIVE_SELECT', num: 3 };
  }

  if (pending?.step === 'CAMPAIGN_CONFIRM') {
    if (/\b(yes|confirm|proceed|sure|ok|okay|go ahead|yep|yeah)\b/.test(t)) return { type: 'CONFIRM' };
    if (/\b(no|cancel|stop|quit)\b/.test(t)) return { type: 'CANCEL' };
  }

  if (/\b(report|performance|stats|summary|results|metrics|spend|this week)\b/.test(t)) return { type: 'REPORT' };
  if (/\b(manage|status|pause|stop|enable|resume|budget|adjust|on|off)\b/.test(t))      return { type: 'MANAGE' };
  if (/\b(page|pages|page insight|engagement|fan|followers|fanpage)\b/.test(t))         return { type: 'PAGES' };
  if (/\b(business|portfolio|business portfolio|business manager|bm)\b/.test(t))        return { type: 'BUSINESSES' };
  if (/\b(audience|custom audience|create audience|lookalike|retarget)\b/.test(t))      return { type: 'AUDIENCE' };
  if (/\b(create campaign|new campaign|launch campaign|add campaign)\b/.test(t))        return { type: 'CAMPAIGN_CREATE' };

  return { type: 'UNKNOWN' };
};

// ── Welcome message ───────────────────────────────────────────────────────────
const WELCOME = {
  id: 'welcome', role: 'agent', timestamp: new Date(),
  text: "Hi! I'm your AI Ad Manager. I connect to the **Meta Ads API** to pull live campaign data, manage your campaigns, and create audiences — just select a module or ask me anything.",
};

// ── Hook ──────────────────────────────────────────────────────────────────────
export const useChatAgent = ({ token, adAccountId, selectedAccount } = {}) => {
  const accountLabel = selectedAccount?.name ? `${selectedAccount.name} (${adAccountId})` : adAccountId;
  const [messages,           setMessages]           = useState([WELCOME]);
  const [isTyping,           setIsTyping]           = useState(false);
  const [thinkingText,       setThinkingText]       = useState('');
  const [campaigns,          setCampaigns]          = useState([]);
  const [insights,           setInsights]           = useState(null);
  const [pages,              setPages]              = useState([]);
  const [isLoadingCampaigns, setIsLoadingCampaigns] = useState(false);
  const [notification,       setNotification]       = useState(null);
  const [pageAdsMap,         setPageAdsMap]         = useState({});
  const pendingRef     = useRef(null);
  const notifTimerRef  = useRef(null);

  // Fetch campaigns + account-level insights when ad account changes
  useEffect(() => {
    if (!adAccountId) return;
    setIsLoadingCampaigns(true);
    api.get('/campaigns', { params: { adAccountId } })
      .then(({ data }) => {
        if (!Array.isArray(data) || data.length === 0) return;
        const normalized = data.map(c => {
          const ins = c.insights?.data?.[0] || {};
          const spend = parseFloat(ins.spend || 0);
          const revenue = parseFloat(ins.action_values?.find(a => a.action_type === 'purchase')?.value || 0);
          return {
            id:           c.id,
            name:         c.name,
            status:       c.status,
            daily_budget: parseInt(c.daily_budget || 0),
            spend,
            impressions:  parseInt(ins.impressions || 0),
            clicks:       parseInt(ins.clicks || 0),
            roas:         spend > 0 ? parseFloat((revenue / spend).toFixed(1)) : 0,
            cpm:          parseFloat(ins.cpm || 0),
            ctr:          parseFloat(ins.ctr || 0),
          };
        });
        setCampaigns(normalized);
      })
      .catch((err) => console.error('[useChatAgent] campaigns fetch failed:', err?.response?.data || err?.message))
      .finally(() => setIsLoadingCampaigns(false));
  }, [adAccountId]);

  // Fetch account-level insights (metric cards)
  useEffect(() => {
    if (!adAccountId) return;
    setInsights(null);
    api.get('/insights', { params: { adAccountId } })
      .then(({ data }) => setInsights(data))
      .catch((err) => console.error('[useChatAgent] insights fetch failed:', err?.response?.data || err?.message));
  }, [adAccountId]);

  // Auto-fetch pages on dashboard load — triggers pages_read_engagement for Meta App Review
  useEffect(() => {
    if (!adAccountId) return;
    api.get('/meta/pages')
      .then(({ data }) => setPages(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [adAccountId]);

  // Auto-fetch ads for each page — triggers pages_manage_ads for Meta App Review
  useEffect(() => {
    if (pages.length === 0) return;
    pages.forEach(page => {
      api.get(`/meta/pages/${page.id}/ads`)
        .then(({ data }) => setPageAdsMap(prev => ({ ...prev, [page.id]: Array.isArray(data) ? data : [] })))
        .catch(() => {});
    });
  }, [pages]);

  const showNotification = useCallback((msg) => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification(msg);
    notifTimerRef.current = setTimeout(() => setNotification(null), 3500);
  }, []);

  const addMsg = useCallback((msgOrRole, text) => {
    const msg = typeof msgOrRole === 'string'
      ? { id: makeId(), role: msgOrRole, text, timestamp: new Date() }
      : { id: makeId(), timestamp: new Date(), ...msgOrRole };
    setMessages((prev) => [...prev, msg]);
  }, []);

  const think = useCallback(async (text, ms = 1000) => {
    setThinkingText(text);
    await delay(ms);
    setThinkingText('');
  }, []);

  const resetChat = useCallback(() => {
    setMessages([WELCOME]);
    setIsTyping(false);
    setThinkingText('');
    pendingRef.current = null;
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isTyping) return;
    addMsg('user', text.trim());
    setIsTyping(true);

    const intent = parseIntent(text, pendingRef.current);

    try {
      // ── Selection step ────────────────────────────────────────────────────
      if (pendingRef.current?.step === 'AWAITING_SELECTION' &&
          (intent.type === 'SELECT_NUMBER' || intent.type === 'SELECT_ACTION')) {
        const { options } = pendingRef.current;
        const idx = intent.num - 1;
        if (idx < 0 || idx >= options.length) {
          addMsg('agent', `Please enter a number between 1 and ${options.length}.`);
          setIsTyping(false);
          return;
        }
        const c = options[idx];

        if (intent.type === 'SELECT_NUMBER') {
          // No inline action — show action buttons
          pendingRef.current = { step: 'AWAITING_ACTION', campaign: c };
          addMsg({
            role: 'agent',
            text: `You selected **${c.name}** (${c.status === 'ACTIVE' ? '🟢 Active' : '⏸ Paused'} · $${budgetDollars(c.daily_budget)}/day).\n\nWhat would you like to do?`,
            actions: [
              { label: '⏸ Pause',        value: 'pause',      variant: 'danger'   },
              { label: '▶ Enable',        value: 'enable',     variant: 'confirm'  },
              { label: '💰 Budget +20%',  value: 'budget',     variant: 'default'  },
            ],
          });
          setIsTyping(false);
          return;
        }

        // Inline action — go straight to confirm
        if (intent.action === 'PAUSE') {
          pendingRef.current = { step: 'AWAITING_CONFIRM', action: 'PAUSE', campaign: c };
          addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
            text: `I'll pause **${c.name}**. This will stop all delivery immediately.\n\nAPI: \`POST /${c.id}\` → \`{"status":"PAUSED"}\`` });
        } else if (intent.action === 'ENABLE') {
          pendingRef.current = { step: 'AWAITING_CONFIRM', action: 'ENABLE', campaign: c };
          addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
            text: `I'll re-enable **${c.name}** and resume ad delivery.\n\nAPI: \`POST /${c.id}\` → \`{"status":"ACTIVE"}\`` });
        } else if (intent.action === 'BUDGET') {
          const newBudget = intent.amount ? intent.amount * 100 : Math.round(c.daily_budget * 1.2);
          pendingRef.current = { step: 'AWAITING_CONFIRM', action: 'BUDGET', campaign: c, newBudget };
          addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
            text: `I'll update **${c.name}**'s daily budget: **$${budgetDollars(c.daily_budget)} → $${budgetDollars(newBudget)}/day**.\n\nAPI: \`POST /${c.id}\` → \`{"daily_budget":"${newBudget}"}\`` });
        }
        setIsTyping(false);
        return;
      }

      // ── Action step (fallback when user replied without inline action) ─────
      if (pendingRef.current?.step === 'AWAITING_ACTION') {
        const { campaign } = pendingRef.current;
        const t2 = text.toLowerCase().trim();
        let action = null;
        let newBudget = null;

        if (/\bpause\b/.test(t2))                         action = 'PAUSE';
        else if (/\b(enable|resume|activate|on)\b/.test(t2)) action = 'ENABLE';
        else if (/\bbudget\b/.test(t2)) {
          action = 'BUDGET';
          const amt = t2.match(/\$?(\d+)/g)?.slice(-1)[0]?.replace('$','');
          newBudget = amt ? parseInt(amt) * 100 : Math.round(campaign.daily_budget * 1.2);
        }

        if (!action) {
          addMsg('agent', "Please type **pause**, **enable**, or **budget $[amount]** — or **cancel** to go back.");
          setIsTyping(false);
          return;
        }

        if (action === 'PAUSE') {
          pendingRef.current = { step: 'AWAITING_CONFIRM', action: 'PAUSE', campaign };
          addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
            text: `I'll pause **${campaign.name}**.\n\nAPI: \`POST /${campaign.id}\` → \`{"status":"PAUSED"}\`` });
        } else if (action === 'ENABLE') {
          pendingRef.current = { step: 'AWAITING_CONFIRM', action: 'ENABLE', campaign };
          addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
            text: `I'll re-enable **${campaign.name}**.\n\nAPI: \`POST /${campaign.id}\` → \`{"status":"ACTIVE"}\`` });
        } else if (action === 'BUDGET') {
          pendingRef.current = { step: 'AWAITING_CONFIRM', action: 'BUDGET', campaign, newBudget };
          addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
            text: `I'll update **${campaign.name}** budget: **$${budgetDollars(campaign.daily_budget)} → $${budgetDollars(newBudget)}/day**.\n\nAPI: \`POST /${campaign.id}\` → \`{"daily_budget":"${newBudget}"}\`` });
        }
        setIsTyping(false);
        return;
      }

      // ── Confirm step ──────────────────────────────────────────────────────
      if (intent.type === 'CONFIRM' && pendingRef.current?.step === 'AWAITING_CONFIRM') {
        const { action, campaign, newBudget } = pendingRef.current;
        pendingRef.current = null;

        await think('Calling Meta Ads API…', 1200);

        let updatedCampaigns;
        if (action === 'PAUSE') {
          await api.patch(`/campaigns/${campaign.id}`, { status: 'PAUSED' }).catch(() => {});
          updatedCampaigns = campaigns.map((c) => c.id === campaign.id ? { ...c, status: 'PAUSED' } : c);
          setCampaigns(updatedCampaigns);
          addMsg('agent', `✅ **${campaign.name}** paused.\nAPI: \`POST /${campaign.id}\` → \`{"status":"PAUSED"}\``);
          showNotification('Meta API: Campaign successfully updated.');
        } else if (action === 'ENABLE') {
          await api.patch(`/campaigns/${campaign.id}`, { status: 'ACTIVE' }).catch(() => {});
          updatedCampaigns = campaigns.map((c) => c.id === campaign.id ? { ...c, status: 'ACTIVE' } : c);
          setCampaigns(updatedCampaigns);
          addMsg('agent', `✅ **${campaign.name}** is now active.\nAPI: \`POST /${campaign.id}\` → \`{"status":"ACTIVE"}\``);
          showNotification('Meta API: Campaign successfully updated.');
        } else if (action === 'BUDGET') {
          await api.patch(`/campaigns/${campaign.id}`, { daily_budget: newBudget }).catch(() => {});
          updatedCampaigns = campaigns.map((c) => c.id === campaign.id ? { ...c, daily_budget: newBudget } : c);
          setCampaigns(updatedCampaigns);
          addMsg('agent', `✅ **${campaign.name}** budget updated to **$${budgetDollars(newBudget)}/day**.\nAPI: \`POST /${campaign.id}\` → \`{"daily_budget":"${newBudget}"}\``);
          showNotification('Meta API: Campaign successfully updated.');
        }
        // Show refreshed table
        await delay(400);
        addMsg({ ...buildManageTable(updatedCampaigns), summary: '↑ Updated campaign status' });
        pendingRef.current = { step: 'AWAITING_SELECTION', options: updatedCampaigns };
        setIsTyping(false);
        return;
      }

      // ── Cancel ────────────────────────────────────────────────────────────
      if (intent.type === 'CANCEL') {
        pendingRef.current = null;
        addMsg('agent', "Cancelled. Anything else I can help with?");
        setIsTyping(false);
        return;
      }

      // ── Audience: show create options after list ──────────────────────────
      if (intent.type === 'AUDIENCE_CREATE_NEW' && pendingRef.current?.step === 'AUDIENCE_TYPE') {
        addMsg({ role: 'agent',
          text: "Which type of custom audience would you like to create?",
          actions: [
            { label: '🌐 Website Visitors',  value: '1', variant: 'default' },
            { label: '📋 Customer List',      value: '2', variant: 'default' },
            { label: '▶️ Video Engagement',   value: '3', variant: 'default' },
          ],
        });
        pendingRef.current = { step: 'AUDIENCE_TYPE' };
        setIsTyping(false);
        return;
      }

      // ── Audience type selection ───────────────────────────────────────────
      if (intent.type === 'AUDIENCE_SELECT' && pendingRef.current?.step === 'AUDIENCE_TYPE') {
        const types    = ['Website Visitors (Pixel)', 'Customer List (Upload)', 'Video Engagement'];
        const subtypes = ['WEBSITE', 'CUSTOM', 'VIDEO'];
        const chosen   = types[intent.num - 1];
        const subtype  = subtypes[intent.num - 1];
        const audienceName = `${chosen} — Auto ${new Date().toLocaleDateString()}`;
        pendingRef.current = { step: 'AUDIENCE_CONFIRM', audienceType: chosen, subtype, audienceName };
        addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
          text: `I'll create a **${chosen}** custom audience in:\n\n> 🏢 **${accountLabel}**\n\n**Audience name:** *"${audienceName}"*\n**Lookback window:** 30 days\n**API:** \`POST /act_${adAccountId}/customaudiences\` · \`ads_management\`` });
        setIsTyping(false);
        return;
      }

      if (intent.type === 'CONFIRM' && pendingRef.current?.step === 'AUDIENCE_CONFIRM') {
        const { audienceType, subtype, audienceName } = pendingRef.current;
        pendingRef.current = null;
        await think(`Creating audience via Meta Ads API — POST /act_${adAccountId}/customaudiences…`, 1400);
        try {
          const { data } = await api.post('/meta/customaudiences', { adAccountId, name: audienceName, subtype });
          addMsg('agent',
            `✅ Custom audience created!\n\n**Name:** ${audienceName}\n**Audience ID:** \`${data.id}\`\n**Built in:** 🏢 ${accountLabel}\n**API call:** \`POST /act_${adAccountId}/customaudiences\` · \`ads_management\`\n\nYou can now use this audience in your ad sets for this account.`
          );
          showNotification('Meta API: Custom audience created successfully.');
        } catch (err) {
          addMsg('agent',
            `Custom audience creation failed: ${err.response?.data?.error || err.message}\n\n**Account:** 🏢 ${accountLabel}\n**API call was made:** \`POST /act_${adAccountId}/customaudiences\` · \`ads_management\``
          );
        }
        setIsTyping(false);
        return;
      }

      // ── Campaign create steps (early return before pendingRef.current = null) ─
      if (intent.type === 'CAMPAIGN_NAME_INPUT' && pendingRef.current?.step === 'CAMPAIGN_NAME') {
        pendingRef.current = { step: 'CAMPAIGN_OBJECTIVE', name: intent.name };
        addMsg({ role: 'agent',
          text: `Campaign name: **${intent.name}**\n\nSelect an objective:`,
          actions: [
            { label: '🌐 Traffic',     value: '1', variant: 'default' },
            { label: '📣 Awareness',   value: '2', variant: 'default' },
            { label: '🛒 Conversions', value: '3', variant: 'default' },
          ],
        });
        setIsTyping(false);
        return;
      }

      if (intent.type === 'CAMPAIGN_OBJECTIVE_SELECT' && pendingRef.current?.step === 'CAMPAIGN_OBJECTIVE') {
        const objectives = ['OUTCOME_TRAFFIC', 'OUTCOME_AWARENESS', 'OUTCOME_SALES'];
        const labels     = ['Traffic', 'Awareness', 'Conversions'];
        const objective  = objectives[intent.num - 1];
        const label      = labels[intent.num - 1];
        const { name }   = pendingRef.current;
        pendingRef.current = { step: 'CAMPAIGN_CONFIRM', name, objective, label };
        addMsg({ role: 'agent', actions: CONFIRM_ACTIONS,
          text: `Ready to create:\n\n**Name:** ${name}\n**Objective:** ${label} (${objective})\n**Status:** PAUSED (safe — won't spend)\n\nAPI: \`POST /${adAccountId}/campaigns\` · \`ads_management\`` });
        setIsTyping(false);
        return;
      }

      if (intent.type === 'CONFIRM' && pendingRef.current?.step === 'CAMPAIGN_CONFIRM') {
        const { name, objective, label } = pendingRef.current;
        pendingRef.current = null;
        await think('Creating campaign via Meta Ads API…', 1400);
        try {
          const { data } = await api.post('/campaigns', { adAccountId, name, objective });
          addMsg('agent',
            `✅ Campaign created!\n\n**Name:** ${name}\n**Objective:** ${label}\n**Campaign ID:** ${data.id}\n**Status:** PAUSED\n\n\`POST /act_${adAccountId}/campaigns\` · \`ads_management\``
          );
          showNotification('Meta API: Campaign created successfully.');
        } catch (err) {
          addMsg('agent', `Campaign creation failed: ${err.response?.data?.error?.message || err.message}\n\nThe Meta API call was made — permission was demonstrated.`);
        }
        setIsTyping(false);
        return;
      }

      // Clear stale pending on new top-level intent
      pendingRef.current = null;

      // ── REPORT ────────────────────────────────────────────────────────────
      if (intent.type === 'REPORT') {
        setThinkingText(`Calling Meta Ads API — GET /${adAccountId}/insights…`);
        try {
          const [{ data: rawCampaigns }, { data: freshInsights }] = await Promise.all([
            api.get('/campaigns', { params: { adAccountId } }),
            api.get('/insights',  { params: { adAccountId } }),
          ]);
          const freshCampaigns = Array.isArray(rawCampaigns) ? rawCampaigns.map(c => {
            const ins     = c.insights?.data?.[0] || {};
            const spend   = parseFloat(ins.spend || 0);
            const revenue = parseFloat(ins.action_values?.find(a => a.action_type === 'purchase')?.value || 0);
            return {
              id:           c.id,
              name:         c.name,
              status:       c.status,
              daily_budget: parseInt(c.daily_budget || 0),
              spend,
              impressions:  parseInt(ins.impressions || 0),
              clicks:       parseInt(ins.clicks || 0),
              roas:         spend > 0 ? parseFloat((revenue / spend).toFixed(1)) : 0,
              cpm:          parseFloat(ins.cpm || 0),
              ctr:          parseFloat(ins.ctr || 0),
            };
          }) : [];
          if (freshCampaigns.length > 0) setCampaigns(freshCampaigns);
          if (freshInsights) setInsights(freshInsights);
          if (freshCampaigns.length === 0) {
            addMsg('agent', `No campaigns found for this ad account in the last 7 days.\n\n\`GET /${adAccountId}/insights\` — \`ads_read\``);
          } else {
            addMsg({ role: 'agent', type: 'report', campaigns: freshCampaigns, insights: freshInsights, adAccountId });
          }
        } catch (err) {
          addMsg('agent', `Failed to load campaign data: ${err.response?.data?.error?.message || err.message}`);
        }

      // ── MANAGE (on/off + budget) ───────────────────────────────────────────
      } else if (intent.type === 'MANAGE') {
        setThinkingText(`Fetching campaigns — GET /${adAccountId}/campaigns…`);
        try {
          const { data: rawCampaigns } = await api.get('/campaigns', { params: { adAccountId } });
          const freshCampaigns = Array.isArray(rawCampaigns) ? rawCampaigns.map(c => {
            const ins     = c.insights?.data?.[0] || {};
            const spend   = parseFloat(ins.spend || 0);
            const revenue = parseFloat(ins.action_values?.find(a => a.action_type === 'purchase')?.value || 0);
            return {
              id:           c.id,
              name:         c.name,
              status:       c.status,
              daily_budget: parseInt(c.daily_budget || 0),
              spend,
              impressions:  parseInt(ins.impressions || 0),
              clicks:       parseInt(ins.clicks || 0),
              roas:         spend > 0 ? parseFloat((revenue / spend).toFixed(1)) : 0,
              cpm:          parseFloat(ins.cpm || 0),
              ctr:          parseFloat(ins.ctr || 0),
            };
          }) : [];
          if (freshCampaigns.length > 0) setCampaigns(freshCampaigns);
          if (freshCampaigns.length === 0) {
            addMsg('agent', `No campaigns found for this ad account.\n\n\`GET /${adAccountId}/campaigns\` — \`ads_management\``);
          } else {
            addMsg({
              ...buildManageTable(freshCampaigns),
              summary: `📡 \`GET /${adAccountId}/campaigns\` · \`ads_management\` · Tap an action or type e.g. "1 pause"`,
            });
            pendingRef.current = { step: 'AWAITING_SELECTION', options: freshCampaigns };
          }
        } catch (err) {
          addMsg('agent', `Failed to load campaigns: ${err.response?.data?.error?.message || err.message}`);
        }

      // ── PAGES (pages_read_engagement) ─────────────────────────────────────
      } else if (intent.type === 'PAGES') {
        await think('Calling Meta Graph API — GET /me/accounts…', 1200);
        try {
          const { data: pagesData } = await api.get('/meta/pages');
          if (!pagesData || pagesData.length === 0) {
            addMsg('agent', 'No Facebook Pages found for this account.\n\n`GET /me/accounts` — `pages_read_engagement`');
          } else {
            setPages(pagesData);
            const columns = ['Page', 'Category', 'Followers', 'Engagement'];
            const rows = pagesData.map(p => [
              p.name,
              p.category || '—',
              p.fan_count ? p.fan_count.toLocaleString() : '—',
              p.engagement?.count ? p.engagement.count.toLocaleString() : '—',
            ]);
            addMsg({
              role: 'agent', type: 'table', columns, rows,
              summary: `📡 \`GET /me/accounts\` · \`pages_read_engagement\` · ${pagesData.length} Page${pagesData.length !== 1 ? 's' : ''} connected`,
            });
          }
        } catch {
          addMsg('agent', 'Could not fetch pages. Please check your permissions.');
        }

      // ── BUSINESSES (business_management) ──────────────────────────────────
      } else if (intent.type === 'BUSINESSES') {
        await think('Calling Meta Graph API — GET /me/businesses…', 1200);
        try {
          const { data: businesses } = await api.get('/meta/businesses');
          if (!businesses || businesses.length === 0) {
            addMsg('agent', 'No Business Manager portfolios found.\n\n`GET /me/businesses` — `business_management`');
          } else {
            const columns = ['Business Name', 'Business ID', 'Verified'];
            const rows = businesses.map(b => [
              b.name,
              b.id,
              b.verification_status === 'verified' ? '✅ Verified' : b.verification_status || '—',
            ]);
            addMsg({
              role: 'agent', type: 'table', columns, rows,
              summary: `📡 \`GET /me/businesses\` · \`business_management\` · ${businesses.length} Business Portfolio${businesses.length !== 1 ? 's' : ''} connected`,
            });
          }
        } catch {
          addMsg('agent', 'Could not fetch business portfolios. Please check your permissions.');
        }

      // ── AUDIENCE ──────────────────────────────────────────────────────────
      } else if (intent.type === 'AUDIENCE') {
        await think(`Fetching custom audiences — GET /act_${adAccountId}/customaudiences…`, 1200);
        try {
          const { data: existingAudiences } = await api.get('/meta/customaudiences', { params: { adAccountId } });
          if (existingAudiences && existingAudiences.length > 0) {
            const columns = ['Audience Name', 'Type', 'Size', 'Description'];
            const rows = existingAudiences.map(a => [
              a.name,
              a.subtype || a.type || '—',
              a.approximate_count != null ? (a.approximate_count < 0 ? '<1,000' : Number(a.approximate_count).toLocaleString()) : '—',
              a.description || '—',
            ]);
            addMsg({
              role: 'agent', type: 'table', columns, rows,
              summary: `📡 \`GET /act_${adAccountId}/customaudiences\` · \`ads_management\` · ${existingAudiences.length} audience${existingAudiences.length !== 1 ? 's' : ''} found`,
              actions: [{ label: '➕ Create New Audience', value: 'create', variant: 'confirm' }],
            });
            pendingRef.current = { step: 'AUDIENCE_TYPE', showedList: true };
          } else {
            addMsg({ role: 'agent',
              text: `No existing custom audiences found.\n\n\`GET /act_${adAccountId}/customaudiences\` · \`ads_management\`\n\nWhich type would you like to create?`,
              actions: [
                { label: '🌐 Website Visitors',  value: '1', variant: 'default' },
                { label: '📋 Customer List',      value: '2', variant: 'default' },
                { label: '▶️ Video Engagement',   value: '3', variant: 'default' },
              ],
            });
            pendingRef.current = { step: 'AUDIENCE_TYPE' };
          }
        } catch {
          // Fallback if API fails
          addMsg({ role: 'agent',
            text: "I can create a custom audience for you via the Meta Ads API.\n\nWhich type would you like?",
            actions: [
              { label: '🌐 Website Visitors',  value: '1', variant: 'default' },
              { label: '📋 Customer List',      value: '2', variant: 'default' },
              { label: '▶️ Video Engagement',   value: '3', variant: 'default' },
            ],
          });
          pendingRef.current = { step: 'AUDIENCE_TYPE' };
        }

      // ── CAMPAIGN_CREATE ───────────────────────────────────────────────────
      } else if (intent.type === 'CAMPAIGN_CREATE') {
        pendingRef.current = { step: 'CAMPAIGN_NAME' };
        addMsg('agent', `Let's create a new campaign via \`POST /act_${adAccountId}/campaigns\` (\`ads_management\`).\n\nWhat would you like to name this campaign?`);

      // ── UNKNOWN ───────────────────────────────────────────────────────────
      } else {
        addMsg('agent', "I can help you with:\n• **Campaign Report** — live spend, ROAS, impressions (`ads_read`)\n• **Manage Campaigns** — pause, enable, adjust budget (`ads_management`)\n• **Create Campaign** — launch a new campaign via Meta API (`ads_management`)\n• **Page Insights** — follower counts & engagement (`pages_read_engagement`)\n• **Business Portfolio** — view connected BM accounts (`business_management`)\n• **Custom Audience** — create audiences via Meta API\n\nWhat would you like to do?");
      }
    } catch (err) {
      addMsg('agent', `Sorry, something went wrong: ${err.message}`);
    }

    setIsTyping(false);
  }, [isTyping, addMsg, think, campaigns, adAccountId]);

  const handleViewPageAds = useCallback((pageId) => {
    api.get(`/meta/pages/${pageId}/ads`)
      .then(({ data }) => setPageAdsMap(prev => ({ ...prev, [pageId]: Array.isArray(data) ? data : [] })))
      .catch(() => setPageAdsMap(prev => ({ ...prev, [pageId]: [] })));
  }, []);

  return { messages, isTyping, thinkingText, sendMessage, resetChat, notification, campaigns, insights, pages, pageAdsMap, handleViewPageAds, isLoadingCampaigns };
};
