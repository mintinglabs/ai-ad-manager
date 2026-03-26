---
name: creative-manager
description: Create and manage ad creatives, upload images and videos, preview placements, and generate ad copy
layer: operational
depends_on: [campaign-advisor]
safety:
  - Video must be status "ready" before using in a creative
  - Preview creative before linking to an active ad
  - Deletions require explicit confirmation; warn that linked ads will stop delivering
  - Image and video specs must match target placement requirements
  - Never use clickbait, misleading claims, or personal attributes in ad copy
---

# Creative Manager

## API Endpoints -- Creatives

### Read

```
GET /api/creatives?adAccountId=act_XXX
```
Returns all creatives for the ad account.

```
GET /api/creatives/:id
```
Returns full details including object_story_spec, CTA, and asset references.

```
GET /api/creatives/:id/previews?ad_format=FORMAT
```
Returns an HTML preview of the creative for the specified placement.

### Create

```
POST /api/creatives
```

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| name | string | yes | Creative name |
| body | string | no | Primary text (post copy) |
| title | string | no | Headline text |
| image_hash | string | no | Hash from image upload |
| video_id | string | no | ID from video upload |
| object_story_spec | object | no | Full story spec for page post ads |
| object_url | string | no | Destination URL |
| call_to_action_type | string | no | See CTA types below |
| url_tags | string | no | UTM parameters appended to all links |
| asset_feed_spec | object | no | For dynamic creative |

### Update

```
PATCH /api/creatives/:id
```
Same fields as create (all optional). Note: Facebook limits which fields can be updated. Some changes require creating a new creative.

### Delete

```
DELETE /api/creatives/:id
```
Permanently deletes the creative. Ads referencing this creative will stop delivering.

## API Endpoints -- Assets

### Images

```
GET /api/assets/images?adAccountId=act_XXX
```
Returns all images with hashes, URLs, and dimensions.

```
POST /api/assets/images
```

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| bytes | string | yes | Base64-encoded image data |
| name | string | no | Display name |

Returns the `image_hash` needed in creatives.

```
DELETE /api/assets/images
```

| Field | Type | Required |
|---|---|---|
| adAccountId | string | yes |
| hash | string | yes |

### Videos

```
GET /api/assets/videos?adAccountId=act_XXX
```
Returns all videos in the ad account's library.

```
POST /api/assets/videos
```

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| file_url | string | conditional | URL of video. Provide `file_url` or `source` |
| source | string | conditional | Direct upload. Provide `file_url` or `source` |
| title | string | no | Video title |
| description | string | no | Video description |

```
GET /api/assets/videos/:id/status
```
Returns processing status: `processing`, `ready`, or `error`.

## API Endpoints -- Previews

```
GET /api/previews/ad/:id?ad_format=FORMAT
```
Preview an existing ad.

```
GET /api/previews/creative/:id?ad_format=FORMAT
```
Preview an existing creative.

```
POST /api/previews/generate
```

| Field | Type | Required |
|---|---|---|
| adAccountId | string | yes |
| creative | object | yes |
| ad_format | string | yes |

Preview a creative before actually creating it.

## Execution Workflow

Every write operation MUST follow this four-step pattern.

### Creating a Creative

**Step 1 READ** -- Fetch existing creatives and available assets.

```
GET /api/creatives?adAccountId=act_XXX
GET /api/assets/images?adAccountId=act_XXX
```

```metrics
Ad Account: act_XXX
Existing Creatives: 12
Available Images: 8
Available Videos: 3
```

**Step 2 CONFIRM** -- Show the creative configuration and preview it.

```steps
Action: CREATE new creative
Name: "Spring Sale - Image Ad v1"
Page: 111222333 ("My Store")
Type: Image (link_data)
Image: abc123hash (1080x1080, uploaded today)
Primary Text: "Spring savings are here! Up to 40% off."
Headline: "Shop the Spring Sale"
Description: "Limited time only"
CTA: SHOP_NOW → https://example.com/spring
URL Tags: utm_source=fb&utm_campaign=spring
```

Generate a preview before creating:

```
POST /api/previews/generate
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
POST /api/creatives
```

**Step 4 VERIFY** -- Confirm creation and show preview.

