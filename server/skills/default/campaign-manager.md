---
name: campaign-manager
description: Manage Facebook ad campaigns — create, update, pause, delete, copy campaigns and view campaign hierarchy (ad sets and ads within campaigns). Use this skill whenever the user wants to create a new campaign, change campaign status, adjust budgets, delete campaigns, duplicate campaigns, or view what's inside a campaign. Also triggers for questions about campaign objectives, bid strategies, or campaign structure.
---

# Campaign Manager

## API Endpoints

### List campaigns

```
GET /api/campaigns?adAccountId=act_XXX
```

Returns all campaigns for the ad account, including performance insights (spend, impressions, clicks, etc.).

### Create a campaign

```
POST /api/campaigns
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| name | string | yes | Campaign name |
| objective | string | yes | See objectives below |
| bid_strategy | string | no | See bid strategies below |
| daily_budget | number | no | In cents. Mutually exclusive with lifetime_budget |
| lifetime_budget | number | no | In cents. Mutually exclusive with daily_budget |
| spend_cap | number | no | In cents. Overall campaign spend limit |
| start_time | string | no | ISO 8601 datetime |
| stop_time | string | no | ISO 8601 datetime. Required if using lifetime_budget |

### Update a campaign

```
PATCH /api/campaigns/:id
```

Body (all fields optional):

| Field | Type | Notes |
|---|---|---|
| status | string | See statuses below |
| daily_budget | number | In cents |

Use this to pause, resume, or adjust budget on an existing campaign.

### Delete a campaign

```
DELETE /api/campaigns/:id
```

Permanently deletes the campaign. To soft-delete, use PATCH to set status to `DELETED` or `ARCHIVED` instead.

### Copy a campaign

```
POST /api/campaigns/:id/copies
```

Body:

| Field | Type | Notes |
|---|---|---|
| deep_copy | boolean | `true` copies ad sets and ads within the campaign. `false` copies only the campaign shell. Default: `false` |
| rename_strategy | string | How to name the copy (e.g., append " - Copy") |
| status_option | string | Status for the new campaign (e.g., `PAUSED`) |

### Get ad sets in a campaign

```
GET /api/campaigns/:id/adsets
```

Returns all ad sets belonging to the campaign. Use this to inspect campaign hierarchy.

### Get ads in a campaign

```
GET /api/campaigns/:id/ads
```

Returns all ads belonging to the campaign (across all ad sets).

## Campaign Objectives

| Objective | Use case |
|---|---|
| `OUTCOME_AWARENESS` | Brand awareness, reach |
| `OUTCOME_ENGAGEMENT` | Post engagement, page likes, event responses |
| `OUTCOME_LEADS` | Lead generation forms |
| `OUTCOME_SALES` | Conversions, catalog sales |
| `OUTCOME_TRAFFIC` | Drive traffic to a website or app |
| `OUTCOME_APP_PROMOTION` | App installs, app engagement |

## Bid Strategies

| Strategy | Behavior |
|---|---|
| `LOWEST_COST_WITHOUT_CAP` | Spend full budget for maximum results. No bid limit. Default strategy. |
| `LOWEST_COST_WITH_BID_CAP` | Get most results while keeping bid under a specified cap |
| `COST_CAP` | Get most results while keeping average cost per result under a target |
| `LOWEST_COST_WITH_MIN_ROAS` | Optimize for minimum return on ad spend |

## Campaign Statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Campaign is running |
| `PAUSED` | Campaign is paused; can be resumed by setting status to `ACTIVE` |
| `DELETED` | Soft-deleted; hidden from default views but retrievable |
| `ARCHIVED` | Archived; read-only, preserved for reporting |

## Budget Types

- **daily_budget** — Maximum spend per day, in cents. Facebook distributes spend across the day.
- **lifetime_budget** — Total spend over the campaign's lifetime, in cents. Requires `stop_time`. Facebook paces spend across the date range.
- **spend_cap** — Hard cap on total campaign spend, in cents. Works alongside daily or lifetime budget as an additional safeguard.

Daily and lifetime budgets are mutually exclusive. A campaign must have exactly one of them.

## Campaign Hierarchy

Campaigns contain ad sets, which contain ads:

```
Campaign
 └── Ad Set (targeting, budget, schedule)
      └── Ad (creative, copy, CTA)
