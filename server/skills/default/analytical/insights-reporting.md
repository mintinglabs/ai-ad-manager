---
name: insights-reporting
description: Retrieve and analyze Facebook ad performance insights with breakdowns, trends, and strategic recommendations
layer: analytical
leads_to: [campaign-manager, adset-manager, ad-manager, creative-manager, targeting-audiences, automation-rules, tracking-conversions]
---

# Insights & Reporting

## API Endpoints

### Account-Level Aggregated Insights

```
GET /api/insights
```

Returns top-level account metrics: `totalSpend`, `totalRevenue`, `roas`, `conversions`, `impressions`, `clicks`, `ctr`.

### Object-Level Insights

```
GET /api/insights/:objectId?fields=...&date_preset=...&breakdowns=...&time_increment=...&level=...&sort=...&limit=...
```

Retrieve insights for a specific campaign, ad set, or ad by its ID.

**Query Parameters:**

| Parameter        | Description                                                     |
| ---------------- | --------------------------------------------------------------- |
| `fields`         | Comma-separated metric fields to return                         |
| `date_preset`    | Predefined date range (see Date Presets below)                  |
| `breakdowns`     | Comma-separated breakdown dimensions                            |
| `time_increment` | `1` = daily, `7` = weekly, `monthly`                           |
| `level`          | Aggregation level: `campaign`, `adset`, `ad`                    |
| `sort`           | Field and direction, e.g. `spend_descending`                    |
| `limit`          | Max number of rows returned                                     |

### Async Reports (Large Datasets)

**Create a report:**

```
POST /api/insights/async
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "fields": ["spend", "impressions", "clicks"],
  "date_preset": "last_30d",
  "time_range": { "since": "2025-01-01", "until": "2025-01-31" },
  "time_increment": "1",
  "breakdowns": ["age", "gender"],
  "level": "campaign",
  "filtering": [],
  "sort": ["spend_descending"],
  "action_attribution_windows": ["7d_click", "1d_view"],
  "limit": 1000
}
```

All fields except `adAccountId` are optional.

**Check report status:**

```
GET /api/insights/async/:reportRunId/status
```

**Fetch report results:**

```
GET /api/insights/async/:reportRunId/results
```

**Workflow:** POST to create the report, poll the status endpoint until complete, then fetch results.

## Analysis Workflow

**Always follow this order:** Route intent → fetch data in parallel → analyze → present → hand off.

### Step -1 -- Route Intent to Report Type (FIRST — before any tool call)

Map the user's message to the correct report type immediately. Do NOT ask — infer and proceed.

| User says | Run |
|---|---|
| "how are my ads doing", "show performance", "check my campaigns", "點樣", any general overview | Weekly Performance Report (§1) |
| "what's wrong", "any problems", "issues", "not working", "點解差" | Problems & Quick Wins (§3) |
| "this month", "monthly", "last month" | Monthly Performance Report (§2) |
| "which creative", "best ad", "worst ad", "creative performance" | Creative Performance Analysis (§4) |
| "budget", "spending", "pacing", "underspend" | Budget Pacing Check (§11) |
| "compare", "vs", "last week vs this week" | Compare Campaigns / Periods (§12) |
| "audience", "demographic", "who's seeing", "age", "gender", "placement" | Demographic & Placement Breakdown (§8) |
| "health check", "audit", "account score" | Full Account Health Audit (§6) |
| "trend", "over time", "last 30 days" | Trend Analysis (§7) |
| "a/b test", "split test", "variant", "winner" | A/B Test Results (§10) |
| "competitor", "market" | Competitor & Market Research (§9) |

**Default if unclear → Weekly Performance Report (§1).**

---

### Step 0 -- Detect Goal & Select Primary Metric

**0a. Run ALL THREE in parallel — never wait sequentially:**

```
get_campaigns()
get_ad_sets()
get_account_insights(date_preset: "last_7d")
```

**0b. `optimization_goal` from ad sets is the ONLY source of truth for metric selection.**
- NEVER use campaign `objective` alone — it is wrong for mixed-destination campaigns.
- NEVER infer the goal from the campaign name (e.g., "Sales_Wts_" does not mean ROAS).
- A campaign with `objective = OUTCOME_SALES` + WhatsApp destination has `optimization_goal = CONVERSATIONS` on its ad sets → treat it as a **Messaging** campaign, show Cost per Conversation, not ROAS or CPL.
- Always call `get_ad_sets` and read the `optimization_goal` field directly before choosing any metric.

Once ad sets return, map `optimization_goal` to the primary metric using table 0c below.

**0c. Map to primary metric using this table:**