```
GET /api/creatives/:new_id
GET /api/creatives/:new_id/previews?ad_format=MOBILE_FEED_STANDARD
```

```metrics
Creative Created Successfully
ID: 120200...
Name: "Spring Sale - Image Ad v1"
Type: Image
CTA: SHOP_NOW
```

```quickreplies
["Preview on Instagram", "Create ad with this creative", "Create another variation", "View all creatives"]
```

### Uploading a Video + Creating Creative

**Step 1 READ** -- Upload the video and poll status.

```
POST /api/assets/videos
```

Then poll until ready:

```
GET /api/assets/videos/:id/status
```

```metrics
Video Upload: "product-demo.mp4"
Video ID: 987654...
Status: processing → ready ✓
```

If status is NOT "ready", inform user: "Your video is being processed by Meta. This usually takes 1-5 minutes."

**SAFETY CHECK**: Never create a creative with a video that is still `processing`. Poll until `ready`.

**Step 2 CONFIRM** -- Show the creative spec.

```steps
Action: CREATE video creative
Video: 987654... (status: ready ✓)
Primary Text: "See our new product in action"
Headline: "Watch the Demo"
CTA: SHOP_NOW → https://example.com
Thumbnail: auto-generated
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** then **Step 4 VERIFY** as above.

### Deleting a Creative

**Step 1 READ** -- Check for linked ads.

```
GET /api/creatives/:id
GET /api/ads?adAccountId=act_XXX
```

```metrics
Creative: "Spring Sale - Image Ad v1"
ID: 120200...
Linked Ads: 2 (both ACTIVE)
```

**Step 2 CONFIRM** -- Warn about impact.

```steps
⚠ DESTRUCTIVE ACTION
Deleting creative 120200... will cause 2 active ads to stop delivering.

Alternative: Create a new creative and swap it on the ads first.
```

Ask: **"Type 'delete' to confirm, or should I swap the creative on linked ads first?"**

**Step 3 EXECUTE** -- Only after explicit "delete" confirmation.

**Step 4 VERIFY** -- Confirm deletion.

### Boost Existing Post Flow

1. Call `GET /api/pages` to list pages.
2. Call `GET /api/pages/:id/posts` to show recent posts.
3. Show posts as a table: | Post | Date | Likes | Comments | Shares |
4. User picks a post.
5. Create creative with `object_story_id` (format: `"pageId_postId"`) instead of `object_story_spec`.
6. Follow standard create workflow above.

## Safety Guardrails

- **Video readiness**: NEVER create a creative referencing a video with status other than `ready`. Poll `GET /api/assets/videos/:id/status` until confirmed.
- **Preview before activation**: Always offer to preview a creative before it goes live. Generate preview via `POST /api/previews/generate` before creating.
- **Deletions**: Warn about linked ads that will stop delivering. Suggest swapping the creative on ads first. Require explicit "delete" confirmation.
- **Ad copy policy**: Never generate clickbait, misleading claims, or personal attributes ("Are you struggling with...") -- these violate Meta advertising policy.
- **Image/video specs**: Validate dimensions match target placement before uploading. Warn if specs do not match.
- **Bulk operations**: Max 10 creatives per batch with per-batch confirmation.

## Quick Reference

### Image Specs by Placement

| Placement | Dimensions | Aspect Ratio | Notes |
|---|---|---|---|
| Feed (FB/IG) | 1080x1080 | 1:1 | Best for engagement |
| Stories/Reels | 1080x1920 | 9:16 | Full-screen vertical |
| Right Column | 1200x628 | 1.91:1 | Landscape |
| Carousel | 1080x1080 per card | 1:1 | 2-10 cards |
| Marketplace | 1200x628 | 1.91:1 | Landscape |

Max file size: 30MB. Formats: JPG, PNG. Minimum: 600x600.

### Video Specs by Placement

| Placement | Dimensions | Aspect Ratio | Max Duration |
|---|---|---|---|
| Feed | 1080x1080 or 1080x1350 | 1:1 or 4:5 | 240 minutes |
| Stories | 1080x1920 | 9:16 | 60 seconds |
| Reels | 1080x1920 | 9:16 | 90 seconds |
| In-Stream | 1280x720+ | 16:9 | 5-15s recommended |
| Carousel (video) | 1080x1080 | 1:1 | 240 minutes per card |

Max file size: 4GB. Formats: MP4 (H.264 recommended), MOV, AVI, FLV, MKV, WebM. Min duration: 1 second. Audio: AAC, 128kbps+.

### object_story_spec Formats

**Image ad:**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "image_hash": "IMAGE_HASH",
    "link": "https://example.com",
    "message": "Primary text here",
    "name": "Headline here",
    "description": "Description here",
    "call_to_action": {
      "type": "SHOP_NOW",
      "value": { "link": "https://example.com" }
    }
  }
}
```

