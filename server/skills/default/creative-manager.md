---
name: creative-manager
description: Manage Facebook ad creatives and media assets — create ad creatives with images/videos/copy, upload images and videos, manage the creative library, and preview creatives. Use this skill when the user wants to create ad copy, upload creative assets, manage their image/video library, set up call-to-action buttons, configure object_story_spec, or preview how creatives will look. Triggers for creative creation, asset upload, image library, video upload, and CTA configuration.
---

# Creative Manager

## API Endpoints — Creatives

### List creatives

```
GET /api/creatives?adAccountId=act_XXX
```

Returns all creatives for the ad account.

### Get a single creative

```
GET /api/creatives/:id
```

Returns full details for a specific creative, including its object_story_spec, CTA, and asset references.

### Create a creative

```
POST /api/creatives
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| name | string | yes | Creative name |
| body | string | no | Primary text (post copy) |
| title | string | no | Headline text |
| image_hash | string | no | Hash of an uploaded image (from image upload endpoint) |
| video_id | string | no | ID of an uploaded video |
| object_story_spec | object | no | Full story spec for page post ads. See structure below |
| object_url | string | no | Destination URL for the ad |
| call_to_action_type | string | no | See CTA types below |
| url_tags | string | no | URL parameters appended to all links (e.g., `utm_source=fb&utm_campaign=spring`) |
| asset_feed_spec | object | no | For dynamic creative. See dynamic creative section below |

### Update a creative

```
PATCH /api/creatives/:id
```

Accepts the same fields as create (all optional). Note: Facebook limits which fields can be updated on existing creatives. Some changes may require creating a new creative instead.

### Delete a creative

```
DELETE /api/creatives/:id
```

Permanently deletes the creative. Ads referencing this creative will stop delivering.

### Preview a creative

```
GET /api/creatives/:id/previews?ad_format=FORMAT
```

Returns an HTML preview of the creative rendered for the specified placement format.

## API Endpoints — Assets

### List images

```
GET /api/assets/images?adAccountId=act_XXX
```

Returns all images in the ad account's image library, including their hashes, URLs, and dimensions.

### Upload an image

```
POST /api/assets/images
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| bytes | string | yes | Base64-encoded image data |
| name | string | no | Display name for the image |

Returns the `image_hash` needed to reference this image in a creative.

### Delete an image

```
DELETE /api/assets/images
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| hash | string | yes | The image hash to delete |

### List videos

```
GET /api/assets/videos?adAccountId=act_XXX
```

Returns all videos in the ad account's video library.

### Upload a video

```
POST /api/assets/videos
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| file_url | string | conditional | URL of the video file. Provide either `file_url` or `source` |
| source | string | conditional | Direct video file upload. Provide either `file_url` or `source` |
| title | string | no | Video title |
| description | string | no | Video description |

### Check video upload status

```
GET /api/assets/videos/:id/status
```

Returns the processing status of an uploaded video. Videos are not usable in creatives until processing completes.

| Status | Meaning |
|---|---|
| `processing` | Video is still being encoded |
| `ready` | Video is ready to use in creatives |
| `error` | Processing failed |

Poll this endpoint after uploading a video until status is `ready` before referencing it in a creative.

## API Endpoints — Previews

### Preview an existing ad

```
GET /api/previews/ad/:id?ad_format=FORMAT
```

### Preview an existing creative

```
GET /api/previews/creative/:id?ad_format=FORMAT
```

### Generate a preview from spec

```
POST /api/previews/generate
```

Body:

| Field | Type | Required | Notes |
|---|---|---|---|
| adAccountId | string | yes | Format: `act_XXX` |
| creative | object | yes | Creative spec (same structure as POST /api/creatives) |
| ad_format | string | yes | See preview formats below |

Use this to preview a creative before actually creating it.

## Call-to-Action Types