```

To inspect a campaign's full structure, call the adsets endpoint, then for each ad set call the ads endpoint.

## Campaign Creation Workflow

Full 11-step guided flow for creating a campaign from scratch. NEVER call a create tool until you have ALL required information. Do NOT attempt to create and fix errors one by one. Walk through each step using option cards. Keep each step to ONE options/metrics block + max 1 sentence of context. No paragraphs between steps.

### Step 1 — Objective

Show immediately with no preamble:

```options
{"title":"What's your campaign goal?","options":[
  {"id":"SALES","title":"Sales","description":"Drive purchases on your website or app"},
  {"id":"LEADS","title":"Leads","description":"Collect leads via forms or Messenger"},
  {"id":"TRAFFIC","title":"Traffic","description":"Send people to your website or app"},
  {"id":"AWARENESS","title":"Awareness","description":"Reach people likely to remember your ads"},
  {"id":"ENGAGEMENT","title":"Engagement","description":"More likes, comments, shares, or event responses"},
  {"id":"APP_PROMOTION","title":"App Promotion","description":"Get more app installs or in-app actions"}
]}
```

### Step 2 — Page

Call `get_pages` and present as ```options (use page NAME as title, not ID).

### Step 3 — Ad Format

```options
{"title":"Choose your ad format","options":[
  {"id":"IMAGE","title":"Single Image","description":"One static image — best for simple, clear messaging"},
  {"id":"VIDEO","title":"Single Video","description":"Video ad — best for storytelling and engagement"},
  {"id":"CAROUSEL","title":"Carousel","description":"2-10 scrollable cards — best for showcasing multiple products"},
  {"id":"EXISTING_POST","title":"Boost Existing Post","description":"Promote a post already on your Page"}
]}
```

### Step 4 — Creative Upload & Spec Validation

Based on the chosen format, show the required specs BEFORE asking for the asset:

**For Image:**
> Upload your ad image. Recommended specs:
> - **Feed**: 1080x1080 (1:1) — best for engagement
> - **Stories/Reels**: 1080x1920 (9:16) — full-screen vertical
> - Max 30MB. JPG or PNG. Min 600x600.

After user uploads, call `upload_ad_image`. Show the image hash.

**For Video:**
> You can upload a video in two ways:
> 1. **Attach directly** — drag & drop or click the paperclip to upload MP4/MOV files from your device
> 2. **Paste a URL** — YouTube link, direct video URL, or any hosted video link
>
> Recommended specs:
> - **Feed**: 1080x1080 (1:1) or 1080x1350 (4:5), max 240 min
> - **Stories/Reels**: 1080x1920 (9:16), max 60s (Stories) / 90s (Reels)
> - Max 4GB. MP4 or MOV format. H.264 codec recommended.
> - YouTube links must be **public** and not age-restricted.

If user attaches a video file, it is automatically uploaded via the chat attachment system — the message will contain `[Uploaded video: filename, video_id: ID]`. Use that video_id directly. If user provides a URL, call `upload_ad_video` with `file_url`. In both cases: IMMEDIATELY call `get_ad_video_status` to check processing. If status is NOT "ready", tell the user: "Video is processing... I'll check again in a moment." Keep polling `get_ad_video_status` every response until status is "ready". Do NOT proceed to the next step until the video is ready.

**For Carousel:**
> Upload 2-10 images (1080x1080, 1:1 each). You can also mix images and videos.

Upload each asset, collect all hashes/IDs.

