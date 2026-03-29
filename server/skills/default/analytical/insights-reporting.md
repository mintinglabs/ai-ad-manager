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

### Step -1 -- Intent-Aware Scenario Routing (FIRST — before any tool call)

Read the user's message and classify it into ONE of 4 scenarios. The scenario determines the entire layout — do NOT ask, infer and proceed.

---

#### SCENARIO A — 預算配比效率 (Budget Allocation Efficiency)
**Triggers:** "最近點？", "how are my ads doing", "show performance", "overview", "last 7 days", "點樣", "overall", "summary", any general check-in

**Strategic lens:** Is the funnel top-heavy? Where does money actually produce results vs burn budget? Analyse spend efficiency across goal types.

**Chat output (🚦 → 🧠 → ⚡):**
1. 🚦 Executive Briefing — overall account status with dominant diagnostic label. State total spend, key wins/losses.
2. 🧠 Strategic Deep-Dive — **Budget Efficiency Analysis**: For each goal type, compute `spend_share = goal_spend / total_spend` and `result_share = goal_results / total_results_value`. Highlight imbalances: "Awareness consumes 41% of budget but feeds no trackable conversion — is this intentional brand investment or unoptimised spend?" Explain inter-goal dynamics.
3. ⚡ Action Plan — `steps` block with prioritised reallocation or pause actions.
4. `quickreplies` — dynamic based on worst finding

**Canvas output (formal report):**
- `budget` block — spend allocation donut by goal type (hero visual)
- `comparison` block — WoW per goal type
- Goal summary table — one row per goal, with diagnostic Status column
- Per-campaign detail table — all campaigns sorted by status severity
- `insights` block — top 3 findings, severity-coded

---

#### SCENARIO B — 素材 vs 市場 (Creative vs Market Diagnosis)
**Triggers:** "點解咁貴？", "why is cost high", "why is CPM up", "analyse this campaign", "what's wrong with", "diagnose", "點解差", "問題", "performance drop", "why are results down"

**Strategic lens:** Is CPA rising because of Creative Decay (ad fatigue) or Auction Pressure (market cost increase)? Walk through the causal evidence chain — never just state a label without proof.

**Chat output (🚦 → 🧠 → ⚡):**
1. 🚦 Executive Briefing — state the dominant diagnosis with evidence: "⚔️ Auction Pressure detected — CPM up +18% while CTR holds at 2.1%"
2. 🧠 Strategic Deep-Dive — **Causal Chain Analysis**: Walk through the evidence step by step:
   - "CPA rose +22% this week to $181/conv (30d baseline: $148)."
   - "Hypothesis 1 — Creative Decay: CTR dropped only -3%, frequency at 2.1 (below 2.5 threshold). Verdict: Minor factor at most."
   - "Hypothesis 2 — Auction Pressure: CPM jumped +18% from $540 to $637. CTR stable means the audience is still engaging, but each impression costs more. Verdict: PRIMARY driver."
   - "Conclusion: This is a market-driven cost increase. Refreshing creative will not solve it. Adjusting bid strategy or shifting to lower-competition placements will."
3. ⚡ Action Plan — specific bid/schedule/placement adjustments
4. `quickreplies` — diagnosis-specific

**Canvas output (formal report):**
- `comparison` block — CTR / CPM / CPA / Frequency this week vs last week
- Detailed campaign table with diagnostic status per campaign:
  | Campaign | Spend | CPA | CTR | CPM | Freq | Status |
  |---|---|---|---|---|---|---|
  | IG 雙效燃脂 | $699 | $233 | 1.8% | $497 | 2.8 | ⚠️ 創意衰退 |
  | FB 瘦咗肥唔返 | $1,678 | $168 | 2.4% | $644 | 1.5 | ⚔️ 競爭加劇 |
- `insights` block — 3 findings with fix actions

---

#### SCENARIO C — 資本損耗 (Capital Hemorrhage / Stop Loss)
**Triggers:** "有咩要熄？", "what should I pause", "worst performers", "losing money", "stop loss", "kill the bad ones", "邊個最差", "熄咗佢"

**Strategic lens:** Quantify capital hemorrhage. Identify "vampire ads" burning money with 0 conversions. Calculate exact Waste Amount. Generate a kill list.

