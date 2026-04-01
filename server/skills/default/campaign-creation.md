---
name: campaign-creation
description: Complete campaign creation — from strategy to launch. Covers guided, materials-based, boost, bulk, and clone scenarios.
layer: pipeline
preview: "Stage 1: Conversions campaign, $50/day, Hong Kong\nStage 2: Lookalike 1% from purchasers\nStage 3: Video ad + 3 copy variations → Launch"
---

# Campaign Creation

## Scenario Router

Parse user intent and pick the matching scenario:

| Scenario | Signal | Section |
|---|---|---|
| A: Materials | Message has `[Uploaded image:` or `[Uploaded video:` tokens | §materials-path |
| B: Boost | Message has "boost", "promote a post", "existing post" | §boost-path |
| C: Guided | No materials, no boost, no doc, no clone | §guided-path |
| D: Bulk | Message has `[Document:` prefix + mentions creating campaigns from doc | §bulk-path |
| E: Clone | Message has "duplicate", "clone", "copy campaign" + campaign reference | §clone-path |

---

## FIRST ACTIONS (parallel, no preamble)

```
get_workflow_context()
get_ad_account_details()
get_minimum_budgets()
get_pages()
```

**STOP — only these 4 calls. Do NOT call `get_custom_audiences()`, `get_saved_audiences()`, or any other API here. Audience data is fetched in Stage 2 only.**

Then detect scenario from the table above and jump to the matching section.

---

## Shared: 3-Stage Framework

### Golden Rules

1. **3-stage UX** — Always show all 3 stages as `setupcard` blocks. Completed = `status:"done"`, current = `status:"active"`, future = `status:"pending"`.
2. **NO API calls yet** — Do NOT create campaign/ad_set in Stages 1-3. Just collect info into `workflow_context`. Execution happens in the Ad Launcher phase.
3. **Smart defaults** — Pre-fill everything possible. User only confirms or edits.
4. **No typing required** — Every choice uses `options`, `quickreplies`, or dropdown (`options` with `layout:"dropdown"`). Never ask the user to type free text.
5. **Pre-confirm validation** — All required fields must have values before Confirm works. If any required field is empty/placeholder when user clicks Confirm, highlight the missing field(s) and re-show the card.

### Smart Defaults (pre-fill, NEVER ask)

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

### Data-Informed Defaults (optional enhancement)

If workflow_context contains `insights_summary` or `top_performing` data (from a previous analyst session), use it to inform Stage 1 defaults:

- **Budget**: If past campaigns in the same objective have avg daily spend, suggest that as default instead of minimum × 2.
- **Audience hint**: If a specific audience consistently outperforms, mention it in Stage 2 as a recommendation tag.
- **CTA**: If a specific CTA outperforms for this objective, default to it.

Show a subtle note when data-informed: `"💡 Based on your past campaign performance"` as `detail` on the relevant item.

This is optional — if no historical data exists, fall back to standard smart defaults.

---

## §materials-path

### STAGE 1: Strategy (Brief Mode — assets present)

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
["✅ Confirm Stage 1", "Rebuild"]
```

Items with `editable:true` already have inline Edit buttons — no need for "Change location"/"Change budget" quickreplies.

Then proceed to Stage 2 (§shared-stage2) on confirm.

---

## §boost-path

### STAGE 1: Boost Setup

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
["✅ Confirm Stage 1", "Rebuild"]
```

For duration edits:
```quickreplies
["3 days", "7 days", "14 days", "30 days"]
```

Then proceed to Stage 2 (§shared-stage2) on confirm. Stage 3 is skipped for boost — goes straight to Ad Launcher.

---

## §guided-path

### STAGE 1: Strategy (Guided — no materials)

**First response** — show 3 stages with objective picker INSIDE Stage 1 as inline select:

```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","items":[
  {"label":"Goal","value":"Select your campaign goal...","icon":"target","type":"select","options":[
    {"id":"OUTCOME_SALES","title":"Sales (銷售)","description":"Drive purchases, WhatsApp conversations, or website conversions"},
    {"id":"OUTCOME_LEADS","title":"Leads (潛在客戶)","description":"Collect leads via forms, Messenger, or WhatsApp"},
    {"id":"OUTCOME_TRAFFIC","title":"Traffic (流量)","description":"Send people to your website or app"},
    {"id":"OUTCOME_AWARENESS","title":"Awareness (知名度)","description":"Reach people likely to remember your ads"},
    {"id":"OUTCOME_ENGAGEMENT","title":"Engagement (互動)","description":"More likes, comments, shares, or video views"}
  ]}
]}
```

```setupcard
{"phase":2,"status":"pending","title":"Stage 2: Audience","subtitle":"Complete Stage 1 first","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Complete Stage 2 first","items":[]}
```

Do NOT show the objective as a separate `options` block — it must be inside the Stage 1 setupcard.

**After user picks objective** — show COMPLETE Stage 1 with ALL fields inside the card. If the objective needs a destination (Sales/Messages/Leads), include it as an inline select. Do NOT use separate quickreplies or options blocks — everything goes inside the setupcard.

**IMPORTANT: Every editable field MUST include an `options` array.** The frontend uses this to show an inline dropdown when user clicks Edit — no chat roundtrip needed. The user picks a value from the dropdown, it sends the selection, and the agent re-renders the card with the updated value.