| optimization_goal | Primary Metric | Primary Action Type | Label |
|---|---|---|---|
| `CONVERSATIONS` (WhatsApp / Messenger / IG DM) | Cost per Conversation | `onsite_conversion.messaging_conversation_started_7d` | Cost per Conversation |
| `LEAD_GENERATION` | CPL | `lead` or `onsite_conversion.lead_grouped` | Cost per Lead |
| `OFFSITE_CONVERSIONS` — purchase event | ROAS + CPA | `purchase` / `offsite_conversion.fb_pixel_purchase` | ROAS & Cost per Purchase |
| `OFFSITE_CONVERSIONS` — lead event | CPL | `offsite_conversion.fb_pixel_lead` | Cost per Lead |
| `OFFSITE_CONVERSIONS` — other event | CPA | match `custom_event_type` from promoted_object | Cost per Result |
| `LINK_CLICKS` | CPC + CTR | `link_click` | Cost per Click |
| `LANDING_PAGE_VIEWS` | Cost per LPV | `landing_page_view` | Cost per Landing Page View |
| `REACH` | CPM + Reach | reach + impressions | CPM & Reach |
| `THRUPLAY` | Cost per ThruPlay | `video_thruplay_watched_actions` | Cost per ThruPlay |
| `VIDEO_VIEWS` | Cost per View | `video_view` | Cost per View |
| `POST_ENGAGEMENT` | CPE | `post_engagement` | Cost per Engagement |
| `APP_INSTALLS` | CPI | `mobile_app_install` | Cost per Install |
| `VALUE` | ROAS | `purchase` + `action_values` | ROAS |

**0d. Mixed account handling** (multiple campaigns with different goals):
- Never average ROAS across a Sales campaign and a WhatsApp campaign.
- **Output layout for all-campaigns overview:**
  1. One diagnostic sentence covering total account spend + overall status emoji
  2. One `metrics` block: **Total Spend only** — do NOT show goal-specific KPIs (leads, conversations, ROAS) here because they belong to different campaign types and mixing them is misleading. Total Reach and CTR are OK.
  3. One section per active goal type, each with its own primary metric, compact campaign summary, and mini `insights` card
  4. One combined `quickreplies` at the end

**0e. ROAS rule:** Only compute ROAS when `optimization_goal` is `VALUE` or `OFFSITE_CONVERSIONS` with `custom_event_type = PURCHASE`. For all other goals, ROAS is meaningless — do not compute or show it anywhere.

**0f. NEVER gate data with a clarifying question before showing results.**
- Generic queries ("how are my ads doing?", "show me performance", "點樣") → run all-campaigns overview grouped by goal type. No question first.
- Goal-specific queries ("how are my WhatsApp campaigns?") → focus only on that goal type.
- Clarifying questions are ONLY allowed AFTER presenting data, as follow-up `quickreplies` (e.g. "Want to drill into any specific campaign?").
- If an account has NO active campaigns, say so once and offer: "Start a new campaign?" as a quickreply.

---

### Step 1 -- Gather data (after goal is known)

**Date computation:** TODAY = current date in YYYY-MM-DD.
- Current period: `since = TODAY minus 7 days`, `until = TODAY minus 1 day`
- Previous period: `since = TODAY minus 14 days`, `until = TODAY minus 8 days`

Call **both periods in parallel** for each campaign:
- **get_object_insights (current period)** — fields relevant to detected goal:
  - All goals: `spend,impressions,clicks,ctr,cpm,reach,frequency,actions,cost_per_action_type`
  - Messaging/conversations: add `onsite_conversion.messaging_conversation_started_7d` — **this is the ONLY correct field for WhatsApp/Messenger conversation count**. Do NOT use `actions` total or any other conversation action type. Meta shows `messaging_conversation_started_7d` in Ads Manager as "Conversations Started".
  - Sales/ROAS: add `action_values,purchase_roas`
  - Video/awareness: add `video_p25_watched_actions,video_p75_watched_actions,video_p100_watched_actions,video_avg_time_watched_actions,video_thruplay_watched_actions`
- **get_object_insights (previous period)** — same fields

**Do NOT use `get_account_insights` to derive primary metrics (leads, conversations, purchases).** The account-level endpoint aggregates all action types together — the numbers will be wrong. Use `get_object_insights` per campaign and sum the specific action type yourself.

Fetch ALL campaigns with `status = ACTIVE` — do not filter or limit at this stage. An account with 5 active campaigns must show all 5, not 3.

> **Trend requirement:** Dual-period fetch is mandatory for all 7-day+ reports. Compute % delta in Step 2.
> **No previous data:** If previous period returns $0 spend or no data, skip delta — omit `prev` and `trend` fields in the insights card and set `status` from absolute thresholds (Strategic Handoff Summary).
> **Data freshness:** Meta has up to a 48-hour attribution window. Note this once per report at the bottom.

---

### Step 2 -- Cross-analyze using the correct metric