**Chat output (🚦 → 🧠 → ⚡):**
1. 🚦 Executive Briefing — "🚨 **$X total capital hemorrhage detected** — [N] vampire campaigns with zero conversions burning $Y, plus [M] campaigns overspending $Z above baseline"
2. 🧠 Strategic Deep-Dive — **Hemorrhage Breakdown**:
   - **Vampire Ads (🚨 Budget Leaking):** Campaigns with spend > 0 and 0 results. Calculate `Waste Amount = total spend on 0-result campaigns`. Explain why each is failing (targeting? tracking? creative?).
   - **Overspending Campaigns (⚠️/⚔️):** For campaigns above baseline, calculate `Excess Cost = (actual_CPA - baseline_CPA) × result_count`. This is money spent above what the account normally pays.
   - **Total Hemorrhage = Waste Amount + Excess Cost**
3. ⚡ Action Plan — kill list as `steps` block: "Step 1: Pause [vampire campaign] — saving $X/week", etc.
4. `quickreplies` — ["🛑 Pause all vampire campaigns", "🛑 Pause [worst name]", "Set budget cap instead", "Show why they're failing"]

**Canvas output (formal report):**
- Kill list table sorted worst → best, ALL goals combined:
  | Campaign | Goal | Spend | Results | Cost/Result | vs Baseline | Waste/Excess | Status | Action |
  |---|---|---|---|---|---|---|---|---|
  | IG 雙效燃脂 | WhatsApp | $699 | 0 | — | — | $699 waste | 🚨 預算流失 | 🛑 Pause |
  | IG 瘦咗肥唔返 | WhatsApp | $1,571 | 8 conv | $196 | +32% | $384 excess | ⚠️ 創意衰退 | ✂️ Cut 30% |
- `insights` block — hemorrhage summary

---

#### SCENARIO D — 邊際紅利 (Marginal Returns / Scale Up)
**Triggers:** "邊個好？", "which should I scale", "add budget", "best performers", "加錢", "scale up", "double down", "top performers", "邊個可以加錢"

**Strategic lens:** Find low-frequency, low-CPA winners with scaling room. Predict post-scaling returns. Quantify the marginal opportunity.

**Chat output (🚦 → 🧠 → ⚡):**
1. 🚦 Executive Briefing — "🚀 **[N] campaigns with scaling headroom** — [best goal] delivering at [cost/result], [X]% below baseline with frequency only [Y]"
2. 🧠 Strategic Deep-Dive — **Marginal Returns Projection**: For each winner:
   - Current: $X budget → Y results at $Z/result, frequency W
   - Projected at +50%: $X×1.5 budget → ~Y×1.4 results at ~$Z×1.07/result (assuming 5-10% CPA increase from frequency lift)
   - Headroom: "Frequency at 1.8 with threshold at 2.5 = room for ~40% more impressions before saturation"
   - Warning threshold: "If frequency exceeds 2.5 post-scale, expect diminishing returns — set automated rule to alert"
3. ⚡ Action Plan — scaling `steps` with specific budget amounts per campaign
4. `quickreplies` — ["🚀 Scale [best campaign] +50%", "🟢 Scale all winners +20%", "Set auto-pause if freq > 2.5", "Show audience size first"]

**Canvas output (formal report):**
- Winners table sorted best → worst cost/result:
  | Campaign | Goal | Spend | Cost/Result | vs Baseline | Freq | Projected +50% Results | Action |
  |---|---|---|---|---|---|---|---|
  | 🚀 FB 雙效燃脂 Photo | WhatsApp | $419 | $140/conv | −17% | 1.8 | +2.1 conv/week | 🚀 +50% budget |
  | 🚀 FB 瘦咗肥唔返 Reels | WhatsApp | $1,678 | $155/conv | −8% | 2.1 | +3.8 conv/week | 🟢 +20% budget |
  Scale eligibility: 🚀 = >20% below baseline AND freq < 2.5. Exclude campaigns with freq > 2.5.
- `insights` block — scaling opportunities

---

#### Default if unclear → Scenario A (預算配比效率)

---

**GLOBAL RULES (apply across ALL scenarios):**

1. **Messaging/WhatsApp campaigns:** NEVER show ROAS. Only show CPA (Cost/Conv), CTR, CPM, Frequency.
2. **WoW delta mandatory:** Every metric shown must include % change vs previous period (🟢/🟡/🔴). Fetch both periods in parallel.
3. **Dynamic Quickreplies** — buttons must reflect the diagnostic status, not generic labels:

| Diagnostic Status | Quickreply buttons to include |
|---|---|
| 🚨 預算流失警告 | "🛑 Pause [vampire campaign]", "💸 Show total wasted amount" |
| ⚠️ 創意吸引力衰退 | "🎨 Refresh creative for [campaign]", "📊 Show frequency breakdown" |
| ⚔️ 流量競爭加劇 | "💰 Adjust bid strategy", "🕐 Check scheduling windows" |
| ⚖️ 表現穩定運行 | "📅 Compare last 30 days", "🎯 Check audience overlap" |
| 🚀 爆發增長模式 | "🚀 Scale [best campaign] +50%", "📈 Project results at higher budget" |

