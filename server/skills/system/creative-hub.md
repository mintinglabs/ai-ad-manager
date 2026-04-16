---
name: creative-hub
description: Upload, manage, and organize ad images and videos — the creative asset management layer for Meta Ads.
layer: system
---

# Asset Library

## Tools

- `get_ad_images()` — list all uploaded ad images in the account
- `get_ad_videos()` — list all uploaded ad videos in the account
- `upload_ad_image(bytes, name?)` — upload an image (base64-encoded)
- `upload_ad_video(file_url?, source?, title?, description?)` — upload a video from URL or base64
- `get_ad_video_status(video_id)` — check video processing status
- `delete_ad_image(image_hash)` — delete an image by hash
- `get_ad_creatives()` — list all ad creatives

## Related Tools

- `create_ad_creative(name, object_story_spec)` — create a creative from uploaded assets
- `get_ad_preview(ad_id, format)` — preview how an ad looks
- `analyze_creative_visual(image_url)` — AI analysis of creative visuals (if available)
- `get_page_posts(page_id)` — get existing page posts to use as ads
- `get_page_videos(page_id)` — get page videos
- `get_ig_media(ig_account_id, page_id)` — get Instagram media
- `get_ig_posts(ig_account_id, page_id)` — get Instagram posts

## Asset Upload Flow

### When User Uploads an Image

The user can paste or attach images directly in chat. When you receive `[Uploaded image: ...]`:

1. The image is already uploaded — extract the URL/hash from the upload result
2. Show preview confirmation:

```setupcard
{"title":"Image Uploaded","subtitle":"Ready to use in ads","items":[
  {"label":"File","value":"product-hero.jpg","icon":"target"},
  {"label":"Size","value":"1080x1080","icon":"sparkles"},
  {"label":"Format","value":"JPG","icon":"shield"}
]}
```

3. Offer next actions:

```quickreplies
["Create Ad with This", "Upload More", "View All Assets", "Back"]
```

### When User Uploads a Video

1. Upload via `upload_ad_video(file_url)` or base64
2. Check processing status with `get_ad_video_status(video_id)` — videos take time to process
3. Show status:

```metrics
[{"label":"Status","value":"Processing","change":"~2 min","trend":"up"},
 {"label":"Duration","value":"0:30","change":"","trend":"up"},
 {"label":"Format","value":"MP4 1080p","change":"","trend":"up"}]
```

4. Once ready, offer to create an ad

### When User Asks to See Assets

1. Call `get_ad_images()` and `get_ad_videos()` in parallel
2. Show summary:

```metrics
[{"label":"Images","value":"24","change":"","trend":"up"},
 {"label":"Videos","value":"8","change":"","trend":"up"},
 {"label":"Creatives","value":"15","change":"","trend":"up"}]
```

3. List recent assets with thumbnails if available

```quickreplies
["Upload New Image", "Upload New Video", "Use Existing Post", "Import from Instagram"]
```

## Creative Specs (Meta Requirements)

### Image Requirements
| Placement | Min Resolution | Aspect Ratio | Max Size |
|-----------|---------------|--------------|----------|
| Feed | 1080x1080 | 1:1 | 30MB |
| Feed Portrait | 1080x1350 | 4:5 | 30MB |
| Stories/Reels | 1080x1920 | 9:16 | 30MB |
| Carousel | 1080x1080 | 1:1 | 30MB |
| Right Column | 1200x628 | 1.91:1 | 30MB |

**Formats:** JPG, PNG
**Text overlay:** Meta may reduce delivery if >20% of image is text

### Video Requirements
| Placement | Min Resolution | Aspect Ratio | Duration |
|-----------|---------------|--------------|----------|
| Feed | 720p | 1:1 or 4:5 | 1s–240s |
| Stories | 720p | 9:16 | 1s–60s |
| Reels | 720p | 9:16 | 1s–90s |
| In-Stream | 720p | 16:9 | 5s–600s |

**Formats:** MP4, MOV (H.264 codec)
**Recommended:** 1080p or higher, <4GB

## Using Existing Posts as Ads

Instead of uploading new media, users can promote existing posts:

1. `get_pages()` → get page_id
2. `get_page_posts(page_id)` → list recent posts
3. Use the post's `id` as `object_story_id` in `create_ad_creative`

For Instagram posts:
1. `get_connected_instagram_accounts()` → get ig_account_id
2. `get_ig_posts(ig_account_id, page_id)` → list IG posts
3. Use post ID to create ad

```quickreplies
["Use Facebook Post", "Use Instagram Post", "Upload New Media", "Back"]
```

## Validation Before Creating Ads

Before using an asset in an ad, verify:
1. **Image**: resolution meets minimum for target placement
2. **Video**: processing complete (status = "ready")
3. **Aspect ratio**: matches the intended placement
4. **File size**: within Meta limits

If validation fails, explain the issue and suggest fixes:
- Wrong ratio → "This image is 16:9 but Stories needs 9:16. Want me to use it for Feed instead?"
- Too small → "This image is 600x600 but Meta recommends 1080x1080 minimum for quality."

## Visual Blocks for Creatives

| Scenario | Block to use |
|---|---|
| Browse/select images or videos | `mediagrid` — visual grid with thumbnails |
| Generate ad copy for a creative | `copyvariations` — A/B/C copy options |
| Preview how the ad looks | `adpreview` — device-frame preview |

When showing existing assets, use `mediagrid` instead of listing them as text. The frontend renders a searchable, sortable grid with thumbnails.

## After Upload

Always offer clear next actions:

```quickreplies
["Create Ad with This", "Upload Another", "View All Assets", "Back to Dashboard"]
```