**Parse `actions` and `cost_per_action_type` by the primary action type identified in Step 0.**

- Extract primary result count: `actions.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
- Extract primary cost: `cost_per_action_type.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
- For ROAS only (OFFSITE_CONVERSIONS + PURCHASE / VALUE): `purchase_roas[0]?.value` or `action_values / spend`
- Identify winners and losers using the correct metric — not ROAS
- Flag creative fatigue: frequency > 3 or declining CTR over time

**Trend delta computation (mandatory when previous period data exists):**

For each primary metric, compute:
- `delta_pct = ((current - prev) / prev) * 100`
- Round to 1 decimal. Prefix with `+` if positive.
- **If prev = 0 or undefined:** skip delta, omit `prev`/`trend` fields, assign status from absolute thresholds only.

Assign `status` based on metric direction (whether higher is better or worse):

| Metric type | ok | warning | critical |
|---|---|---|---|
| **Cost metrics** (CPL, CPC, CPM, CPA, Cost per Conversation) — lower is better | delta ≤ +10% | +10% to +25% | > +25% |
| **Volume metrics** (Leads, Clicks, Conversions, Reach) — higher is better | delta ≥ -10% | -10% to -25% | < -25% |
| **Ratio metrics** (CTR, ROAS, Video View Rate) — higher is better | delta ≥ -10% | -10% to -25% | < -25% |
| **Frequency** — lower is better (> 3 is bad) | ≤ 3 absolute | 3–5 absolute | > 5 absolute |

Use `"positive"` status when cost metrics improve > 10% or volume/ratio metrics improve > 15%.

**Never use total `actions` count as "conversions" — always filter by the specific action_type for this campaign's goal.**

---

### Step 3 -- Present with goal-appropriate structured blocks

---

#### LAYOUT A — Single-goal account (all active campaigns share the same optimization_goal)

Output in this exact order, no deviations:

**1. Diagnostic sentence** (one bold line before any block):
`[emoji] **[N] [primary results] last [period] at [cost/result] ([trend vs prior week]).** [One action signal — best or worst campaign called out.]`

Examples:
- 🟢 **28 conversations last week at $181/conv (flat WoW).** All 5 campaigns healthy — FB Reels leading at $168/conv.
- 🟡 **28 conversations last week at $181/conv (+12% WoW cost rise).** IG Carousel at $233/conv is pulling the average up.
- 🚨 **CPL up +28% this week ($50 → $64).** Lead volume also dropped 18%. Immediate action needed.

**2. `metrics` block** — 4 KPIs, goal-specific, all from `get_object_insights` (NOT from account-level):
```metrics
- Messaging: Spend | Conversations | Cost per Conv | CTR
- Leads: Spend | Leads | CPL | CTR
- Sales: Spend | ROAS | Conversions | CPA
- Traffic: Spend | Clicks | CPC | CTR
- Awareness: Spend | Reach | CPM | Frequency
```

**3. Campaign lines** — max 2 lines, plain text (no table):
```
✅ Best: [Short Name] — [N results] @ [cost]
⚠️ Review: [Short Name] — [cost] ([+X% above avg or reason])
```
Only show ⚠️ line if a campaign is warning/critical. If all are healthy, write: "All [N] campaigns within normal range."
Strip long prefixes from campaign names — keep only the meaningful part (e.g. "FB Retargeting Reels" not "Sales_Wts_FB_Retargeting_Onda Pro_瘦咗肥返_Reels_+wrapped framework").

**4. `insights` card** — 4 items max, primary metric first, with trend + status:
```insights
[
  { "metric": "Cost per Conv", "value": 181, "prev": 161, "trend": "+12%", "status": "warning" },
  { "metric": "Conversations", "value": 28, "prev": 31, "trend": "-9.7%", "status": "ok" },
  { "metric": "CTR", "value": "1.8%", "prev": "2.1%", "trend": "-14%", "status": "warning" },
  { "metric": "Spend", "value": 5064, "prev": 4980, "trend": "+1.7%", "status": "ok" }
]
```

**5. `trend` block** — only if date range ≥ 7 days; skip for single-day:
```trend
Series 1: Spend. Series 2: primary metric (Conversations / CPL / ROAS etc — never generic "Actions").
```

**6. `quickreplies`** — always 4 buttons:
- Button 1: `"Show all [N] campaigns"` — opt-in for full table
- Button 2: most urgent action (pause worst / scale best)
- Button 3: drill deeper (creative / audience / budget)
- Button 4: `"Compare last 30 days"`

---

#### LAYOUT B — Mixed-goal account (campaigns have different optimization_goals)

Output in this exact order:

**1. Diagnostic sentence** (account-level, mentions both goal types and spend):
`[emoji] **$[total spend] spent last [period] — [Goal1]: [primary metric summary], [Goal2]: [primary metric summary].**`