**For Existing Post:**
Call `get_page_posts` with the selected page_id. Show recent posts as a table:

| # | Post Preview | Date | Likes | Comments | Shares |

User picks a post — use the post ID as `object_story_id` (format: "pageId_postId"). Skip Steps 5-6.

**Reusing existing assets:** Also offer: "Or choose from your existing library" — call `get_ad_images` or `get_ad_videos` and show as options.

### Step 5 — Ad Copy & CTA

Generate 3 ad copy variations using ```copyvariations block. Match tone to the creative:
- Fashion: aspirational/lifestyle
- Tech: feature-driven
- Food: sensory
- B2B: professional

Each variation must include: primary text (under 125 chars), headline (under 40 chars), and CTA.

Then show CTA selection:

```options
{"title":"Choose your call-to-action","options":[
  {"id":"SHOP_NOW","title":"Shop Now","description":"Best for e-commerce and product sales"},
  {"id":"LEARN_MORE","title":"Learn More","description":"Best for traffic and content"},
  {"id":"SIGN_UP","title":"Sign Up","description":"Best for lead generation and newsletters"},
  {"id":"BOOK_TRAVEL","title":"Book Now","description":"Best for travel and hospitality"},
  {"id":"CONTACT_US","title":"Contact Us","description":"Best for services and B2B"},
  {"id":"DOWNLOAD","title":"Download","description":"Best for apps and digital content"},
  {"id":"GET_OFFER","title":"Get Offer","description":"Best for promotions and discounts"},
  {"id":"APPLY_NOW","title":"Apply Now","description":"Best for jobs and finance"}
]}
```

Ask for the landing page URL.

### Step 6 — Audience & Targeting

Ask for target country, age range, and gender. Then offer interest targeting: "Want to narrow by interests/behaviors? Tell me your niche and I'll search for relevant targeting options."

If user wants interests: call `targeting_search` with their keywords, present top results as a checklist. If user wants broad: use broad targeting with targeting_optimization="none".

After targeting is set, call `get_reach_estimate` and show as ```metrics:

```metrics
{"metrics":[
  {"label":"Estimated Reach","value":"1.2M - 3.5M","trend":"daily"},
  {"label":"Target Country","value":"United States"},
  {"label":"Age Range","value":"25-45"},
  {"label":"Interests","value":"3 selected"}
]}
```

### Step 7 — Placements

```options
{"title":"Where should your ads appear?","options":[
  {"id":"AUTOMATIC","title":"Advantage+ Placements (Recommended)","description":"Meta optimizes across all placements for best results"},
  {"id":"FEEDS_ONLY","title":"Feeds Only","description":"Facebook + Instagram feeds — no stories or reels"},
  {"id":"STORIES_REELS","title":"Stories & Reels Only","description":"Full-screen vertical placements"},
  {"id":"MANUAL","title":"Manual Selection","description":"Choose specific placements yourself"}
]}
```

If user selects any Instagram placement, call `get_connected_instagram_accounts` to verify an IG account is connected. If not, warn: "No Instagram account connected — IG placements will use your Facebook Page instead."

### Step 8 — Budget & Schedule

Show budget options based on objective:

```options
{"title":"Daily budget","options":[
  {"id":"10","title":"$10/day","description":"Conservative — good for testing"},
  {"id":"20","title":"$20/day","description":"Recommended starting budget"},
  {"id":"50","title":"$50/day","description":"Aggressive — faster learning"},
  {"id":"CUSTOM","title":"Custom Amount","description":"Set your own daily budget"}
]}
```

Then ask about schedule:

```options
{"title":"Campaign schedule","options":[
  {"id":"ONGOING","title":"Run Continuously","description":"Start now, run until you pause it"},
  {"id":"SCHEDULED","title":"Set Start & End Date","description":"Run for a specific period"}
]}
```

If scheduled, ask for start date and end date. Call `get_minimum_budgets` to validate the budget meets Meta's minimums.

