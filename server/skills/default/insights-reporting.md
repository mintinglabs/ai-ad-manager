---
name: insights-reporting
description: Retrieve and analyze Facebook ad performance insights — account-level metrics, campaign/adset/ad-level insights with breakdowns by age, gender, country, device, and placement. Create async reports for large datasets. Use this skill whenever the user asks about ad performance, ROAS, spend, impressions, clicks, CTR, conversions, wants to see breakdowns/segmentation, compare time periods, or generate reports. Triggers for performance analysis, reporting, analytics, metrics, and data breakdowns.
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

## Metrics

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
| Video metrics      | `video_p25_watched_actions`, `video_p50_watched_actions`, `video_p75_watched_actions`, `video_p100_watched_actions`, `video_avg_time_watched_actions` |

## Breakdown Dimensions

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

## Date Presets

`today`, `yesterday`, `last_3d`, `last_7d`, `last_14d`, `last_28d`, `last_30d`, `last_90d`, `this_week_mon_today`, `this_week_sun_today`, `last_week_mon_sun`, `last_week_sun_sat`, `this_month`, `last_month`, `this_quarter`, `last_quarter`, `this_year`, `last_year`, `maximum`.

Alternatively, use `time_range` with `since` and `until` (YYYY-MM-DD) for custom date ranges.

## Time Increment

- `1` — daily granularity
- `7` — weekly granularity
- `monthly` — monthly granularity

## Attribution Windows

Specify via `action_attribution_windows`:

- `1d_click` — 1-day click
- `7d_click` — 7-day click (default)
- `1d_view` — 1-day view
- `28d_click` — 28-day click

## Report Generation Workflow

When the user asks for a report, audit, analysis, or performance review, follow this systematic approach. Reports require multiple API calls -- plan your tool calls carefully.

### 1. Gather ALL data first (call tools in sequence)
- **get_campaigns** -- get all campaigns with status, budget, objective, and last 7d performance
- **get_account_insights** with date_preset="last_7d" (or appropriate range) -- get account-level metrics
- **get_object_insights** for each active campaign ID -- get per-campaign detailed performance
- If needed: **get_ad_sets** and **get_object_insights** for each ad set breakdown
- If needed: **get_ads** and **get_object_insights** for each ad -- ad-level creative analysis

### 2. Cross-analyze the data
- Calculate ROAS = purchase_roas or (action_values / spend)
- Calculate CPA = spend / conversions (or cost_per_action_type)
- Compare periods: last 7d vs previous 7d for trend detection
- Identify winners (high ROAS, low CPA) and losers (low ROAS, high CPA, high frequency)
- Flag creative fatigue: frequency > 3 or declining CTR over time

### 3. Structure the output using rich cards
Follow this exact visual flow for reports:
1. **Bold headline** -- one sentence summary with key numbers
2. `metrics` block -- 4 hero KPI numbers (spend, ROAS, CTR, CPA or similar)
3. `trend` block -- day-by-day performance chart (ALWAYS include for any report covering 7+ days)
4. Markdown table -- campaign/ad set breakdown with all relevant columns
5. `insights` block -- what the data means + what needs attention (use severity levels)
6. `steps` block -- prioritized action plan with high/medium/low priorities
7. `quickreplies` block -- contextual follow-up actions based on findings

### 4. Trend chart block format
Use the `trend` block for any time-series data (daily spend, daily ROAS, daily CTR over time):

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

- Use SHORT date labels (e.g., "Mar 18", "Mon", "Week 1") -- not full ISO dates
- Multi-series: include 2-3 lines max for readability (e.g., Spend + ROAS, or CTR + CPC)
- ALWAYS output a trend block when showing 7+ days of data -- this is the primary way users see performance over time

### 5. Special report types
- **Budget analysis**: use `budget` card (shows donut pie chart + allocation)
- **Period comparison** (WoW, MoM): use `comparison` card + `trend` for daily breakdown
- **Funnel analysis**: use `funnel` card (shows drop-off between stages)
- **Account audit**: use `score` card + `insights` + `steps`
- **Time-series / daily trends**: use `trend` card (line chart)

### 6. Common report requests and required tool calls

**"Weekly Performance Report"**:
1. get_campaigns -> get_account_insights (last_7d) -> get_object_insights for top campaigns -> get_account_insights (last_14d for comparison)
2. Output: metrics -> **trend (daily spend + ROAS)** -> table -> comparison card -> insights -> steps -> quickreplies
3. Quickreplies: ["Drill into top campaign", "Creative breakdown", "Budget reallocation plan", "Compare to last month"]

