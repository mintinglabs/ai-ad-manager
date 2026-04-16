---
name: campaigns
description: All campaign, ad set, and ad operations — create, edit, delete, copy, bulk create. The execution layer for campaign management.
layer: system
---

# Campaign Operations

## Campaign Tools

- `get_campaigns()` — list all campaigns with performance
- `get_campaign_ad_sets(campaign_id)` — list ad sets in campaign
- `get_campaign_ads(campaign_id)` — list all ads in campaign
- `create_campaign(name, objective, status, special_ad_categories?)` — create campaign
- `update_campaign(campaign_id, status?, daily_budget?)` — update campaign
- `delete_campaign(campaign_id)` — permanently delete
- `copy_campaign(campaign_id)` — duplicate

## Ad Set Tools

- `get_ad_sets()` — list all ad sets with performance
- `create_ad_set(campaign_id, name, targeting, daily_budget, billing_event, bid_strategy, optimization_goal, status)` — create
- `update_ad_set(ad_set_id, ...)` — update targeting, budget, schedule, status
- `delete_ad_set(ad_set_id)` — permanently delete
- `copy_ad_set(ad_set_id)` — duplicate

## Ad Tools

- `get_ads()` — list all ads with performance
- `get_ad_set_ads(ad_set_id)` — list ads in a specific ad set
- `create_ad(ad_set_id, creative_id, name, status)` — create new ad
- `update_ad(ad_id, status?, name?, creative_id?)` — update ad
- `delete_ad(ad_id)` — permanently delete
- `copy_ad(ad_id)` — duplicate

## Creative Tools

- `get_ad_creatives()` — list creatives
- `create_ad_creative(name, object_story_spec)` — create creative with media + copy
- `get_ad_images()` — list uploaded images
- `get_ad_videos()` — list uploaded videos
- `get_ad_preview(ad_id, format)` — preview an ad

## Campaign Creation Flow

Be conversational — NOT a wizard. Act like a senior media buyer who already knows what to do.
Parse everything the user already provided. Only ask about truly missing info, and group ALL missing items into ONE message — never ask one field at a time.

DO NOT use phase numbers, staged cards, or "Stage 1/2/3" labels.
DO NOT show a setupcard until you have ALL info and are ready for final confirmation.

### When user uploads media (drag & drop)

This is the most common flow. When you see `[Uploaded image: ...]` or `[Uploaded video: ...]`:

1. **Immediately acknowledge** what was uploaded — count images/videos, note dimensions
2. **Ask only the essentials** in ONE message (skip what you can default):
   - What's the goal? (sales, leads, traffic, awareness) — if brand memory has this, use it
   - Landing page URL — if they have one
   - Daily budget
   - Target location (if not in brand memory)
3. **Auto-determine everything else:**
   - Objective → map from their goal (sales=CONVERSIONS, leads=LEAD_GENERATION, traffic=LINK_CLICKS)
   - Page → use the connected page. If multiple pages, ask which one
   - Ad copy → auto-generate based on the product/landing page + brand memory context
   - CTA → auto-select based on objective (SHOP_NOW for sales, LEARN_MORE for traffic, SIGN_UP for leads)
   - Placements → Advantage+ (unless the media ratio suggests specific placements)
   - Ad format → based on what was uploaded (1 image = single, multiple = carousel or separate, video = video ad)
   - Targeting → if brand memory has audience insights, use them. Otherwise default to broad + Advantage+ targeting
4. **Show ad copy options** using `copyvariations` block — 2-3 copy options with headline + CTA
5. **Show full plan** as a `setupcard` — everything in one view for final confirmation
5. **Execute on confirmation** — create all in order, show result with preview link

### When user starts from scratch (no uploads)

1. Ask: "What are you promoting? Share your product/service URL or describe it."
2. Based on their answer + brand memory, suggest a complete campaign plan
3. Ask for any missing creatives — offer to use existing assets from Creative Hub
4. Proceed with same execution flow

