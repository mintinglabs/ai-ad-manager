---
name: insights-reporting
description: Analyze Facebook ad performance with diagnostic statuses and strategic recommendations
layer: analytical
leads_to: [campaign-manager, adset-manager, creative-manager, targeting-audiences, tracking-conversions]
---

# Insights & Reporting

## Scenario Routing (classify BEFORE writing)

Read the user's message → pick ONE scenario → follow its output structure.

| Scenario | Triggers | Strategic Lens |
|---|---|---|
| A — 預算配比效率 | "overview", "how are my ads", "last 7 days", general check-in | Spend efficiency across goal types — is the funnel top-heavy? |
| B — 素材 vs 市場 | "why is cost high", "diagnose", "what's wrong" | Creative Decay vs Auction Pressure — walk through causal evidence |
| C — 資本損耗 | "what should I pause", "worst performers", "stop loss" | Quantify capital hemorrhage, generate kill list |
| D — 邊際紅利 | "which should I scale", "best performers", "add budget" | Find low-freq low-CPA winners with scaling room |

Default if unclear → Scenario A.

---

## Goal → Primary Metric Map

| optimization_goal | Primary Metric | Primary Action Type |
|---|---|---|
| CONVERSATIONS | Cost/Conversation | `onsite_conversion.messaging_conversation_started_7d` |
| LEAD_GENERATION | CPL | `lead` or `onsite_conversion.lead_grouped` |
| OFFSITE_CONVERSIONS (purchase) | ROAS + CPA | `purchase` / `offsite_conversion.fb_pixel_purchase` |
| OFFSITE_CONVERSIONS (lead) | CPL | `offsite_conversion.fb_pixel_lead` |
| OFFSITE_CONVERSIONS (other) | Cost/LPV | `landing_page_view` |
| LINK_CLICKS | CPC + CTR | `link_click` |
| LANDING_PAGE_VIEWS | Cost/LPV | `landing_page_view` |
| PROFILE_VISIT | Cost/Click | `link_click` (proxy) |
| REACH | CPM + Reach | impressions/reach |
| THRUPLAY | Cost/ThruPlay | `video_thruplay_watched_actions` |
| POST_ENGAGEMENT | CPE | `post_engagement` |
| APP_INSTALLS | CPI | `mobile_app_install` |
| VALUE | ROAS | `purchase` + `action_values` |

**OFFSITE_CONVERSIONS detection:** Check `actions` array for `offsite_conversion.fb_pixel_purchase` → purchase; `fb_pixel_lead` → lead; else → landing_page_view fallback.

**ROAS rule:** Only compute when goal = VALUE or OFFSITE_CONVERSIONS+purchase. Never for messaging/leads.

**Mixed accounts:** Never average ROAS across different goal types. Group by goal, show each group's primary metric separately.

---

## Data (already loaded by analyze_performance)

`analyze_performance()` returns:
```
{ current_7d, previous_7d, baseline_30d, _benchmarks, account_summary }
```

Each campaign row includes: campaign_id, campaign_name, spend, impressions, clicks, ctr, cpm, reach, frequency, actions, video_thruplay_watched_actions, action_values, optimization_goal.

`_benchmarks[goal]` = { avg_cost_per_result, total_spend, total_results, campaign_count, primary_action_type }

**Use `_benchmarks` as evaluation baseline — never compute averages yourself.**

Extract primary result: `actions.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
Extract primary cost: `cost_per_action_type.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`

---

## Diagnostic Evaluation (5 signals)

```
cpa_deviation_pct = ((campaign_cost - _benchmarks[goal].avg_cost_per_result) / avg) * 100
ctr_delta_pct     = ((current_ctr - prev_ctr) / prev_ctr) * 100
cpm_delta_pct     = ((current_cpm - prev_cpm) / prev_cpm) * 100
frequency         = current period value
result_count      = current period primary results (0 vs >0)
```

**Decision tree (first match wins):**

| Status | Condition |
|---|---|
| 🚨 預算流失警告 | spend > 0 AND results = 0 |
| ⚠️ 創意吸引力衰退 | CPA > +20% AND CTR < -10% AND freq > 2.5 |
| ⚔️ 流量競爭加劇 | CPA > +20% AND CTR stable AND CPM > +15% |
| ⚖️ 表現穩定運行 | CPA within ±20% |
| 🚀 爆發增長模式 | CPA < -20% AND CTR stable/improving |
| 📊 數據積累中 | < 3 days data or < $10 spend → skip diagnosis |

**Edge cases:** No prev data → use CPA vs baseline only. No CPA (THRUPLAY/REACH) → use cost_per_thruplay or CPM. `_benchmarks[goal]` missing → use WoW as proxy.

**Frequency signal:** ≤3 healthy, 3-5 saturation approaching, >5 audience saturated.

---

## Output Format — Two Panels, Zero Redundancy

Text appears in BOTH panels. Canvas blocks (metrics, budget, comparison) + tables appear ONLY in canvas. Write all text first, then canvas blocks at the end.

### Chat (left panel) — stream first:
1. **One-paragraph summary** — 2-3 sentences: dominant status + total spend + key finding with numbers
2. **Bullet insights** — 3-5 one-line bullets: "• [Campaign]: [status] [metric] ([WoW change])"
3. `insights` block — top 3 severity-coded findings
4. `steps` block — 2-4 prioritized actions
5. `quickreplies` — 4 diagnostic-aware buttons

### Canvas (right panel) — emit AFTER all text, no text between blocks:
1. `metrics` block (Spend + 3 KPIs)
2. `budget` block (spend donut by goal)
3. `comparison` block (WoW bar chart)
4. Goal summary table (Goal | Spend | Results | Cost/Result | Status | WoW)
5. Per-campaign table sorted by severity 🚨→🚀

### Rules
- WhatsApp/Messaging: NEVER show ROAS
- Every metric includes WoW % (🟢/🟡/🔴)
- Strip campaign name prefixes
- Dynamic quickreplies based on diagnostic, not generic
- Note 48h attribution window at report bottom

---

## Handoff

After analysis, save alert context then transfer back:

```
update_workflow_context({ data: {
  insights_alert: { metric, value, prev, trend, status, campaign_id, optimization_goal }
}})
```

| Diagnostic | Recommended Next Skill |
|---|---|
| 🚨 Budget Leaking | `tracking-conversions` → `campaign-manager` |
| ⚠️ Creative Decay | `creative-manager` |
| ⚔️ Auction Pressure | `campaign-manager` |
| 🚀 Growth Breakout | `campaign-manager` + `targeting-audiences` |