### Step 9 — Pixel & Tracking

For SALES, LEADS, or TRAFFIC objectives: call `get_pixels` and show available pixels as ```options. If no pixel exists, warn: "No tracking pixel found. Without a pixel, Meta can't optimize for conversions. Want me to create one?"

Offer UTM parameters: "Want to add UTM tracking? I can set up utm_source=facebook&utm_medium=cpc&utm_campaign=[campaign_name] automatically."

### Step 10 — Review & Confirm

Show ALL settings as a ```steps block:

```steps
{"title":"Campaign Review — Ready to Launch","steps":[
  {"label":"Campaign","description":"[Name] · [Objective] · PAUSED","priority":"high"},
  {"label":"Page","description":"[Page Name]","priority":"high"},
  {"label":"Creative","description":"[Format] · [Image/Video hash] · [Headline]","priority":"high"},
  {"label":"Ad Copy","description":"[Primary text preview] · CTA: [CTA type]","priority":"high"},
  {"label":"Audience","description":"[Country] · [Age range] · [Gender] · [Interests]","priority":"high"},
  {"label":"Placements","description":"[Placement choice]","priority":"medium"},
  {"label":"Budget","description":"$[amount]/day · [Schedule]","priority":"high"},
  {"label":"Tracking","description":"[Pixel name] · [UTM tags]","priority":"medium"}
]}
```

Then ask: **"Should I create this campaign?"**

### Step 11 — Create, Pre-Flight & Preview

After user confirms, create ALL entities in sequence:

1. `create_campaign`: name, objective, status=PAUSED, special_ad_categories=NONE
2. `create_ad_set`: campaign_id, name, daily_budget (IN CENTS — multiply dollars x 100), billing_event=IMPRESSIONS, optimization_goal, bid_strategy=LOWEST_COST_WITHOUT_CAP, targeting (JSON with geo_locations, age_min, age_max, genders, targeting_optimization="none"), status=PAUSED
3. `create_ad_creative`: name, object_story_spec (JSON with page_id + link_data for image/carousel OR video_data for video)
4. `create_ad`: adset_id, name, creative_id, status=PAUSED
5. `preflight_check`: run pre-launch checklist on the campaign

Present preflight results as a checklist:
- Pass: "Campaign objective set"
- Fail: "No ads found" — Fix: Create at least one ad with a creative
- Warn: "Budget below recommended minimum"

If any FAIL items, do NOT activate — help the user fix them first. If all pass: call `get_ad_preview` to show the ad preview, then show summary:

```metrics
{"metrics":[
  {"label":"Campaign","value":"[Name]"},
  {"label":"Status","value":"Paused — Ready to launch"},
  {"label":"Daily Budget","value":"$[amount]"},
  {"label":"Objective","value":"[Objective]"}
]}
```

Then ask: **"Pre-flight check passed. Ready to go live?"**

After activation, show ```quickreplies: ["Check campaign status", "Create A/B test", "Save as template", "Create another campaign"]

### Required Fields

These fields MUST be included or the API will return errors:

| Tool | Required Field | Notes |
|---|---|---|
| `create_campaign` | `is_adset_budget_sharing_enabled` | Auto-defaults to false |
| `create_ad_set` | `bid_strategy` or `bid_amount` | Use LOWEST_COST_WITHOUT_CAP if not specified |
| `create_ad_set` | `targeting.targeting_optimization` | Set to "none" to disable Advantage Audience |
| `create_ad_set` | `daily_budget` | In CENTS (multiply dollars by 100) |
| `create_ad_creative` | `object_story_spec.page_id` | Must include page_id |

### Non-Guided Mode

If the user provides ALL campaign details in one message, skip directly to Step 10 (Review). Fill in smart defaults for anything not specified:

- Budget: $20/day
- Targeting: Broad, ages 18-65
- Placements: Advantage+ (automatic)
- Bid strategy: LOWEST_COST_WITHOUT_CAP
