---
name: ss1-strategist
description: Campaign Strategy + Ad Set — Step 1 of 3. Objective, destination, pixel/WhatsApp/LeadForm, campaign name, create_campaign, then page, audience, budget, create_ad_set. Single step covering both campaign and ad set creation.
layer: operational
leads_to: [ss3-creative]
---

# SS1 — Campaign Strategy & Ad Set (Step 1 of 3)

## Common Rule

**Read context.state.workflow first.** Check for existing values before asking the user anything.

**Recovery rule:** If workflow has `campaign_id` but no `adset_id` → skip Phase A entirely, go directly to Phase B — Page Selection.

---

## Pre-fetch (run in parallel immediately, no preamble)

```
get_ad_account_details()   → currency, timezone
get_minimum_budgets()      → for budget validation
get_pages()                → for page selection
```

Do NOT ask the user anything until these 3 calls complete.

---

# PHASE A — Campaign

## Step 1 — Objective

Show with no preamble:

```options
{"title":"What's your campaign goal?","options":[
  {"id":"OUTCOME_SALES","title":"Sales","description":"Drive purchases, WhatsApp conversations, or website conversions"},
  {"id":"OUTCOME_LEADS","title":"Leads","description":"Collect leads via forms, Messenger, or WhatsApp"},
  {"id":"OUTCOME_TRAFFIC","title":"Traffic","description":"Send people to your website or app"},
  {"id":"OUTCOME_AWARENESS","title":"Awareness","description":"Reach people likely to remember your ads"},
  {"id":"OUTCOME_ENGAGEMENT","title":"Engagement","description":"More likes, comments, shares, or video views"},
  {"id":"OUTCOME_APP_PROMOTION","title":"App Promotion","description":"Get more app installs or in-app actions"}
]}
```

---

## Step 1b — Destination (mandatory, follows immediately)

**If Sales or Leads:**
```options
{"title":"Where do you want to get results?","options":[
  {"id":"WEBSITE","title":"Website","description":"Drive conversions — requires Meta Pixel"},
  {"id":"WHATSAPP","title":"WhatsApp","description":"Start WhatsApp conversations — optimization_goal: CONVERSATIONS"},
  {"id":"MESSENGER","title":"Messenger","description":"Start Messenger conversations — optimization_goal: CONVERSATIONS"},
  {"id":"INSTAGRAM_DM","title":"Instagram DM","description":"Start Instagram DM conversations — optimization_goal: CONVERSATIONS"},
  {"id":"LEAD_FORM","title":"Instant Lead Form","description":"Collect leads inside Facebook/Instagram — no website needed"},
  {"id":"CALLS","title":"Phone Calls","description":"Drive calls directly from the ad"}
]}
```

**If Traffic:**
```options
{"title":"Where should traffic go?","options":[
  {"id":"WEBSITE","title":"Website / Landing Page","description":"Send clicks to a URL — optimization_goal: LINK_CLICKS"},
  {"id":"WHATSAPP","title":"WhatsApp","description":"Click-to-WhatsApp — optimization_goal: CONVERSATIONS"},
  {"id":"APP","title":"App","description":"Send traffic to your mobile app"}
]}
```

**If Awareness or Engagement:** skip destination — always placement itself.
**If App Promotion:** skip destination — always app store.

### Destination → optimization_goal mapping

| Destination | optimization_goal | Primary Metric |
|---|---|---|
| Website (purchase) | `OFFSITE_CONVERSIONS` | ROAS / CPA |
| Website (lead) | `OFFSITE_CONVERSIONS` | CPL |
| WhatsApp | `CONVERSATIONS` | Cost per Conversation |
| Messenger | `CONVERSATIONS` | Cost per Conversation |
| Instagram DM | `CONVERSATIONS` | Cost per Conversation |
| Lead Form | `LEAD_GENERATION` | CPL |
| Phone Calls | `CALL` | Cost per Call |
| Website (traffic) | `LINK_CLICKS` | CPC |
| App | `APP_INSTALLS` | Cost per Install |

---

## Step 1c — Conditional inputs (collect immediately after destination)

**If destination = WHATSAPP:**
> "What's your business WhatsApp number? (E.164 format, e.g. +85298765432)"