4. **Strip campaign name prefixes** — never show "Sales_Wts_IG_Retargeting_Onda Pro_". Show only the meaningful part: "IG 雙效燃脂 Carousel", "FB 瘦咗肥唔返 Reels".

---

### Step 0 -- Detect Goal & Select Primary Metric

**0a. Run these in parallel — never wait sequentially:**

```
get_campaigns()
get_account_insights(date_preset: "last_7d")
```

Note: `get_ad_sets()` is NOT needed here for goal classification. `get_object_insights(level="campaign")` in Step 1 returns each row with `optimization_goal` pre-joined. Only call `get_ad_sets` if you need targeting/budget details for a specific drill-down.

**0b. `optimization_goal` is pre-joined into the API response — use it directly.**
- When you call `get_object_insights` with `level=campaign`, each campaign row already contains an `optimization_goal` field (e.g. `CONVERSATIONS`, `THRUPLAY`, `OFFSITE_CONVERSIONS`, `LINK_CLICKS`, `PROFILE_VISIT`). This is fetched from the ad set level automatically by the tool — you do NOT need to call `get_ad_sets` separately for goal classification.
- NEVER use campaign `objective` alone — it is wrong for mixed-destination campaigns.
- NEVER infer the goal from the campaign name (e.g., "Sales_Wts_" does not mean ROAS).
- A campaign with `objective = OUTCOME_SALES` + WhatsApp destination has `optimization_goal = CONVERSATIONS` → treat it as a **Messaging** campaign, show Cost per Conversation, not ROAS or CPL.
- Use the `optimization_goal` field from each row directly — never guess or override it.

Map each row's `optimization_goal` to its primary metric using table 0c below.

**0c. Map to primary metric using this table:**

| optimization_goal | Primary Metric | Primary Action Type | Label |
|---|---|---|---|
| `CONVERSATIONS` (WhatsApp / Messenger / IG DM) | Cost per Conversation | `onsite_conversion.messaging_conversation_started_7d` | Cost per Conversation |
| `LEAD_GENERATION` | CPL | `lead` or `onsite_conversion.lead_grouped` | Cost per Lead |
| `OFFSITE_CONVERSIONS` — purchase event | ROAS + CPA | `purchase` / `offsite_conversion.fb_pixel_purchase` | ROAS & Cost per Purchase |
| `OFFSITE_CONVERSIONS` — lead event | CPL | `offsite_conversion.fb_pixel_lead` | Cost per Lead |
| `OFFSITE_CONVERSIONS` — view_content event | Cost per View Content | `offsite_conversion.fb_pixel_view_content` | Cost per View Content |
| `OFFSITE_CONVERSIONS` — other/unknown event | Cost per Landing Page View | `landing_page_view` (fallback) | Cost per Landing Page View |
| `LINK_CLICKS` | CPC + CTR | `link_click` | Cost per Click |
| `LANDING_PAGE_VIEWS` | Cost per LPV | `landing_page_view` | Cost per Landing Page View |
| `PROFILE_VISIT` (IG Traffic) | Cost per Profile Visit | `link_click` (proxy — Meta does not expose profile_visit in actions array) | Cost per Click |
| `REACH` | CPM + Reach | reach + impressions | CPM & Reach |
| `THRUPLAY` | Cost per ThruPlay | `video_thruplay_watched_actions` | Cost per ThruPlay |
| `VIDEO_VIEWS` | Cost per View | `video_view` | Cost per View |
| `POST_ENGAGEMENT` | CPE | `post_engagement` | Cost per Engagement |
| `APP_INSTALLS` | CPI | `mobile_app_install` | Cost per Install |
| `VALUE` | ROAS | `purchase` + `action_values` | ROAS |

**OFFSITE_CONVERSIONS detection rule:** `promoted_object` may be null (Meta API does not always return it). Instead, check the `actions` array from the insights response:
- Contains `offsite_conversion.fb_pixel_purchase` → purchase event
- Contains `offsite_conversion.fb_pixel_lead` → lead event
- Contains `offsite_conversion.fb_pixel_view_content` → view_content event
- None of the above → fall back to `landing_page_view`

**PROFILE_VISIT note:** Meta does not include IG profile visits in the `actions` array. Use `link_click` as the primary metric and label it "Clicks to Profile". CTR and CPM are the most meaningful secondary metrics for this goal.

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
- Baseline period: `since = TODAY minus 30 days`, `until = TODAY minus 1 day`

