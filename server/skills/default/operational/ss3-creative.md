---
name: ss3-creative
description: Creative Assembly — Step 3 of 4. Format selection, image/video upload, carousel, existing post, ad copy generation, CTA, object_story_spec for all destinations including WhatsApp.
layer: operational
depends_on: [ss2-adset]
leads_to: [ss4-launcher]
---

# SS3 — Creative Builder

## Common Rule (ALL sub-agents)

**Read context.state.workflow first.** Before asking the user for any IDs or settings, check `context.state.workflow` for existing values (page_id, conversion_destination, whatsapp_phone_number, pixel_id, etc.). Never re-ask for information already saved in state.

---

## Step 1 — Format Selection

```options
{"title":"Choose your ad format","options":[
  {"id":"IMAGE","title":"Single Image","description":"One static image — best for simple, clear messaging"},
  {"id":"VIDEO","title":"Single Video","description":"Video ad — best for storytelling and engagement"},
  {"id":"CAROUSEL","title":"Carousel","description":"2–10 scrollable cards — best for showcasing multiple products"},
  {"id":"EXISTING_POST","title":"Boost Existing Post","description":"Promote a post already on your Page"}
]}
```

For WhatsApp/Messenger destination: IMAGE and VIDEO are recommended.

---

## Step 2 — Media Upload

### IMAGE
> Upload your ad image. Recommended specs:
> - Feed: 1080×1080 (1:1)
> - Stories/Reels: 1080×1920 (9:16)
> - Max 30MB. JPG or PNG. Min 600×600.

Also offer: "Or choose from existing library" — call `get_ad_images()`.

After upload: call `upload_ad_image()` → returns `image_hash`.
Show image NAME to user, NOT the raw hash.

### VIDEO
> Upload options:
> 1. Attach file (MP4/MOV) directly in chat
> 2. Paste a URL (YouTube, direct video link)
>
> Specs:
> - Feed: 1080×1080 or 1080×1350, max 240 min
> - Stories/Reels: 1080×1920 (9:16), max 60s
> - Max 4GB. H.264 codec recommended.

If file attached: use the `video_id` from the attachment system directly.
If URL provided: call `upload_ad_video(file_url: "URL")`.

**Video async poll — MANDATORY:**
After upload, immediately call `get_ad_video_status(video_id)`.
- If status = "ready" → proceed
- If NOT ready → tell user: "Video is processing, I'll check again shortly." Poll every turn until ready.
- If still not ready after 10 min → surface error, offer re-upload.
Do NOT proceed to ad copy until video status = "ready".

Also offer: "Choose from existing videos" — call `get_ad_videos()`.

### CAROUSEL
Collect 2–10 cards. For each card:
1. Upload image (same specs as IMAGE)
2. Collect headline (max 40 chars)
3. Collect destination URL

### EXISTING POST
Call `get_page_posts(page_id)`. Show recent posts as options:

```options
{"title":"Which post do you want to promote?","options":[
  {"id":"PAGE_ID_POST_ID","title":"Post preview...","description":"Posted on [date]"}
]}
```

Use format `"pageId_postId"` as `object_story_id`. Skip Steps 3–4 (post has its own copy).

---

## Step 3 — Ad Copy (skip for EXISTING_POST)

### Language detection
If user's market is HK → default Traditional Chinese/Cantonese.
TW → Traditional Chinese. CN → Simplified Chinese. If unsure, ask.

### Copy generation
Generate 3 variations using `copyvariations` block. Match tone to industry:

| Industry | Tone |
|---|---|
| Fashion / Beauty / Lifestyle | Aspirational, emotion-driven |
| F&B / Food | Sensory, cravings-focused, urgency |
| Healthcare / Wellness | Trust-building, benefit-focused |
| Tech / SaaS | Feature-driven, problem-solving |
| Finance / Insurance / Real Estate | Authority, ROI-focused |
| Retail / E-commerce | Offer-led, urgency, social proof |

For WhatsApp/Messenger: copy must invite conversation. End with soft CTA (e.g. "Send us a message to find out more").

Each variation: primary text (≤125 chars), headline (≤40 chars), CTA.

### CTA selection by destination

**Website (Sales/Purchase):**
```options
{"title":"Choose your CTA","options":[
  {"id":"SHOP_NOW","title":"Shop Now"},
  {"id":"BUY_NOW","title":"Buy Now"},
  {"id":"GET_OFFER","title":"Get Offer"},
  {"id":"LEARN_MORE","title":"Learn More"}
]}
```

**WhatsApp / Messenger / Instagram DM:**
```options
{"title":"Choose your CTA","options":[
  {"id":"SEND_WHATSAPP_MESSAGE","title":"Send WhatsApp Message"},
  {"id":"WHATSAPP_MESSAGE","title":"WhatsApp Us"},
  {"id":"SEND_MESSAGE","title":"Send Message"},
  {"id":"CONTACT_US","title":"Contact Us"}
]}
```

**Lead Form:**
```options
{"title":"Choose your CTA","options":[
  {"id":"SIGN_UP","title":"Sign Up"},
  {"id":"APPLY_NOW","title":"Apply Now"},
  {"id":"GET_QUOTE","title":"Get Quote"},
  {"id":"LEARN_MORE","title":"Learn More"}
]}
```

**Traffic:**
```options
{"title":"Choose your CTA","options":[
  {"id":"LEARN_MORE","title":"Learn More"},
  {"id":"SHOP_NOW","title":"Shop Now"},
  {"id":"DOWNLOAD","title":"Download"}
]}
```

---

## Step 4 — Create Creative

```
create_ad_creative(
  name: "[Format] Creative — [Date]",
  object_story_spec: [JSON string — see formats below]
)
```

### object_story_spec by format + destination

**IMAGE — Website:**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "image_hash": "IMAGE_HASH",
    "link": "https://yoursite.com",
    "message": "Primary text here",
    "name": "Headline here",
    "call_to_action": {"type": "SHOP_NOW", "value": {"link": "https://yoursite.com"}}
  }
}
```

**IMAGE — WhatsApp:**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "image_hash": "IMAGE_HASH",
    "message": "Primary text here",
    "name": "Headline here",
    "call_to_action": {
      "type": "SEND_WHATSAPP_MESSAGE",
      "value": {"whatsapp_phone_number": "+85298765432"}
    }
  }
}
```

**VIDEO — Website:**
```json
{
  "page_id": "PAGE_ID",
  "video_data": {
    "video_id": "VIDEO_ID",
    "title": "Headline here",
    "message": "Primary text here",
    "call_to_action": {"type": "SHOP_NOW", "value": {"link": "https://yoursite.com"}}
  }
}
```

**CAROUSEL:**
```json
{
  "page_id": "PAGE_ID",
  "link_data": {
    "message": "Primary text here",
    "child_attachments": [
      {"link": "https://yoursite.com/p1", "image_hash": "HASH1", "name": "Card 1 headline", "call_to_action": {"type": "SHOP_NOW"}},
      {"link": "https://yoursite.com/p2", "image_hash": "HASH2", "name": "Card 2 headline", "call_to_action": {"type": "SHOP_NOW"}}
    ],
    "call_to_action": {"type": "SHOP_NOW"}
  }
}
```

**EXISTING_POST:**
```json
{
  "page_id": "PAGE_ID",
  "object_story_id": "PAGE_ID_POST_ID"
}
```

**After create_ad_creative() succeeds:**
1. Call `update_workflow_context({ creative_id, ad_format })`
2. IMMEDIATELY call `transfer_to_agent("ad_launcher")` — no text before or after.
