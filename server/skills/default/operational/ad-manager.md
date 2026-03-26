---
name: ad-manager
description: Create, update, delete, copy, and preview Facebook ads with read-first safety guardrails
layer: operational
depends_on: [campaign-manager, targeting-audiences]
safety:
  - Always show current ad state before proposing changes
  - Warn before activating ads without creative review or preview
  - Deletions require explicit "delete" confirmation; suggest PAUSED or ARCHIVED first
  - Status changes display current vs proposed state
  - Bulk operations max 10 ads per batch with per-batch confirmation
---

# Ad Manager

## API Endpoints

### Read

```
GET /api/ads?adAccountId=act_XXX
```
Returns all ads for the ad account, including performance insights.

```
GET /api/ads/:id
```
Returns full details for a specific ad, including its creative, status, and tracking configuration.

```
GET /api/ads/:id/leads
```
Returns lead form submissions collected by this ad.

```
GET /api/ads/:id/previews?ad_format=DESKTOP_FEED_STANDARD
```
Returns an HTML preview of the ad for the specified placement.

### Create

```
POST /api/ads
```

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| name | string | yes | Ad name |
| adset_id | string | yes | The ad set this ad belongs to |
| creative | object | yes | Must contain `creative_id` referencing an existing creative |
| status | string | no | Default: `PAUSED` |
| tracking_specs | array | no | Conversion tracking configuration |
| conversion_domain | string | no | Domain for conversion events |

```
POST /api/ads/:id/copies
```

| Field | Type | Notes |
|---|---|---|
| deep_copy | boolean | `true` duplicates ad with its creative. Default: `false` |
| rename_strategy | string | How to name the copy |
| status_option | string | Status for the new ad (e.g., `PAUSED`) |

### Update

```
PATCH /api/ads/:id
```

| Field | Type | Notes |
|---|---|---|
| name | string | New ad name |
| status | string | See statuses below |
| creative | object | Link a different creative via `creative_id` |
| tracking_specs | array | Update conversion tracking |
| conversion_domain | string | Update conversion domain |

### Delete

```
DELETE /api/ads/:id
```
Permanently deletes the ad.

## Execution Workflow

Every write operation MUST follow this four-step pattern.

### Creating an Ad

**Step 1 READ** -- Fetch the target ad set and its existing ads to confirm context.

```
GET /api/adsets/:id
GET /api/adsets/:id/ads
```

Show current state:

```metrics
Ad Set: "Summer Promo - US 25-45"
Status: ACTIVE
Existing Ads: 3
Creative to attach: "Summer Banner v2" (creative_id: 120200...)
```

**Step 2 CONFIRM** -- Show what will be created.

```steps
Action: CREATE new ad
Ad Set: "Summer Promo - US 25-45"
Name: "Summer Banner v2 - Ad A"
Creative: 120200... ("Summer Banner v2")
Status: PAUSED (will not deliver until activated)
Tracking: pixel_id 123456, domain example.com
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
POST /api/ads
```

**Step 4 VERIFY** -- Confirm the ad was created.

```
GET /api/ads/:new_id
```

```metrics
Ad Created Successfully
ID: 120200...
Name: "Summer Banner v2 - Ad A"
Status: PAUSED
Creative: 120200...
```

```quickreplies
["Preview this ad", "Activate this ad", "Create another ad", "View all ads in this ad set"]
```

### Updating an Ad (Status, Creative, Name)

**Step 1 READ** -- Fetch current ad state.

```
GET /api/ads/:id
```

```metrics
Ad: "Summer Banner v2 - Ad A"
ID: 120200...
Current Status: PAUSED
Current Creative: 120200... ("Summer Banner v2")
```

**Step 2 CONFIRM** -- Show before/after.

```steps
Action: UPDATE ad 120200...
Change: status PAUSED → ACTIVE
```

If activating, check: Has the creative been previewed? If not, warn:
"This ad has not been previewed yet. I recommend previewing before activating."

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
PATCH /api/ads/:id
```

**Step 4 VERIFY** -- Confirm the change.

```
GET /api/ads/:id
```

```metrics
Ad Updated
Name: "Summer Banner v2 - Ad A"
Status: ACTIVE ✓
```

```quickreplies
["Preview this ad", "Pause this ad", "View ad performance", "Edit creative"]
```

### Deleting an Ad

**Step 1 READ** -- Fetch current ad state.

```
GET /api/ads/:id
```

```metrics
Ad: "Summer Banner v2 - Ad A"
Status: ACTIVE
Spend to date: $142.50
Impressions: 12,340
```

**Step 2 CONFIRM** -- Suggest alternatives first.

```steps
⚠ DESTRUCTIVE ACTION
You are about to permanently delete ad 120200...
Current status: ACTIVE (still delivering!)

