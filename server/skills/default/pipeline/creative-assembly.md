---
name: creative-assembly
description: Stage 3 (Creative) — Collect creative materials and ad copy. For Brief/Bulk mode, assets are already uploaded. For Boost, skip entirely. For Guided, ask user to upload. Always auto-generate copy. Transfer to ad-launcher for execution.
layer: pipeline
depends_on: [campaign-setup]
leads_to: [ad-launcher]
---

# Creative Assembly — Stage 3 (Creative)

## Golden Rules

1. **Show all 3 stages** — Stage 1 & 2 as `status:"done"` collapsed, Stage 3 as `status:"active"`.
2. **Never ask user to type ad copy** — Always auto-generate 3 variations and let user pick.
3. **Analyze visuals before writing copy** — Call `analyze_creative_visual()` to understand what's in the image/video.
4. **No API calls for campaign/ad_set** — Just collect creative info. Execution in ad-launcher.
5. **PATH B (Boost) is instant** — Zero user interaction, skip straight to ad-launcher.

---

## FIRST ACTIONS (no preamble)

```
get_workflow_context()
```

Detect path from workflow state:
- `bulk_mode: true` AND `uploaded_assets` → **PATH A (Brief/Bulk)**
- `boost_mode: true` → **PATH B (Boost)** — skip to ad-launcher immediately
- Otherwise → **PATH C (Guided)**

---

## Show 3-Stage Progress

Every response in Stage 3 must show all 3 stages. Build Stage 1 and 2 summaries from workflow_context:

```setupcard
{"phase":1,"status":"done","collapsed":true,"title":"Stage 1: Strategy ✅","subtitle":"[Objective] · [Country] · [Budget]/day","items":[
  {"label":"Goal","value":"[Objective] ([Destination])","icon":"target"},
  {"label":"Location","value":"[Country]","icon":"target"},
  {"label":"Budget","value":"[Budget]/day","icon":"dollar"}
]}
```

```setupcard
{"phase":2,"status":"done","collapsed":true,"title":"Stage 2: Audience ✅","subtitle":"[Audience type] · [Summary]","items":[
  {"label":"Strategy","value":"[Broad / Saved audience name / Custom targeting / Lookalike]","icon":"sparkles"}
]}
```

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","subtitle":"[Current step]","items":[...]}
```

---

## PATH A — Brief/Bulk Mode (assets pre-uploaded)

Assets are already uploaded (`uploaded_assets` in workflow context). Skip upload entirely.

### A-1 — Multi-image format choice

If `uploaded_assets.length >= 2`:

```options
{"title":"I see [N] images. How should I use them?","options":[
  {"id":"carousel","title":"Carousel Ad","description":"1 ad with [N] scrollable cards — great for showcasing multiple products"},
  {"id":"separate","title":"[N] Separate Ads","description":"A/B test which image performs best"}
]}
```

If only 1 asset, skip this step.

### A-2 — Visual analysis + copy generation

Call `get_ad_images()` to get image URLs by `image_hash`. For videos, use video_id.

Call `analyze_creative_visual(media_urls, context)` with the resolved URLs and campaign context (objective, destination, product/brand).

**CRITICAL: Use the visual analysis to write copy.** Copy MUST reference what's in the image (e.g. if image shows a beauty product, copy must be about beauty, not generic).

### A-3 — Generate copyvariations

For each asset (or for the carousel), produce a `copyvariations` block.

**Write FULL primary text (50–125 words per variation).** Not a tagline — this is the final ad copy.

```copyvariations
{"label":"Creative 1 — [filename]","variations":[
  {"id":"A","primary":"Full 50-125 word ad copy referencing visual analysis...","headline":"Headline (max 40 chars)","cta":"[CTA from workflow]"},
  {"id":"B","primary":"Different angle or tone...","headline":"Alt Headline","cta":"[CTA]"},
  {"id":"C","primary":"Third variation...","headline":"Third Headline","cta":"[CTA]"}
]}
```

Update Stage 3 card:

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","items":[
  {"label":"Creatives","value":"[N] image(s) ready ✓","icon":"sparkles"},
  {"label":"Ad Copy","value":"Pick a variation below","icon":"target"}
]}
```

Ask: **"Which variation for each creative? Reply e.g. 'A, B, A' or 'all A'."**

```quickreplies
["Use A for all", "Use B for all", "Use C for all"]
```

### A-4 — Parse selection

| Reply | Meaning |
|---|---|
| `A,B,A` or `1,2,1` | Per-creative choice |
| `all A` or `all 1` | Same for all |
| Single letter/digit | Same for all |

### A-5 — Save and transfer

```
update_workflow_context({ data: {
  ...current,
  creation_stage: "execution",
  ad_format: "IMAGE" | "VIDEO" | "CAROUSEL",
  creative_specs: [
    { asset_index: 0, variation: "A", primary_text: "...", headline: "...", cta: "..." },
    ...
  ]
}})
```

Transfer to ad-launcher: `load_skill("ad-launcher")`

---

## PATH B — Boost Mode (zero interaction)

