---
name: campaign-manager
description: Manage Facebook ad campaigns — create, update, pause, delete, copy campaigns and view campaign hierarchy (ad sets and ads within campaigns). Use this skill whenever the user wants to create a new campaign, change campaign status, adjust budgets, delete campaigns, duplicate campaigns, or view what's inside a campaign. Also triggers for questions about campaign objectives, bid strategies, or campaign structure.
---

# Campaign Manager

## API Endpoints

### List campaigns

```
GET /api/campaigns?adAccountId=act_XXX
```

Returns all campaigns for the ad account, including performance insights (spend, impressions, clicks, etc.).

### Create a campaign

```
POST /api/campaigns
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| name | string | yes | Campaign name |
| objective | string | yes | See objectives below |
| bid_strategy | string | no | See bid strategies below |
| daily_budget | number | no | In cents. Mutually exclusive with lifetime_budget |
| lifetime_budget | number | no | In cents. Mutually exclusive with daily_budget |
| spend_cap | number | no | In cents. Overall campaign spend limit |
| start_time | string | no | ISO 8601 datetime |
| stop_time | string | no | ISO 8601 datetime. Required if using lifetime_budget |

### Update a campaign

```
PATCH /api/campaigns/:id
```

Body (all fields optional):

| Field | Type | Notes |
|---|---|---|
| status | string | See statuses below |
| daily_budget | number | In cents |

Use this to pause, resume, or adjust budget on an existing campaign.

### Delete a campaign

```
DELETE /api/campaigns/:id
```

Permanently deletes the campaign. To soft-delete, use PATCH to set status to `DELETED` or `ARCHIVED` instead.

### Copy a campaign

```
POST /api/campaigns/:id/copies
```

Body:

| Field | Type | Notes |
|---|---|---|
| deep_copy | boolean | `true` copies ad sets and ads within the campaign. `false` copies only the campaign shell. Default: `false` |
| rename_strategy | string | How to name the copy (e.g., append " - Copy") |
| status_option | string | Status for the new campaign (e.g., `PAUSED`) |

### Get ad sets in a campaign

```
GET /api/campaigns/:id/adsets
```

Returns all ad sets belonging to the campaign. Use this to inspect campaign hierarchy.

### Get ads in a campaign

```
GET /api/campaigns/:id/ads
```

Returns all ads belonging to the campaign (across all ad sets).

## Campaign Objectives

| Objective | Use case |
|---|---|
| `OUTCOME_AWARENESS` | Brand awareness, reach |
| `OUTCOME_ENGAGEMENT` | Post engagement, page likes, event responses |
| `OUTCOME_LEADS` | Lead generation forms |
| `OUTCOME_SALES` | Conversions, catalog sales |
| `OUTCOME_TRAFFIC` | Drive traffic to a website or app |
| `OUTCOME_APP_PROMOTION` | App installs, app engagement |

## Bid Strategies

| Strategy | Behavior |
|---|---|
| `LOWEST_COST_WITHOUT_CAP` | Spend full budget for maximum results. No bid limit. Default strategy. |
| `LOWEST_COST_WITH_BID_CAP` | Get most results while keeping bid under a specified cap |
| `COST_CAP` | Get most results while keeping average cost per result under a target |
| `LOWEST_COST_WITH_MIN_ROAS` | Optimize for minimum return on ad spend |

## Campaign Statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Campaign is running |
| `PAUSED` | Campaign is paused; can be resumed by setting status to `ACTIVE` |
| `DELETED` | Soft-deleted; hidden from default views but retrievable |
| `ARCHIVED` | Archived; read-only, preserved for reporting |

## Budget Types

- **daily_budget** — Maximum spend per day, in cents. Facebook distributes spend across the day.
- **lifetime_budget** — Total spend over the campaign's lifetime, in cents. Requires `stop_time`. Facebook paces spend across the date range.
- **spend_cap** — Hard cap on total campaign spend, in cents. Works alongside daily or lifetime budget as an additional safeguard.

Daily and lifetime budgets are mutually exclusive. A campaign must have exactly one of them.

## Campaign Hierarchy

Campaigns contain ad sets, which contain ads:

```
Campaign
 └── Ad Set (targeting, budget, schedule)
      └── Ad (creative, copy, CTA)
```

To inspect a campaign's full structure, call the adsets endpoint, then for each ad set call the ads endpoint.
