---
name: adset-manager
description: Manage Facebook ad sets — create, update, delete, copy ad sets with targeting, budgets, bidding, scheduling, and optimization goals. Use this skill whenever the user wants to set up targeting (demographics, interests, locations), configure bidding and budgets at the ad set level, set schedules/dayparting, manage placements, or view ads within an ad set. Also triggers for audience targeting, delivery optimization, and ad scheduling questions.
---

# Ad Set Manager

Manage Facebook ad sets through the AI Ad Manager API. Ad sets sit between campaigns and ads, controlling targeting, budget, schedule, optimization, and delivery.

## API Endpoints

### List ad sets

```
GET /api/adsets?adAccountId=act_XXX
```

Returns all ad sets for the given ad account.

### Get a single ad set

```
GET /api/adsets/:id
```

### Create an ad set

```
POST /api/adsets
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "string",
  "campaign_id": "string",
  "optimization_goal": "LINK_CLICKS",
  "billing_event": "IMPRESSIONS",
  "bid_amount": 500,
  "daily_budget": 2000,
  "targeting": { ... },
  "start_time": "2026-04-01T00:00:00-0700",
  "end_time": "2026-04-30T23:59:59-0700",
  "status": "PAUSED",
  "promoted_object": { ... },
  "adset_schedule": [ ... ]
}
```

Required fields: `adAccountId`, `name`, `campaign_id`, `optimization_goal`, `billing_event`, `targeting`, `status`.

Optional fields: `bid_amount`, `daily_budget`, `lifetime_budget`, `start_time`, `end_time`, `promoted_object`, `adset_schedule`.

Provide exactly one of `daily_budget` or `lifetime_budget`. If using `lifetime_budget`, `end_time` is required.

### Update an ad set

```
PATCH /api/adsets/:id
```

Body (all fields optional):

```json
{
  "name": "string",
  "status": "ACTIVE",
  "daily_budget": 3000,
  "lifetime_budget": 50000,
  "bid_amount": 750,
  "targeting": { ... },
  "end_time": "2026-05-31T23:59:59-0700",
  "adset_schedule": [ ... ]
}
```

### Delete an ad set

```
DELETE /api/adsets/:id
```

### Copy an ad set

```
POST /api/adsets/:id/copies
```

Body:

```json
{
  "deep_copy": true,
  "rename_strategy": "DEEP_COPY_PREFIX",
  "status_option": "PAUSED"
}
```

- `deep_copy` (bool) -- when true, copies the ads inside the ad set as well.
- `rename_strategy` -- how to name the copy. Options: `DEEP_COPY_PREFIX`, `NO_RENAME`.
- `status_option` -- status for the new ad set. Options: `ACTIVE`, `PAUSED`, `INHERITED`.

### List ads in an ad set

```
GET /api/adsets/:id/ads
```

### Get delivery estimate

```
GET /api/adsets/:id/delivery_estimate
```

Returns estimated daily reach and other delivery metrics for the ad set's current targeting and budget configuration.

## Targeting

The `targeting` object controls who sees the ads. Structure:

```json
{
  "geo_locations": {
    "countries": ["US", "CA"],
    "regions": [{ "key": "4081" }],
    "cities": [{ "key": "2420605", "radius": 25, "distance_unit": "mile" }],
    "zips": [{ "key": "US:90210" }]
  },
  "age_min": 18,
  "age_max": 65,
  "genders": [1, 2],
  "flexible_spec": [
    {
      "interests": [
        { "id": "6003139266461", "name": "Yoga" }
      ],
      "behaviors": [
        { "id": "6002714895372", "name": "Frequent travelers" }
      ]
    }
  ],
  "custom_audiences": [
    { "id": "23850000000000000" }
  ],
  "excluded_custom_audiences": [
    { "id": "23850000000000001" }
  ],
  "publisher_platforms": ["facebook", "instagram", "audience_network", "messenger"],
  "facebook_positions": ["feed", "right_hand_column", "marketplace"],
  "instagram_positions": ["stream", "story", "reels"],
  "device_platforms": ["mobile", "desktop"]
}
```

Key rules:

- `geo_locations` is required. At minimum provide `countries`.
- `genders`: `1` = male, `2` = female. Omit or pass `[1, 2]` for all.
- `age_min` range: 13--65. `age_max` range: 13--65. Default is 18--65.
- `flexible_spec` items within the same object are OR-ed; separate objects in the array are AND-ed.
- `custom_audiences` targets users in those audiences; `excluded_custom_audiences` excludes them.
- `publisher_platforms` and position fields control placements. Omit for automatic placements (recommended by Meta).

## Optimization Goals

Set `optimization_goal` to tell Meta what outcome to optimize delivery for:

