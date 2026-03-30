---
name: campaign-setup
description: Stage 1 (Strategy) + Stage 2 (Audience) — Collect campaign settings and targeting. NO Meta API calls — just collect info into workflow_context. Transfer to creative-assembly for Stage 3.
layer: pipeline
leads_to: [creative-assembly]
---

# Campaign Setup — Stage 1 (Strategy) + Stage 2 (Audience)

## Golden Rules

1. **3-stage UX** — Always show all 3 stages as `setupcard` blocks. Completed = `status:"done"`, current = `status:"active"`, future = `status:"pending"`.
2. **NO API calls yet** — Do NOT create campaign/ad_set here. Just collect info into `workflow_context`. Execution happens in ad-launcher.
3. **Smart defaults** — Pre-fill everything possible. User only confirms or edits.
4. **No typing required** — Every choice uses `options`, `quickreplies`, or dropdown (`options` with `layout:"dropdown"`). Never ask the user to type free text.
5. **Detect the path first** — Brief Mode (assets present), Boost Mode (post promotion), or Guided (nothing).

---

## Smart Defaults (pre-fill, NEVER ask)

| Field | Default |
|---|---|
| Campaign name | `[Objective] — [Today's Date]` |
| special_ad_categories | `[]` |
| bid_strategy | `LOWEST_COST_WITHOUT_CAP` |
| billing_event | `IMPRESSIONS` |
| age_min / age_max | 18 / 65 |
| Gender | All (omit genders field) |
| Placements | Advantage+ (omit publisher_platforms) |
| CTA | Based on objective (Sales→SHOP_NOW, Messages→WHATSAPP_MESSAGE, Leads→SIGN_UP, Traffic→LEARN_MORE) |

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

Then detect path:

- Message has `[Uploaded image:` or `[Uploaded video:` tokens → **PATH A (Brief Mode)**
- Message has "boost", "promote a post", "existing post" → **PATH B (Boost Mode)**
- Otherwise → **PATH C (Guided)**

---

## STAGE 1: Strategy

### PATH A — Brief Mode (assets present)

Parse from message:

| Signal | Extract | Default if missing |
|---|---|---|
| Objective | `OUTCOME_XXX` | `OUTCOME_SALES` |
| Country | geo_locations | Ad account country |
| Daily budget | amount | Account minimum × 2 |
| Destination URL | link | None |
| CTA | call_to_action type | Based on objective |
| Assets | uploaded_assets array | From tokens |

Parse tokens: `[Uploaded image: FILENAME, image_hash: HASH]` → `{ filename, type: "image", image_hash: HASH }`

Show Stage 1 pre-filled with all 3 stages visible:

```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","items":[
  {"label":"Goal","value":"[Objective]","icon":"target","editable":true},
  {"label":"Location","value":"[Country]","icon":"target","editable":true},
  {"label":"Budget","value":"[Amount + currency]/day","icon":"dollar","editable":true},
  {"label":"Page","value":"[Page Name]","icon":"shield","editable":true},
  {"label":"CTA","value":"[CTA type]","icon":"sparkles","editable":true},
  {"label":"Creatives","value":"[N] file(s) ready","icon":"sparkles"}
]}
```

```setupcard
{"phase":2,"status":"pending","title":"Stage 2: Audience","subtitle":"Complete Stage 1 first","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"[N] file(s) ready — will configure after audience","items":[]}
```

```quickreplies
["✅ Confirm Stage 1", "Change location", "Change budget", "Rebuild"]
```

### PATH B — Boost Mode

Call `get_page_posts(page_id)` immediately.

Show post picker as dropdown (many posts):

```options
{"title":"Which post do you want to boost?","layout":"dropdown","options":[
  {"id":"PAGEID_POSTID","title":"[Post text preview — 60 chars]","description":"Posted [date] · [likes] likes"},
  ...
]}
```

After user picks post, show Stage 1 pre-filled:

```setupcard
{"phase":1,"status":"active","title":"Stage 1: Boost Setup","items":[
  {"label":"Post","value":"[Post preview — 60 chars]","icon":"sparkles"},
  {"label":"Goal","value":"Engagement","icon":"target"},
  {"label":"Location","value":"[Country]","icon":"target","editable":true},
  {"label":"Budget","value":"[Amount + currency]/day","icon":"dollar","editable":true},
  {"label":"Duration","value":"7 days","icon":"sparkles","editable":true},
  {"label":"Page","value":"[Page Name]","icon":"shield"}
]}
```

```setupcard
{"phase":2,"status":"pending","title":"Stage 2: Audience","subtitle":"Complete Stage 1 first","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Skipped — using existing post","items":[]}
```

```quickreplies
["✅ Confirm Stage 1", "Change budget", "Change duration", "Rebuild"]
```

For duration edits:
```quickreplies
["3 days", "7 days", "14 days", "30 days"]
```