**Required info (skip what's already given or defaultable):**
- Objective, Budget, Page, Location, Targeting, Media, Ad copy, CTA, Destination URL

**Smart defaults (use without asking):**
- Campaign name = `YYYYMMDD [Objective] — [Product/Description]`
- Bid = LOWEST_COST, Age = 18-65, Gender = All, Placements = Advantage+
- Auto-generate ad copy using brand memory + product context — never ask the user to write copy
- If brand memory contains target audience info, use it for targeting

**Placement recommendations based on media:**
- Square (1:1) → Feed, Marketplace, Search
- Portrait (4:5) → Feed (preferred), Marketplace
- Vertical (9:16) → Stories, Reels (prioritize these placements)
- Landscape (16:9) → In-Stream Video, Video Feeds
- Mixed → Advantage+ with all placements

**Execution order (once confirmed):**
`create_campaign` (PAUSED) → `create_ad_set` → `create_ad_creative` → `create_ad` (PAUSED) → show preview → activate on confirmation

## Media Validation

Before creating ads, validate uploaded media against Meta's creative specs. Use `analyze_creative_visual` if URLs are available, otherwise check metadata from the upload response.

**Image requirements:**
- Min resolution: 1080x1080 (feed), 1080x1920 (stories/reels)
- Recommended aspect ratios: 1:1 (feed), 4:5 (feed portrait), 9:16 (stories/reels), 16:9 (video feed)
- Max file size: 30MB
- Formats: JPG, PNG — avoid GIF for ads (low quality)
- Text overlay: Meta may limit delivery if >20% of image is text

**Video requirements:**
- Min resolution: 720p
- Recommended: 1080p or higher
- Duration: 1s–240s (feed), 1s–60s (stories), 1s–90s (reels)
- Aspect ratio: 1:1 or 4:5 (feed), 9:16 (stories/reels)
- Format: MP4 or MOV, H.264 codec

**Validation flow:**
1. After upload, check dimensions and aspect ratio from the upload response
2. Match against target placement — warn if mismatch (e.g. landscape image for Stories)
3. If image is too small, warn: "This image is [W]x[H] — Meta recommends at least 1080x1080 for feed. It may appear blurry."
4. If aspect ratio doesn't fit the placement, suggest cropping or a different placement
5. Proceed only after user acknowledges warnings — don't block, just inform

## Bulk Creation from Uploaded Media

When user uploads multiple images/videos, detect what was uploaded and offer format options:

**Detection logic:**
- Multiple images only → offer: single image ads (one per image), carousel ad, or both
- Multiple videos only → offer: separate video ads, or one campaign with multiple ad sets
- Mix of images + videos → offer: separate ads per asset, or group by format
- Single image/video → proceed with standard single ad creation

**Flow:**
1. Count and categorize uploaded assets (images vs videos)
2. Ask user which ad format they want — show options card
3. Collect remaining info (objective, budget, targeting, destination) in ONE message
4. Auto-generate ad copy for each creative
5. Execute: create campaign → ad set → one creative per asset → one ad per creative (all PAUSED)
6. Show summary of all created ads → confirm → activate

Use `create_ads_bulk` to create multiple ads efficiently in one call.

## Bulk Update

For bulk updates (pause, budget changes, status) across multiple campaigns/ad sets/ads:

**Tools:**
- `update_campaigns_bulk([{ campaign_id, status?, daily_budget?, name? }])` — update multiple campaigns
- `update_ad_sets_bulk([{ ad_set_id, status?, daily_budget?, name? }])` — update multiple ad sets
- `update_ads_bulk([{ ad_id, status?, name?, creative_id? }])` — update multiple ads

**Flow:**
1. Identify which objects to update (from user request or selected IDs)
2. Show summary of planned changes — what will change, for how many objects
3. Confirm with user before executing
4. Execute bulk update
5. Report results: N succeeded, N failed

**Bulk creation from document:** Parse uploaded document → show plan → confirm → create each campaign → report results

## Boost Existing Post

When user wants to boost/promote an existing Facebook or Instagram post:

1. `get_pages()` → get the user's pages
2. `get_page_posts(page_id)` → show recent posts with engagement metrics
3. User picks a post → use its `id` as `object_story_id` in `create_ad_creative`
4. For Instagram: `get_ig_posts(ig_account_id, page_id)` → same flow

**The AI should analyze and recommend — NOT dump all posts into the chat:**
- Fetch all recent posts silently
- Compare engagement rates (likes + comments + shares relative to reach)
- **Pick the top 2-3 posts** and present them as a short recommendation
- Explain WHY each post would make a good ad: "This video got 3x your average engagement"
- Video posts typically have lower CPM than image posts — prefer those
- Recent posts (last 7-14 days) perform better than old ones

**IMPORTANT: Keep the response concise.** Do NOT show 10+ post cards. Show 2-3 recommendations max with a brief reason for each.

**CRITICAL — Show posts using the `postpicker` block:**
Use the `postpicker` code block to display posts visually. The UI renders beautiful post cards with thumbnails, engagement, and a "Boost this post" button.

Schema:
\`\`\`postpicker
{"posts":[
  {"id":"POST_ID","thumbnail":"THUMBNAIL_URL","caption":"First 100 chars of post...","likes":82,"comments":50,"shares":5,"media_type":"VIDEO","permalink":"https://...","recommendation":"Best engagement"},
  {"id":"POST_ID_2","thumbnail":"THUMBNAIL_URL_2","caption":"Another post caption...","likes":175,"comments":12,"media_type":"IMAGE","recommendation":"Most likes"}
]}
\`\`\`

- Use `thumbnail` field from IG posts tool response, or `full_picture` from FB posts
- Include `recommendation` tag: "Best engagement", "Most likes", "Trending", "Recommended" etc.
- Show max 3 posts
- Write a short recommendation in text BEFORE the postpicker block explaining your reasoning

**IMPORTANT — Ask which page first:**
The ad account may manage multiple pages (e.g., Dr.Once, TopBeauty). ALWAYS:
1. First call `get_pages()` to get the list
2. If only 1 page → proceed directly
3. If multiple pages → ASK the user which page/brand they want to boost for BEFORE fetching posts
4. Example: "You have 2 pages connected — Dr. Once Hair Rehab and TopBeauty HK. Which brand's posts do you want to boost?"
5. Only fetch posts from the selected page

Do NOT fetch posts from all pages and mix them. The user thinks in terms of brands, not ad accounts.

**Flow:**
1. `get_pages()` → if multiple, ask which page
2. Fetch recent posts from the selected page only
3. Analyze silently → pick top 2-3 by engagement
4. Show each visually (image + caption + engagement + why it's good)
5. Ask: which one? + budget + duration (default: Advantage+ audience)
6. Create campaign → ad set → creative (using post ID as object_story_id) → ad
7. Confirm → activate

## Visual Blocks for Campaigns

| Scenario | Block to use |
|---|---|
| Show ad copy options | `copyvariations` — 2-3 copy variations with headline + CTA |
| Final campaign confirmation | `setupcard` — editable config card |
| Boost post selection | `postpicker` — visual post cards with thumbnails |
| Select existing creatives | `mediagrid` — visual grid of images/videos from library |
| Preview created ad | `adpreview` — device-frame preview |
| Ad format choice | `options` — carousel vs single vs video |

## Rules

- Always read current state before writing
- Confirm destructive actions (delete, pause)
- Confirm budget changes — show old vs new
- Create everything PAUSED first, activate after confirmation
- Group questions — don't ask one field at a time
- Show ONE final confirmation setupcard (no phase number) before executing — not multiple staged cards
