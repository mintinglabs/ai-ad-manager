---
name: ss2-adset
description: Audience, Targeting & Ad Set — Step 2 of 4. Page selection, audience strategy, targeting spec, placements, budget, create_ad_set API spec.
layer: operational
depends_on: [ss1-strategist]
leads_to: [ss3-creative]
---

# SS2 — Ad Set Builder

## Common Rule (ALL sub-agents)

**Read context.state.workflow first.** Before asking the user for any IDs or settings, check `context.state.workflow` for existing values (campaign_id, optimization_goal, conversion_destination, pixel_id, etc.). Never re-ask for information already saved in state.

---

## Step 1 — Page Selection

If `page_id` is already in `context.state.workflow`, skip this step.

Call `get_pages()` if not already fetched. Present pages using page NAME (never raw IDs):

```options
{"title":"Which Page will run this campaign?","options":[
  {"id":"PAGE_ID_1","title":"Your Business Page Name","description":"Facebook Page"},
  {"id":"PAGE_ID_2","title":"Your Other Page Name","description":"Facebook Page"}
]}
```

---

## Step 2 — Audience Strategy

```options
{"title":"How do you want to target?","options":[
  {"id":"BROAD","title":"Broad Targeting","description":"Let Meta find the best audience — recommended for most campaigns"},
  {"id":"INTEREST","title":"Interest-Based","description":"Target by specific interests, behaviors, and demographics"},
  {"id":"CUSTOM","title":"Custom Audience","description":"Retarget website visitors, video viewers, or customer lists"},
  {"id":"LOOKALIKE","title":"Lookalike Audience","description":"Reach new people similar to your best customers"},
  {"id":"SAVED","title":"Saved Audience","description":"Use a previously saved targeting preset"}
]}
```

### BROAD
Ask for country only. Use:
```json
{"geo_locations":{"countries":["HK"]},"age_min":18,"age_max":65,"targeting_optimization":"none"}
```

### INTEREST
1. Ask for country, age range, gender
2. Ask: "What's the product/service? I'll find relevant interests."
3. Call `targeting_search(query)` with 2–3 keywords, present results as options
4. Loop until user is satisfied
5. Call `get_reach_estimate()` — show audience size in target country

Reach warnings:
- < 50,000 → "Audience is narrow. Consider broadening or adding interests."
- > 50,000,000 → "Audience is very broad. Consider narrowing with demographics."

### CUSTOM
Call `get_custom_audiences()` → user picks `custom_audience_id`.
If none exist: suggest creating one via the targeting-audiences skill first.

### LOOKALIKE
Call `get_custom_audiences()` → user picks source audience → ask for target country.

### SAVED
Call `get_saved_audiences()` → user picks saved audience ID.

---

## Step 3 — Placements

```options
{"title":"Where should your ads appear?","options":[
  {"id":"AUTOMATIC","title":"Advantage+ Placements (Recommended)","description":"Meta optimizes across all placements for best results"},
  {"id":"FEEDS_ONLY","title":"Feeds Only","description":"Facebook + Instagram feeds — no stories or reels"},
  {"id":"STORIES_REELS","title":"Stories & Reels Only","description":"Full-screen vertical placements"},
  {"id":"MANUAL","title":"Manual Selection","description":"Choose specific placements yourself"}
]}
```

If any Instagram placement selected: call `get_connected_instagram_accounts()` to verify IG is connected. If not: warn that IG placements will default to Facebook Page.

---

## Step 4 — Budget & Schedule

