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

Follow this systematic flow for every report request. Gather data first, analyze second, present with structured blocks, then hand off to strategic skills.

### Step 1 -- Gather ALL data (call tools in sequence)

- **get_campaigns** -- all campaigns with status, budget, objective, and last 7d performance
- **get_account_insights** with appropriate date_preset -- account-level metrics
- **get_object_insights** for each active campaign ID -- per-campaign detailed performance
- If needed: **get_ad_sets** and **get_object_insights** for ad set breakdowns
- If needed: **get_ads** and **get_object_insights** for ad-level creative analysis

> **Data freshness warning:** Meta reporting has up to a 48-hour attribution window. Conversions from the last 48 hours may be incomplete. Always note this when presenting recent data.

### Step 2 -- Cross-analyze the data

- Calculate ROAS = purchase_roas or (action_values / spend)
- Calculate CPA = spend / conversions (or cost_per_action_type)
- Compare periods: last 7d vs previous 7d for trend detection
- Identify winners (high ROAS, low CPA) and losers (low ROAS, high CPA, high frequency)
- Flag creative fatigue: frequency > 3 or declining CTR over time

### Step 3 -- Present with structured blocks

Follow this exact visual flow:

**Bold headline** -- one sentence summary with key numbers.

```metrics
4 hero KPIs: Spend, ROAS, CTR, CPA (or context-appropriate metrics)
```

```trend
Day-by-day performance chart -- ALWAYS include for any report covering 7+ days
```

Markdown table -- campaign/ad set breakdown with all relevant columns.

```insights
What the data means + what needs attention. Use severity: critical / warning / success.
```

```score
Audit scorecard when running health checks (structure, budget, creative, tracking).
```

```steps
Prioritized action plan: high / medium / low priority items.
```

```quickreplies
Contextual follow-up actions that lead to strategic skills.
```

### Step 4 -- Strategic Handoff (always end here)

After every analysis, identify which strategic skill the user should load next based on findings. Present this as quickreplies.

---

## Report Types & Strategic Handoffs

### 1. Weekly Performance Report

**Tool call sequence:**
1. get_campaigns -> get_account_insights (last_7d) -> get_object_insights for top campaigns -> get_account_insights (last_14d for comparison)
2. Output: metrics -> trend (daily spend + ROAS) -> table -> comparison card -> insights -> steps -> quickreplies

**Strategic Handoff:**
- If ROAS < 1.5x on any campaign -> recommend loading `campaign-manager` to adjust budgets or pause
- If CTR declining week-over-week -> recommend loading `creative-manager` for creative refresh
- If CPA rising across all campaigns -> recommend loading `targeting-audiences` to review audience overlap

```quickreplies
["Drill into top campaign", "Optimize budgets in Campaign Manager", "Refresh creatives", "Review audience targeting"]
```

### 2. Monthly Performance Report

**Tool call sequence:**
1. get_campaigns -> get_account_insights (this_month) -> get_account_insights (last_month) -> get_object_insights for top campaigns (this_month)
2. Output: metrics -> trend (daily spend + ROAS for the month) -> comparison card (this vs last month) -> table -> insights -> steps -> quickreplies

**Strategic Handoff:**
- If monthly ROAS trending down -> recommend loading `campaign-manager` for budget reallocation
- If frequency > 3 across campaigns -> recommend loading `creative-manager` to rotate creatives
- If conversion volume dropping despite stable spend -> recommend loading `tracking-conversions` to verify pixel health

```quickreplies
["Weekly breakdown", "Reallocate budgets", "Check pixel & tracking health", "Creative performance deep dive"]
```

### 3. Problems & Quick Wins

**Tool call sequence:**
1. get_campaigns -> get_object_insights for each active campaign (last_7d) -> get_ad_sets -> get_object_insights for low performers
2. Look for: declining ROAS, rising CPA, high frequency, audience overlap, inactive campaigns still spending

**Strategic Handoff:**
- Critical: ROAS < 1x -> recommend loading `campaign-manager` to pause or restructure immediately
- Warning: frequency > 4 -> recommend loading `creative-manager` for urgent creative rotation
- Warning: audience overlap detected -> recommend loading `targeting-audiences` to deduplicate audiences
- Quick win: high ROAS but low budget -> recommend loading `campaign-manager` to scale budget

```quickreplies
["Fix top issue now", "Pause underperformers", "Scale winners via Campaign Manager", "Deduplicate audiences"]
```