Example:
- 🟡 **$16,331 spent last week — WhatsApp: 28 conv at $181/conv (↑12%), Traffic: 913 clicks at $1.69/click (stable).**

**2. One section per active goal type** — repeat this mini-block for each goal:

```
### [emoji] [Goal Type Label] · [N] campaigns · $[spend] spent

[metrics block — 3 KPIs for THIS goal only: primary result | cost per result | CTR]

✅ Best: [Short Name] — [N results] @ [cost]
⚠️ Review: [Short Name] — [reason] (only if warning/critical)
```

Goal type labels and emojis:
- CONVERSATIONS → 📱 WhatsApp / Messaging
- LEAD_GENERATION → 📋 Lead Generation
- OFFSITE_CONVERSIONS (purchase) → 🛒 Sales
- LINK_CLICKS / LANDING_PAGE_VIEWS → 🔗 Traffic
- REACH / THRUPLAY → 📢 Awareness

**3. `insights` card** — top 3–4 findings across ALL goals, most critical first:
```insights
[{ metric: "Cost per Conv", ... }, { metric: "Traffic CPC", ... }, { metric: "Total Spend", ... }]
```

**4. `quickreplies`** — goal-specific drill-downs:
- `"Dive into [Goal1]"` — e.g. "Dive into WhatsApp"
- `"Dive into [Goal2]"` — e.g. "Dive into Traffic"
- Most urgent action across all goals
- `"Compare last 30 days"`

---

**Rules that apply to both layouts:**
- NEVER show a full campaign table unless user explicitly asks "show all" or "show full breakdown"
- NEVER mix metrics from different goal types in the same `metrics` block
- Always use shortened campaign names (≤ 25 chars)
- `insights` card values must come from `get_object_insights` — never from `get_account_insights`

---

### Step 4 -- Strategic Handoff (always end here)

After every analysis, identify which strategic skill the user should load next based on findings. Present this as quickreplies.

**When routing to ANY skill due to warning or critical findings:**

Always save the alert context BEFORE any handoff — not just campaign-manager:

```
update_workflow_context({ data: {
  insights_alert: {
    metric: "[primary metric label, e.g. CPL]",
    value: [current value],
    prev: [previous value],
    trend: "[e.g. +15%]",
    status: "warning|critical",
    campaign_id: "[id]",
    adset_id: "[id or null]",
    optimization_goal: "[e.g. LEAD_GENERATION]"
  }
}})
```

Then transfer. The receiving skill reads this context to start immediately with the relevant data.

**Priority when multiple findings are present:** critical findings first, then by user-facing consequence: cost > volume > efficiency. Only surface the top 1–2 issues — do not list everything.

---

## Report Types & Strategic Handoffs

### 1. Weekly Performance Report

**Tool call sequence:**
- **Round 1 (parallel):** `get_campaigns` + `get_ad_sets` + `get_account_insights(last_7d)` + `get_account_insights(last_14d)`
- **Round 2 (parallel):** `get_object_insights(current 7d)` + `get_object_insights(previous 7d)` for each active campaign
- Output sequence: diagnostic → metrics → trend → table (grouped by goal) → insights → steps → quickreplies

**Strategic Handoff:**
- Apply thresholds from the Strategic Handoff Summary table matching each campaign's optimization_goal
- If CTR declining week-over-week -> recommend loading `creative-manager` for creative refresh
- If primary metric cost rising > 20% WoW -> recommend loading `campaign-manager` to adjust budget or bid

```quickreplies
["Drill into top campaign", "Optimise budgets", "Refresh creatives", "Review audience targeting"]
```

### 2. Monthly Performance Report

**Tool call sequence:**
- **Round 1 (parallel):** `get_campaigns` + `get_ad_sets` + `get_account_insights(this_month)` + `get_account_insights(last_month)`
- **Round 2 (parallel):** `get_object_insights(this_month)` + `get_object_insights(last_month)` for each active campaign
- Output sequence: diagnostic → metrics → trend (daily for the month) → comparison card (this vs last month) → table → insights → steps → quickreplies

**Strategic Handoff:**
- If primary metric cost trending up month-over-month -> recommend loading `campaign-manager` for budget reallocation
- If frequency > 3 across campaigns -> recommend loading `creative-manager` to rotate creatives
- If result volume dropping despite stable spend -> recommend loading `tracking-conversions` to verify pixel/lead form health

```quickreplies
["Weekly breakdown", "Reallocate budgets", "Check tracking health", "Creative performance deep dive"]
```

### 3. Problems & Quick Wins

**Tool call sequence:**
1. get_campaigns + get_ad_sets (detect optimization_goal per campaign) -> get_object_insights for each active campaign (last_7d, goal-appropriate fields) -> get_object_insights for low performers
2. Look for: high cost per primary result, declining result volume, high frequency, audience overlap, inactive campaigns still spending