**Sales/Messages objective** — includes destination select:
```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","items":[
  {"label":"Goal","value":"[Objective]","icon":"target","editable":true,"options":[
    {"id":"OUTCOME_SALES","title":"Sales (銷售)"},
    {"id":"OUTCOME_LEADS","title":"Leads (潛在客戶)"},
    {"id":"OUTCOME_TRAFFIC","title":"Traffic (流量)"},
    {"id":"OUTCOME_AWARENESS","title":"Awareness (知名度)"},
    {"id":"OUTCOME_ENGAGEMENT","title":"Engagement (互動)"}
  ]},
  {"label":"Destination","value":"Select destination...","icon":"target","type":"select","options":[
    {"id":"whatsapp","title":"WhatsApp","description":"Send customers to WhatsApp chat"},
    {"id":"website","title":"Website (網站)","description":"Drive traffic to your website"},
    {"id":"messenger","title":"Messenger","description":"Start Messenger conversations"},
    {"id":"instagram_dm","title":"Instagram DM","description":"Start Instagram Direct conversations"}
  ]},
  {"label":"Location","value":"[Account country]","icon":"target","editable":true,"options":[
    {"id":"HK","title":"Hong Kong"},{"id":"TW","title":"Taiwan"},{"id":"SG","title":"Singapore"},
    {"id":"MY","title":"Malaysia"},{"id":"US","title":"United States"},{"id":"UK","title":"United Kingdom"}
  ]},
  {"label":"Budget","value":"[Smart default + currency]/day","icon":"dollar","editable":true,"options":[
    {"id":"10000","title":"HK$100/day"},{"id":"20000","title":"HK$200/day"},
    {"id":"50000","title":"HK$500/day"},{"id":"100000","title":"HK$1,000/day"}
  ]},
  {"label":"Page","value":"[Page Name]","icon":"shield","editable":true,"options":[POPULATE_FROM_get_pages]},
  {"label":"CTA","value":"[Auto CTA]","icon":"sparkles","editable":true,"options":[
    {"id":"WHATSAPP_MESSAGE","title":"Send WhatsApp Message"},{"id":"SHOP_NOW","title":"Shop Now"},
    {"id":"LEARN_MORE","title":"Learn More"},{"id":"SIGN_UP","title":"Sign Up"}
  ]}
]}
```

**Leads objective** — different destination options:
```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","items":[
  {"label":"Goal","value":"Leads (潛在客戶)","icon":"target","editable":true,"options":[SAME_AS_ABOVE]},
  {"label":"Destination","value":"Select destination...","icon":"target","type":"select","options":[
    {"id":"whatsapp","title":"WhatsApp","description":"Collect leads via WhatsApp"},
    {"id":"lead_form","title":"Lead Form","description":"Use Facebook lead form"},
    {"id":"website","title":"Website","description":"Send to website landing page"}
  ]},
  {"label":"Location","value":"...","icon":"target","editable":true,"options":[SAME_COUNTRIES]},
  {"label":"Budget","value":"...","icon":"dollar","editable":true,"options":[SAME_BUDGETS]},
  {"label":"Page","value":"...","icon":"shield","editable":true,"options":[FROM_get_pages]},
  {"label":"CTA","value":"...","icon":"sparkles","editable":true,"options":[SAME_CTAS]}
]}
```

**Traffic/Awareness/Engagement** — no destination row:
```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy","items":[
  {"label":"Goal","value":"[Objective]","icon":"target","editable":true,"options":[SAME_OBJECTIVES]},
  {"label":"Location","value":"...","icon":"target","editable":true,"options":[SAME_COUNTRIES]},
  {"label":"Budget","value":"...","icon":"dollar","editable":true,"options":[SAME_BUDGETS]},
  {"label":"Page","value":"...","icon":"shield","editable":true,"options":[FROM_get_pages]},
  {"label":"CTA","value":"...","icon":"sparkles","editable":true,"options":[SAME_CTAS]}
]}
```

Use the account's actual currency for budget options. Populate Page options from `get_pages()` results.

All objectives share these pending stages:

```setupcard
{"phase":2,"status":"pending","title":"Stage 2: Audience","subtitle":"Complete Stage 1 first","items":[]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Complete Stage 2 first","items":[]}
```

```quickreplies
["✅ Confirm Stage 1"]
```

**RULES:**
1. Every editable field includes `options` array — Edit opens dropdown client-side, no extra chat message.
2. Only quickreply allowed is the confirm/action button. NO "Change location", "Change budget", etc.
3. `type:"select"` items (like Destination) show as dropdown immediately. `editable:true` items show as text with a hover Edit button that opens the dropdown.

**SMART PARSING**: If user provides multiple details in one message (e.g. "Sales campaign, WhatsApp, HK, $200/day"), parse ALL values and pre-fill everything. Go straight to the review card.

Then proceed to Stage 2 (§shared-stage2) on confirm.

---

## §bulk-path

### When to Use

Load when ALL of these are true:
1. User uploaded a document (message contains `[Document:` prefix)
2. Message mentions creating campaigns/ads from the doc
3. The document contains a table-like structure with campaign plan data

### Step 1 — Parse the Document

Extract a campaign plan table from the document. Look for columns like:

| Expected Column | Aliases | Required? |
|---|---|---|
| Stage / Funnel | TOFU, MOFU, BOFU, Awareness, Consideration, Conversion | Optional — used for campaign naming |
| Objective | objective, goal, campaign_type | Required |
| Video ID | video_id, creative_id, video | Optional |
| Audience ID | audience_id, custom_audience, targeting | Optional |
| Budget | daily_budget, budget, spend | Required |
| Placement | placement, publisher_platforms | Optional — default Advantage+ |
| Geo | country, location, geo | Optional — default from account |
| Age | age_min, age_max, age_range | Optional — default 18-65 |
| Gender | gender | Optional — default All |

If the document is not a clear table, ask the user to clarify the structure.

### Step 2 — Validate All IDs

Run these checks **in parallel** before showing the summary:

