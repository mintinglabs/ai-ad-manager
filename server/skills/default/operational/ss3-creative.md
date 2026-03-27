---
name: ss3-creative
description: Creative Assembly — Step 2 of 3. Three paths: PATH A skips upload (assets already in context), PATH B is invisible boost creative, PATH C is guided upload+copy. Always auto-generates copy — never asks user to type manually.
layer: operational
depends_on: [ss1-strategist]
leads_to: [ss4-launcher]
---

# SS3 — Creative Builder (Step 2 of 3)

## Golden Rules

1. **Check path first** — read `get_workflow_context()` before doing anything.
2. **PATH B is invisible** — zero user messages for boost. Create creative immediately, transfer.
3. **Never ask the user to type ad copy** — always auto-generate and let them pick.
4. **Never re-ask** for IDs or settings already in workflow state.

---

## FIRST ACTIONS (parallel, no preamble)

```
get_workflow_context()
load_skill("ss3-creative")
```

Then detect path from workflow state:

---

## PATH A — Brief Mode (bulk_mode: true)

**Trigger:** `get_workflow_context()` returns `bulk_mode: true` AND `uploaded_assets` array with length ≥ 1.

### A-1 — Skip format selection and upload entirely

Assets are already uploaded. Go straight to copy generation.

### A-2 — Generate ALL copyvariations in ONE response

For each asset in `uploaded_assets`, produce one `copyvariations` block prefixed with a markdown header.
Use the filename, campaign objective, conversion_destination, and any product/brand context from the brief.

Example output:

**Creative 1 — dress_red.png**
```copyvariations
{"label":"Creative 1 — dress_red.png","variations":[
  {"id":"A","primary":"…","headline":"…","cta":"SHOP_NOW"},
  {"id":"B","primary":"…","headline":"…","cta":"SHOP_NOW"},
  {"id":"C","primary":"…","headline":"…","cta":"SHOP_NOW"}
]}
```

(Repeat for each asset in one message.)

Then ask in one line: **"Which variation for each creative? Reply e.g. '1,2,1' or 'all A'."**

### A-3 — Parse user selection

| Reply | Meaning |
|---|---|
| `1,2,1` or `A,B,A` | Per-creative choice (1=A, 2=B, 3=C) |
| `all A` or `all 1` | Same variation for every creative |
| Single digit or letter | Same variation for every creative |

### A-4 — Create creatives in sequence

For each asset with the chosen variation:
```
create_ad_creative(
  name: "[filename] Creative [i+1] — [Today's Date]",
  object_story_spec: [built from image_hash or video_id, page_id, chosen copy, CTA]
)
```

Show compact inline status:
> ✅ Creative 1 created — dress_red.png
> ❌ Creative 2 failed — [error message]

If one fails: continue with remaining. At end ask: "Creative [N] failed — continue without it or retry?"

For video assets: call `get_ad_video_status(video_id)` first. If not ready, create image creatives first, then revisit video once status = "ready".

### A-5 — Save and transfer

```
update_workflow_context({ data: {
  creative_ids: ["ID1","ID2",...],
  creative_id: "ID1",
  creative_names: ["filename — Creative 1", ...],
  ad_format: "IMAGE",
  bulk_mode: true
}})
```

IMMEDIATELY `transfer_to_agent("ad_launcher")` — no text before or after.

---

## PATH B — Post Boost (boost_mode: true)

**Trigger:** `get_workflow_context()` returns `boost_mode: true` AND `object_story_id` is set.

### B-1 — Zero user interaction

Do NOT show any message to the user. Immediately:

```
create_ad_creative(
  name: "Boost Creative — [Today's Date]",
  object_story_spec: {
    "page_id": "[page_id from workflow]",
    "object_story_id": "[object_story_id from workflow]"
  }
)
```

### B-2 — Save and transfer immediately

```
update_workflow_context({ data: { creative_id: "[id]", ad_format: "EXISTING_POST" } })
```

IMMEDIATELY `transfer_to_agent("ad_launcher")` — no text before or after.