**ALWAYS use account-level + level=campaign — NEVER call get_object_insights per campaign ID.**

**CRITICAL: NEVER use `date_preset` with level=campaign — it returns empty data from Meta API. ALWAYS compute explicit `since` and `until` dates from TODAY.**

Call **exactly 3 calls in parallel**:

```
// Current 7-day period
get_object_insights(
  object_id: "[act_xxx account ID from workflow context]",
  level: "campaign",
  since: "[TODAY minus 7 days as YYYY-MM-DD]",
  until: "[TODAY minus 1 day as YYYY-MM-DD]",
  fields: "campaign_id,campaign_name,spend,impressions,clicks,ctr,cpm,reach,frequency,actions,cost_per_action_type,video_thruplay_watched_actions,action_values,purchase_roas"
)

// Previous 7-day period (for WoW comparison)
get_object_insights(
  object_id: "[act_xxx account ID]",
  level: "campaign",
  since: "[TODAY minus 14 days as YYYY-MM-DD]",
  until: "[TODAY minus 8 days as YYYY-MM-DD]",
  fields: same
)

// 30-day baseline (for self-benchmarking)
get_object_insights(
  object_id: "[act_xxx account ID]",
  level: "campaign",
  since: "[TODAY minus 30 days as YYYY-MM-DD]",
  until: "[TODAY minus 1 day as YYYY-MM-DD]",
  fields: same,
  include_benchmarks: true
)
```

The 30-day call returns `{ data: [...], _benchmarks: {...} }`. The `_benchmarks` object contains per-goal aggregated baselines computed server-side:
- `avg_cost_per_result`: 30-day average cost/result for all campaigns with that goal
- `total_spend`, `total_results`, `campaign_count`: aggregates for context
- `primary_action_type`: the action type used for counting results

**Use `_benchmarks` as the evaluation baseline in Step 2 — NEVER compute averages yourself.**

**If the result is empty:** do NOT say "permissions error". The cause is using date_preset instead of since/until. Retry with explicit dates.

**Do NOT loop over campaign IDs and call get_object_insights once per campaign.** That fetches partial data (misses campaigns) and makes unnecessary API calls.

**Do NOT use `get_account_insights` to derive primary metrics.** The account-level endpoint aggregates all action types — numbers will be wrong for goal-specific metrics.

Each campaign row already includes `optimization_goal` (pre-joined by the tool). Use it directly to classify campaigns into goal groups — no manual join needed.

> **Trend requirement:** Dual-period fetch is mandatory for all 7-day+ reports. Compute % delta in Step 2.
> **No previous data:** If previous period returns $0 spend or no data, skip WoW delta — omit `prev` and `trend` fields. Use baseline-relative evaluation only (`_benchmarks` from 30d call).
> **Data freshness:** Meta has up to a 48-hour attribution window. Note this once per report at the bottom.

---

### Step 2 -- Multi-Signal Diagnostic Evaluation

**禁絕「需調整」「underperforming」等罐頭詞。** Every campaign MUST receive a specific diagnostic status that names the ROOT CAUSE — not just good/bad.

**2a. Compute 5 signals per campaign**

From the 3 API calls (current 7d, previous 7d, 30d baseline with `_benchmarks`):

```
cpa_deviation_pct = ((campaign_cost_per_result - _benchmarks[goal].avg_cost_per_result) / _benchmarks[goal].avg_cost_per_result) * 100
ctr_delta_pct    = ((current_ctr - prev_ctr) / prev_ctr) * 100
cpm_delta_pct    = ((current_cpm - prev_cpm) / prev_cpm) * 100
frequency        = current period absolute value
result_count     = current period primary result count (0 vs >0)
```

**2b. Diagnostic decision tree (first match wins)**

| # | Status | Condition | Root Cause | Action |
|---|---|---|---|---|
| 1 | 🚨 預算流失警告 (Budget Leaking) | spend > 0 AND result_count == 0 | Funnel completely broken — spend with zero conversions | Pause immediately, check pixel/tracking |
| 2 | ⚠️ 創意吸引力衰退 (Creative Decay) | cpa_deviation_pct > +20% AND ctr_delta_pct < -10% AND frequency > 2.5 | Audience seeing same creative too often, engagement dropping | Refresh creative, rotate ad sets |
| 3 | ⚔️ 流量競爭加劇 (Auction Pressure) | cpa_deviation_pct > +20% AND ctr_delta_pct ≥ -10% (stable) AND cpm_delta_pct > +15% | Market auction costs rising — not a creative problem | Adjust bid strategy, check scheduling windows |
| 4 | ⚖️ 表現穩定運行 (Steady Performance) | cpa_deviation_pct within ±20% of baseline | On-target performance, harvesting phase | Maintain current setup |
| 5 | 🚀 爆發增長模式 (Growth Breakout) | cpa_deviation_pct < -20% AND ctr_delta_pct ≥ -5% (stable or improving) | Exceptional efficiency with strong engagement | Scale aggressively (+50% if freq < 2.5) |