1. **Video IDs**: Call `get_video` for each unique video_id. If any returns error, flag it.
2. **Audience IDs**: Call `get_custom_audience` for each unique audience_id. If any returns error, flag it.
3. **Pages**: Call `get_pages` to get available pages for ad creative.
4. **Account**: Call `get_ad_account_details` + `get_minimum_budgets` to validate budgets.
5. **Pixels**: If any campaign has conversion objective, call `get_pixels` to verify tracking.

Show validation results:

```score
{"label":"Bulk Plan Validation","score":N,"max":TOTAL,"items":[
  {"label":"Video: 真正的減脂...","status":"good"},
  {"label":"Audience: Website Visitors 30d","status":"good"},
  {"label":"Budget: $50/day (min $X)","status":"good"},
  {"label":"Video ID 999999 not found","status":"bad"}
]}
```

If any critical validation fails (video/audience not found), show the error and ask user to fix. Do NOT proceed to creation.

### Step 3 — Show Summary for Confirmation

Present ALL campaigns in a single setupcard:

```setupcard
{"title":"Bulk Campaign Plan","status":"active","phase":"Review","icon":"sparkles","items":[
  {"label":"Campaign 1","value":"TOFU · Reach · Video: 減脂... · $50/day","type":"text"},
  {"label":"Campaign 2","value":"MOFU · Traffic · Video: Onda Pro... · $30/day","type":"text"},
  {"label":"Campaign 3","value":"BOFU · Conversions · Audience: Purchasers · $100/day","type":"text"},
  {"label":"Total Daily Budget","value":"$180/day","type":"text"}
]}
```

Then ask:

```quickreplies
["Create all campaigns (PAUSED)", "Edit a campaign", "Cancel"]
```

### Step 4 — Execute in Sequence

For each campaign row, execute in order:

#### 4a. Create Campaign
```
create_campaign({
  name: "[Stage] — [Objective] — [Today's Date]",
  objective: MAPPED_OBJECTIVE,
  special_ad_categories: [],
  status: "PAUSED"
})
```

#### 4b. Create Ad Set
```
create_ad_set({
  campaign_id: CAMPAIGN_ID,
  name: "[Stage] Ad Set",
  daily_budget: BUDGET_IN_CENTS,
  optimization_goal: MAPPED_GOAL,
  billing_event: "IMPRESSIONS",
  bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  targeting: {
    geo_locations: { countries: [GEO] },
    age_min: AGE_MIN, age_max: AGE_MAX,
    custom_audiences: AUDIENCE_ID ? [{ id: AUDIENCE_ID }] : undefined
  },
  status: "PAUSED"
})
```

#### 4c. Create Ad Creative (if video/image provided)
```
create_ad_creative({
  name: "[Stage] Creative",
  object_story_spec: {
    page_id: PAGE_ID,
    video_data: { video_id: VIDEO_ID, title: "...", message: "..." }
  }
})
```

#### 4d. Create Ad
```
create_ad({
  adset_id: ADSET_ID,
  creative_id: CREATIVE_ID,
  name: "[Stage] Ad",
  status: "PAUSED"
})
```

After each campaign is created, update progress:

```metrics
[
  {"label":"Campaign 1 (TOFU)","value":"✅ Created","trend":"up"},
  {"label":"Campaign 2 (MOFU)","value":"⏳ Creating..."},
  {"label":"Campaign 3 (BOFU)","value":"⏳ Pending"}
]
```

### Step 5 — Final Summary

After all campaigns are created:

```metrics
[
  {"label":"Campaigns Created","value":"3"},
  {"label":"Total Daily Budget","value":"$180"},
  {"label":"Status","value":"All PAUSED"}
]
```

```quickreplies
["Activate all campaigns", "Review Campaign 1", "Run preflight check", "Done"]
```

### Bulk Error Handling

- If a campaign creation fails mid-batch, **stop and report** which campaigns succeeded and which failed. Do NOT retry automatically.
- Save all created IDs to workflow_context so the user can resume or clean up.
- If budget is below minimum, warn and suggest the minimum instead of failing silently.

### After Bulk Completion

Save created campaign IDs to workflow_context:
```
update_workflow_context({ data: {
  bulk_campaigns: [
    { campaign_id: "...", adset_id: "...", ad_id: "...", stage: "TOFU", status: "PAUSED" },
    ...
  ]
}})
```

Transfer back to ad_manager.

---

## §clone-path

### When to Use

User says "duplicate Campaign X", "clone this campaign", "copy campaign [name/ID]".

### Step 1 — Fetch the Source Campaign

```
copy_campaign(campaign_id)
```

This returns the full campaign structure: campaign settings, ad set targeting, creative specs, and budget.

### Step 2 — Show 3 Stages Pre-Filled from Original

Show all 3 stages with values copied from the source campaign. Every field is editable so the user can modify before creation.

```setupcard
{"phase":1,"status":"active","title":"Stage 1: Strategy (Cloned)","items":[
  {"label":"Source","value":"[Original campaign name]","icon":"sparkles"},
  {"label":"Goal","value":"[Original objective]","icon":"target","editable":true,"options":[
    {"id":"OUTCOME_SALES","title":"Sales (銷售)"},
    {"id":"OUTCOME_LEADS","title":"Leads (潛在客戶)"},
    {"id":"OUTCOME_TRAFFIC","title":"Traffic (流量)"},
    {"id":"OUTCOME_AWARENESS","title":"Awareness (知名度)"},
    {"id":"OUTCOME_ENGAGEMENT","title":"Engagement (互動)"}
  ]},
  {"label":"Location","value":"[Original country]","icon":"target","editable":true,"options":[COUNTRY_LIST]},
  {"label":"Budget","value":"[Original budget + currency]/day","icon":"dollar","editable":true,"options":[BUDGET_OPTIONS]},
  {"label":"Page","value":"[Original page]","icon":"shield","editable":true,"options":[FROM_get_pages]},
  {"label":"CTA","value":"[Original CTA]","icon":"sparkles","editable":true,"options":[CTA_OPTIONS]}
]}
```

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience (Cloned)","items":[
  {"label":"Strategy","value":"[Original audience type]","icon":"sparkles","editable":true,"options":[
    {"id":"saved","title":"Use Saved Audience"},
    {"id":"custom","title":"Build Custom Targeting"},
    {"id":"lookalike","title":"Lookalike Audience"}
  ]},
  {"label":"Audience","value":"[Original audience name/targeting summary]","icon":"target","editable":true}
]}
```

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative (Cloned)","items":[
  {"label":"Format","value":"[Original format]","icon":"sparkles"},
  {"label":"Creative","value":"[Original creative filename(s)]","icon":"sparkles"},
  {"label":"Ad Copy","value":"[Original primary text — first 60 chars]","icon":"target","editable":true},
  {"label":"Headline","value":"[Original headline]","icon":"target","editable":true},
  {"label":"CTA","value":"[Original CTA]","icon":"target"}
]}
```