Read account currency from `context.state.workflow` (set by SS1's `get_ad_account_details` call).
Call `get_minimum_budgets()` if minimum not already in state.

Budget options by destination:

| Destination | Recommended Daily Budget |
|---|---|
| WhatsApp / Messenger conversations | $15–25/day |
| Website purchase (ROAS) | $20–30/day |
| Lead Form / Lead gen | $15–25/day |
| Website traffic | $10–20/day |
| Awareness / Reach | $10–15/day |
| Engagement | $10–15/day |

Present in account currency (NOT USD if account is HKD/SGD/GBP/etc.):

```options
{"title":"Daily budget","options":[
  {"id":"CONSERVATIVE","title":"[LOCAL_MIN]/day","description":"Conservative — good for testing"},
  {"id":"RECOMMENDED","title":"[LOCAL_RECOMMENDED]/day","description":"Recommended for this goal"},
  {"id":"AGGRESSIVE","title":"[LOCAL_HIGH]/day","description":"Aggressive — faster learning"},
  {"id":"CUSTOM","title":"Custom Amount","description":"Set your own daily budget"}
]}
```

Then schedule:
```options
{"title":"Campaign schedule","options":[
  {"id":"ONGOING","title":"Run Continuously","description":"Start now, run until paused"},
  {"id":"SCHEDULED","title":"Set Start & End Date","description":"Run for a specific period"}
]}
```

---

## Step 5 — Bid Strategy

Default: `LOWEST_COST_WITHOUT_CAP`. Only ask if user wants to set a specific cost target.

```options
{"title":"Bid strategy","options":[
  {"id":"LOWEST_COST_WITHOUT_CAP","title":"Lowest Cost (Recommended)","description":"Spend full budget for maximum results"},
  {"id":"COST_CAP","title":"Cost Cap","description":"Keep average cost per result under a target"},
  {"id":"LOWEST_COST_WITH_BID_CAP","title":"Bid Cap","description":"Keep individual bid under a maximum"}
]}
```

---

## Step 6 — Create Ad Set

```
create_ad_set(
  campaign_id: [from context.state.workflow],
  name: "[Page Name] — [Audience Strategy] — [Date]",
  optimization_goal: [from context.state.workflow],
  billing_event: "IMPRESSIONS",
  bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  daily_budget: [amount IN CENTS — multiply dollars × 100],
  status: "PAUSED",
  targeting: [JSON string],
  promoted_object: [see table below, if required]
)
```

### promoted_object by destination

| Destination | promoted_object |
|---|---|
| Website (purchase) | `{"pixel_id":"ID","custom_event_type":"PURCHASE"}` |
| Website (lead) | `{"pixel_id":"ID","custom_event_type":"LEAD"}` |
| Traffic (LPV) | `{"pixel_id":"ID"}` |
| WhatsApp / Messenger / IG DM | omit |
| Lead Form | omit |
| App | `{"application_id":"APP_ID","object_store_url":"URL"}` |

**After success:**
1. Call `update_workflow_context({ adset_id, page_id })`
2. IMMEDIATELY call `transfer_to_agent("creative_builder")` — no text before or after.

---

## API Quick Reference

### Targeting spec — geo only (Broad)
```json
{
  "geo_locations": {"countries": ["HK"]},
  "age_min": 18,
  "age_max": 65,
  "targeting_optimization": "none"
}
```

### Targeting spec — with interests
```json
{
  "geo_locations": {"countries": ["HK"]},
  "age_min": 25,
  "age_max": 45,
  "genders": [2],
  "flexible_spec": [
    {"interests": [
      {"id": "6003139266461", "name": "Yoga"},
      {"id": "6003107902433", "name": "Fitness"}
    ]}
  ],
  "targeting_optimization": "none"
}
```

### Targeting spec — custom audience
```json
{
  "geo_locations": {"countries": ["HK"]},
  "custom_audiences": [{"id": "23850000000000000"}],
  "excluded_custom_audiences": [{"id": "23850000000000001"}],
  "targeting_optimization": "none"
}
```

### Key rules
- `geo_locations` is always required
- `genders`: `1` = male, `2` = female — omit for all
- Budget is always in CENTS: $20/day = 2000
- Always include `targeting_optimization: "none"` to disable Advantage Audience
- `billing_event` defaults to `IMPRESSIONS`
