---
name: ss4-launcher
description: Tracking, Review, Preflight & Launch — Step 4 of 4. Pixel/UTM setup, review gate, create_ad, preflight_check, preview (mobile + desktop), activate, success summary.
layer: operational
depends_on: [ss3-creative]
leads_to: []
---

# SS4 — Ad Launcher

## Common Rule (ALL sub-agents)

**Read context.state.workflow first.** Before asking the user for any IDs or settings, check `context.state.workflow` for existing values (campaign_id, adset_id, creative_id, ad_format, conversion_destination, pixel_id, etc.). Never re-ask for information already saved in state.

---

## Step 1 — Pixel & UTM (conditional)

**Skip entirely for:** WhatsApp, Messenger, Instagram DM, Phone Calls, Lead Form.

**For Website destinations only:**

If `pixel_id` is in `context.state.workflow`, confirm which conversion event to track:
```options
{"title":"Which conversion event should Meta optimise for?","options":[
  {"id":"PURCHASE","title":"Purchase","description":"Track completed transactions"},
  {"id":"LEAD","title":"Lead","description":"Track form submissions or sign-ups"},
  {"id":"COMPLETE_REGISTRATION","title":"Complete Registration"},
  {"id":"ADD_TO_CART","title":"Add to Cart"},
  {"id":"INITIATE_CHECKOUT","title":"Initiate Checkout"},
  {"id":"VIEW_CONTENT","title":"View Content"}
]}
```

Then UTM parameters:
```options
{"title":"Add UTM tracking?","options":[
  {"id":"AUTO","title":"Auto-generate UTMs","description":"utm_source=facebook&utm_medium=cpc&utm_campaign=[name]"},
  {"id":"CUSTOM","title":"Custom UTMs","description":"Set your own parameters"},
  {"id":"NONE","title":"Skip UTMs","description":"No URL tracking"}
]}
```

---

## Step 2 — Review Gate (HARD STOP — user must confirm before proceeding)

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
  {"label":"Tracking","description":"[Pixel event or 'Not required'] · [UTM status]","priority":"medium"}
]}
```

Ask: **"Should I create this campaign?"**

Do NOT call any create tool until user says yes.

---

## Step 3 — Create Ad

```
create_ad(
  adset_id: [from context.state.workflow],
  name: "[Campaign Name] — Ad",
  creative_id: [from context.state.workflow],
  status: "PAUSED"
)
```

---

## Step 4 — Preflight Check (NON-NEGOTIABLE)

```
preflight_check(campaign_id: [from context.state.workflow])
```

Present results as a checklist:

```steps
{"title":"Pre-flight Checklist","steps":[
  {"label":"Campaign objective set","description":"OUTCOME_SALES","priority":"high","status":"pass"},
  {"label":"Ad set with targeting & budget","description":"Found 1 ad set","priority":"high","status":"pass"},
  {"label":"Ad with creative","description":"Found 1 ad","priority":"high","status":"pass"},
  {"label":"Pixel configured","description":"Pixel 987654321","priority":"high","status":"pass"}
]}
```

- All pass → proceed to Step 5
- Any FAIL → **HALT**. Tell user what to fix. Offer to route back to the relevant step (audience → SS2, creative → SS3).
- Warnings only → show user, ask to confirm before continuing

---

## Step 5 — Preview

Call `get_ad_preview()` twice — once for each placement:

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

Ask: **"Pre-flight check passed. Ready to go live?"**

---

## Step 6 — Activate (only after explicit confirmation)

Update all 3 entities to ACTIVE in sequence:

```
update_campaign(campaign_id, status: "ACTIVE")
update_ad_set(adset_id, status: "ACTIVE")
update_ad(ad_id, status: "ACTIVE")
```

---

## Step 7 — Handoff to ad_manager

After activation succeeds:
1. Call `update_workflow_context({ ad_id, activation_status: "ACTIVE" })`
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