Boost mode uses the existing post as creative. Nothing to configure.

Immediately transfer to ad-launcher:

```
update_workflow_context({ data: { ...current, creation_stage: "execution", ad_format: "EXISTING_POST" } })
```

`load_skill("ad-launcher")`

---

## PATH C — Guided (no materials)

### C-1 — Format selection

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","subtitle":"Choose your ad format","items":[]}
```

```options
{"title":"Choose your ad format","options":[
  {"id":"IMAGE","title":"Single Image","description":"One static image — best for simple, clear messaging"},
  {"id":"VIDEO","title":"Single Video","description":"Video ad — best for storytelling and engagement"},
  {"id":"CAROUSEL","title":"Carousel","description":"2–10 scrollable cards — showcase multiple products"},
  {"id":"EXISTING_POST","title":"Boost Existing Post","description":"Promote a post already on your Page"}
]}
```

If user picks EXISTING_POST, switch to boost mode: fetch posts, let user pick, then update workflow as boost_mode and transfer to ad-launcher.

### C-2 — Upload prompt

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","items":[
  {"label":"Format","value":"[Selected format]","icon":"sparkles"},
  {"label":"Upload","value":"Drop your [image/video] below ↓","icon":"target"}
]}
```

```quickreplies
["Browse existing images", "Browse existing videos"]
```

For "Browse existing images": call `get_ad_images()` → show as dropdown.
For "Browse existing videos": call `get_ad_videos()` → show as dropdown.

Specs reminder (only if needed):
- Image: 1080×1080 (1:1) Feed, 1080×1920 (9:16) Stories. Max 30MB. JPG/PNG.
- Video: MP4/MOV. Max 4GB.
- Carousel: 2–10 images, each with headline + URL.

### C-3 — After upload received

User uploads file → frontend sends message with `[Uploaded image: FILENAME, image_hash: HASH]` or `[Uploaded video: FILENAME, video_id: ID]`.

For video: call `get_ad_video_status(video_id)`. If not "ready", show "Video processing..." and poll.

For carousel: keep asking for more images until user has 2–10, then proceed.

### C-4 — Visual analysis + copy generation (same as A-2/A-3)

Analyze uploaded visual → generate 3 copyvariations → user picks.

**Language rules:**
- HK → Traditional Chinese / Cantonese
- TW → Traditional Chinese
- CN → Simplified Chinese
- Otherwise → English

**Tone by industry:**
| Industry | Tone |
|---|---|
| Fashion / Beauty / Lifestyle | Aspirational, emotion-driven |
| F&B / Food | Sensory, cravings-focused, urgency |
| Healthcare / Wellness | Trust-building, benefit-focused |
| Tech / SaaS | Feature-driven, problem-solving |
| Retail / E-commerce | Offer-led, urgency, social proof |

For WhatsApp/Messenger destination: copy must invite conversation. End with soft CTA.

### C-5 — Save and transfer (same as A-5)

Save creative_specs to workflow_context, transfer to ad-launcher.

---

## Stage 3 Confirmation

After user picks copy variation(s), show final Stage 3 summary:

```setupcard
{"phase":3,"status":"active","title":"Stage 3: Creative","items":[
  {"label":"Format","value":"[IMAGE / VIDEO / CAROUSEL]","icon":"sparkles"},
  {"label":"Creative","value":"[filename(s)]","icon":"sparkles"},
  {"label":"Copy","value":"Variation [X] selected","icon":"target"},
  {"label":"Headline","value":"[Selected headline]","icon":"target"},
  {"label":"CTA","value":"[CTA type]","icon":"target"}
]}
```

```quickreplies
["✅ Confirm Stage 3", "Change copy", "Rebuild"]
```

On confirm → save to workflow_context and transfer to ad-launcher.

---

## object_story_spec Reference (for ad-launcher to use)

**IMAGE — Website:**
```json
{"page_id":"PAGE_ID","link_data":{"image_hash":"HASH","link":"URL","message":"Primary","name":"Headline","call_to_action":{"type":"SHOP_NOW","value":{"link":"URL"}}}}
```

**IMAGE — WhatsApp:**
```json
{"page_id":"PAGE_ID","link_data":{"image_hash":"HASH","message":"Primary","name":"Headline","call_to_action":{"type":"WHATSAPP_MESSAGE","value":{"whatsapp_phone_number":"+852..."}}}}
```

**VIDEO — Website:**
```json
{"page_id":"PAGE_ID","video_data":{"video_id":"ID","title":"Headline","message":"Primary","call_to_action":{"type":"SHOP_NOW","value":{"link":"URL"}}}}
```

**CAROUSEL:**
```json
{"page_id":"PAGE_ID","link_data":{"message":"Primary","child_attachments":[{"link":"URL","image_hash":"HASH","name":"Card headline","call_to_action":{"type":"SHOP_NOW"}}],"call_to_action":{"type":"SHOP_NOW"}}}
```

**EXISTING_POST:**
```json
{"page_id":"PAGE_ID","object_story_id":"PAGEID_POSTID"}
```