| CTA | Use case |
|---|---|
| `SHOP_NOW` | E-commerce, product pages |
| `LEARN_MORE` | General purpose, informational |
| `SIGN_UP` | Newsletter, account registration |
| `BOOK_TRAVEL` | Travel and hospitality bookings |
| `CONTACT_US` | Lead generation, inquiries |
| `DOWNLOAD` | App downloads, file downloads |
| `GET_OFFER` | Promotions, discount offers |
| `GET_QUOTE` | Insurance, services |
| `SUBSCRIBE` | Subscription services |
| `WATCH_MORE` | Video content |
| `APPLY_NOW` | Job applications, credit cards |
| `ORDER_NOW` | Food delivery, quick purchases |
| `SEND_MESSAGE` | Messenger conversations |
| `WHATSAPP_MESSAGE` | WhatsApp conversations |
| `CALL_NOW` | Phone call actions |

## object_story_spec Structure

The `object_story_spec` defines the full content of a page post ad. Structure:

```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "link": "https://example.com",
    "message": "Primary text / post copy",
    "name": "Headline",
    "description": "Description below headline",
    "image_hash": "IMAGE_HASH",
    "call_to_action": {
      "type": "LEARN_MORE",
      "value": {
        "link": "https://example.com"
      }
    }
  }
}
```

For video ads, use `video_data` instead of `link_data`:

```json
{
  "page_id": "PAGE_ID",
  "video_data": {
    "video_id": "VIDEO_ID",
    "message": "Primary text",
    "title": "Headline",
    "image_url": "THUMBNAIL_URL",
    "call_to_action": {
      "type": "SHOP_NOW",
      "value": {
        "link": "https://example.com"
      }
    }
  }
}
```

## asset_feed_spec for Dynamic Creative

Dynamic creative automatically tests combinations of assets. The `asset_feed_spec` provides multiple options for Facebook to mix and match:

```json
{
  "images": [
    { "hash": "IMAGE_HASH_1" },
    { "hash": "IMAGE_HASH_2" }
  ],
  "bodies": [
    { "text": "Primary text option 1" },
    { "text": "Primary text option 2" }
  ],
  "titles": [
    { "text": "Headline option 1" },
    { "text": "Headline option 2" }
  ],
  "descriptions": [
    { "text": "Description option 1" }
  ],
  "call_to_action_types": ["SHOP_NOW", "LEARN_MORE"],
  "link_urls": [
    { "website_url": "https://example.com" }
  ]
}
```

Dynamic creative requires the ad set to have `is_dynamic_creative` set to `true`.

## Image Upload Flow

1. Encode the image file as base64.
2. POST to `/api/assets/images` with `adAccountId`, `bytes` (base64 string), and optional `name`.
3. Store the returned `image_hash`.
4. Use `image_hash` in a creative's `object_story_spec.link_data.image_hash` or in `asset_feed_spec.images`.

Supported formats: JPG, PNG. Recommended minimum resolution: 1080x1080 pixels.

## Video Upload and Status Polling

1. POST to `/api/assets/videos` with `adAccountId` and either `file_url` (remote URL) or `source` (direct upload).
2. Store the returned video `id`.
3. Poll `GET /api/assets/videos/:id/status` until status is `ready`.
4. Use the `video_id` in a creative's `object_story_spec.video_data.video_id`.

Videos must finish processing before they can be used in creatives. Attempting to create a creative with a still-processing video will fail.

## Preview Formats

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

## Creative Workflow Guidance

### Image Upload Specs by Placement

Before uploading, always confirm the required specs for the target placement:

| Placement | Dimensions | Aspect Ratio | Notes |
|---|---|---|---|
| Feed (FB/IG) | 1080x1080 | 1:1 | Best for engagement |
| Stories/Reels | 1080x1920 | 9:16 | Full-screen vertical |
| Right Column | 1200x628 | 1.91:1 | Landscape |
| Carousel | 1080x1080 per card | 1:1 | 2-10 cards |
| Marketplace | 1200x628 | 1.91:1 | Landscape |

- Max file size: 30MB
- Formats: JPG, PNG
- Minimum resolution: 600x600

After upload, always confirm: "Image uploaded successfully -- hash: [HASH]"

### Video Upload Specs by Placement

