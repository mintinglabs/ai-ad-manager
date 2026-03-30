---
name: campaign-setup
description: Campaign Strategy + Ad Set — Step 1 of 3. Detect path (Brief/Boost/Guided), collect only must-have inputs, show ONE review card, create campaign + ad set, transfer to creative_builder.
layer: pipeline
leads_to: [creative-assembly]
---

# SS1 — Campaign Strategy & Ad Set (Step 1 of 3)

## Golden Rules

1. **Detect the path first** — do NOT show a wizard unless the user has no materials and no post to boost.
2. **One review card per path** — never ask questions one by one. Batch everything into a single summary, then ask "yes to proceed".
3. **Smart defaults** — never ask for anything in the table below.
4. **Recovery** — if workflow already has `campaign_id` but no `adset_id`, skip to the ad-set step only.

---

## Smart Defaults (NEVER ask the user for these)

| Field | Default |
|---|---|
| Campaign name | `[Objective] — [Today's Date]` |
| special_ad_categories | `[]` |
| bid_strategy | `LOWEST_COST_WITHOUT_CAP` |
| billing_event | `IMPRESSIONS` |
| age_min / age_max | 18 / 65 |
| Gender | All (omit genders field) |
| Placements | Advantage+ (omit publisher_platforms) |
| Pixel / UTM tracking | Skip entirely — user adds later in Ads Manager |

---

## FIRST ACTIONS (parallel, no preamble)

```
get_workflow_context()
get_ad_account_details()
get_minimum_budgets()
get_pages()
get_custom_audiences()
get_saved_audiences()
```

The audience calls fetch existing audiences so the user can pick one instead of always using broad targeting.

Then detect the path:

---

## PATH A — Brief Mode (Drop + Brief)

**Trigger:** User message contains `[Uploaded image:` or `[Uploaded video:` tokens AND workflow is empty (no `campaign_id`).

### A-1 — Parse brief from natural language + tokens

Extract from the message:

| Signal | Extract | Default if missing |
|---|---|---|
| Objective / campaign type | `OUTCOME_XXX` | `OUTCOME_SALES` |
| Country / location | geo_locations countries | Ask in review card |
| Daily budget | amount in dollars | Ask in review card |
| Destination URL | link | None (omit if not present) |
| CTA | call_to_action type | `SHOP_NOW` |
| Gender | genders | all |
| Age range | age_min / age_max | 18 / 65 |
| Assets | uploaded_assets array | from tokens |

Parse each token:
- `[Uploaded image: FILENAME, image_hash: HASH]` → `{ filename, type: "image", image_hash: HASH }`
- `[Uploaded video: FILENAME, video_id: ID]` → `{ filename, type: "video", video_id: ID }`

If country or budget is missing from the brief, add a single line below the review card: "Please also confirm: **Country** and **Daily budget**." Do NOT show a separate wizard step.

### A-2 — Show ONE review card

```setupcard
{"phase":1,"title":"Campaign & Targeting","subtitle":"Review before creating","items":[
  {"label":"Campaign","value":"[Objective] — [Date]","detail":"Will be created PAUSED","icon":"target","editable":true},
  {"label":"Destination","value":"[WhatsApp / Website URL / Lead Form]","detail":"[URL or phone if applicable]","icon":"target","editable":true},
  {"label":"Audience","value":"[Country] · Ages 18–65","detail":"Broad targeting · Advantage+ placements","icon":"sparkles","editable":true},
  {"label":"Daily Budget","value":"[Amount + currency]/day","detail":"= [cents] cents","icon":"dollar","editable":true},
  {"label":"Creatives","value":"[N] image(s)/video(s) ready","icon":"sparkles"},
  {"label":"CTA","value":"[SHOP_NOW / WHATSAPP_MESSAGE / LEARN_MORE]","editable":true}
]}
```

End with quick replies (NOT plain text):

```quickreplies
["OK, proceed", "我想改預算", "我想改目標地區", "我想改 Audience"]
```

### A-3 — On "yes"

Run in sequence:
1. `create_campaign(name, objective, status: "PAUSED", special_ad_categories: [])` → save `campaign_id`
2. `create_ad_set(campaign_id, name: "[Objective] Ad Set — [Date]", optimization_goal, billing_event: "IMPRESSIONS", bid_strategy: "LOWEST_COST_WITHOUT_CAP", daily_budget: [cents], status: "PAUSED", targeting: {"geo_locations":{"countries":["XX"]},"age_min":18,"age_max":65,"targeting_optimization":"none"})` → save `adset_id`

If page_id — use the only page, or the first page if multiple (user can change in Ads Manager).

3. `update_workflow_context({ data: { campaign_id, campaign_objective, optimization_goal, conversion_destination, adset_id, page_id, bulk_mode: true, uploaded_assets: [...] } })`
4. Proceed to Phase 2 — Creative Assembly. Load `load_skill("creative-assembly")`.

---

## PATH B — Post Boost (Existing Post)

**Trigger:** User message contains "boost", "boost my post", "promote a post", "existing post", "promote this post", or similar.

### B-1 — Fetch and show post picker + ask country+budget together

Call `get_page_posts(page_id)` immediately (use the only page, or ask which page if 2+).

Show posts as options:
```options
{"title":"Which post do you want to boost?","options":[
  {"id":"PAGE_ID_POST_ID","title":"Post preview…","description":"Posted [date]"}
]}
```

In the **same message** below the picker, add one line:
> "Also: **Which country** should this reach, and what's your **daily budget**?"

### B-2 — Show ONE review card (after user replies)

