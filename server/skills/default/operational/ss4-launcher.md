---
name: ss4-launcher
description: Review & Launch — Step 3 of 3. Review gate, create_ad, preflight_check (silent if clean), preview (mobile + desktop), activate, success summary.
layer: operational
depends_on: [ss3-creative]
leads_to: []
---

# SS4 — Ad Launcher (Step 3 of 3)

## Common Rule (ALL sub-agents)

**Read context.state.workflow first.** Before asking the user for any IDs or settings, check `context.state.workflow` for existing values (campaign_id, adset_id, creative_id, ad_format, conversion_destination, pixel_id, etc.). Never re-ask for information already saved in state.

---

## Step 1 — Review Gate (HARD STOP — user must confirm before proceeding)

Show ALL settings as a structured summary — never proceed without explicit "yes":

```steps
{"title":"Campaign Review — Ready to Launch","steps":[
  {"label":"Campaign","description":"[Name] · [Objective] · PAUSED","priority":"high"},
  {"label":"Destination","description":"[Destination]","priority":"high"},
  {"label":"Page","description":"[Page Name]","priority":"high"},
  {"label":"Creative","description":"[Format] · [Asset name — NOT raw hash] · [Headline]","priority":"high"},
  {"label":"Ad Copy","description":"[First 60 chars of primary text…] · CTA: [CTA label]","priority":"high"},
  {"label":"Audience","description":"[Country] · Ages [min]–[max] · [Gender] · [Strategy]","priority":"high"},
  {"label":"Placements","description":"[Placement choice]","priority":"medium"},
  {"label":"Budget","description":"[AMOUNT + CURRENCY]/day · [Schedule]","priority":"high"},
  {"label":"Tracking","description":"[Pixel event or 'Not required']","priority":"medium"}
]}
```

Ask: **"Should I create this campaign?"**

Do NOT call any create tool until user says yes.

---

## Step 2 — Review & Launch (single flow after confirmation)

### 2a — Create Ad

```
create_ad(
  adset_id: [from context.state.workflow],
  name: "[Campaign Name] — Ad",
  creative_id: [from context.state.workflow],
  status: "PAUSED"
)
```

### 2b — Preflight Check (run immediately after create_ad, no user prompt)

```
preflight_check(campaign_id: [from context.state.workflow])
```

**Preflight output rules:**
- All pass → **do NOT render a preflight steps block** — proceed directly to preview (silent)
- Any FAIL → **HALT**. Show failures as a `steps` block. Offer to route back to the relevant step.
- Warnings only → show a brief inline note, ask to confirm before continuing.

### 2c — Preview (run immediately after clean preflight)

Call `get_ad_preview()` twice in parallel:

```
get_ad_preview(ad_id: [new ad_id], ad_format: "MOBILE_FEED_STANDARD")
get_ad_preview(ad_id: [new ad_id], ad_format: "DESKTOP_FEED_STANDARD")
```

Output both as an `adpreview` block:

```adpreview
[
  {"format": "MOBILE_FEED_STANDARD", "html": "[body from first call]"},
  {"format": "DESKTOP_FEED_STANDARD", "html": "[body from second call]"}
]
```

Below the preview, ask: **"✅ Pre-flight passed. Ready to go live?"**

---

## Step 3 — Activate (only after explicit "yes")

Update all 3 entities to ACTIVE in sequence:

```
update_campaign(campaign_id: "[from workflow]", status: "ACTIVE")
update_ad_set(ad_set_id: "[adset_id from workflow]", status: "ACTIVE")
update_ad(ad_id: "[from workflow]", status: "ACTIVE")
```

---

## Step 4 — Handoff to ad_manager

After activation succeeds:
1. Call `update_workflow_context({ data: { ad_id: "[id]", activation_status: "ACTIVE" } })`
2. IMMEDIATELY call `transfer_to_agent("ad_manager")` — no text before the transfer.

`ad_manager` will deliver the final success summary and quick replies.

---

## What ad_manager says after receiving the handoff

When `ad_manager` receives the transfer back from `ad_launcher`, show:

```metrics
[
  {"label": "Campaign", "value": "[Name]", "trend": "up"},
  {"label": "Status", "value": "✅ Live", "trend": "up"},
  {"label": "Daily Budget", "value": "[Amount + Currency]"},
  {"label": "Objective", "value": "[Objective]"}
]
```

Then:
```quickreplies
["Check campaign status in 24h", "Create A/B test", "Save as template", "Build an audience", "Set up automation rule"]
```

---

# BULK LAUNCH MODE

## Trigger
get_workflow_context() returns creative_ids as an array with length ≥ 2.
Standard single-ad flow for creative_ids length ≤ 1 or when only creative_id (singular) is present.

## BL-1 — Review card (one card for all N ads)

```steps
{"title":"Bulk Launch — [N] Ads Ready","steps":[
  {"label":"Campaign","description":"[Name] · [Objective] · PAUSED","priority":"high"},
  {"label":"Ad Set","description":"[Audience summary] · [Budget]/day","priority":"high"},
  {"label":"Creatives","description":"[N] creatives ready: [comma list of filenames]","priority":"high"},
  {"label":"Format","description":"[IMAGE / VIDEO / mixed]","priority":"high"},
  {"label":"Status","description":"Will launch ACTIVE after confirmation","priority":"high"}
]}
```

Ask: **"Should I create all [N] ads and launch the campaign?"**
Do NOT call any tool until user confirms.

## BL-2 — On "yes" → create_ads_bulk

```
create_ads_bulk({ ads: creative_ids.map((id, i) => ({
  adset_id: [adset_id from workflow],
  name: "[Campaign Name] — Ad [i+1]",
  creative_id: id,
  status: "PAUSED"
}))})
```

Show compact result after the call:
| # | Creative | Status |
|---|---|---|
| 1 | [filename] | ✅ Created |
| 2 | [filename] | ❌ Failed — [error] |

If any failed, ask: "Continue without failed ads, or abort?"

## BL-3 — Preflight (silent if clean)

preflight_check(campaign_id: [from workflow])
- All pass → do NOT render a preflight block — proceed directly to preview
- Failures → show steps block, HALT
- Warnings only → brief inline note, ask to confirm

## BL-4 — Preview (first creative only, for speed)

get_ad_preview(ad_id: [ad_ids[0] from create_ads_bulk result], ad_format: "MOBILE_FEED_STANDARD")

Render as adpreview block. Add note below: "Showing preview for creative 1 of [N]. All ads use the same format."

Ask: **"✅ Pre-flight passed. Ready to go live? This will activate all [N] ads."**

## BL-5 — Activate (only after explicit "yes")

```
update_campaign(campaign_id: [from workflow], status: "ACTIVE")
update_ad_set(ad_set_id: [from workflow], status: "ACTIVE")
```
Then for each ad_id in create_ads_bulk result:
```
update_ad(ad_id: "[id]", status: "ACTIVE")
```

## BL-6 — Handoff

1. update_workflow_context({ data: { ad_ids: [...], activation_status: "ACTIVE" } })
2. IMMEDIATELY transfer_to_agent("ad_manager") — no text before the transfer.

ad_manager bulk success summary:
```metrics
[
  {"label":"Ads Created","value":"[N] ads","trend":"up"},
  {"label":"Status","value":"✅ All Live","trend":"up"},
  {"label":"Daily Budget","value":"[Amount + Currency]"},
  {"label":"Campaign","value":"[Name]"}
]
```
Then:
```quickreplies
["View campaign performance", "Create A/B test", "Build retargeting audience", "Save as template"]
```