**Additional status (not in tree — assigned separately):**
- 📊 數據積累中 (Insufficient Data): campaign has < 3 days of data or < $10 spend → skip diagnosis entirely, note "too early for diagnosis"

**2c. Edge cases**

- **No CTR data** (awareness/reach goals with THRUPLAY or REACH): Skip CTR-dependent checks (statuses 2 and 3). Use CPA deviation + frequency only: CPA >20% above + freq >3 = ⚠️ Creative Decay; CPA >20% above + freq ≤3 = ⚔️ Auction Pressure; CPA ±20% = ⚖️ Steady; CPA <-20% = 🚀 Breakout.
- **No CPA** (THRUPLAY/REACH goals): Use cost_per_thruplay or CPM as the primary cost metric. `_benchmarks[goal]` already computes per-goal baselines using the correct metric.
- **No previous period data** (WoW unavailable): Cannot compute ctr_delta_pct or cpm_delta_pct. Fall back: results==0 → 🚨 Budget Leaking; CPA >20% above → ⚠️ Creative Decay (default assumption); CPA ±20% → ⚖️ Steady; CPA <-20% → 🚀 Breakout.
- **`_benchmarks[goal]` missing** (no 30d data for this goal): Use WoW cost/result change as proxy for CPA deviation. If WoW also unavailable, assign ⚖️ Steady with note "insufficient baseline data".
- **`avg_cost_per_result` is null** (spend but 0 results in 30d): Flag as 🚨 "Zero results in 30 days — fundamental targeting or tracking issue".
- **$0 spend in current 7d**: Skip evaluation entirely.

**2d. Frequency signal (independent input, feeds into diagnostic)**

| Frequency | Signal |
|---|---|
| ≤ 3 | ✅ Healthy reach — room to scale |
| 3–5 | ⚠️ Saturation approaching — creative rotation recommended |
| > 5 | 🔴 Audience saturated — must pause or refresh |

Frequency is an INPUT to the decision tree (contributes to Creative Decay diagnosis at >2.5) and also reported independently in campaign tables.

**2e. Parse metrics from API response**

- Extract primary result count: `actions.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
- Extract primary cost: `cost_per_action_type.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
- For ROAS only (OFFSITE_CONVERSIONS + PURCHASE / VALUE): `purchase_roas[0]?.value` or `action_values / spend`

**Never use total `actions` count as "conversions" — always filter by the specific action_type for this campaign's goal.**

---

### Step 3 -- Dual-Stream Output (Chat Briefing + Canvas Report)

**Every response has TWO streams.** Chat = strategic text (no data blocks). Canvas = formal report (all data blocks + tables). The UI auto-separates them via `splitChatAndCanvas()`.

**⚡ STREAMING-FIRST RULE: Start outputting the Chat briefing IMMEDIATELY.** Do not pre-compute every campaign's diagnostic status before writing. Use account-level totals first (total spend, total results, average CPA from `_benchmarks`), write the Executive Briefing headline, then elaborate as you process campaign details. The user must see text appearing within seconds — not a blank screen for 30 seconds.

---

#### STREAM 1 — Chat Strategic Briefing (left panel)

Output these sections in order. Data blocks (`metrics`, `budget`, `comparison`, `trend`, `funnel`, `adpreview`) and markdown tables are FORBIDDEN in the chat stream — they belong in the Canvas stream only.

**1. 🚦 Executive Briefing** — `### 🚦 [Status Emoji + Label] 執行官簡報` — **OUTPUT THIS FIRST, IMMEDIATELY**

One bold headline sentence using the account's dominant diagnostic status, followed by 1-2 paragraphs explaining the situation with key numbers in **bold**. Start with headline numbers from account-level data before diving into per-campaign analysis.

Examples:
- ### 🚦 ⚔️ 流量競爭加劇 執行官簡報
  **本週總支出 $16,331，WhatsApp 對話成本升至 $181/conv（30 天基準：$148，偏離 +22%）。** CPM 飆升 +18% 但 CTR 持穩於 2.1%，確認係市場競價壓力而非素材問題。同時，Awareness 佔預算 41% 但無法追蹤轉化回報。