---

## PATH C — Guided (standard creation)

**Trigger:** No `bulk_mode` and no `boost_mode` in workflow state.

### C-1 — Format selection

```options
{"title":"Choose your ad format","options":[
  {"id":"IMAGE","title":"Single Image","description":"One static image — best for simple, clear messaging"},
  {"id":"VIDEO","title":"Single Video","description":"Video ad — best for storytelling and engagement"},
  {"id":"CAROUSEL","title":"Carousel","description":"2–10 scrollable cards — best for showcasing multiple products"},
  {"id":"EXISTING_POST","title":"Boost Existing Post","description":"Promote a post already on your Page"}
]}
```

### C-2 — Media upload

**IMAGE:**
Upload image → `upload_ad_image()` → returns `image_hash`. Show filename to user, NOT the raw hash.

Or offer: "Choose from existing library" → `get_ad_images()`.

Specs: 1080×1080 (1:1) for Feed, 1080×1920 (9:16) for Stories/Reels. Max 30MB. JPG or PNG.

**VIDEO:**
Upload file (MP4/MOV) or paste URL → `upload_ad_video()`.
After upload, immediately call `get_ad_video_status(video_id)`.
- If "ready" → proceed.
- If NOT ready → "Video is processing, I'll check again shortly." Poll until ready. Offer re-upload after 10 min.
Do NOT proceed until video status = "ready".

Or offer: "Choose from existing videos" → `get_ad_videos()`.

**CAROUSEL:**
Collect 2–10 cards. For each card: image upload + headline (max 40 chars) + destination URL.

**EXISTING_POST:**
`get_page_posts(page_id)` → show posts as options:
```options
{"title":"Which post do you want to promote?","options":[
  {"id":"PAGE_ID_POST_ID","title":"Post preview…","description":"Posted [date]"}
]}
```
Use `"pageId_postId"` as `object_story_id`. Skip copy generation — post has its own content.

### C-3 — Auto-generate copy (IMAGE and VIDEO only)

**Immediately** after media is ready — do NOT wait to be asked:

Generate 3 variations using the filename, campaign objective, conversion_destination, and any product/brand context.

```copyvariations
{"label":"Ad Copy Options","variations":[
  {"id":"A","primary":"…","headline":"…","cta":"SHOP_NOW"},
  {"id":"B","primary":"…","headline":"…","cta":"SHOP_NOW"},
  {"id":"C","primary":"…","headline":"…","cta":"SHOP_NOW"}
]}
```

Ask: "Which variation? You can also reply with edits."

**Language:** HK → Traditional Chinese/Cantonese. TW → Traditional Chinese. CN → Simplified Chinese.

**Tone by industry:**
| Industry | Tone |
|---|---|
| Fashion / Beauty / Lifestyle | Aspirational, emotion-driven |
| F&B / Food | Sensory, cravings-focused, urgency |
| Healthcare / Wellness | Trust-building, benefit-focused |
| Tech / SaaS | Feature-driven, problem-solving |
| Finance / Insurance / Real Estate | Authority, ROI-focused |
| Retail / E-commerce | Offer-led, urgency, social proof |
| Footwear / Sportswear | Performance-driven, aspirational |

For WhatsApp/Messenger: copy must invite conversation. End with soft CTA (e.g. "Send us a message to find out more").

### C-4 — Create creative

```
create_ad_creative(
  name: "[Format] Creative — [Today's Date]",
  object_story_spec: [JSON string — see formats below]
)
```

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
      {"link": "https://yoursite.com/p1", "image_hash": "HASH1", "name": "Card 1", "call_to_action": {"type": "SHOP_NOW"}},
      {"link": "https://yoursite.com/p2", "image_hash": "HASH2", "name": "Card 2", "call_to_action": {"type": "SHOP_NOW"}}
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

### C-5 — Save and transfer

```
update_workflow_context({ data: { creative_id: "[id]", ad_format: "[format]" } })
```

IMMEDIATELY `transfer_to_agent("ad_launcher")` — no text before or after.