**"Monthly Performance Report"**:
1. get_campaigns -> get_account_insights (this_month) -> get_account_insights (last_month for comparison) -> get_object_insights for top campaigns (this_month)
2. Output: metrics -> **trend (daily spend + ROAS for the month)** -> comparison card (this month vs last month) -> table -> insights -> steps -> quickreplies
3. Quickreplies: ["Weekly breakdown", "Top performing campaigns", "Budget optimization", "Creative analysis"]

**"Problems & Quick Wins"**:
1. get_campaigns -> get_object_insights for each active campaign (last_7d) -> get_ad_sets -> get_object_insights for low performers
2. Look for: declining ROAS, rising CPA, high frequency, audience overlap, inactive campaigns still spending
3. Output: headline -> insights (critical/warning/success) -> steps -> quickreplies
4. Quickreplies: ["Fix top issue now", "Pause underperformers", "Reallocate budget", "Creative refresh suggestions"]

**"Creative Performance Analysis"**:
1. get_ads -> get_object_insights for each ad (last_7d) -> get_ad_creative for top/bottom ads
2. Flag: frequency > 3, declining CTR, best vs worst performers
3. Output: metrics -> **trend (CTR + CPC over time)** -> table -> insights -> copyvariations (suggest new copy based on winners) -> quickreplies
4. Quickreplies: ["Generate new copy variations", "Pause fatigued ads", "Duplicate top performers", "Test new creative format"]

**"Budget Optimization Plan"**:
1. get_campaigns -> get_object_insights for each campaign (last_7d) -> calculate ROAS per campaign
2. Identify over/under-spending relative to ROAS
3. Output: budget card -> **trend (spend by campaign over time)** -> table with reallocation amounts -> steps -> quickreplies
4. Quickreplies: ["Apply these budget changes", "Show ROAS projections", "Scale top campaigns", "Create budget rules"]

**"Full Account Health Audit"**:
1. get_campaigns -> get_ad_sets -> get_ads -> get_pixels -> get_account_insights -> get_object_insights for active campaigns
2. Score: structure (naming, organization), budget efficiency, creative diversity, pixel setup, audience overlap
3. Output: score card -> **trend (overall account performance)** -> insights -> steps -> quickreplies
4. Quickreplies: ["Fix critical issues", "Optimize budget allocation", "Review creative performance", "Check audience overlap"]

**"Show me trends" / "How is performance trending?"**:
1. get_account_insights with date_preset (last_7d, last_14d, last_30d based on what user asks)
2. get_object_insights for top campaigns with daily breakdown
3. Output: metrics (current period) -> **trend (multi-line: spend, ROAS, CTR)** -> insights -> quickreplies
4. Quickreplies: ["Compare to previous period", "Breakdown by campaign", "Breakdown by placement", "Breakdown by age/gender"]

### 7. Contextual quick replies rules
Quick replies MUST be contextual -- based on what the report actually found:
- If low ROAS campaigns found -> include "Pause low performers" or "Reallocate budget"
- If creative fatigue detected -> include "Refresh creatives" or "Generate new copy"
- If budget is uneven -> include "Apply budget rebalance"
- If high performers found -> include "Scale top campaigns" or "Duplicate winners"
- Always include at least one "drill deeper" option (e.g., "Breakdown by ad set", "Creative analysis")
- Always include one "take action" option (e.g., "Apply changes", "Fix issues")

### 8. Important rules for report generation
- NEVER say "I'll analyze" or "Let me look" -- just call the tools and present results
- If a tool returns an error, explain it briefly and continue with available data
- Always convert API amounts from cents to dollars (divide by 100)
- Always calculate derived metrics (ROAS, CTR, CPA) -- don't just show raw numbers
- For comparison reports, calculate % change and use trend indicators (up/down)
- Include SPECIFIC dollar amounts in recommendations ("shift $50/day from Campaign X to Campaign Y")
- ALWAYS include a `trend` block for any report spanning 7+ days -- users need to see the visual trend line
- Do NOT suggest "Open Report Canvas" -- all charts and data render inline in chat

### 9. Handling slow/complex requests
- For large accounts with many campaigns, prioritize ACTIVE campaigns
- Limit to top 10-15 campaigns by spend to keep reports focused
- If the account has no data for the requested period, say so clearly and suggest a different date range
- If no ad account is selected, say: "Select an ad account from the sidebar to get started."