- ### 🚦 🚀 爆發增長模式 執行官簡報
  **WhatsApp 廣告進入爆發期 — 28 conversations at $140/conv，比 30 天基準低 17%。** FB Retargeting Photo 係最平嘅廣告，頻率僅 1.8，仲有大量 scale 空間。

**2. 🧠 Strategic Deep-Dive** — `### 🧠 顧問戰略深挖（指標聯動分析）`

Long, deep causal analysis. **NO length limit.** Walk through logic chain with `####` sub-headers. Content depends on scenario:

- **Scenario A:** Budget allocation efficiency — spend_share vs result_share per goal, funnel imbalances, inter-goal dynamics
- **Scenario B:** Causal chain — evidence for/against Creative Decay vs Auction Pressure, hypothesis testing with specific numbers
- **Scenario C:** Hemorrhage breakdown — vampire ads quantified, excess cost calculated, root cause per failing campaign
- **Scenario D:** Marginal returns projection — per-winner scaling estimate, frequency headroom, diminishing returns warning

Rules:
- Explain the "why" behind every number — do not list metrics without causal interpretation
- Use `####` sub-headers to structure analysis (e.g., "#### 預算效率分析", "#### 因果鏈推導", "#### 吸血鬼廣告拆解")
- Reference specific campaign names and exact numbers throughout
- Compare against `_benchmarks[goal].avg_cost_per_result` with explicit deviation %

**3. ⚡ Action Plan** — `### ⚡ 建議 Action Plan`

```steps
[
  { "number": 1, "title": "[Action with specific campaign name]", "desc": "[Expected outcome with numbers]" },
  { "number": 2, "title": "[Action]", "desc": "[Expected outcome]" },
  { "number": 3, "title": "[Action]", "desc": "[Expected outcome]" }
]
```

Note: `steps` is NOT in CANVAS_BLOCK_NAMES, so it stays in chat.

**4. `insights` block** — top 3 findings, severity-coded with diagnostic status. Each must include an `action` button:

```insights
[
  { "severity": "critical", "title": "[Diagnostic status + issue]", "desc": "[Root cause with numbers]", "action": "[Fix label]" },
  { "severity": "warning", "title": "[Diagnostic status + issue]", "desc": "[Root cause with numbers]", "action": "[Action label]" },
  { "severity": "success", "title": "[Diagnostic status + opportunity]", "desc": "[Numbers + projection]", "action": "[Scale label]" }
]
```

Note: `insights` is NOT in CANVAS_BLOCK_NAMES, so it stays in chat (interactive action buttons).

**5. `quickreplies`** — always 4 buttons, mapped to diagnostic status:

| Dominant Status | Button 1 | Button 2 | Button 3 | Button 4 |
|---|---|---|---|---|
| 🚨 Budget Leaking | "🛑 Pause [vampire campaign]" | "Show all 0-result campaigns" | "Check pixel/tracking" | "Back to overview" |
| ⚠️ Creative Decay | "🎨 Refresh creative for [campaign]" | "Show frequency breakdown" | "Scale best performers" | "Compare last 30 days" |
| ⚔️ Auction Pressure | "💰 Adjust bid strategy" | "Check scheduling windows" | "Show CPM trend" | "Compare placements" |
| ⚖️ Steady | "Show all [N] [Goal] campaigns" | "Compare last 30 days" | "Check audience overlap" | "Scale best performers" |
| 🚀 Growth Breakout | "🚀 Scale [campaign] +50%" | "Scale all winners +20%" | "Set auto-pause if freq > 2.5" | "Show audience size" |

---

#### STREAM 2 — Canvas Formal Audit Report (right panel)

After the chat sections, emit data blocks and tables. These get auto-stripped from chat by `splitChatAndCanvas()` and rendered in the canvas panel.

**IMPORTANT: Only use block types in CANVAS_BLOCK_NAMES (`metrics`, `budget`, `comparison`, `trend`, `funnel`, `adpreview`) and markdown tables in this section.** Other blocks (`insights`, `steps`, `quickreplies`) and plain text will NOT be stripped and would bleed into chat. Keep text between blocks to an absolute minimum — one short label line before each block is acceptable.

**KPI summary:**
```metrics
[
  { "label": "Total Spend", "value": "$[amount]", "trend": "[+/-]% vs last week" },
  { "label": "[Primary Goal] Results", "value": "[count] [unit]", "trend": "[+/-]%" },
  { "label": "[Primary Goal] Cost/Result", "value": "$[amount]", "trend": "[+/-]%" },
  { "label": "Active Campaigns", "value": "[N]" }
]
```

