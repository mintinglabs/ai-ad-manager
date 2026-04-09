---
name: campaign-creation
description: Create campaigns end-to-end — collect what's missing, execute when ready.
layer: system
---

# Campaign Creation

## Approach

Be adaptive. Parse what the user already provided, identify what's missing, only ask for the gaps. Never re-ask for info already given.

## First Actions (parallel)

```
get_workflow_context()
get_ad_account_details()
get_minimum_budgets()
get_pages()
```

## Required Information

Collect ALL before execution. Skip what's already provided:

**Strategy**
- Objective (Sales, Leads, Traffic, Awareness, Engagement, App installs)
- Budget per day (default: account minimum × 2)
- Page (auto-select if only one)

**Audience**
- Location (default: ad account country)
- Targeting — broad, saved audience, custom audience, lookalike, or interests (default: Advantage+)

**Creative**
- Media — image(s) or video(s) (may already be uploaded)
- Ad copy — primary text, headline, description (auto-generate if not provided)
- CTA button (default based on objective)
- Destination URL or messaging app

## Smart Defaults (pre-fill, never ask)

| Field | Default |
|---|---|
| Campaign name | `[Objective] — [Today's Date]` |
| Bid strategy | LOWEST_COST_WITHOUT_CAP |
| Billing event | IMPRESSIONS |
| Age | 18-65 |
| Gender | All |
| Placements | Advantage+ automatic |

## Rules

1. Parse first, ask second — extract everything from the user's message before asking
2. Group questions — show what's collected, ask for all missing at once
3. Confirm before executing — show summary, get user OK
4. No API calls until confirmed — collect into workflow_context first

## Ad Copy Auto-Generation

If no ad copy provided, generate 3 variations:
- Hook — attention-grabbing first line
- Body — value proposition
- CTA — clear next step

## Execution

When all info collected and user confirms:

1. Create campaign (PAUSED): `create_campaign(name, objective, status: PAUSED)`
2. Create ad set: `create_ad_set(campaign_id, targeting, budget, optimization_goal)`
3. Create creative: `create_ad_creative(name, media, copy)`
4. Create ad: `create_ad(ad_set_id, creative_id, status: PAUSED)`
5. Preflight: `preflight_check(campaign_id)` — validate everything
6. Show results + preview
7. Activate on user confirmation: update status to ACTIVE