```quickreplies
["✅ Create Clone", "Edit Stage 1", "Edit Stage 2", "Edit Stage 3", "Cancel"]
```

### Step 3 — On Confirm

If user clicks "Create Clone" without edits, save all cloned values to workflow_context and proceed directly to the Ad Launcher phase with `creation_stage: "execution"`.

If user edits any stage, re-show that stage as `status:"active"` with all fields editable and the modified values. After confirming edits, return to the clone overview.

### Step 4 — Execution

Same as standard Ad Launcher flow. Campaign name defaults to `"[Original Name] — Copy [Today's Date]"`.

---

## §shared-stage2

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
  // Materials path only:
  bulk_mode: true/false,
  uploaded_assets: [...],
  // Boost path only:
  boost_mode: true/false,
  object_story_id: "[PAGEID_POSTID]",
  boost_duration_days: 7
}})
```

Then proceed to Stage 2 (Audience) below.

---

## STAGE 2: Audience

**FIRST**, fetch audience data now (deferred from Stage 1 for speed):
```
get_custom_audiences()
get_saved_audiences()
```

Show all 3 stages with Stage 1 done. Stage 2 has the audience strategy as an inline `type:"select"` inside the card — NO separate options block, NO quickreplies for choices.

**If saved/custom audiences exist:**

```setupcard
{"phase":1,"status":"done","collapsed":true,"title":"Stage 1: Strategy ✅","subtitle":"[Objective] · [Destination] · [Country] · [Budget]/day","items":[
  {"label":"Goal","value":"[Objective] ([Destination])","icon":"target"},
  {"label":"Location","value":"[Country]","icon":"target"},
  {"label":"Budget","value":"[Amount + currency]/day","icon":"dollar"},
  {"label":"Page","value":"[Page Name]","icon":"shield"}
]}
```

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Select targeting strategy...","icon":"sparkles","type":"select","options":[
    {"id":"saved","title":"Use Saved Audience","description":"Pick from your [N] existing audiences"},
    {"id":"custom","title":"Build Custom Targeting","description":"Define interests, demographics, behaviors with AI help"},
    {"id":"lookalike","title":"Lookalike Audience","description":"Find people similar to your existing customers"}
  ]}
]}
```

```setupcard
{"phase":3,"status":"pending","title":"Stage 3: Creative","subtitle":"Complete Stage 2 first","items":[]}
```

**If NO saved/custom audiences exist:**

Same structure but only Custom and Lookalike options in the select.

**No Broad option.** Do not offer Broad (Advantage+) targeting.

### After user picks a strategy

**Saved Audience** — show audience list as second inline select:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Saved Audience","icon":"sparkles","editable":true,"options":[
    {"id":"saved","title":"Use Saved Audience"},
    {"id":"custom","title":"Build Custom Targeting"},
    {"id":"lookalike","title":"Lookalike Audience"}
  ]},
  {"label":"Audience","value":"Select an audience...","icon":"target","type":"select","options":[
    {"id":"AUDIENCE_ID_1","title":"[Audience name]","description":"[type] · ~[size] people · Updated [date]"},
    {"id":"AUDIENCE_ID_2","title":"[Audience name]","description":"[targeting summary]"}
  ]}
]}
```

After user picks an audience:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Saved Audience","icon":"sparkles","editable":true,"options":[SAME_STRATEGIES]},
  {"label":"Audience","value":"[Audience name]","icon":"target","editable":true,"options":[SAME_AUDIENCE_LIST]},
  {"label":"Size","value":"~[N] people","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2"]
```

**Build Custom** — transfer to audience_strategist:

```
update_workflow_context({ data: { ...current, creation_stage: "stage2_custom_audience" } })
transfer_to_agent("audience_strategist")
```

The audience_strategist builds targeting and saves to workflow_context, then transfers back. On return, show:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Custom Targeting","icon":"sparkles","editable":true,"options":[SAME_STRATEGIES]},
  {"label":"Targeting","value":"[Summary — e.g. Women 25-40, Beauty & Skincare]","icon":"target"},
  {"label":"Interests","value":"[Interest list]","icon":"target"},
  {"label":"Est. Reach","value":"~[N] people","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2"]
```

**Lookalike** — show source audience + percentage as inline selects:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Lookalike","icon":"sparkles","editable":true,"options":[SAME_STRATEGIES]},
  {"label":"Source","value":"Select source audience...","icon":"target","type":"select","options":[
    {"id":"AUD_1","title":"[Custom audience name]","description":"[type] · ~[size] people"}
  ]},
  {"label":"Percentage","value":"Select similarity...","icon":"target","type":"select","options":[
    {"id":"1","title":"1% — Most similar"},
    {"id":"3","title":"3% — Balanced"},
    {"id":"5","title":"5% — Broader"},
    {"id":"10","title":"10% — Widest"}
  ]}
]}
```