```budget
{
  "title": "7-Day Spend by Goal — [Account Name]",
  "total_budget": "$[total]",
  "items": [
    { "name": "📱 WhatsApp", "spend": [amount], "percentage": [%] },
    { "name": "🎬 Awareness", "spend": [amount], "percentage": [%] }
  ]
}
```

```comparison
{
  "title": "[since]–[until] vs [prev_since]–[prev_until]",
  "a_label": "This Week",
  "b_label": "Last Week",
  "metrics": [
    { "label": "[Goal primary metric]", "a": [current], "b": [prev] }
  ]
}
```

| Goal | Campaigns | Spend | Results | Cost/Result | Status | vs Last Week |
|---|---|---|---|---|---|---|
| 📱 WhatsApp | 5 | $5,064 | 28 conv | $181/conv | ⚔️ 競爭加劇 | +22% |
| 🎬 Awareness | 6 | $6,620 | 12,361 thruplay | $0.54/play | ⚖️ 穩定運行 | +5% |

Goal labels: CONVERSATIONS → 📱 WhatsApp, THRUPLAY → 🎬 Awareness, OFFSITE_CONVERSIONS view_content → 🖱️ View Content, PROFILE_VISIT → 👤 IG Traffic, LEAD_GENERATION → 📋 Leads, OFFSITE_CONVERSIONS purchase → 🛒 Sales. Goal-group status = most severe diagnostic among its campaigns.

| Campaign | Goal | Spend | Results | Cost/Result | CPM | CTR | Freq | Status |
|---|---|---|---|---|---|---|---|---|
| IG 雙效燃脂 | WhatsApp | $699 | 0 | — | $497 | 1.8% | 2.8 | 🚨 預算流失 |
| IG 瘦咗肥唔返 | WhatsApp | $1,571 | 8 conv | $196 | $583 | 2.1% | 2.3 | ⚠️ 創意衰退 |
| FB 瘦咗肥唔返 | WhatsApp | $1,678 | 10 conv | $168 | $644 | 2.4% | 1.5 | 🚀 爆發增長 |

Rules:
- Each row uses the campaign's INDIVIDUAL diagnostic status from Step 2
- Strip naming prefixes — show only meaningful part ≤ 35 chars
- Never add a ROAS column unless goal = VALUE / OFFSITE_CONVERSIONS purchase
- Sort by status severity: 🚨 first → ⚠️ → ⚔️ → ⚖️ → 🚀 last

---

#### DRILL-DOWN: When user asks "Show all [N] [Goal] campaigns"

**Chat:** Brief diagnostic commentary on this goal group + `steps` with top 1-2 actions + `quickreplies`.

**Canvas:** Ranked table for that goal only, sorted worst → best by cost/result, with diagnostic status:

| Campaign | Spend | Results | Cost/Result | CPM | CTR | Freq | Status |
|---|---|---|---|---|---|---|---|
| IG 雙效燃脂 Carousel | $699 | 3 conv | $233/conv | $497 | 1.8% | 2.8 | ⚠️ 創意衰退 |
| IG 瘦咗肥唔返 Reels | $1,571 | 8 conv | $196/conv | $583 | 2.1% | 2.3 | ⚔️ 競爭加劇 |
| FB 瘦咗肥唔返 Reels | $1,678 | 10 conv | $168/conv | $644 | 2.4% | 1.5 | ⚖️ 穩定運行 |
| FB 雙效燃脂 Photo | $419 | 3 conv | $140/conv | $419 | 2.6% | 1.8 | 🚀 爆發增長 |

Rules:
- Sort by cost/result descending (most expensive = worst = top row)
- Use campaign's INDIVIDUAL diagnostic status — never generic labels like "Pause candidate" or "Monitor"
- Follow with `quickreplies`: ["🛑 Pause [worst campaign]", "🚀 Scale [best campaign]", "🎨 Show creative breakdown", "Back to overview"]

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
- **Round 1 (parallel):** `get_campaigns` + `get_account_insights(last_7d)` + `get_account_insights(last_14d)`
- **Round 2 (parallel):** `get_object_insights(level="campaign", current 7d)` + `get_object_insights(level="campaign", previous 7d)` — each row includes pre-joined `optimization_goal`
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
- **Round 1 (parallel):** `get_campaigns` + `get_account_insights(this_month)` + `get_account_insights(last_month)`
- **Round 2 (parallel):** `get_object_insights(level="campaign", this_month)` + `get_object_insights(level="campaign", last_month)` — each row includes pre-joined `optimization_goal`
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
1. `get_object_insights(level="campaign", last_7d)` — each row includes pre-joined `optimization_goal`. No need for separate `get_ad_sets` call for goal detection.
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
1. `get_object_insights(level="campaign", last_7d)` — each row includes pre-joined `optimization_goal`. Calculate PRIMARY metric cost per campaign using the goal from the row.
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
- **Round 1 (parallel):** `get_campaigns` + `get_ads` + `get_pixels` + `get_account_insights(last_30d)`
- **Round 2 (parallel):** `get_object_insights(level="campaign", last_30d)` — each row includes pre-joined `optimization_goal`
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