### 4. Creative Performance Analysis

**Tool call sequence:**
1. get_ads -> get_object_insights for each ad (last_7d) -> get_ad_creative for top/bottom ads
2. Flag: frequency > 3, declining CTR, best vs worst performers

**Strategic Handoff:**
- If top creatives identified -> recommend loading `creative-manager` to duplicate and iterate on winners
- If all creatives fatigued (CTR < 1% and frequency > 3) -> recommend loading `creative-manager` for full creative refresh
- If video completion rates low -> recommend loading `creative-manager` to test shorter formats

```quickreplies
["Generate new copy variations", "Duplicate top performers in Creative Manager", "Pause fatigued ads", "Test new creative format"]
```

### 5. Budget Optimization Plan

**Tool call sequence:**
1. get_campaigns -> get_object_insights for each campaign (last_7d) -> calculate ROAS per campaign
2. Identify over/under-spending relative to ROAS

**Strategic Handoff:**
- Recommend loading `campaign-manager` to apply budget changes with specific dollar amounts
- If CBO vs ABO mismatch -> recommend loading `campaign-manager` to restructure budget strategy
- If scaling opportunities found -> recommend loading `automation-rules` to set auto-scaling rules

```quickreplies
["Apply budget changes in Campaign Manager", "Set auto-scaling rules", "Show ROAS projections", "Scale top campaigns"]
```

### 6. Full Account Health Audit

**Tool call sequence:**
1. get_campaigns -> get_ad_sets -> get_ads -> get_pixels -> get_account_insights -> get_object_insights for active campaigns
2. Score: structure (naming, organization), budget efficiency, creative diversity, pixel setup, audience overlap

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
- If downward trend in ROAS over 7+ days -> recommend loading `campaign-manager` for intervention
- If CPM rising steadily -> recommend loading `targeting-audiences` to expand or refresh audiences
- If conversion rate declining -> recommend loading `tracking-conversions` to verify attribution setup

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

---

## Strategic Handoff Summary

| Finding | Severity | Recommended Skill |
|---------|----------|-------------------|
| ROAS < 1x | Critical | `campaign-manager` -- pause or restructure |
| ROAS < 1.5x | Warning | `campaign-manager` -- budget reallocation |
| CTR declining over time | Warning | `creative-manager` -- creative refresh |
| Frequency > 3 | Warning | `creative-manager` -- rotate creatives |
| Frequency > 5 | Critical | `creative-manager` -- urgent new creatives |
| CPA rising across campaigns | Warning | `targeting-audiences` -- audience review |
| Audience overlap > 30% | Warning | `targeting-audiences` -- consolidate |
| Pixel firing errors | Critical | `tracking-conversions` -- fix pixel setup |
| Conversions dropping, spend stable | Warning | `tracking-conversions` -- verify attribution |
| High ROAS, low budget | Opportunity | `campaign-manager` -- scale budget |
| Budget unevenly distributed | Warning | `campaign-manager` -- rebalance |
| No automation rules | Info | `automation-rules` -- set up guardrails |
| Placement CPA variance > 50% | Warning | `adset-manager` -- placement optimization |

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
- Multi-series: include 2-3 lines max for readability
- ALWAYS output a trend block when showing 7+ days of data

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
- Always calculate derived metrics (ROAS, CTR, CPA) -- don't just show raw numbers
- For comparison reports, calculate % change and use trend indicators (up/down)
- Include SPECIFIC dollar amounts in recommendations ("shift $50/day from Campaign X to Campaign Y")
- ALWAYS include a `trend` block for any report spanning 7+ days
- Do NOT suggest "Open Report Canvas" -- all charts and data render inline in chat
- For large accounts, prioritize ACTIVE campaigns and limit to top 10-15 by spend
- If no data for the requested period, say so clearly and suggest a different date range
- If no ad account is selected, say: "Select an ad account from the sidebar to get started."
- **Data freshness:** Always note that conversions from the last 48 hours may be incomplete due to Meta's attribution window

### Contextual Quick Replies Rules

Quick replies MUST be contextual based on findings:
- Low ROAS found -> "Pause low performers" or "Reallocate budget"
- Creative fatigue detected -> "Refresh creatives" or "Generate new copy"
- Budget uneven -> "Apply budget rebalance"
- High performers found -> "Scale top campaigns" or "Duplicate winners"
- Always include at least one "drill deeper" option
- Always include one "take action" option that leads to a strategic skill
