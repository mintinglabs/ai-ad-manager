---
name: adset-manager
description: Create, update, delete, and copy ad sets with targeting, budgets, bidding, and scheduling
layer: operational
depends_on: [campaign-manager, targeting-audiences]
safety:
  - Budget increases max 20% per operation
  - Warn if daily budget is below $5 (500 cents)
  - Always show current vs proposed state for status and budget changes
  - Deletions require explicit "delete" confirmation; suggest PAUSED or ARCHIVED first
  - Bulk operations max 10 ad sets per batch with per-batch confirmation
  - All budget values in CENTS (multiply dollars × 100)
---

# Ad Set Manager

## API Endpoints

### Read

```
GET /api/adsets?adAccountId=act_XXX
```
Returns all ad sets for the given ad account.

```
GET /api/adsets/:id
```
Returns full details for a specific ad set.

```
GET /api/adsets/:id/ads
```
Returns all ads within an ad set.

```
GET /api/adsets/:id/delivery_estimate
```
Returns estimated daily reach and delivery metrics for the ad set's current targeting and budget.

### Create

```
POST /api/adsets
```

Required fields: `adAccountId`, `name`, `campaign_id`, `optimization_goal`, `billing_event`, `targeting`, `status`.

Optional fields: `bid_amount`, `daily_budget`, `lifetime_budget`, `start_time`, `end_time`, `promoted_object`, `adset_schedule`.

Provide exactly one of `daily_budget` or `lifetime_budget`. If using `lifetime_budget`, `end_time` is required.

```
POST /api/adsets/:id/copies
```

| Field | Notes |
|---|---|
| deep_copy | `true` copies ads inside the ad set as well |
| rename_strategy | `DEEP_COPY_PREFIX` or `NO_RENAME` |
| status_option | `ACTIVE`, `PAUSED`, or `INHERITED` |

### Update

```
PATCH /api/adsets/:id
```
All fields optional: `name`, `status`, `daily_budget`, `lifetime_budget`, `bid_amount`, `targeting`, `end_time`, `adset_schedule`.

### Delete

```
DELETE /api/adsets/:id
```

## Execution Workflow

Every write operation MUST follow this four-step pattern.

### Creating an Ad Set

**Step 1 READ** -- Fetch the parent campaign and existing ad sets.

```
GET /api/campaigns/:id
GET /api/adsets?adAccountId=act_XXX
```

```metrics
Campaign: "Spring Sale 2026"
Objective: OUTCOME_SALES
Existing Ad Sets: 2
```

**Step 2 CONFIRM** -- Show the full ad set configuration.

```steps
Action: CREATE new ad set
Campaign: "Spring Sale 2026"
Name: "US Women 25-45 - Interest Targeting"
Budget: $50.00/day (5000 cents)
Optimization: OFFSITE_CONVERSIONS
Billing: IMPRESSIONS
Targeting:
  - Countries: US
  - Age: 25-45
  - Gender: Female
  - Interests: Online shopping, Fashion
Promoted Object: pixel_id 123456, event PURCHASE
Status: PAUSED
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
POST /api/adsets
```

**Step 4 VERIFY** -- Confirm the ad set was created.

```
GET /api/adsets/:new_id
GET /api/adsets/:new_id/delivery_estimate
```

```metrics
Ad Set Created Successfully
ID: 120200...
Name: "US Women 25-45 - Interest Targeting"
Budget: $50.00/day
Est. Daily Reach: 8,500 - 24,700
Status: PAUSED
```

```quickreplies
["Create an ad for this ad set", "Activate this ad set", "Adjust targeting", "View delivery estimate"]
```

### Updating Budget

**Step 1 READ** -- Fetch current ad set.

```
GET /api/adsets/:id
```

```metrics
Ad Set: "US Women 25-45"
Current Daily Budget: $50.00 (5000 cents)
Status: ACTIVE
Spend Today: $23.45
```

**Step 2 CONFIRM** -- Show before/after with safety check.

```steps
Action: UPDATE budget
Ad Set: 120200...
Change: daily_budget 5000 → 6000 cents ($50.00 → $60.00)
Increase: 20% ✓ (within 20% safety limit)
```

If the increase exceeds 20%, warn:
"This is a {X}% increase, which exceeds the 20% safety limit. Large budget jumps can disrupt Meta's learning phase. I recommend increasing in steps."

If the new budget is below $5 (500 cents), warn:
"A daily budget below $5 may result in very limited delivery."

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
PATCH /api/adsets/:id
```

**Step 4 VERIFY** -- Confirm the change.

```
GET /api/adsets/:id
```

```metrics
Budget Updated
Ad Set: "US Women 25-45"
New Daily Budget: $60.00 (6000 cents)
Status: ACTIVE
```

```quickreplies
["View delivery estimate", "Adjust targeting", "View ads in this ad set", "Pause this ad set"]
```

### Updating Targeting

**Step 1 READ** -- Fetch current targeting.

```
GET /api/adsets/:id
```

Show current targeting configuration in a `metrics` block.

**Step 2 CONFIRM** -- Show before/after.

```steps
Action: UPDATE targeting
Ad Set: 120200...
Changes:
  - Countries: US → US, CA, GB
  - Age: 25-45 → 18-55
  - Interests: added "Fitness" (id: 6003107902433)
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** then **Step 4 VERIFY** as above.

### Deleting an Ad Set

**Step 1 READ** -- Fetch current state including child ads.

```
GET /api/adsets/:id
GET /api/adsets/:id/ads
```