After both selected, call `create_lookalike_audience(source_audience_id, country, percentage)`, then show:

```setupcard
{"phase":2,"status":"active","title":"Stage 2: Audience","items":[
  {"label":"Strategy","value":"Lookalike","icon":"sparkles","editable":true,"options":[SAME_STRATEGIES]},
  {"label":"Source","value":"[Source audience name]","icon":"target"},
  {"label":"Percentage","value":"[X]%","icon":"target"},
  {"label":"Est. Size","value":"~[N] people","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 2"]
```

---

## STAGE 2 → STAGE 3 TRANSITION

When user confirms Stage 2:

Update workflow context:
```
update_workflow_context({ data: {
  ...current,
  creation_stage: "stage3",
  audience_type: "saved" | "custom" | "lookalike",
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

Then proceed to Creative Assembly (Stage 3) below.

---

## Creative Assembly (Stage 3)

### Golden Rules

1. **Show all 3 stages** — Stage 1 & 2 as `status:"done"` collapsed, Stage 3 as `status:"active"`.
2. **Never ask user to type ad copy** — Always auto-generate 3 variations and let user pick.
3. **Analyze visuals before writing copy** — Call `analyze_creative_visual()` to understand what's in the image/video.
4. **No API calls for campaign/ad_set** — Just collect creative info. Execution in Ad Launcher.
5. **Boost path is instant** — Zero user interaction, skip straight to Ad Launcher.

### FIRST ACTIONS (no preamble)

```
get_workflow_context()
```

Detect path from workflow state:
- `bulk_mode: true` AND `uploaded_assets` → **Materials sub-flow**
- `boost_mode: true` → **Boost sub-flow** — skip to Ad Launcher immediately
- Otherwise → **Guided sub-flow**

### Show 3-Stage Progress

Every response in Stage 3 must show all 3 stages. Build Stage 1 and 2 summaries from workflow_context:

```setupcard
{"phase":1,"status":"done","collapsed":true,"title":"Stage 1: Strategy ✅","subtitle":"[Objective] · [Country] · [Budget]/day","items":[
  {"label":"Goal","value":"[Objective] ([Destination])","icon":"target"},
  {"label":"Location","value":"[Country]","icon":"target"},
  {"label":"Budget","value":"[Budget]/day","icon":"dollar"}
]}
```

```setupcard
{"phase":2,"status":"done","collapsed":true,"title":"Stage 2: Audience ✅","subtitle":"[Audience type] · [Summary]","items":[
  {"label":"Strategy","value":"[Broad / Saved audience name / Custom targeting / Lookalike]","icon":"sparkles"}
]}
```

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","subtitle":"[Current step]","items":[...]}
```

### Materials Sub-flow (assets pre-uploaded)

Assets are already uploaded (`uploaded_assets` in workflow context). Skip upload entirely.

**Multi-image format choice** — If `uploaded_assets.length >= 2`:

```options
{"title":"I see [N] images. How should I use them?","options":[
  {"id":"carousel","title":"Carousel Ad","description":"1 ad with [N] scrollable cards — great for showcasing multiple products"},
  {"id":"separate","title":"[N] Separate Ads","description":"A/B test which image performs best"}
]}
```

If only 1 asset, skip this step.

**Visual analysis + copy generation:**

Call `get_ad_images()` to get image URLs by `image_hash`. For videos, use video_id.

Call `analyze_creative_visual(media_urls, context)` with the resolved URLs and campaign context (objective, destination, product/brand).

**Optional: Creative Strategist consultation** — If the user has existing running ads in the account, consider transferring to creative_strategist for differentiation advice:
```
update_workflow_context({ data: { ...current, creation_stage: "stage3_creative_review" } })
transfer_to_agent("creative_strategist")
```
The creative_strategist will compare the new visual against existing ads and save suggestions to workflow_context. On return, use `creative_analysis` and `creative_suggestions` to inform copy generation. Skip this if the user has no running ads or if it would slow down the flow unnecessarily.

**CRITICAL: Use the visual analysis to write copy.** Copy MUST reference what's in the image (e.g. if image shows a beauty product, copy must be about beauty, not generic).

**Generate copy variations:**

For each asset (or for the carousel), produce a `copyvariations` block.

**Write FULL primary text (50–125 words per variation).** Not a tagline — this is the final ad copy.

**Include `image_url` from `get_ad_images()` so the thumbnail shows next to the copy:**

```copyvariations
{"label":"Creative 1 — [filename]","image_url":"[URL from get_ad_images permalink_url]","variations":[
  {"id":"A","primary":"Full 50-125 word ad copy referencing visual analysis...","headline":"Headline (max 40 chars)","cta":"[CTA from workflow]"},
  {"id":"B","primary":"Different angle or tone...","headline":"Alt Headline","cta":"[CTA]"},
  {"id":"C","primary":"Third variation...","headline":"Third Headline","cta":"[CTA]"}
]}
```

Update Stage 3 card:

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","items":[
  {"label":"Creatives","value":"[N] image(s) ready ✓","icon":"sparkles"},
  {"label":"Ad Copy","value":"Pick a variation below","icon":"target"}
]}
```

Ask: **"Which variation for each creative? Reply e.g. 'A, B, A' or 'all A'."**

```quickreplies
["Use A for all", "Use B for all", "Use C for all"]
```

**Parse selection:**

| Reply | Meaning |
|---|---|
| `A,B,A` or `1,2,1` | Per-creative choice |
| `all A` or `all 1` | Same for all |
| Single letter/digit | Same for all |

### Boost Sub-flow (zero interaction)

Boost mode uses the existing post as creative. Nothing to configure.

Immediately proceed to Ad Launcher:

```
update_workflow_context({ data: { ...current, creation_stage: "execution", ad_format: "EXISTING_POST" } })
```

### Guided Sub-flow (no materials)

**Format selection:**

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","subtitle":"Choose your ad format","items":[]}
```