**Strategic Handoff:**
- Apply per-goal thresholds from Strategic Handoff Summary
- Warning: frequency > 4 -> recommend loading `creative-manager` for urgent creative rotation
- Warning: audience overlap detected -> recommend loading `targeting-audiences` to deduplicate
- Quick win: low cost per result + low budget -> recommend loading `campaign-manager` to scale budget

```quickreplies
["Fix top issue now", "Pause underperformers", "Scale winners", "Deduplicate audiences"]
```

### 4. Creative Performance Analysis

**Tool call sequence:**
1. get_ads -> get_object_insights for each ad (last_7d, include `actions,cost_per_action_type,frequency,ctr`) -> get_ad_creative for top/bottom ads
2. Flag: frequency > 3, declining CTR, best vs worst performers by PRIMARY action type cost

**Strategic Handoff:**
- If top creatives identified -> recommend loading `creative-manager` to duplicate and iterate on winners
- If all creatives fatigued (CTR < 1% and frequency > 3) -> recommend loading `creative-manager` for full refresh
- If video completion rates low -> recommend loading `creative-manager` to test shorter formats

```quickreplies
["Generate new copy variations", "Duplicate top performers", "Pause fatigued ads", "Test new creative format"]
```

### 5. Budget Optimisation Plan

**Tool call sequence:**
1. get_campaigns + get_ad_sets (detect optimization_goal per campaign) -> get_object_insights for each campaign (last_7d, goal-appropriate fields) -> calculate PRIMARY metric cost per campaign
2. Identify over/under-spending relative to PRIMARY metric performance — not ROAS universally

**Strategic Handoff:**
- Recommend loading `campaign-manager` to apply budget changes with specific dollar amounts
- If CBO vs ABO mismatch -> recommend loading `campaign-manager` to restructure budget strategy
- If scaling opportunities found -> recommend loading `automation-rules` to set auto-scaling rules

```quickreplies
["Apply budget changes", "Set auto-scaling rules", "Show performance projections", "Scale top campaigns"]
```

### 6. Full Account Health Audit

**Tool call sequence:**
- **Round 1 (parallel):** `get_campaigns` + `get_ad_sets` + `get_ads` + `get_pixels` + `get_account_insights(last_30d)`
- **Round 2 (parallel):** `get_object_insights(last_30d)` for each active campaign
- Score: structure (naming, organization), budget efficiency, creative diversity, pixel setup, audience overlap

**Strategic Handoff:**
- If pixel issues found -> recommend loading `tracking-conversions` to fix event setup
- If audience overlap > 30% -> recommend loading `targeting-audiences` to consolidate
- If budget efficiency score low -> recommend loading `campaign-manager` for restructure
- If creative diversity score low -> recommend loading `creative-manager` for new formats

```quickreplies
["Fix tracking issues", "Optimize audience targeting", "Restructure campaigns", "Diversify creatives"]
```

### 7. Trend Analysis

**Tool call sequence:**
1. get_account_insights with appropriate date_preset (last_7d, last_14d, last_30d)
2. get_object_insights for top campaigns with daily breakdown (time_increment=1)

**Strategic Handoff:**
- If downward trend in primary metric over 7+ days -> recommend loading `campaign-manager` for intervention
- If CPM rising steadily -> recommend loading `targeting-audiences` to expand or refresh audiences
- If result volume declining, spend stable -> recommend loading `tracking-conversions` to verify attribution/pixel/lead form

```quickreplies
["Compare to previous period", "Breakdown by campaign", "Adjust targeting strategy", "Verify conversion tracking"]
```

### 8. Demographic & Placement Breakdown

**Tool call sequence:**
1. get_object_insights with breakdowns=age,gender for active campaigns
2. get_object_insights with breakdowns=publisher_platform,platform_position

**Strategic Handoff:**
- If certain demographics underperforming -> recommend loading `targeting-audiences` to exclude or adjust
- If specific placements have high CPA -> recommend loading `adset-manager` to adjust placement settings
- If one platform dominates positively -> recommend loading `adset-manager` to increase allocation

```quickreplies
["Adjust age/gender targeting", "Optimize placements in Ad Set Manager", "Exclude underperforming segments", "Scale top demographics"]
```

### 9. Competitor & Market Research

**Tool call sequence:**
1. Use Ad Library endpoint: GET /api/meta/ad-library?search_terms=...&ad_reached_countries=...
2. Analyze competitor creative formats, messaging themes, and active ad count

**Strategic Handoff:**
- If competitors using formats you lack -> recommend loading `creative-manager` to test those formats
- If competitor messaging reveals positioning gaps -> recommend loading `creative-manager` for new copy angles
- If market is saturated -> recommend loading `targeting-audiences` for underserved audience segments

