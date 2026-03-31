---
name: bulk-campaign-setup
description: Create multiple campaigns at once from an uploaded document (CSV/Excel/PDF) containing campaign plan with stages, video IDs, audience IDs, and budgets
layer: pipeline
depends_on: [campaign-setup]
leads_to: [ad-launcher]
---

# Bulk Campaign Setup — Doc-to-Campaign Pipeline

Create multiple campaigns from a structured document the user uploaded. The document text is injected into the user's message by the system.

## When to Load This Skill

Load when ALL of these are true:
1. User uploaded a document (message contains `[Document:` prefix)
2. Message mentions creating campaigns/ads from the doc
3. The document contains a table-like structure with campaign plan data

## Golden Rules

1. **Parse first, confirm once, execute in sequence** — no interactive back-and-forth per campaign.
2. **Validate ALL IDs before creating anything** — check that video IDs, audience IDs, and page IDs actually exist.
3. **Show ONE summary card** — user confirms all campaigns at once, not one by one.
4. **Create everything PAUSED** — never auto-activate bulk campaigns. User activates manually.
5. **Use smart defaults** for any missing fields (same as campaign-setup skill).

---

## Step 1 — Parse the Document

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

---

## Step 2 — Validate All IDs

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

---

## Step 3 — Show Summary for Confirmation

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

---

## Step 4 — Execute in Sequence

For each campaign row, execute in order:

### 4a. Create Campaign
```
create_campaign({
  name: "[Stage] — [Objective] — [Today's Date]",
  objective: MAPPED_OBJECTIVE,
  special_ad_categories: [],
  status: "PAUSED"
})
```

### 4b. Create Ad Set
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

### 4c. Create Ad Creative (if video/image provided)
```
create_ad_creative({
  name: "[Stage] Creative",
  object_story_spec: {
    page_id: PAGE_ID,
    video_data: { video_id: VIDEO_ID, title: "...", message: "..." }
  }
})
```

### 4d. Create Ad
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

---

## Step 5 — Final Summary

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

---

## Objective Mapping

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

---

## Error Handling

- If a campaign creation fails mid-batch, **stop and report** which campaigns succeeded and which failed. Do NOT retry automatically.
- Save all created IDs to workflow_context so the user can resume or clean up.
- If budget is below minimum, warn and suggest the minimum instead of failing silently.

## After Completion

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