```options
{"title":"Choose your ad format","options":[
  {"id":"IMAGE","title":"Single Image","description":"One static image — best for simple, clear messaging"},
  {"id":"VIDEO","title":"Single Video","description":"Video ad — best for storytelling and engagement"},
  {"id":"CAROUSEL","title":"Carousel","description":"2–10 scrollable cards — showcase multiple products"},
  {"id":"EXISTING_POST","title":"Boost Existing Post","description":"Promote a post already on your Page"}
]}
```

If user picks EXISTING_POST, switch to boost mode: fetch posts, let user pick, then update workflow as boost_mode and proceed to Ad Launcher.

**Upload prompt:**

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","items":[
  {"label":"Format","value":"[Selected format]","icon":"sparkles"},
  {"label":"Upload","value":"Drop your [image/video] below ↓","icon":"target"}
]}
```

```quickreplies
["Browse existing images", "Browse existing videos"]
```

For "Browse existing images": call `get_ad_images()` → show as dropdown.
For "Browse existing videos": call `get_ad_videos()` → show as dropdown.

Specs reminder (only if needed):
- Image: 1080×1080 (1:1) Feed, 1080×1920 (9:16) Stories. Max 30MB. JPG/PNG.
- Video: MP4/MOV. Max 4GB.
- Carousel: 2–10 images, each with headline + URL.

**After upload received:**

User uploads file → frontend sends message with `[Uploaded image: FILENAME, image_hash: HASH]` or `[Uploaded video: FILENAME, video_id: ID]`.

For video: call `get_ad_video_status(video_id)`. If not "ready", show "Video processing..." and poll.

For carousel: keep asking for more images until user has 2–10, then proceed.

**Visual analysis + copy generation** — same as Materials sub-flow above.

**Language rules:**
- HK → Traditional Chinese / Cantonese
- TW → Traditional Chinese
- CN → Simplified Chinese
- Otherwise → English

**Tone by industry:**
| Industry | Tone |
|---|---|
| Fashion / Beauty / Lifestyle | Aspirational, emotion-driven |
| F&B / Food | Sensory, cravings-focused, urgency |
| Healthcare / Wellness | Trust-building, benefit-focused |
| Tech / SaaS | Feature-driven, problem-solving |
| Retail / E-commerce | Offer-led, urgency, social proof |

For WhatsApp/Messenger destination: copy must invite conversation. End with soft CTA.

### Stage 3 Confirmation

After user picks copy variation(s), show final Stage 3 summary:

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","items":[
  {"label":"Format","value":"[IMAGE / VIDEO / CAROUSEL]","icon":"sparkles"},
  {"label":"Creative","value":"[filename(s)]","icon":"sparkles"},
  {"label":"Copy","value":"Variation [X] selected","icon":"target"},
  {"label":"Headline","value":"[Selected headline]","icon":"target"},
  {"label":"CTA","value":"[CTA type]","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 3", "Rebuild"]
```

### Save and Transfer to Ad Launcher

```
update_workflow_context({ data: {
  ...current,
  creation_stage: "execution",
  ad_format: "IMAGE" | "VIDEO" | "CAROUSEL",
  creative_specs: [
    { asset_index: 0, variation: "A", primary_text: "...", headline: "...", cta: "..." },
    ...
  ]
}})
```

---

## Ad Launcher (Execution)

All 3 stages are complete. This phase:
1. Shows final review card
2. Creates campaign → ad set → creative → ad (all PAUSED)
3. Runs preflight check
4. Shows ad preview
5. Activates on user confirmation

### Golden Rules

1. **Max 2 user confirmations**: review ("yes to create") + go live ("yes to activate").
2. **No Pixel / UTM step** — skip entirely.
3. **Silent preflight** — if all checks pass, don't show anything, just proceed to preview.
4. **Never guess IDs** — read everything from `get_workflow_context()`.
5. **Pre-confirm validation** — Before showing the review card, verify all required fields have real values (not placeholders). If any field is missing, go back to the relevant stage.

### FIRST ACTIONS (no preamble)

```
get_workflow_context()
```

Read ALL settings from workflow context:
- `campaign_objective`, `optimization_goal`, `conversion_destination`
- `country`, `daily_budget_cents`, `page_id`, `cta_type`, `campaign_name`
- `audience_type`, `audience_id`, `targeting_spec`, `lookalike_audience_id`
- `bulk_mode`, `uploaded_assets`, `boost_mode`, `object_story_id`
- `ad_format`, `creative_specs`

Detect mode:
- `creative_specs` array length >= 2 → **BULK MODE**
- `boost_mode: true` → **BOOST MODE**
- Otherwise → **STANDARD MODE**

### Step 1 — Final Review Card (HARD STOP)

Show all 3 stages as done, plus a final review:

```setupcard
{"phase":1,"status":"done","collapsed":true,"title":"Stage 1: Strategy ✅","subtitle":"[Objective] · [Country] · [Budget]/day","items":[]}
```

```setupcard
{"phase":2,"status":"done","collapsed":true,"title":"Stage 2: Audience ✅","subtitle":"[Audience summary]","items":[]}
```

```setupcard
{"phase":3,"status":"done","collapsed":true,"title":"Stage 3: Creative ✅","subtitle":"[Format] · [N] creative(s)","items":[]}
```

Then show the full review:

```setupcard
{"phase":3,"title":"Final Review — Ready to Create?","subtitle":"Everything will be created PAUSED first","items":[
  {"label":"Campaign Name","value":"[campaign_name]","icon":"target","editable":true},
  {"label":"Ad Set Name","value":"[Objective] Ad Set — [Today's Date]","icon":"target","editable":true},
  {"label":"Ad Name","value":"[campaign_name] — Ad","icon":"target","editable":true},
  {"label":"Destination","value":"[WhatsApp / Website URL / Lead Form]","icon":"target"},
  {"label":"Page","value":"[Page Name]","icon":"shield"},
  {"label":"Audience","value":"[Audience summary — audience name / targeting summary]","icon":"sparkles"},
  {"label":"Budget","value":"[AMOUNT + CURRENCY]/day","icon":"dollar"},
  {"label":"Creative","value":"[Format] · [N] creative(s) · [filename(s)]","icon":"sparkles"},
  {"label":"Ad Copy","value":"[Selected headline — first 40 chars]","icon":"target"}
]}
```

Users can click Edit on Campaign Name / Ad Set Name / Ad Name to rename before creation.

When user edits a name: update `workflow_context` with the new name and re-show the review card with the change applied.

**"Should I create this ad?"**

```quickreplies
["✅ Yes, create it", "Cancel"]
```

Do NOT call any create tool until user confirms.

### Step 2 — Create Everything

**CRITICAL: Execute STRICTLY in sequence — one call at a time. Wait for each response before calling the next. Do NOT call multiple create tools in parallel. Each step depends on the ID from the previous step.**

On user confirmation:

#### 2a — Create Campaign

```
create_campaign(
  name: "[campaign_name]",
  objective: "[campaign_objective]",
  status: "PAUSED",
  special_ad_categories: []
)
```
→ Save `campaign_id`.

#### 2b — Create Ad Set

Build targeting spec from workflow context:

**Saved audience** — use `audience_id` directly in the ad set's `targeting` field.

**Custom targeting** — use `targeting_spec` from workflow.

**Lookalike** — use `lookalike_audience_id` in custom_audiences.

```
create_ad_set(
  campaign_id: "[campaign_id]",
  name: "[Objective] Ad Set — [Today's Date]",
  optimization_goal: "[optimization_goal]",
  billing_event: "IMPRESSIONS",
  bid_strategy: "LOWEST_COST_WITHOUT_CAP",
  daily_budget: [daily_budget_cents],
  status: "PAUSED",
  targeting: [built targeting object]
)
```
→ Save `adset_id`.

#### 2c — Create Creative(s)

For each entry in `creative_specs`:

Build `object_story_spec` using the reference formats below.

```
create_ad_creative(
  name: "[filename] Creative — [Today's Date]",
  object_story_spec: [JSON string]
)
```
→ Save `creative_id` (or `creative_ids` for bulk).

**For Boost mode:** Use `object_story_id` directly:
```json
{"page_id": "[page_id]", "object_story_id": "[object_story_id]"}
```

Show progress inline:
> ✅ Campaign created
> ✅ Ad Set created
> ✅ Creative created

For video assets: call `get_ad_video_status(video_id)` first. If not ready, wait.

#### 2d — Create Ad(s)

**Standard/Boost:**
```
create_ad(
  adset_id: "[adset_id]",
  name: "[Campaign Name] — Ad",
  creative_id: "[creative_id]",
  status: "PAUSED"
)
```

**Bulk:**
```
create_ads_bulk({ ads: creative_ids.map((id, i) => ({
  adset_id: "[adset_id]",
  name: "[Campaign Name] — Ad [i+1]",
  creative_id: id,
  status: "PAUSED"
}))})
```

Show bulk result as table:
| # | Creative | Status |
|---|---|---|
| 1 | [filename] | ✅ Created |
| 2 | [filename] | ✅ Created |

If any fail: "Creative [N] failed — continue without it or retry?"

### Step 3 — Preflight (silent if clean)

```
preflight_check(campaign_id: "[campaign_id]")
```

- **All pass** → Silent. Proceed to preview.
- **FAIL** → HALT. Show failures as `steps` block. Tell user what to fix.
- **Warnings only** → Brief inline note, ask to confirm.

### Step 4 — Preview

**Normal mode (real ad_id):**

Call both in parallel:
```
get_ad_preview(ad_id: "[ad_id]", ad_format: "MOBILE_FEED_STANDARD")
get_ad_preview(ad_id: "[ad_id]", ad_format: "DESKTOP_FEED_STANDARD")
```

```adpreview
[
  {"format": "MOBILE_FEED_STANDARD", "html": "[body from first call]"},
  {"format": "DESKTOP_FEED_STANDARD", "html": "[body from second call]"}
]
```

**For bulk mode:** Preview first ad only, note "Showing preview for creative 1 of [N]."

**Dev mode fallback** (ad_id starts with `DEV_AD_`):

Show draft preview as setupcard with image URL from `get_ad_images()`:

```setupcard
{"phase":3,"title":"Ad Preview (Draft)","subtitle":"Development Mode — real preview available in Live Mode","items":[
  {"label":"Image","value":"[filename]","icon":"sparkles"},
  {"label":"Headline","value":"[headline]","icon":"target"},
  {"label":"Primary Text","value":"[copy preview — first 60 chars]","icon":"target"},
  {"label":"CTA","value":"[CTA type]","icon":"target"}
]}
```

### Step 5 — Go Live

Ask: **"Ready to go live?"**

```quickreplies
["🚀 Launch now", "Keep paused", "Edit something"]
```

On "Launch now":

```
update_campaign(campaign_id: "[campaign_id]", status: "ACTIVE")
update_ad_set(ad_set_id: "[adset_id]", status: "ACTIVE")
update_ad(ad_id: "[ad_id]", status: "ACTIVE")
```

For bulk: activate all ads.

### Step 6 — Handoff