```quickreplies
["Create competitive creatives", "Test new ad formats", "Find underserved audiences", "Analyze more competitors"]
```

### 10. A/B Test Results

**Tool call sequence:**
1. get_campaigns (identify split test campaigns — look for pairs with similar names or campaigns flagged as experiments) -> get_object_insights for each variant (same date range, goal-appropriate fields) -> compare primary metric per variant

**Output:** comparison block (variant A vs B) -> metrics (PRIMARY metric for each variant, spend per variant) -> insights (winner or inconclusive) -> steps

**Signals:**
- Clear winner: one variant's cost per primary result is > 20% better on equivalent spend (> $50 per variant minimum)
- No clear winner: < 20% difference — more data needed
- Note: Meta doesn't provide statistical p-values — use spend parity and volume as proxies for confidence

**Strategic Handoff:**
- Winner identified -> recommend loading `creative-manager` to scale winner and pause loser
- No winner yet -> recommend loading `campaign-manager` to extend test or increase budget

```quickreplies
["Scale winning variant", "Extend the test", "Pause losing variant", "Create new test"]
```

### 11. Budget Pacing Check

**Tool call sequence:**
1. get_campaigns (get daily_budget per active campaign) -> get_object_insights (today, spend field) -> get_object_insights (this_month, spend field)

**Output:**

```metrics
Per active campaign:
- Today's Spend vs Daily Budget
- Pacing % (today's spend / (daily_budget × hours_elapsed/24))
- MTD Spend
- Projected Month-End Spend (MTD / days_elapsed × days_in_month)
```

**Pacing thresholds:**
- < 70% of expected spend by midday: Underpacing — check audience size, bid, or creative
- > 120% of daily budget: Overpacing — risk of budget blowout
- 90-110%: On pace

**Strategic Handoff:**
- Underpacing campaigns -> recommend loading `campaign-manager` to diagnose delivery issues (audience too narrow, bid too low, learning phase stalled)
- Overpacing / projected overspend -> recommend loading `campaign-manager` to add spend cap or reduce daily budget

```quickreplies
["Fix underpacing campaign", "Add spend cap", "Rebalance daily budgets", "Set auto-pause rules"]
```

### 12. Compare Campaigns / Periods

**Tool call sequence:**
- **Comparing campaigns:** get_object_insights for each campaign with the same date_preset + goal-appropriate fields
- **Comparing periods:** get_object_insights with two separate time_range calls (e.g. last 7d vs previous 7d)

**Output:** comparison block (side-by-side) -> table (spend, primary metric value, primary metric cost, CTR, CPM per campaign/period) -> insights (what improved, what declined, root cause) -> steps

**Key rules:**
- Only compare campaigns with the same `optimization_goal` — never cross-compare ROAS vs CPL
- For period comparison: flag which changes (budget, audience, creative, bid) happened between periods
- Always show absolute change AND % change

**Strategic Handoff:**
- One campaign outperforms on primary metric -> recommend loading `campaign-manager` to reallocate budget toward winner
- Period comparison shows decline -> apply thresholds from Strategic Handoff Summary for that goal

```quickreplies
["Reallocate budget to winner", "Drill into better campaign", "Check what changed between periods", "Scale top performer"]
```

---

## Strategic Handoff Summary

Apply thresholds based on the campaign's `optimization_goal`, not universally.

### Messaging / WhatsApp / Messenger Campaigns (optimization_goal = CONVERSATIONS)

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| Cost per conversation rising > 20% WoW | Warning | `campaign-manager` -- review bid strategy |
| Cost per conversation > 3x account average | Critical | `targeting-audiences` -- audience too broad or wrong segment |
| Conversations < 5 in 7 days | Warning | `creative-manager` -- test new message creative |
| Frequency > 3 | Warning | `creative-manager` -- rotate creatives |
| High cost, low conversation rate | Critical | `creative-manager` -- CTA or message copy issue |

### Lead Generation Campaigns (optimization_goal = LEAD_GENERATION)

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| CPL rising > 20% WoW | Warning | `campaign-manager` -- budget or bid adjustment |
| CPL > 3x account historical average | Critical | `targeting-audiences` -- audience review |
| Lead volume dropping, spend stable | Warning | `tracking-conversions` -- verify lead form or pixel |
| Frequency > 3 | Warning | `creative-manager` -- rotate creatives |
| CTR declining WoW | Warning | `creative-manager` -- creative refresh |

