---
name: ss4-launcher
description: Review & Launch — Step 3 of 3. Review card (HARD STOP), create ad, silent preflight, preview, activate on "go live". No Pixel/UTM step. Max 2 user confirmations.
layer: operational
depends_on: [ss3-creative]
leads_to: []
---

# SS4 — Ad Launcher (Step 3 of 3)

## Golden Rules

1. **Max 2 user confirmations**: review card ("yes to create") + go live ("yes to activate").
2. **No Pixel / UTM step** — skip entirely. User adds tracking in Ads Manager later.
3. **Silent preflight** — if all checks pass, show nothing, just proceed to preview.
4. **Never guess** — read all IDs from `get_workflow_context()`.

---

## FIRST ACTIONS (parallel, no preamble)

```
get_workflow_context()
load_skill("ss4-launcher")
```

Detect mode from workflow state:
- `creative_ids` array length ≥ 2 → **BULK LAUNCH MODE** (see section below)
- Otherwise → **STANDARD FLOW** (below)

---

## STANDARD FLOW

### Step 1 — Review Card (HARD STOP)

Show all settings from workflow context. Ask for explicit confirmation before ANY create tool call.

```steps
{"title":"Campaign Review — Ready to Create?","steps":[
  {"label":"Campaign","description":"[Name] · [Objective] · PAUSED","priority":"high"},
  {"label":"Destination","description":"[Destination + URL / WhatsApp number / form name]","priority":"high"},
  {"label":"Page","description":"[Page Name]","priority":"high"},
  {"label":"Creative","description":"[Format] · [Asset name — NOT raw hash or ID]","priority":"high"},
  {"label":"Audience","description":"[Country] · Ages 18–65 · Broad targeting","priority":"high"},
  {"label":"Budget","description":"[AMOUNT + CURRENCY]/day","priority":"high"}
]}
```

Ask: **"Should I create this ad?"**

Do NOT call any create tool until user says yes / confirm / looks good / proceed.

---

### Step 2 — Create Ad

```
create_ad(
  adset_id: [from workflow],
  name: "[Campaign Name] — Ad",
  creative_id: [from workflow],
  status: "PAUSED"
)
```

---

### Step 3 — Preflight (run immediately after create_ad, no user prompt)

```
preflight_check(campaign_id: [from workflow])
```

- **All pass** → do NOT render a preflight block — proceed directly to preview (silent)
- **Any FAIL** → HALT. Show failures as a `steps` block. Tell user what to fix and offer to route back.
- **Warnings only** → brief inline note, ask to confirm before continuing.

---

### Step 4 — Preview (run immediately after clean preflight)

Call both in parallel:
```
get_ad_preview(ad_id: [new ad_id], ad_format: "MOBILE_FEED_STANDARD")
get_ad_preview(ad_id: [new ad_id], ad_format: "DESKTOP_FEED_STANDARD")
```

Output as:
```adpreview
[
  {"format": "MOBILE_FEED_STANDARD", "html": "[body from first call]"},
  {"format": "DESKTOP_FEED_STANDARD", "html": "[body from second call]"}
]
```

Ask: **"✅ Pre-flight passed. Ready to go live?"**

---

### Step 5 — Activate (only after explicit "yes")

```
update_campaign(campaign_id: "[from workflow]", status: "ACTIVE")
update_ad_set(ad_set_id: "[adset_id from workflow]", status: "ACTIVE")
update_ad(ad_id: "[from workflow]", status: "ACTIVE")
```

---

### Step 6 — Handoff

1. `update_workflow_context({ data: { ad_id: "[id]", activation_status: "ACTIVE" } })`
2. IMMEDIATELY `transfer_to_agent("ad_manager")` — no text before the transfer.

`ad_manager` delivers the final success summary and quick replies.

---

## BULK LAUNCH MODE

**Trigger:** `get_workflow_context()` returns `creative_ids` as an array with length ≥ 2.

### BL-1 — Review Card (one card for all N ads)

```steps
{"title":"Bulk Launch — [N] Ads Ready","steps":[
  {"label":"Campaign","description":"[Name] · [Objective] · PAUSED","priority":"high"},
  {"label":"Ad Set","description":"[Country] · Ages 18–65 · [Budget]/day","priority":"high"},
  {"label":"Creatives","description":"[N] creatives ready: [comma list of filenames]","priority":"high"},
  {"label":"Format","description":"[IMAGE / VIDEO / mixed]","priority":"high"},
  {"label":"Status","description":"Will launch ACTIVE after confirmation","priority":"high"}
]}
```

Ask: **"Should I create all [N] ads and launch the campaign?"**

Do NOT call any tool until user confirms.

### BL-2 — On "yes" → create_ads_bulk

```
create_ads_bulk({ ads: creative_ids.map((id, i) => ({
  adset_id: [adset_id from workflow],
  name: "[Campaign Name] — Ad [i+1]",
  creative_id: id,
  status: "PAUSED"
}))})
```

Show compact result:
| # | Creative | Status |
|---|---|---|
| 1 | [filename] | ✅ Created |
| 2 | [filename] | ❌ Failed — [error] |

If any failed: "Continue without failed ads, or abort?"

### BL-3 — Preflight (silent if clean)

```
preflight_check(campaign_id: [from workflow])
```
- All pass → silent, proceed to preview
- Failures → show steps block, HALT
- Warnings only → brief inline note, ask to confirm

### BL-4 — Preview (first creative only)

```
get_ad_preview(ad_id: [ad_ids[0] from bulk result], ad_format: "MOBILE_FEED_STANDARD")
```

Render as `adpreview` block. Add: "Showing preview for creative 1 of [N]. All ads use the same format."

Ask: **"✅ Pre-flight passed. Ready to go live? This will activate all [N] ads."**

### BL-5 — Activate (only after explicit "yes")

```
update_campaign(campaign_id: [from workflow], status: "ACTIVE")
update_ad_set(ad_set_id: [from workflow], status: "ACTIVE")
```
Then for each ad_id in the bulk result:
```
update_ad(ad_id: "[id]", status: "ACTIVE")
```

### BL-6 — Handoff

1. `update_workflow_context({ data: { ad_ids: [...], activation_status: "ACTIVE" } })`
2. IMMEDIATELY `transfer_to_agent("ad_manager")` — no text before the transfer.

---

## What ad_manager shows after handoff

When `ad_manager` receives the transfer back from `ad_launcher`:

```metrics
[
  {"label": "Campaign", "value": "[Name]", "trend": "up"},
  {"label": "Status", "value": "✅ Live", "trend": "up"},
  {"label": "Daily Budget", "value": "[Amount + Currency]"},
  {"label": "Objective", "value": "[Objective]"}
]
```

```quickreplies
["Check campaign status in 24h", "Create A/B test", "Save as template", "Build a retargeting audience"]
```