Update workflow and transfer back:

```
update_workflow_context({ data: {
  ad_id: "[id]",
  ad_ids: [...],  // bulk
  activation_status: "ACTIVE",
  clear_task: true
}})
```

Transfer back to root: `transfer_to_agent("ad_manager")`

Root agent shows success:

```metrics
[
  {"label": "Campaign", "value": "[Name]", "trend": "up"},
  {"label": "Status", "value": "✅ Live", "trend": "up"},
  {"label": "Daily Budget", "value": "[Amount + Currency]"},
  {"label": "Ads", "value": "[N] active"}
]
```

```quickreplies
["Check performance in 24h", "Create another campaign", "Build a retargeting audience"]
```

---

## Edit Stage (going back)

When user clicks "Edit" on a completed stage or says "I want to edit Stage [N]":

- **Edit Stage 1** (while in Stage 2): Reset `creation_stage` to `"stage1"`, re-show Stage 1 as `status:"active"` with all values pre-filled and editable. Stage 2/3 revert to `"pending"`.
- **Edit Stage 1 or 2** (while in Stage 3): Same pattern — reset the stage and re-show. All later stages revert to `"pending"`.

```
update_workflow_context({ data: { ...current, creation_stage: "stage1" } })
```

Then re-render from that stage as if the user just arrived, but with all fields pre-filled from the existing workflow context.

**Edit from Stage 3 back:**

1. Update workflow_context: `creation_stage: "stage1"` or `"stage2"`
2. Re-render from the target stage with fields pre-filled.

---

## Recovery Rule

If `get_workflow_context()` already has data:
- `creation_stage: "stage2"` AND `targeting_spec` exists → Returning from audience_strategist. Skip Stage 1, show Stage 2 with targeting already filled (show the confirmation card, not the strategy picker).
- `creation_stage: "stage2"` AND no `targeting_spec` → Skip Stage 1, show Stage 2 audience strategy picker.
- `creation_stage: "stage3"` → Skip Stage 1+2, proceed to Creative Assembly.
- `creation_stage: "stage2_custom_audience"` → Transfer to audience_strategist.
- `creation_stage: "execution"` → Proceed to Ad Launcher.
- `campaign_id` exists but no `adset_id` → Something was partially created in a previous session. Show recovery options.

---

## Quick Reference

### Destination → optimization_goal Mapping

| Destination | optimization_goal |
|---|---|
| Website (purchase) | `OFFSITE_CONVERSIONS` |
| Website (traffic) | `LINK_CLICKS` |
| WhatsApp / Messenger / IG DM | `CONVERSATIONS` |
| Lead Form | `LEAD_GENERATION` |
| App | `APP_INSTALLS` |
| Post Boost | `POST_ENGAGEMENT` |

### Objective Mapping (Bulk)

| User Input | Meta Objective | optimization_goal |
|---|---|---|
| Reach / Awareness / TOFU | OUTCOME_AWARENESS | REACH |
| Traffic / Clicks / MOFU | OUTCOME_TRAFFIC | LINK_CLICKS or LANDING_PAGE_VIEWS |
| Conversions / Sales / BOFU | OUTCOME_SALES | OFFSITE_CONVERSIONS |
| Leads / Lead Gen | OUTCOME_LEADS | LEAD_GENERATION |
| Messages / WhatsApp | OUTCOME_ENGAGEMENT | CONVERSATIONS |
| App Installs | OUTCOME_APP_PROMOTION | APP_INSTALLS |
| Video Views | OUTCOME_AWARENESS | THRUPLAY |
| Engagement | OUTCOME_ENGAGEMENT | POST_ENGAGEMENT |

### CTA Mapping by Objective

| Objective | Default CTA |
|---|---|
| Sales | SHOP_NOW |
| Messages | WHATSAPP_MESSAGE |
| Leads | SIGN_UP |
| Traffic | LEARN_MORE |
| Engagement | — |
| Awareness | — |

### object_story_spec Formats

**IMAGE — Website:**
```json
{"page_id":"PAGE_ID","link_data":{"image_hash":"HASH","link":"URL","message":"Primary","name":"Headline","call_to_action":{"type":"SHOP_NOW","value":{"link":"URL"}}}}
```

**IMAGE — WhatsApp:**
```json
{"page_id":"PAGE_ID","link_data":{"image_hash":"HASH","message":"Primary","name":"Headline","call_to_action":{"type":"WHATSAPP_MESSAGE","value":{"whatsapp_phone_number":"+852..."}}}}
```

**VIDEO — Website:**
```json
{"page_id":"PAGE_ID","video_data":{"video_id":"ID","title":"Headline","message":"Primary","call_to_action":{"type":"SHOP_NOW","value":{"link":"URL"}}}}
```

**CAROUSEL:**
```json
{"page_id":"PAGE_ID","link_data":{"message":"Primary","child_attachments":[{"link":"URL","image_hash":"HASH","name":"Card headline","call_to_action":{"type":"SHOP_NOW"}}],"call_to_action":{"type":"SHOP_NOW"}}}
```

**EXISTING_POST:**
```json
{"page_id":"PAGE_ID","object_story_id":"PAGEID_POSTID"}
```

### Language Rules by Region

| Region | Language |
|---|---|
| HK | Traditional Chinese / Cantonese |
| TW | Traditional Chinese |
| CN | Simplified Chinese |
| Other | English |

### Tone by Industry

| Industry | Tone |
|---|---|
| Fashion / Beauty / Lifestyle | Aspirational, emotion-driven |
| F&B / Food | Sensory, cravings-focused, urgency |
| Healthcare / Wellness | Trust-building, benefit-focused |
| Tech / SaaS | Feature-driven, problem-solving |
| Retail / E-commerce | Offer-led, urgency, social proof |
