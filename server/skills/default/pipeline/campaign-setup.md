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

## Data-Informed Defaults (optional enhancement)

If workflow_context contains `insights_summary` or `top_performing` data (from a previous analyst session), use it to inform Stage 1 defaults:

- **Budget**: If past campaigns in the same objective have avg daily spend, suggest that as default instead of minimum × 2.
- **Audience hint**: If a specific audience consistently outperforms, mention it in Stage 2 as a recommendation tag.
- **CTA**: If a specific CTA outperforms for this objective, default to it.

Show a subtle note when data-informed: `"💡 Based on your past campaign performance"` as `detail` on the relevant item.

This is optional — if no historical data exists, fall back to standard smart defaults.

---

## FIRST ACTIONS (parallel, no preamble)

```
get_workflow_context()
get_ad_account_details()
get_minimum_budgets()
get_pages()
```

**STOP — only these 4 calls. Do NOT call `get_custom_audiences()`, `get_saved_audiences()`, or any other API here. Audience data is fetched in Stage 2 only.**

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
["✅ Confirm Stage 1", "Rebuild"]
```

Items with `editable:true` already have inline Edit buttons — no need for "Change location"/"Change budget" quickreplies.

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
["✅ Confirm Stage 1", "Rebuild"]
```

For duration edits:
```quickreplies
["3 days", "7 days", "14 days", "30 days"]
```

### PATH C — Guided (no materials)

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

### Audience Sub-flow: Lookalike

User picks "Lookalike":

Show source + percentage as inline selects inside Stage 2:

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

## Edit Stage (going back)

When user clicks "Edit" on a completed stage or says "I want to edit Stage [N]":

- **Edit Stage 1** (while in Stage 2): Reset `creation_stage` to `"stage1"`, re-show Stage 1 as `status:"active"` with all values pre-filled and editable. Stage 2/3 revert to `"pending"`.
- **Edit Stage 1 or 2** (while in Stage 3): Same pattern — reset the stage and re-show. All later stages revert to `"pending"`.

```
update_workflow_context({ data: { ...current, creation_stage: "stage1" } })
```

Then re-render from that stage as if the user just arrived, but with all fields pre-filled from the existing workflow context.

---

## Recovery Rule

If `get_workflow_context()` already has data:
- `creation_stage: "stage2"` AND `targeting_spec` exists → Returning from audience_strategist. Skip Stage 1, show Stage 2 with targeting already filled (show the confirmation card, not the strategy picker).
- `creation_stage: "stage2"` AND no `targeting_spec` → Skip Stage 1, show Stage 2 audience strategy picker.
- `creation_stage: "stage3"` → Skip Stage 1+2, transfer to creative-assembly
- `creation_stage: "stage2_custom_audience"` → Transfer to audience_strategist
- `campaign_id` exists but no `adset_id` → Something was partially created in a previous session. Show recovery options.