Alternative options:
- PAUSED: stops delivery, can reactivate later
- ARCHIVED: read-only, preserved for reporting
- DELETE: permanent, cannot be undone
```

Ask: **"Type 'delete' to confirm permanent deletion, or choose PAUSED/ARCHIVED instead."**

**Step 3 EXECUTE** -- Only after user explicitly types "delete".

```
DELETE /api/ads/:id
```

**Step 4 VERIFY** -- Confirm deletion.

```metrics
Ad 120200... permanently deleted.
```

```quickreplies
["View remaining ads", "Create a new ad", "View ad set"]
```

### Ad Preview Before Going Live

Before activating any ad, offer a preview. Call:

```
GET /api/ads/:id/previews?ad_format=MOBILE_FEED_STANDARD
```

Show the preview and ask: "Does this look correct? Should I activate?"

### Boost Existing Post Flow

1. Call `GET /api/pages` to list pages.
2. Call `GET /api/pages/:id/posts` to show recent posts.
3. Show posts as a table: | Post | Date | Likes | Comments | Shares |
4. User picks a post -- use the post ID.
5. Create creative with `object_story_id` (format: `"pageId_postId"`) instead of `object_story_spec`.
6. Follow the standard create ad workflow above with this creative.

### Ad Library / Competitor Research

When showing Ad Library results, output in the `adlib` block format:

```adlib
[
  {
    "page_name": "Competitor Name",
    "status": "Active",
    "headline": "Ad headline text",
    "body": "Ad body/description text (first 150 chars)",
    "platforms": ["facebook", "instagram"],
    "started": "2025-01-15",
    "snapshot_url": "https://www.facebook.com/ads/library/?id=123456"
  }
]
```

Rules for ad library results:
- Always output as `adlib` JSON block -- the UI renders these as visual ad cards
- Include up to 12 results
- Truncate body text to ~150 chars
- Set status to "Active" if no ad_delivery_stop_time, otherwise "Ended"
- Extract headline from ad_creative_link_titles, body from ad_creative_bodies
- After the cards, add a brief **Insights** section analyzing competitor creative patterns

### Policy Issue Detection

When Meta API errors mention "policy", "disapproved", or "restricted":
1. Identify the specific policy violation
2. Explain what policy was violated in plain language
3. Suggest specific text/creative changes to fix it
4. Offer to create a compliant version

Common policy issues: misleading claims, personal attributes, restricted content, discriminatory targeting, before/after images, excessive text in images.

## Safety Guardrails

- **Status changes**: Always show current vs proposed state in a `steps` block before changing
- **Activation without preview**: Warn "This ad has not been previewed. Preview first?" before activating any ad that has not been previewed in this session
- **Deletions**: Always suggest PAUSED or ARCHIVED first; require explicit "delete" confirmation for permanent deletion
- **Bulk operations**: Max 10 ads per batch; show summary and confirm each batch
- **Active ad modifications**: Warn if modifying an ad that is currently ACTIVE and delivering

## Quick Reference

### Ad Statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Ad is running (delivery depends on parent campaign and ad set status) |
| `PAUSED` | Ad is paused; can be resumed |
| `DELETED` | Soft-deleted; hidden from default views but retrievable |
| `ARCHIVED` | Archived; read-only, preserved for reporting |

An ad only delivers when its parent campaign AND ad set are also `ACTIVE`.

### Preview Formats

| Format | Placement |
|---|---|
| `DESKTOP_FEED_STANDARD` | Facebook desktop News Feed |
| `MOBILE_FEED_STANDARD` | Facebook mobile News Feed |
| `INSTAGRAM_STANDARD` | Instagram feed |
| `INSTAGRAM_STORY` | Instagram Stories |
| `INSTAGRAM_REELS` | Instagram Reels |
| `RIGHT_COLUMN_STANDARD` | Facebook right column |
| `AUDIENCE_NETWORK_INSTREAM_VIDEO` | Audience Network in-stream video |
| `MARKETPLACE_MOBILE` | Facebook Marketplace on mobile |

### Creative Linking

Ads reference creatives by `creative_id`. To change an ad's appearance:
1. Create or select a creative (see creative-manager skill).
2. PATCH the ad with `{ "creative": { "creative_id": "NEW_ID" } }`.

A single creative can be shared across multiple ads.

### Ad Hierarchy

```
Campaign
 └── Ad Set (targeting, budget, schedule)
      └── Ad (creative reference, tracking, status)
```

### Lead Retrieval

The `/leads` endpoint returns submissions from lead forms attached to the ad. Each lead includes form field values, submission timestamp, and lead ID. Only available for ads using `OUTCOME_LEADS` objective with an attached lead form.