| Placement | Dimensions | Aspect Ratio | Max Duration |
|---|---|---|---|
| Feed | 1080x1080 or 1080x1350 | 1:1 or 4:5 | 240 minutes |
| Stories | 1080x1920 | 9:16 | 60 seconds |
| Reels | 1080x1920 | 9:16 | 90 seconds |
| In-Stream | 1280x720+ | 16:9 | 5-15s recommended |
| Carousel (video) | 1080x1080 | 1:1 | 240 minutes per card |

- Max file size: 4GB
- Formats: MP4, MOV, AVI, FLV, MKV, WebM (MP4 with H.264 recommended)
- Minimum duration: 1 second
- Audio: AAC, 128kbps+ recommended
- Thumbnails: auto-generated, or provide a custom thumbnail via image upload

### Upload Methods

**Method 1 -- Direct file attachment (MP4/MOV):**
User drags and drops or attaches a video file. The file is automatically uploaded and the message will contain `[Uploaded video: filename, video_id: ID]`. Use the video_id directly.

**Method 2 -- URL (YouTube, hosted, direct link):**
Call `upload_ad_video` with `file_url` parameter. Meta can ingest YouTube URLs, Vimeo, direct MP4 links, and most hosted video URLs. YouTube links must be **public** and not age-restricted or Meta will reject them.

After any upload, always show the hash or ID so the user can reference it in creatives.

### Video Processing Polling Workflow

Videos process asynchronously after upload. Follow this sequence:

1. Upload the video via `upload_ad_video`
2. Immediately call `get_ad_video_status` with the returned video_id
3. If status is NOT "ready", inform the user: "Your video is being processed by Meta. This usually takes 1-5 minutes depending on file size."
4. On the next user message, check `get_ad_video_status` again. Repeat until status = "ready"
5. Only then proceed to use the video_id in the ad creative's `video_data`

Never attempt to create a creative with a video that is still processing -- it will fail.

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

SHOP_NOW, LEARN_MORE, SIGN_UP, BOOK_TRAVEL, CONTACT_US, DOWNLOAD, GET_OFFER, GET_QUOTE, SUBSCRIBE, WATCH_MORE, APPLY_NOW, ORDER_NOW, SEE_MENU, SEND_MESSAGE, WHATSAPP_MESSAGE, CALL_NOW

Match the CTA to the campaign objective: conversions use SHOP_NOW, leads use SIGN_UP, traffic uses LEARN_MORE.

### Ad Copy Generation Guidelines

When generating ad copy for uploaded creatives:

- **Match tone to the visual**: fashion gets aspirational/lifestyle copy, tech gets feature-driven copy, food gets sensory language, B2B gets professional tone
- Always generate **2-3 copy variations** for A/B testing
- Keep primary text under **125 chars** for best performance (avoids truncation)
- Headlines under **40 chars** -- punchy and benefit-driven
- For **multiple images**: write **unique copy per image**, not duplicates. Each should highlight a different angle or product feature
- Suggest A/B testing strategies: same creative with different copy, or same copy with different creatives
- If the user specifies a brand voice or tone, follow it strictly
- Never use clickbait, misleading claims, or personal attributes ("Are you struggling with...") -- these violate Meta advertising policy

### Creating Ads from Uploaded Assets

When user messages contain `[Uploaded image: filename, image_hash: HASH]`:

1. Acknowledge the uploads (e.g., "Got **6 images** uploaded to your ad account")
2. Ask about: campaign objective, target audience, landing page URL, budget (if not already stated)
3. Call `get_pages` to get the Page ID (required for object_story_spec)
4. For each image, generate **2-3 ad copy variations** (primary text + headline + CTA)
5. Show the Ad Creation Review Card with all settings before executing
6. If multiple images: ask if they want **separate ads** (one per image) or a **carousel**

### Boost Existing Post Flow

When the user wants to promote an existing Facebook Page post:

1. Call `get_pages` to list their pages
2. Call `get_page_posts` with the page_id to show recent posts
3. Show posts as a table: Post | Date | Likes | Comments | Shares
4. User picks a post -- use the post ID
5. Create ad creative with `object_story_id` instead of `object_story_spec`: `{ "object_story_id": "PAGE_ID_POST_ID" }` (format: "pageId_postId")
6. This bypasses the need to create a new creative from scratch
7. Proceed with campaign, ad set, and ad creation using this creative