### PATH C — Guided (no materials)

**First response** — show 3 stages + objective picker:

```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","subtitle":"Choose your campaign goal","items":[]}
```

```setupcard
{"phase":2,"status":"pending","title":"Stage 2: Audience","subtitle":"Complete Stage 1 first","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Complete Stage 2 first","items":[]}
```

```options
{"title":"What's your campaign goal?","options":[
  {"id":"OUTCOME_SALES","title":"Sales","description":"Drive purchases, WhatsApp conversations, or website conversions"},
  {"id":"OUTCOME_LEADS","title":"Leads","description":"Collect leads via forms, Messenger, or WhatsApp"},
  {"id":"OUTCOME_TRAFFIC","title":"Traffic","description":"Send people to your website or app"},
  {"id":"OUTCOME_AWARENESS","title":"Awareness","description":"Reach people likely to remember your ads"},
  {"id":"OUTCOME_ENGAGEMENT","title":"Engagement","description":"More likes, comments, shares, or video views"}
]}
```

**After user picks objective** — propose COMPLETE Stage 1 with smart defaults.

For Messages/Leads objectives, ask destination first:
```quickreplies
["WhatsApp", "Messenger", "Instagram DM"]
```
or for Leads:
```quickreplies
["WhatsApp", "Lead Form", "Website"]
```

Then show full Stage 1 with everything pre-filled:

```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","items":[
  {"label":"Goal","value":"[Objective] ([Destination])","icon":"target","editable":true},
  {"label":"Location","value":"[Account country]","icon":"target","editable":true},
  {"label":"Budget","value":"[Smart default + currency]/day","icon":"dollar","editable":true},
  {"label":"Page","value":"[Page Name]","icon":"shield","editable":true},
  {"label":"CTA","value":"[Auto CTA]","icon":"sparkles","editable":true}
]}
```

```setupcard
{"phase":2,"status":"pending","title":"Stage 2: Audience","subtitle":"Complete Stage 1 first","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Complete Stage 2 first","items":[]}
```

```quickreplies
["✅ Confirm Stage 1", "Change location", "Change budget", "Rebuild"]
```

**SMART PARSING**: If user provides multiple details in one message (e.g. "Sales campaign, WhatsApp, HK, $200/day"), parse ALL values and pre-fill everything. Go straight to the review card.

### Handling Stage 1 Edits

When user clicks edit or says "Change location":
```quickreplies
["Hong Kong", "Taiwan", "Singapore", "Malaysia", "United States", "United Kingdom", "Other..."]
```

When user says "Change budget":
```quickreplies
["HK$100/day", "HK$200/day", "HK$500/day", "HK$1,000/day", "Other..."]
```

Use the account's currency for budget quickreplies.

After any edit, re-show the updated Stage 1 setupcard with the change applied.

---

## STAGE 1 → STAGE 2 TRANSITION

When user confirms Stage 1 ("✅ Confirm Stage 1" or similar affirmation):

Save Stage 1 data to workflow context:
```
update_workflow_context({ data: {
  creation_stage: "stage2",
  campaign_objective: "[OUTCOME_XXX]",
  optimization_goal: "[goal]",
  conversion_destination: "[destination]",
  country: "[XX]",
  daily_budget_cents: [amount in cents],
  page_id: "[page_id]",
  cta_type: "[CTA]",
  campaign_name: "[Objective] — [Today's Date]",
  // PATH A only:
  bulk_mode: true/false,
  uploaded_assets: [...],
  // PATH B only:
  boost_mode: true/false,
  object_story_id: "[PAGEID_POSTID]",
  boost_duration_days: 7
}})
```

Then proceed to Stage 2 (Audience) below.

---

## STAGE 2: Audience

Show all 3 stages with Stage 1 done:

```setupcard
{"phase":1,"status":"done","collapsed":true,"title":"Stage 1: Strategy ✅","subtitle":"[Objective] · [Destination] · [Country] · [Budget]/day","items":[
  {"label":"Goal","value":"[Objective] ([Destination])","icon":"target"},
  {"label":"Location","value":"[Country]","icon":"target"},
  {"label":"Budget","value":"[Amount + currency]/day","icon":"dollar"},
  {"label":"Page","value":"[Page Name]","icon":"shield"}
]}
```

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","subtitle":"Choose your targeting strategy","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Complete Stage 2 first","items":[]}
```

Then show audience options. Build the options dynamically based on what audiences exist in the account:

**If saved/custom audiences exist:**

```options
{"title":"How would you like to target?","options":[
  {"id":"broad","title":"Broad (Advantage+)","description":"Let Meta AI find your best customers — recommended for new campaigns","tag":"Recommended"},
  {"id":"saved","title":"Use Saved Audience","description":"Pick from your [N] existing audiences"},
  {"id":"custom","title":"Build Custom Targeting","description":"Define interests, demographics, behaviors with AI help"},
  {"id":"lookalike","title":"Lookalike Audience","description":"Find people similar to your existing customers"}
]}
```

**If NO saved/custom audiences exist:**

```options
{"title":"How would you like to target?","options":[
  {"id":"broad","title":"Broad (Advantage+)","description":"Let Meta AI find your best customers — recommended for new campaigns","tag":"Recommended"},
  {"id":"custom","title":"Build Custom Targeting","description":"Define interests, demographics, behaviors with AI help"},
  {"id":"lookalike","title":"Lookalike Audience","description":"Find people similar to your existing customers"}
]}
```

### Audience Sub-flow: Broad

User picks "Broad":

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Broad (Advantage+)","icon":"sparkles"},
  {"label":"Age Range","value":"18–65","icon":"target"},
  {"label":"Placements","value":"Advantage+ (all platforms)","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2", "Change strategy", "Rebuild"]
```