### Sales / Purchase Campaigns (optimization_goal = OFFSITE_CONVERSIONS or VALUE)

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| ROAS < 1x | Critical | `campaign-manager` -- pause or restructure |
| ROAS < 1.5x | Warning | `campaign-manager` -- budget reallocation |
| CPA (purchase) rising > 20% WoW | Warning | `targeting-audiences` -- audience overlap or fatigue |
| Conversions dropping, spend stable | Warning | `tracking-conversions` -- verify pixel + attribution |
| High ROAS, low budget | Opportunity | `campaign-manager` -- scale budget |
| ROAS < 1x with audience issues | Critical | `targeting-audiences` -- review overlap before pausing |

### Traffic Campaigns (optimization_goal = LINK_CLICKS or LANDING_PAGE_VIEWS)

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| CPC rising > 20% WoW | Warning | `creative-manager` -- ad relevance declining |
| CTR < 0.5% | Warning | `creative-manager` -- creative not compelling |
| Landing page view rate < 60% of clicks | Warning | `tracking-conversions` -- check pixel + page speed |
| Frequency > 4 | Critical | `creative-manager` -- urgent new creative |

### Awareness / Reach Campaigns (optimization_goal = REACH or THRUPLAY)

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| CPM rising > 30% WoW | Warning | `targeting-audiences` -- audience too narrow |
| Frequency > 5 | Critical | `creative-manager` -- audience saturated, new creative needed |
| Video completion rate < 20% | Warning | `creative-manager` -- hook is not working |
| ThruPlay rate < 15% | Warning | `creative-manager` -- video too long or weak opening |

### Universal (apply to all campaign types)

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| CTR declining week-over-week | Warning | `creative-manager` -- creative refresh |
| Audience overlap > 30% | Warning | `targeting-audiences` -- consolidate |
| Pixel firing errors | Critical | `tracking-conversions` -- fix pixel setup |
| Budget unevenly distributed | Warning | `campaign-manager` -- rebalance |
| Placement CPA variance > 50% | Warning | `adset-manager` -- placement optimisation |
| No automation rules | Info | `automation-rules` -- set up guardrails |

---

## Quick Reference

### Metrics

| Metric             | Description                              |
| ------------------ | ---------------------------------------- |
| `spend`            | Total amount spent                       |
| `impressions`      | Number of times ads were shown           |
| `clicks`           | Total clicks                             |
| `ctr`              | Click-through rate (clicks / impressions)|
| `cpm`              | Cost per 1,000 impressions               |
| `cpc`              | Cost per click                           |
| `reach`            | Unique users who saw the ad              |
| `frequency`        | Average times each user saw the ad       |
| `actions`          | Array of action objects (type + value)   |
| `action_values`    | Monetary value of actions                |
| `conversions`      | Conversion actions count                 |
| `purchase_roas`    | Return on ad spend for purchases         |
| `video_p25_watched_actions` | 25% video watched          |
| `video_p50_watched_actions` | 50% video watched          |
| `video_p75_watched_actions` | 75% video watched          |
| `video_p100_watched_actions` | 100% video watched        |
| `video_avg_time_watched_actions` | Avg watch time        |

### Breakdown Dimensions

| Dimension             | Description                        |
| --------------------- | ---------------------------------- |
| `age`                 | Age ranges (18-24, 25-34, etc.)    |
| `gender`              | Male, Female, Unknown              |
| `country`             | Country code                       |
| `region`              | Region / state                     |
| `publisher_platform`  | Facebook, Instagram, Audience Network, Messenger |
| `platform_position`   | Feed, Stories, Reels, etc.         |
| `device_platform`     | Mobile, Desktop                    |
| `impression_device`   | Specific device types              |
| `action_type`         | Breakdown by action type           |

Multiple breakdowns can be combined (e.g. `age,gender`).

### Date Presets

`today`, `yesterday`, `last_3d`, `last_7d`, `last_14d`, `last_28d`, `last_30d`, `last_90d`, `this_week_mon_today`, `this_week_sun_today`, `last_week_mon_sun`, `last_week_sun_sat`, `this_month`, `last_month`, `this_quarter`, `last_quarter`, `this_year`, `last_year`, `maximum`.

Alternatively, use `time_range` with `since` and `until` (YYYY-MM-DD) for custom date ranges.

### Time Increment

- `1` -- daily granularity
- `7` -- weekly granularity
- `monthly` -- monthly granularity

### Attribution Windows

Specify via `action_attribution_windows`:

- `1d_click` -- 1-day click
- `7d_click` -- 7-day click (default)
- `1d_view` -- 1-day view
- `28d_click` -- 28-day click

### Trend Chart Block Format

The trend block second series must match the campaign's primary metric — not always ROAS.