```setupcard
{"phase":1,"title":"Boost Setup","subtitle":"Review before boosting","items":[
  {"label":"Post","value":"[Post preview — first 60 chars]","icon":"sparkles"},
  {"label":"Objective","value":"Engagement (Boost)","icon":"target"},
  {"label":"Audience","value":"[Country] · Ages 18–65 · Broad targeting","icon":"sparkles","editable":true},
  {"label":"Daily Budget","value":"[Amount + currency]/day","icon":"dollar","editable":true},
  {"label":"Page","value":"[Page Name]","icon":"shield"}
]}
```

```quickreplies
["OK, proceed", "我想改預算", "我想改目標地區"]
```

### B-3 — On "yes"

1. `create_campaign(name: "Boost — [Date]", objective: "OUTCOME_ENGAGEMENT", status: "PAUSED", special_ad_categories: [])` → save `campaign_id`
2. `create_ad_set(...)` with same smart defaults → save `adset_id`
3. `update_workflow_context({ data: { campaign_id, campaign_objective: "OUTCOME_ENGAGEMENT", optimization_goal: "POST_ENGAGEMENT", adset_id, page_id, boost_mode: true, object_story_id: "[PAGE_ID_POST_ID]" } })`
4. Proceed to Phase 2 — Creative Assembly. Load `load_skill("creative-assembly")`.

---

## PATH C — Guided (No Materials)

**Trigger:** User says "create campaign", "create an ad", "run an ad", "launch an ad", "I want to advertise" — no images/videos attached, no boost intent.

### C-1 — Objective card (first message)

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

### C-2 — ONE combined follow-up (after user picks objective)

Ask all remaining must-haves in a single message. Example for Sales:

> Got it — **Sales campaign**. A few quick details:
>
> 1. **Where do people go?** Website URL, WhatsApp number, or Lead Form?
> 2. **Which country** are you targeting?
> 3. **Daily budget?** (e.g. HKD 200/day)

Also show existing audiences if any were found in FIRST ACTIONS:

```options
{"title":"Audience (optional — default: Broad)","options":[
  {"id":"broad","title":"Broad Targeting","description":"Ages 18–65, all interests · Recommended for new campaigns","tag":"Default"},
  {"id":"AUDIENCE_ID_1","title":"[Custom audience name]","description":"[type] · [size if known]"},
  {"id":"AUDIENCE_ID_2","title":"[Saved audience name]","description":"[targeting summary]"},
  {"id":"new","title":"Build New Audience","description":"Create a custom or lookalike audience"}
]}
```

If no custom/saved audiences exist, skip the options card — just use broad targeting by default.
If user picks "Build New Audience", save current progress to workflow_context and `transfer_to_agent("audience_strategist")`.

For Awareness / Engagement: skip destination question (not required).
For Traffic: ask URL + country + budget.
For Leads: ask WhatsApp / Lead Form / Website + country + budget.

If user picks **Website**: silently call `get_pixels()`. If a pixel exists, use it. If not, use `optimization_goal: "LINK_CLICKS"`.

**SMART PARSING**: If the user answers all fields in one line (e.g. "WhatsApp, HK, HK$100"), parse ALL values and go straight to the review card. Do NOT ask follow-up questions for info already provided.

### C-3 — ONE review card (MANDATORY — always show this)

**CRITICAL: You MUST always render this `setupcard` block after collecting the required info. Never skip it. Never replace it with plain text.**

```setupcard
{"phase":1,"title":"Campaign & Targeting","subtitle":"Review before creating","items":[
  {"label":"Campaign","value":"[Objective] — [Date]","detail":"Will be created PAUSED","icon":"target","editable":true},
  {"label":"Destination","value":"[WhatsApp / Website URL / Lead Form]","detail":"[URL or phone if applicable]","icon":"target","editable":true},
  {"label":"Audience","value":"[Country] · Ages 18–65","detail":"Broad targeting · Advantage+ placements","icon":"sparkles","editable":true},
  {"label":"Daily Budget","value":"[Amount + currency]/day","icon":"dollar","editable":true},
  {"label":"Page","value":"[Page Name]","icon":"shield"}
]}
```

```quickreplies
["OK, proceed", "我想改預算", "我想改目標地區", "我想揀 Audience"]
```

### C-4 — On "yes" / "OK, proceed"

1. `create_campaign(...)` → save `campaign_id`
2. `create_ad_set(...)` with smart defaults + pixel_id if website destination → save `adset_id`
3. `update_workflow_context({ data: { campaign_id, campaign_objective, optimization_goal, conversion_destination, adset_id, page_id, whatsapp_phone_number: "[if WhatsApp]", pixel_id: "[if website+pixel]" } })`
4. Proceed to Phase 2 — Creative Assembly. Load `load_skill("creative-assembly")`.

---

## Recovery Rule

If `get_workflow_context()` shows `campaign_id` but no `adset_id`:
→ Skip PATH detection. Skip campaign creation. Go directly to creating the ad set.
→ Ask only: "Which country and what daily budget?" → show review card → create_ad_set → transfer.

---

## Destination → optimization_goal mapping

| Destination | optimization_goal |
|---|---|
| Website (purchase) | `OFFSITE_CONVERSIONS` |
| Website (lead) | `OFFSITE_CONVERSIONS` |
| Website (traffic) | `LINK_CLICKS` |
| WhatsApp / Messenger / Instagram DM | `CONVERSATIONS` |
| Lead Form | `LEAD_GENERATION` |
| Phone Calls | `CALL` |
| App | `APP_INSTALLS` |
| Post Boost | `POST_ENGAGEMENT` |

---

## Targeting spec — Broad (default)

```json
{
  "geo_locations": {"countries": ["HK"]},
  "age_min": 18,
  "age_max": 65,
  "targeting_optimization": "none"
}
```

Budget is always in **CENTS**: $200/day = 20000.