**All evaluations use the multi-signal diagnostic decision tree from Step 2.** The diagnostic status determines the recommended skill:

| Diagnostic Status | Root Cause | Action | Recommended Skill |
|---|---|---|---|
| 🚨 預算流失警告 | Funnel broken — spend with 0 results | Pause immediately, diagnose tracking | `tracking-conversions` → `campaign-manager` |
| ⚠️ 創意吸引力衰退 | Ad fatigue — CTR↓ + freq > 2.5 | Refresh creative, rotate ad sets | `creative-manager` |
| ⚔️ 流量競爭加劇 | Market costs rising — CPM↑ + CTR stable | Adjust bid/schedule/placement | `campaign-manager` |
| ⚖️ 表現穩定運行 | On-target, harvesting phase | Maintain, monitor weekly | — |
| 🚀 爆發增長模式 | Exceptional efficiency + strong engagement | Scale aggressively, test new audiences | `campaign-manager` + `targeting-audiences` |

### Goal-specific signals (supplement diagnostic status)

#### Messaging / WhatsApp (CONVERSATIONS)
| Finding | Severity | Skill |
|---|---|---|
| ⚠️ Creative Decay + worsening WoW | Critical — actively deteriorating | `targeting-audiences` -- audience too broad |
| Conversations < 5 in 7 days | Warning | `creative-manager` -- test new message creative |
| Frequency > 3 | Warning | `creative-manager` -- rotate creatives |

#### Lead Generation (LEAD_GENERATION)
| Finding | Severity | Skill |
|---|---|---|
| ⚠️/⚔️ status + lead volume dropping | Critical | `tracking-conversions` -- verify lead form or pixel |
| Frequency > 3 | Warning | `creative-manager` -- rotate creatives |
| CTR declining WoW | Warning | `creative-manager` -- creative refresh |

#### Sales / Purchase (OFFSITE_CONVERSIONS or VALUE)
| Finding | Severity | Skill |
|---|---|---|
| ROAS < 1x (absolute — regardless of baseline) | Critical | `campaign-manager` -- pause or restructure |
| ROAS < 1.5x | Warning | `campaign-manager` -- budget reallocation |
| 🚀 Growth Breakout + high ROAS + low budget | Opportunity | `campaign-manager` -- scale budget aggressively |
| Conversions dropping, spend stable | Warning | `tracking-conversions` -- verify pixel + attribution |

#### Traffic (LINK_CLICKS / LANDING_PAGE_VIEWS)
| Finding | Severity | Skill |
|---|---|---|
| CTR < 0.5% (absolute) | Warning | `creative-manager` -- creative not compelling |
| Landing page view rate < 60% of clicks | Warning | `tracking-conversions` -- check pixel + page speed |
| Frequency > 4 | Critical | `creative-manager` -- urgent new creative |

#### Awareness / Reach (REACH / THRUPLAY)
| Finding | Severity | Skill |
|---|---|---|
| Frequency > 5 | Critical | `creative-manager` -- audience saturated |
| Video completion rate < 20% | Warning | `creative-manager` -- hook is not working |
| ThruPlay rate < 15% | Warning | `creative-manager` -- video too long or weak opening |

### Universal (all campaign types)
| Finding | Severity | Skill |
|---|---|---|
| CTR declining WoW | Warning | `creative-manager` -- creative refresh |
| Audience overlap > 30% | Warning | `targeting-audiences` -- consolidate |
| Pixel firing errors | Critical | `tracking-conversions` -- fix pixel setup |
| Budget unevenly distributed | Warning | `campaign-manager` -- rebalance |
| Frequency > 3 + declining reach | Warning | `creative-manager` -- audience exhaustion |
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
| `warning` | 20-50% above 30d baseline, or 10-25% WoW deterioration | 🟡 |
| `critical` | >50% above 30d baseline, or >25% WoW deterioration | 🚨 |
| `positive` | 20-50% below baseline (outperforming) | ✅ |

**When no previous period data is available** (e.g. first-ever report, campaign < 7 days old):
- Omit `prev` and `trend` fields.
- Set `status` from baseline-relative evaluation only (`_benchmarks` from 30d call).

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