| Value | Use when |
|---|---|
| `APP_INSTALLS` | Driving mobile app installs |
| `REACH` | Maximizing unique users reached |
| `LINK_CLICKS` | Driving clicks to a URL |
| `OFFSITE_CONVERSIONS` | Optimizing for website conversions (requires pixel + promoted_object) |
| `LEAD_GENERATION` | Collecting leads via lead forms |
| `VALUE` | Maximizing purchase value (requires pixel + promoted_object with custom_event_type) |
| `CONVERSATIONS` | Driving messaging conversations (Messenger, WhatsApp, Instagram Direct) |

The optimization goal must be compatible with the parent campaign's objective.

## Billing Events

Set `billing_event` to control when you are charged:

| Value | Description |
|---|---|
| `IMPRESSIONS` | Charged per 1,000 impressions (CPM). Works with all optimization goals. |
| `LINK_CLICKS` | Charged per click (CPC). Only with `LINK_CLICKS` optimization. |
| `THRUPLAY` | Charged per completed video view (or 15s). Only for video campaigns. |

Default to `IMPRESSIONS` unless the user specifically requests CPC or ThruPlay billing.

## Budget Options

Provide exactly one:

- **`daily_budget`** -- maximum spend per day, in cents (e.g., `2000` = $20.00). Meta may spend up to 25% more on high-performing days, balanced over the week.
- **`lifetime_budget`** -- total spend for the ad set's lifetime, in cents. Requires `end_time`. Meta paces spend across the full schedule.

All budget values are integers in the account's currency minor unit (cents for USD).

## Scheduling

- **`start_time`** -- ISO 8601 datetime. Defaults to immediately if omitted.
- **`end_time`** -- ISO 8601 datetime. Required when using `lifetime_budget`. Optional for `daily_budget` (ad set runs indefinitely if omitted).
- **`adset_schedule`** -- dayparting array. Only works with `lifetime_budget`. Each entry specifies days and hours:

```json
[
  {
    "start_minute": 0,
    "end_minute": 480,
    "days": [1, 2, 3, 4, 5],
    "timezone_type": "USER"
  }
]
```

- `start_minute` / `end_minute`: minutes from midnight (0--1440). Example: 480 = 8:00 AM, 1020 = 5:00 PM.
- `days`: 0 = Sunday, 1 = Monday, ... 6 = Saturday.
- `timezone_type`: `USER` (viewer's timezone) or `ADVERTISER` (ad account timezone).

## Bid Strategies and Bid Amount

Meta supports several bid strategies configured at the campaign or ad set level:

- **Lowest cost (default)** -- omit `bid_amount`. Meta bids automatically to get the most results for your budget.
- **Cost cap** -- set `bid_amount` to your target cost per result in cents. Meta aims to keep average cost at or below this amount.
- **Bid cap** -- set `bid_amount` to the maximum you will bid in any auction.

`bid_amount` is in cents. Example: `bid_amount: 500` = $5.00 max bid or cost cap.

When the user does not specify a bid strategy, omit `bid_amount` to use lowest cost.

## Promoted Object

Required for conversion-based optimization goals (`OFFSITE_CONVERSIONS`, `APP_INSTALLS`, `VALUE`). Tells Meta what conversion event or app to optimize for.

```json
{
  "pixel_id": "123456789",
  "custom_event_type": "PURCHASE"
}
```

Common `custom_event_type` values: `PURCHASE`, `LEAD`, `COMPLETE_REGISTRATION`, `ADD_TO_CART`, `INITIATED_CHECKOUT`, `SEARCH`, `VIEW_CONTENT`, `ADD_PAYMENT_INFO`, `ADD_TO_WISHLIST`.

For app installs:

```json
{
  "application_id": "987654321",
  "object_store_url": "https://apps.apple.com/app/id123"
}
```

For messaging/conversations:

```json
{
  "page_id": "111222333"
}
```

## Common Patterns

**Create a conversion-optimized ad set with daily budget:**

```json
{
  "adAccountId": "act_XXX",
  "name": "Conversions - US 25-45",
  "campaign_id": "120200000000000000",
  "optimization_goal": "OFFSITE_CONVERSIONS",
  "billing_event": "IMPRESSIONS",
  "daily_budget": 5000,
  "status": "PAUSED",
  "promoted_object": {
    "pixel_id": "123456789",
    "custom_event_type": "PURCHASE"
  },
  "targeting": {
    "geo_locations": { "countries": ["US"] },
    "age_min": 25,
    "age_max": 45,
    "flexible_spec": [
      { "interests": [{ "id": "6003139266461", "name": "Online shopping" }] }
    ]
  }
}
```

**Pause an ad set:**

```json
PATCH /api/adsets/:id
{ "status": "PAUSED" }
```

**Update targeting on an existing ad set:**

```json
PATCH /api/adsets/:id
{
  "targeting": {
    "geo_locations": { "countries": ["US", "CA", "GB"] },
    "age_min": 18,
    "age_max": 55
  }
}
```

**Deep-copy an ad set (including its ads) in paused state:**

```json
POST /api/adsets/:id/copies
{ "deep_copy": true, "status_option": "PAUSED" }
```