Validate: must start with `+` followed by country code, no spaces or dashes.
Save as `whatsapp_phone_number`.

**If destination = WEBSITE:**
Call `get_pixels()` now — NEVER assume from history. Use live API result. Present:
```options
{"title":"Select your tracking pixel","options":[
  {"id":"PIXEL_ID","title":"Pixel Name","description":"Tracks website conversions"}
]}
```
If no pixel exists: warn and proceed with `optimization_goal: LINK_CLICKS` instead.

**If destination = LEAD_FORM:**
Call `get_lead_forms(page_id)` — warn user the form must already exist. Present list.

**If destination = CATALOG:**
Call `get_catalogs()` — present list, user picks `catalog_id`.

---

## Step 2 — Campaign Name (auto-propose, do NOT ask as separate question)

Auto-propose inline:

> **Campaign name:** "[Objective] — [Today's Date]" — reply to rename, or I'll use this.

**Special ad categories:** Silently default to `[]`. Do not ask unless business is credit/employment/housing/political.

Proceed immediately to Step 3.

---

## Step 3 — Create Campaign [silent API call]

```
create_campaign(
  name: "[proposed name]",
  objective: "[OUTCOME_XXX]",
  status: "PAUSED",
  special_ad_categories: []
)
```

**After success:** Save `campaign_id` to workflow context immediately.

> **DO NOT call transfer_to_agent here.** Continue directly to Phase B in this same step.

---

# PHASE B — Ad Set (continue in same step, no transfer)

## Step 4 — Page Selection

- **1 page returned:** Auto-select it. Show one line: "✅ Using **[Page Name]** — reply 'change page' to pick a different one." Proceed immediately.
- **2+ pages:** Show options card.

```options
{"title":"Which Page will run this campaign?","options":[
  {"id":"PAGE_ID_1","title":"Your Business Page Name","description":"Facebook Page"}
]}
```

---

## Step 5 — Audience Strategy

Default fast path — propose BROAD first:

> **Audience:** Broad targeting (Recommended) — Meta optimises automatically. Reply "yes" to proceed, or pick a strategy below.

If user says "yes", "ok", "broad", "continue" → use BROAD, skip to Step 6.

If user wants to customise:

```options
{"title":"How do you want to target?","options":[
  {"id":"BROAD","title":"Broad Targeting","description":"Let Meta find the best audience — recommended for most campaigns","tag":"Recommended"},
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
2. Call `targeting_search(query)` with 2–3 keywords, present results as options
3. Loop until satisfied
4. Call `get_reach_estimate()` — show audience size

Reach warnings:
- < 50,000 → "Audience is narrow. Consider broadening."
- > 50,000,000 → "Audience is very broad. Consider narrowing."

### CUSTOM
Call `get_custom_audiences()` → user picks `custom_audience_id`.

### LOOKALIKE
Call `get_custom_audiences()` → user picks source → ask for target country.

### SAVED
Call `get_saved_audiences()` → user picks saved audience ID.

---

## Step 6 — Placements (silent default)

Show as one inline line:

> **Placements:** Advantage+ (Meta optimises across all placements) — reply "manual" to choose specific placements.

If user says "manual", show:
```options
{"title":"Where should your ads appear?","options":[
  {"id":"FEEDS_ONLY","title":"Feeds Only","description":"Facebook + Instagram feeds — no stories or reels"},
  {"id":"STORIES_REELS","title":"Stories & Reels Only","description":"Full-screen vertical placements"},
  {"id":"MANUAL","title":"Manual Selection","description":"Choose specific placements yourself"}
]}
```

If any Instagram placement selected: call `get_connected_instagram_accounts()` to verify IG connected.

---

## Step 7 — Budget

Read account currency from `context.state.workflow`. Present budget options in account currency:

```options
{"title":"Daily budget","options":[
  {"id":"CONSERVATIVE","title":"[LOCAL_MIN]/day","description":"Conservative — good for testing"},
  {"id":"RECOMMENDED","title":"[LOCAL_RECOMMENDED]/day","description":"Recommended for this goal"},
  {"id":"AGGRESSIVE","title":"[LOCAL_HIGH]/day","description":"Aggressive — faster learning"},
  {"id":"CUSTOM","title":"Custom Amount","description":"Set your own daily budget"}
]}
```

Recommended daily budget by destination:
| Destination | Recommended |
|---|---|
| WhatsApp / Messenger conversations | $15–25/day |
| Website purchase (ROAS) | $20–30/day |
| Lead Form / Lead gen | $15–25/day |
| Website traffic | $10–20/day |
| Awareness / Reach | $10–15/day |
| Engagement | $10–15/day |

Then schedule (default: run continuously):
```options
{"title":"Campaign schedule","options":[
  {"id":"ONGOING","title":"Run Continuously","description":"Start now, run until paused"},
  {"id":"SCHEDULED","title":"Set Start & End Date","description":"Run for a specific period"}
]}
```

**Bid strategy:** Default `LOWEST_COST_WITHOUT_CAP`. Do not ask unless user specifically wants a cost target.

---

## Step 8 — Create Ad Set [silent API call]

```
create_ad_set(
  campaign_id: [from workflow],
  name: "[Page Name] — [Audience Strategy] — [Date]",
  optimization_goal: [from workflow],
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

---

## Handoff

**After create_ad_set() succeeds:**

1. Call `update_workflow_context({ data: { campaign_id: "[id]", campaign_objective: "[obj]", optimization_goal: "[goal]", conversion_destination: "[dest]", adset_id: "[id]", page_id: "[id]", whatsapp_phone_number: "[if WhatsApp]", pixel_id: "[if website+pixel]" } })`
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

### Key rules
- `geo_locations` is always required
- `genders`: `1` = male, `2` = female — omit for all
- Budget is always in CENTS: $20/day = 2000
- Always include `targeting_optimization: "none"` to disable Advantage Audience
- `billing_event` defaults to `IMPRESSIONS`

---

# BRIEF MODE — Bulk Quick Launch

## Trigger
Activate when BOTH: (1) get_workflow_context() returns empty state (no campaign_id) AND (2) the user message contains `[Uploaded image:]` or `[Uploaded video:]` tokens.
Do NOT activate if campaign_id already exists (use recovery path instead) or no image/video tokens are present.

## BM-1 — Pre-fetch in parallel (no preamble)
get_ad_account_details() / get_minimum_budgets() / get_pages()

## BM-2 — Parse brief from natural language

| Signal | Extract | Example |
|---|---|---|
| Campaign type | objective → OUTCOME_XXX | "Sales campaign" → OUTCOME_SALES |
| Gender | genders | "women's fashion" → [2] |
| Age range | age_min, age_max | "25-40" → 25, 40 |
| Location | geo_locations countries | "HK" → ["HK"] |
| Budget | daily_budget (in dollars) | "$200/day" → 20000 cents |
| CTA | call_to_action type | "Shop Now" → SHOP_NOW |
| Destination URL | link | "https://…" |

## BM-3 — Show ONE review card (no individual questions)

```steps
{"title":"Campaign Setup — Please confirm","steps":[
  {"label":"Campaign","description":"[Objective] — [Date] · PAUSED","priority":"high"},
  {"label":"Audience","description":"[Country] · Ages [min]–[max] · Broad targeting","priority":"high"},
  {"label":"Daily Budget","description":"[Amount + Currency]","priority":"high"},
  {"label":"Creatives","description":"[N] images/videos ready to launch","priority":"high"},
  {"label":"CTA","description":"[CTA or SHOP_NOW default]","priority":"medium"}
]}
```

End with: **"Looks right? Reply 'yes' to create the campaign & ad set."**

## BM-4 — On "yes"

1. create_campaign() with parsed objective → save campaign_id
2. create_ad_set() with parsed targeting + budget → save adset_id
3. Parse uploaded_assets from the original message tokens:
   - Each `[Uploaded image: FILENAME, image_hash: HASH]` → { filename, type: "image", image_hash }
   - Each `[Uploaded video: FILENAME, video_id: ID]` → { filename, type: "video", video_id }
4. update_workflow_context({ data: { campaign_id, campaign_objective, optimization_goal, conversion_destination, adset_id, page_id, bulk_mode: true, uploaded_assets: [...] } })
5. IMMEDIATELY transfer_to_agent("creative_builder") — no text before or after.

## Fallback
If no parseable objective AND no budget → use standard wizard flow (show objective options card).