**Carousel ad:**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "link": "https://example.com",
    "child_attachments": [
      { "image_hash": "HASH1", "name": "Headline 1", "link": "https://example.com/1" },
      { "image_hash": "HASH2", "name": "Headline 2", "link": "https://example.com/2" }
    ],
    "message": "Primary text for carousel"
  }
}
```

**Video ad:**
```json
{
  "page_id": "PAGE_ID",
  "video_data": {
    "video_id": "VIDEO_ID",
    "message": "Primary text",
    "title": "Headline",
    "description": "Description",
    "call_to_action": {
      "type": "SHOP_NOW",
      "value": { "link": "https://example.com" }
    },
    "image_hash": "THUMBNAIL_HASH_OPTIONAL"
  }
}
```

### Ad Copy Character Limits

| Field | Recommended | Maximum | Notes |
|---|---|---|---|
| Primary text | 125 chars | 2200 chars | Truncated after ~3 lines on mobile |
| Headline | 40 chars | 255 chars | Punchy, benefit-driven |
| Description | 30 chars | 255 chars | Shown below headline on some placements |

### CTA Options

| CTA | Best for |
|---|---|
| `SHOP_NOW` | E-commerce, product pages |
| `LEARN_MORE` | General, informational |
| `SIGN_UP` | Newsletter, registration |
| `BOOK_TRAVEL` | Travel, hospitality |
| `CONTACT_US` | Lead generation |
| `DOWNLOAD` | App/file downloads |
| `GET_OFFER` | Promotions, discounts |
| `GET_QUOTE` | Insurance, services |
| `SUBSCRIBE` | Subscription services |
| `WATCH_MORE` | Video content |
| `APPLY_NOW` | Jobs, credit cards |
| `ORDER_NOW` | Food delivery, purchases |
| `SEND_MESSAGE` | Messenger conversations |
| `WHATSAPP_MESSAGE` | WhatsApp conversations |
| `CALL_NOW` | Phone call actions |

Match CTA to objective: conversions = SHOP_NOW, leads = SIGN_UP, traffic = LEARN_MORE.

### Dynamic Creative (asset_feed_spec)

```json
{
  "images": [{ "hash": "HASH_1" }, { "hash": "HASH_2" }],
  "bodies": [{ "text": "Option 1" }, { "text": "Option 2" }],
  "titles": [{ "text": "Headline 1" }, { "text": "Headline 2" }],
  "descriptions": [{ "text": "Desc 1" }],
  "call_to_action_types": ["SHOP_NOW", "LEARN_MORE"],
  "link_urls": [{ "website_url": "https://example.com" }]
}
```

Requires ad set `is_dynamic_creative` set to `true`.

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

### Ad Copy Generation Guidelines

When generating ad copy:
- Match tone to the visual: fashion = aspirational, tech = feature-driven, food = sensory, B2B = professional
- Generate 2-3 variations for A/B testing
- Keep primary text under 125 chars for best performance
- Headlines under 40 chars, punchy and benefit-driven
- For multiple images, write unique copy per image highlighting different angles
- Never use clickbait, misleading claims, or personal attributes -- these violate Meta policy

### Creating Ads from Uploaded Assets

When user messages contain `[Uploaded image: filename, image_hash: HASH]`:
1. Acknowledge uploads
2. Ask about objective, audience, landing page URL, budget if not stated
3. Call `GET /api/pages` to get Page ID
4. Generate 2-3 ad copy variations per image
5. Show full creative spec in a `steps` block before executing
6. For multiple images, ask: separate ads or carousel?
