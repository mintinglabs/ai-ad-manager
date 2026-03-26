---
name: ad-manager
description: Manage individual Facebook ads — create, update, delete, copy ads, preview how they look, and retrieve leads. Use this skill whenever the user wants to create a new ad, change ad status, link ads to creatives, preview ad appearance on different placements, get lead form submissions, or copy existing ads. Triggers for ad creation, ad preview, lead retrieval, and ad-level operations.
---

# Ad Manager

## API Endpoints

### List ads

```
GET /api/ads?adAccountId=act_XXX
```

Returns all ads for the ad account, including performance insights.

### Get a single ad

```
GET /api/ads/:id
```

Returns full details for a specific ad, including its creative, status, and tracking configuration.

### Create an ad

```
POST /api/ads
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| name | string | yes | Ad name |
| adset_id | string | yes | The ad set this ad belongs to |
| creative | object | yes | Must contain `creative_id` referencing an existing creative |
| status | string | no | See statuses below. Default: `PAUSED` |
| tracking_specs | array | no | Conversion tracking configuration |
| conversion_domain | string | no | Domain for conversion events (e.g., `example.com`) |

Example creative field:

```json
{
  "creative": {
    "creative_id": "123456789"
  }
}
```

### Update an ad

```
PATCH /api/ads/:id
```

Body (all fields optional):

| Field | Type | Notes |
|---|---|---|
| name | string | New ad name |
| status | string | See statuses below |
| creative | object | Link a different creative via `creative_id` |
| tracking_specs | array | Update conversion tracking |
| conversion_domain | string | Update conversion domain |

Use this to pause, resume, rename, or swap the creative on an existing ad.

### Delete an ad

```
DELETE /api/ads/:id
```

Permanently deletes the ad. To soft-delete, use PATCH to set status to `DELETED` or `ARCHIVED` instead.

### Copy an ad

```
POST /api/ads/:id/copies
```

Body:

| Field | Type | Notes |
|---|---|---|
| deep_copy | boolean | `true` duplicates the ad with its creative. `false` copies only the ad shell. Default: `false` |
| rename_strategy | string | How to name the copy (e.g., append " - Copy") |
| status_option | string | Status for the new ad (e.g., `PAUSED`) |

### Get leads for an ad

```
GET /api/ads/:id/leads
```

Returns lead form submissions collected by this ad. Only applicable to ads running with a lead generation objective and an attached lead form.

### Preview an ad

```
GET /api/ads/:id/previews?ad_format=DESKTOP_FEED_STANDARD
```

Returns an HTML preview of the ad as it would appear on the specified placement. Pass the desired format as a query parameter.

## Ad Statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Ad is running (delivery depends on parent campaign and ad set status) |
| `PAUSED` | Ad is paused; can be resumed by setting status to `ACTIVE` |
| `DELETED` | Soft-deleted; hidden from default views but retrievable |
| `ARCHIVED` | Archived; read-only, preserved for reporting |

An ad only delivers when its parent campaign AND ad set are also `ACTIVE`.

## Creative Linking

Ads do not contain creative content directly. Instead, each ad references a creative object by its `creative_id`. To change an ad's appearance:

1. Create or select a creative (see creative-manager skill).
2. PATCH the ad with `{ "creative": { "creative_id": "NEW_ID" } }`.

A single creative can be shared across multiple ads.

## Preview Formats

Use the `ad_format` query parameter to preview how the ad looks on different placements:

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

Multiple formats can be useful for reviewing creative appearance across placements before activating an ad.

## Lead Retrieval

The `/leads` endpoint returns submissions from lead forms attached to the ad. Each lead includes:

- Form field values (name, email, phone, etc.)
- Submission timestamp
- Lead ID

Leads are only available for ads using the `OUTCOME_LEADS` campaign objective with an attached lead form on the ad set.

## Ad Hierarchy

Ads sit at the bottom of the Facebook campaign hierarchy:

```
Campaign
 └── Ad Set (targeting, budget, schedule)
      └── Ad (creative reference, tracking, status)
```

Each ad must belong to exactly one ad set, specified by `adset_id` at creation time.

## Additional Workflows

### Policy Issue Detection

When you see Meta API errors mentioning "policy", "disapproved", "restricted", or ad review issues:
1. Identify the specific policy violation
2. Explain what policy was violated in plain language
3. Suggest specific text/creative changes to fix it
4. Offer to create a compliant version for approval

Common policy issues: misleading claims, personal attributes, restricted content, discriminatory targeting, before/after images, excessive text in images.

### Boost Existing Post Flow

When the user wants to promote an existing Facebook Page post:
1. Call `get_pages` to list their pages
2. Call `get_page_posts` with the page_id to show recent posts
3. Show posts as a table: | Post | Date | Likes | Comments | Shares |
4. User picks a post -- use the post ID
5. Create ad creative with `object_story_id` instead of `object_story_spec`:
   `{ "object_story_id": "PAGE_ID_POST_ID" }` (format: "pageId_postId")
6. This bypasses the need to create a new creative from scratch -- perfect for dev mode
7. Proceed with campaign -> ad set -> ad creation using this creative

### Ad Library / Competitor Research

When showing Ad Library results, output them in a special code block so the UI renders them as visual cards:

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
- After the cards, add a brief **Insights** section analyzing the competitor creative patterns
- If the API returns an authorization error, explain that the user needs to authorize Ad Library API access at facebook.com/ads/library/api
