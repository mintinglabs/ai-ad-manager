---
name: ad-launcher
description: Execution phase — All 3 stages confirmed. Show final review, create campaign + ad set + creative + ad, preflight, preview, activate. Max 2 user confirmations (review + go live).
layer: pipeline
depends_on: [creative-assembly]
leads_to: []
---

# Ad Launcher — Execution Phase

All 3 stages are complete. This phase:
1. Shows final review card
2. Creates campaign → ad set → creative → ad (all PAUSED)
3. Runs preflight check
4. Shows ad preview
5. Activates on user confirmation

## Golden Rules

1. **Max 2 user confirmations**: review ("yes to create") + go live ("yes to activate").
2. **No Pixel / UTM step** — skip entirely.
3. **Silent preflight** — if all checks pass, don't show anything, just proceed to preview.
4. **Never guess IDs** — read everything from `get_workflow_context()`.

---

## FIRST ACTIONS (no preamble)

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

---

## Step 1 — Final Review Card (HARD STOP)

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
  {"label":"Audience","value":"[Audience summary — Broad / audience name / targeting summary]","icon":"sparkles"},
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

---

## Step 2 — Create Everything

On user confirmation, execute in sequence:

### 2a — Create Campaign

```
create_campaign(
  name: "[campaign_name]",
  objective: "[campaign_objective]",
  status: "PAUSED",
  special_ad_categories: []
)
```
→ Save `campaign_id`.

### 2b — Create Ad Set

Build targeting spec from workflow context:

**Broad audience:**
```json
{
  "geo_locations": {"countries": ["[country]"]},
  "age_min": 18, "age_max": 65,
  "targeting_optimization": "none"
}
```

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

### 2c — Create Creative(s)

For each entry in `creative_specs`:

Build `object_story_spec` using the reference formats from creative-assembly.md.

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

### 2d — Create Ad(s)

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

---

## Step 3 — Preflight (silent if clean)

```
preflight_check(campaign_id: "[campaign_id]")
```

- **All pass** → Silent. Proceed to preview.
- **FAIL** → HALT. Show failures as `steps` block. Tell user what to fix.
- **Warnings only** → Brief inline note, ask to confirm.

---

## Step 4 — Preview

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

---

## Step 5 — Go Live

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

---

## Step 6 — Handoff

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