Sales campaign example:
```trend
{"title":"Daily Spend & ROAS (Last 7 Days)","yLabel":"$","series":[
  {"name":"Spend","data":[
    {"date":"Mar 18","value":"120.50"},{"date":"Mar 19","value":"135.20"},{"date":"Mar 20","value":"98.00"},
    {"date":"Mar 21","value":"145.30"},{"date":"Mar 22","value":"110.80"},{"date":"Mar 23","value":"128.90"},{"date":"Mar 24","value":"142.10"}
  ]},
  {"name":"ROAS","data":[
    {"date":"Mar 18","value":"2.8"},{"date":"Mar 19","value":"3.1"},{"date":"Mar 20","value":"2.2"},
    {"date":"Mar 21","value":"3.5"},{"date":"Mar 22","value":"2.9"},{"date":"Mar 23","value":"3.0"},{"date":"Mar 24","value":"3.3"}
  ]}
]}
```

WhatsApp campaign example:
```trend
{"title":"Daily Spend & Conversations (Last 7 Days)","yLabel":"$","series":[
  {"name":"Spend","data":[
    {"date":"Mar 18","value":"240"},{"date":"Mar 19","value":"260"},{"date":"Mar 20","value":"190"},
    {"date":"Mar 21","value":"280"},{"date":"Mar 22","value":"220"},{"date":"Mar 23","value":"250"},{"date":"Mar 24","value":"270"}
  ]},
  {"name":"Conversations","data":[
    {"date":"Mar 18","value":"3"},{"date":"Mar 19","value":"2"},{"date":"Mar 20","value":"1"},
    {"date":"Mar 21","value":"2"},{"date":"Mar 22","value":"1"},{"date":"Mar 23","value":"2"},{"date":"Mar 24","value":"1"}
  ]}
]}
```

- Use SHORT date labels (e.g., "Mar 18", "Mon", "Week 1") -- not full ISO dates
- Multi-series: include 2-3 lines max for readability
- ALWAYS output a trend block when showing 7+ days of data

### Insights Card Format

Every analysis MUST include an `insights` block in this exact structure:

```insights
[
  { "metric": "PRIMARY_METRIC_LABEL", "value": CURRENT_VALUE, "prev": PREV_VALUE, "trend": "±X%", "status": "ok|warning|critical|positive" },
  { "metric": "Spend", "value": CURRENT_SPEND, "prev": PREV_SPEND, "trend": "±X%", "status": "ok|warning|critical|positive" }
]
```

**Status mapping:**

| Status | Meaning | Icon shown in UI |
|---|---|---|
| `ok` | Within normal range or < 10% change in bad direction | 🟢 |
| `warning` | 10–25% deterioration (cost rising / volume falling) | 🟡 |
| `critical` | > 25% deterioration or absolute threshold breach | 🚨 |
| `positive` | > 10% improvement (cost falling / volume rising) | ✅ |

**When no previous period data is available** (e.g. first-ever report, campaign < 7 days old):
- Omit `prev` and `trend` fields.
- Set `status` based on absolute thresholds from the Strategic Handoff Summary section.

### Special Block Types

- **`budget`** -- donut pie chart + allocation (for budget analysis)
- **`comparison`** -- period-over-period comparison (for WoW, MoM reports)
- **`funnel`** -- drop-off between stages (for funnel analysis)
- **`score`** -- audit scorecard (for account health checks)
- **`copyvariations`** -- suggested ad copy based on winners

---

## Important Rules

- NEVER say "I'll analyze" or "Let me look" -- just call the tools and present results
- If a tool returns an error, explain it briefly and continue with available data
- Always convert API amounts from cents to dollars (divide by 100)
- Always calculate derived metrics appropriate to the goal (CTR always; ROAS only for purchase campaigns; CPL for lead campaigns; cost per conversation for messaging campaigns) — don't just show raw numbers
- For comparison reports, calculate % change and use trend indicators (up/down)
- Include SPECIFIC dollar amounts in recommendations ("shift $50/day from Campaign X to Campaign Y")
- ALWAYS include a `trend` block for any report spanning 7+ days
- Do NOT suggest "Open Report Canvas" -- all charts and data render inline in chat
- For large accounts, prioritize ACTIVE campaigns and limit to top 10-15 by spend
- If no data for the requested period, say so clearly and suggest a different date range
- If no ad account is selected, say: "Select an ad account from the sidebar to get started."
- **Data freshness:** Always note that conversions from the last 48 hours may be incomplete due to Meta's attribution window

### Contextual Quick Replies Rules

Quick replies MUST be contextual based on findings AND the campaign's primary goal:
- High cost per primary result (conversation/lead/purchase) -> "Review audience targeting" or "Reallocate budget"
- Creative fatigue detected -> "Refresh creatives" or "Generate new copy"
- Budget uneven -> "Apply budget rebalance"
- Low cost per primary result + low budget -> "Scale top campaigns" or "Duplicate winners"
- Always include at least one "drill deeper" option
- Always include one "take action" option that leads to a strategic skill
- NEVER include "Improve ROAS" as a quickreply for messaging or lead gen campaigns