### Audience Sub-flow: Saved Audience

User picks "Use Saved Audience":

Show existing audiences as a searchable dropdown:

```options
{"title":"Select an audience","layout":"dropdown","options":[
  {"id":"AUDIENCE_ID_1","title":"[Custom audience name]","description":"[type] · ~[size] people · Updated [date]"},
  {"id":"AUDIENCE_ID_2","title":"[Saved audience name]","description":"[targeting summary]"},
  ...
]}
```

After user picks:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Audience","value":"[Audience name]","icon":"sparkles"},
  {"label":"Type","value":"[Custom / Saved / Lookalike]","icon":"target"},
  {"label":"Size","value":"~[N] people","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2", "Choose different audience", "Rebuild"]
```

### Audience Sub-flow: Build Custom

User picks "Build Custom":

Transfer to audience_strategist: `transfer_to_agent("audience_strategist")`

Before transferring, save current progress:
```
update_workflow_context({ data: { ...current, creation_stage: "stage2_custom_audience" } })
```

The audience_strategist will:
1. Ask user to describe their ideal customer (via quickreplies)
2. Call `targeting_search()` + `targeting_suggestions()`
3. Build targeting spec
4. Save to workflow_context: `{ targeting_spec: {...}, audience_description: "..." }`
5. Transfer back to executor

When executor receives control back, read workflow_context for the targeting spec and show:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Targeting","value":"[Summary — e.g. Women 25-40, Beauty & Skincare]","icon":"sparkles"},
  {"label":"Interests","value":"[Interest list]","icon":"target"},
  {"label":"Est. Reach","value":"~[N] people","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2", "Adjust targeting", "Use Broad instead", "Rebuild"]
```

### Audience Sub-flow: Lookalike

User picks "Lookalike":

Show source audiences as dropdown:

```options
{"title":"Select source audience","layout":"dropdown","options":[
  {"id":"AUD_1","title":"[Custom audience name]","description":"[type] · ~[size] people"},
  ...
]}
```

After source selected, ask percentage:

```quickreplies
["1% — Most similar", "3% — Balanced", "5% — Broader", "10% — Widest"]
```

After percentage selected, call `create_lookalike_audience(source_audience_id, country, percentage)`.

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Type","value":"Lookalike","icon":"sparkles"},
  {"label":"Source","value":"[Source audience name]","icon":"target"},
  {"label":"Percentage","value":"[X]%","icon":"target"},
  {"label":"Est. Size","value":"~[N] people","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2", "Change percentage", "Rebuild"]
```

---

## STAGE 2 → STAGE 3 TRANSITION

When user confirms Stage 2:

Update workflow context:
```
update_workflow_context({ data: {
  ...current,
  creation_stage: "stage3",
  audience_type: "broad" | "saved" | "custom" | "lookalike",
  // For saved:
  audience_id: "[ID]",
  // For custom:
  targeting_spec: { interests: [...], demographics: {...} },
  // For lookalike:
  lookalike_audience_id: "[ID]",
  lookalike_source_id: "[ID]",
  lookalike_percentage: 1
}})
```

Then transfer to creative-assembly for Stage 3:

```
load_skill("creative-assembly")
```

---

## Destination → optimization_goal mapping

| Destination | optimization_goal |
|---|---|
| Website (purchase) | `OFFSITE_CONVERSIONS` |
| Website (traffic) | `LINK_CLICKS` |
| WhatsApp / Messenger / IG DM | `CONVERSATIONS` |
| Lead Form | `LEAD_GENERATION` |
| App | `APP_INSTALLS` |
| Post Boost | `POST_ENGAGEMENT` |

---

## Recovery Rule

If `get_workflow_context()` already has data:
- `creation_stage: "stage2"` → Skip Stage 1, go to Stage 2
- `creation_stage: "stage3"` → Skip Stage 1+2, transfer to creative-assembly
- `campaign_id` exists but no `adset_id` → Something was partially created in a previous session. Show recovery options.