```metrics
Ad Set: "US Women 25-45"
Status: ACTIVE
Ads inside: 4
Total Spend: $1,245.00
```

**Step 2 CONFIRM** -- Suggest alternatives.

```steps
⚠ DESTRUCTIVE ACTION
You are about to permanently delete ad set 120200...
This will also remove all 4 ads inside it.

Alternative options:
- PAUSED: stops delivery, can reactivate later
- ARCHIVED: read-only, preserved for reporting
- DELETE: permanent, cannot be undone
```

Ask: **"Type 'delete' to confirm permanent deletion, or choose PAUSED/ARCHIVED instead."**

**Step 3 EXECUTE** -- Only after explicit "delete" confirmation.

**Step 4 VERIFY** -- Confirm deletion.

## Safety Guardrails

- **Budget increases**: Max 20% increase per operation. For larger changes, recommend stepping up over multiple days to preserve Meta's learning phase.
- **Budget minimum**: Warn if daily budget is below $5 (500 cents) -- delivery will be very limited.
- **Budget in CENTS**: All budget and bid values are integers in cents. $20.00 = 2000. Always confirm the dollar amount with the user before sending.
- **Status changes**: Always show current vs proposed state before changing.
- **Deletions**: Always suggest PAUSED or ARCHIVED first. Require explicit "delete" to permanently remove. Warn about child ads that will be lost.
- **Bulk operations**: Max 10 ad sets per batch; confirm each batch.
- **Active ad set modifications**: Warn that targeting or budget changes on active ad sets may reset Meta's learning phase.

## Quick Reference

### Targeting Spec Examples

**Geographic targeting:**
```json
{
  "geo_locations": {
    "countries": ["US", "CA"],
    "regions": [{ "key": "4081" }],
    "cities": [{ "key": "2420605", "radius": 25, "distance_unit": "mile" }],
    "zips": [{ "key": "US:90210" }]
  }
}
```

**Demographics + interests:**
```json
{
  "geo_locations": { "countries": ["US"] },
  "age_min": 25,
  "age_max": 45,
  "genders": [2],
  "flexible_spec": [
    {
      "interests": [
        { "id": "6003139266461", "name": "Yoga" },
        { "id": "6003107902433", "name": "Fitness" }
      ]
    }
  ]
}
```

**Custom audiences + exclusions:**
```json
{
  "geo_locations": { "countries": ["US"] },
  "custom_audiences": [{ "id": "23850000000000000" }],
  "excluded_custom_audiences": [{ "id": "23850000000000001" }]
}
```

Key targeting rules:
- `geo_locations` is required. At minimum provide `countries`.
- `genders`: `1` = male, `2` = female. Omit or `[1, 2]` for all.
- `age_min` / `age_max`: range 13-65. Default 18-65.
- `flexible_spec`: items in same object are OR-ed; separate objects are AND-ed.
- Omit `publisher_platforms` for automatic placements (recommended by Meta).

### Optimization Goals

| Value | Use when |
|---|---|
| `APP_INSTALLS` | Driving mobile app installs |
| `REACH` | Maximizing unique users reached |
| `LINK_CLICKS` | Driving clicks to a URL |
| `OFFSITE_CONVERSIONS` | Website conversions (requires pixel + promoted_object) |
| `LEAD_GENERATION` | Collecting leads via lead forms |
| `VALUE` | Maximizing purchase value |
| `CONVERSATIONS` | Messaging conversations |

### Billing Events

| Value | Description |
|---|---|
| `IMPRESSIONS` | Charged per 1,000 impressions (CPM). Works with all goals. |
| `LINK_CLICKS` | Charged per click (CPC). Only with `LINK_CLICKS` optimization. |
| `THRUPLAY` | Charged per completed video view (or 15s). Video campaigns only. |

Default to `IMPRESSIONS` unless user specifically requests CPC or ThruPlay.

### Budget Options

| Type | Field | Notes |
|---|---|---|
| Daily | `daily_budget` | Max spend per day in **cents**. Meta may spend up to 25% more on peak days. |
| Lifetime | `lifetime_budget` | Total spend in **cents**. Requires `end_time`. |

### Scheduling

- `start_time` -- ISO 8601 datetime. Defaults to immediately.
- `end_time` -- ISO 8601 datetime. Required for `lifetime_budget`.
- `adset_schedule` -- dayparting. Only with `lifetime_budget`.

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

Minutes from midnight: 480 = 8:00 AM, 1020 = 5:00 PM. Days: 0 = Sunday ... 6 = Saturday.

### Bid Strategies

- **Lowest cost (default)** -- omit `bid_amount`. Meta bids automatically.
- **Cost cap** -- set `bid_amount` to target cost per result in cents.
- **Bid cap** -- set `bid_amount` to maximum auction bid in cents.

### Promoted Object

Required for `OFFSITE_CONVERSIONS`, `APP_INSTALLS`, `VALUE`.

```json
{ "pixel_id": "123456789", "custom_event_type": "PURCHASE" }
```

Common event types: `PURCHASE`, `LEAD`, `COMPLETE_REGISTRATION`, `ADD_TO_CART`, `INITIATED_CHECKOUT`, `SEARCH`, `VIEW_CONTENT`, `ADD_PAYMENT_INFO`, `ADD_TO_WISHLIST`.

### Ad Set Statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Delivering (if parent campaign is also active) |
| `PAUSED` | Paused; can reactivate |
| `DELETED` | Soft-deleted |
| `ARCHIVED` | Read-only, preserved for reporting |
