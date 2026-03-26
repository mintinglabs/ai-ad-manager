---
name: creative-manager
description: Create and manage ad creatives, upload images and videos, preview placements, and generate ad copy
layer: operational
depends_on: [campaign-manager]
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

### Creating a Carousel Ad

**Step 1 READ** — Determine card count and upload images.

Ask how many cards:

```options
{"title":"How many carousel cards?","options":[
  {"id":"2","title":"2 cards"},
  {"id":"3","title":"3 cards"},
  {"id":"4","title":"4 cards"},
  {"id":"custom","title":"Custom (5-10)"}
]}
```

**Validation**: Minimum 2 cards, maximum 10. Reject if outside range.

For each card, user uploads an image. Each upload calls:

```
POST /api/assets/images
```

After each upload, immediately confirm and collect card details:

```metrics
Card 1 uploaded ✓
Hash: abc123
Dimensions: 1080x1080
```

Then ask for that card's headline + URL:
- Headline (max 40 chars)
- Landing URL (each card can have an independent link)

Repeat for every card. Track progress:

```metrics
Carousel Progress
Cards uploaded: 3 of 4
Card 1: ✓ "夏日新品" → example.com/summer
Card 2: ✓ "限時優惠" → example.com/sale
Card 3: ✓ "免運費" → example.com/shipping
Card 4: pending upload
```

**All cards MUST be 1080x1080 (1:1)**. Warn immediately if dimensions don't match.

**Step 2 CONFIRM** — Show full carousel structure with ordering.

Once all cards are uploaded, display the complete carousel review:

```steps
Action: CREATE carousel creative
Page: 111222333 ("My Store")
Primary Text: "探索我哋嘅新系列"
CTA: SHOP_NOW (applied to all cards)
URL Tags: utm_source=fb&utm_campaign=carousel

┌─────────────────────────────────────────────────┐
│ Card 1: [abc123] "夏日新品"                       │
│         → https://example.com/summer             │
├─────────────────────────────────────────────────┤
│ Card 2: [def456] "限時優惠"                       │
│         → https://example.com/sale               │
├─────────────────────────────────────────────────┤
│ Card 3: [ghi789] "免運費"                         │
│         → https://example.com/shipping           │
├─────────────────────────────────────────────────┤
│ Card 4: [jkl012] "新會員專享"                      │
│         → https://example.com/member             │
└─────────────────────────────────────────────────┘
Total cards: 4
```

Then offer reordering:

```options
{"title":"Card order — any changes?","options":[
  {"id":"confirm","title":"Order looks good ✓","description":"Proceed with current sequence"},
  {"id":"swap","title":"Swap card positions","description":"Tell me which cards to swap (e.g. swap 1 and 3)"},
  {"id":"remove","title":"Remove a card","description":"Drop one card from the carousel"},
  {"id":"add","title":"Add another card","description":"Upload one more image (max 10)"}
]}
```

If user requests a swap, reorder the `child_attachments` array and re-display the full list.

**Validation checks before proceeding:**
- ✅ Card count: 2-10 cards
- ✅ All images: 1080x1080 (1:1)
- ✅ All cards have headline + URL
- ✅ CTA type is the same across all cards (carousel requires uniform CTA)
- ✅ Primary text is set

If any check fails, show which card has the issue and ask user to fix it.

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** — Build the `object_story_spec` and create.

```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "link": "https://example.com",
    "message": "Primary text for carousel",
    "child_attachments": [
      { "image_hash": "abc123", "name": "夏日新品", "link": "https://example.com/summer" },
      { "image_hash": "def456", "name": "限時優惠", "link": "https://example.com/sale" },
      { "image_hash": "ghi789", "name": "免運費", "link": "https://example.com/shipping" },
      { "image_hash": "jkl012", "name": "新會員專享", "link": "https://example.com/member" }
    ],
    "call_to_action": { "type": "SHOP_NOW" }
  }
}
```

```
POST /api/creatives
```

**Step 4 VERIFY** — Confirm and preview.

```
GET /api/creatives/:new_id
GET /api/creatives/:new_id/previews?ad_format=MOBILE_FEED_STANDARD
```

```metrics
Carousel Creative Created ✓
ID: 120200...
Name: "Product Carousel v1"
Cards: 4
CTA: SHOP_NOW
```

```quickreplies
["Preview on Instagram", "Create ad with this creative", "Add more cards", "Create another carousel"]
```

---

### Creating a Lead Ad Creative

To create a creative that opens a lead form instead of a landing page, use `lead_gen_form_id` in the CTA value:

**object_story_spec for Lead Ad (image):**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "image_hash": "IMAGE_HASH",
    "link": "https://www.facebook.com",
    "message": "Primary text",
    "name": "Headline",
    "call_to_action": {
      "type": "SIGN_UP",
      "value": { "lead_gen_form_id": "FORM_ID" }
    }
  }
}
```

**object_story_spec for Lead Ad (carousel):**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "link": "https://www.facebook.com",
    "message": "Primary text",
    "child_attachments": [
      { "image_hash": "HASH1", "name": "Card 1 headline", "link": "https://www.facebook.com" },
      { "image_hash": "HASH2", "name": "Card 2 headline", "link": "https://www.facebook.com" }
    ],
    "call_to_action": {
      "type": "SIGN_UP",
      "value": { "lead_gen_form_id": "FORM_ID" }
    }
  }
}
```

**Key rules:**
- The `link` field MUST be `https://www.facebook.com` (Meta requires this for lead ads -- the form opens as an overlay)
- CTA type should be `SIGN_UP`, `LEARN_MORE`, or `SUBSCRIBE` for lead generation
- Get the `lead_gen_form_id` from the `lead-ads` skill (create form first, then use its ID here)
- Campaign objective MUST be `OUTCOME_LEADS`

Also cross-reference: after creating the lead ad creative, recommend loading `tracking-conversions` to set up lead event tracking.

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
- **Carousel validation**: Minimum 2 cards, maximum 10. All images must be 1080x1080 (1:1). CTA type must be uniform across all cards. Every card must have a headline and URL. Always display full card list and offer reordering before creation.
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
