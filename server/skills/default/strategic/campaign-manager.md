---
name: campaign-manager
description: Plan and configure Facebook ad campaigns — guided 11-step creation flow with interactive options at every decision point. Also handles diagnostic response to insights warnings/criticals with one-click fixes.
layer: strategic
depends_on: [insights-reporting]
leads_to: [adset-manager, ad-manager, creative-manager, targeting-audiences, tracking-conversions]
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

## Diagnostic Response Mode

**Triggered when:** routed from `insights-reporting` with `warning` or `critical` status items, OR user says "fix this", "optimize", "what should I do", "點算", "點改" after seeing an insights report.

**This mode is NOT the campaign creation flow.** Skip Steps 1–11 entirely. Go straight to D1 → D2 → D3.

### Entry Actions (run in parallel)

```
get_workflow_context()
get_ad_sets()
```

Read `insights_alert` from workflow context if present. Format: `{ metric, value, prev, trend, status, campaign_id, adset_id, optimization_goal }`. If no alert in context, call `get_object_insights` (last_7d) on the most recently active campaign and derive the issue yourself.

---

### D1 — Three Specific Recommendations

Based on `optimization_goal` + the flagged metric, select the matching row and present **exactly 3 recommendations** with specific names, adset names, and dollar amounts from the live data. No vague advice.

**Leads (optimization_goal = LEAD_GENERATION)**

| Alert | 3 Recommendations |
|---|---|
| CPL rising > +15% | 1. Pause [worst adset by CPL]; 2. Shift its daily budget to [best adset by CPL]; 3. Load `creative-manager` to refresh copy on the paused adset |
| Lead volume down > -15%, spend stable | 1. Check lead form health — a broken form = zero leads; 2. Test a new creative hook (first 3 seconds or headline); 3. Widen audience age range ±5 years |
| Frequency > 3 | 1. Pause ads running > 14 days; 2. Duplicate top ad with a new image; 3. Expand to Lookalike 2% of existing converters |

**Sales (optimization_goal = OFFSITE_CONVERSIONS or VALUE)**

| Alert | 3 Recommendations |
|---|---|
| ROAS < 1.5x or dropping > -15% | 1. Pause ad sets with ROAS < 1x immediately; 2. Increase budget +20% on ad sets with ROAS > 2.5x; 3. Narrow audience to website retargeting only |
| CPA rising > +20% | 1. Switch audience to retargeting (exclude cold traffic); 2. Test new creative with a stronger offer or price anchor; 3. Add spend cap = 3× current daily budget to limit bleed |
| Conversions down, spend stable | 1. Verify pixel is firing (broken pixel = no conversions attributed); 2. Test a new landing page angle; 3. Switch bid strategy to Cost Cap at current CPA |

**Messaging (optimization_goal = CONVERSATIONS)**

| Alert | 3 Recommendations |
|---|---|
| Cost per Conversation rising > +20% | 1. Test a new creative opening with a direct question CTA; 2. Narrow audience to top-performing city/region; 3. Add a time-limited hook to ad copy ("Chat today, get X free") |
| Conversation volume < 5/week | 1. Increase daily budget +30%; 2. Expand audience age range; 3. Test Stories/Reels placement — lower CPM for conversation entry |

**Traffic (optimization_goal = LINK_CLICKS or LANDING_PAGE_VIEWS)**

| Alert | 3 Recommendations |
|---|---|
| CPC rising > +20% | 1. Refresh ad creative — rising CPC signals relevance score drop; 2. Add 2-3 interest layers to improve audience signal; 3. Test a shorter headline (under 25 chars) |
| CTR < 0.5% | 1. Pause this ad immediately; 2. Duplicate with a new hero image (lifestyle vs product); 3. Test video format — video CTR typically 30-50% higher than static |

**Universal**

| Alert | 3 Recommendations |
|---|---|
| Budget underpacing < 70% by midday | 1. Remove manual placement restrictions; 2. Widen audience (remove exclusions or broaden age); 3. Switch to Advantage+ placements |
| Frequency > 5 (any goal) | 1. Pause all ads running > 21 days; 2. Duplicate top 2 ads with 3 new copy variations; 3. Expand audience size by 2–3× via Lookalike or broader interests |

---

### D2 — One-click Action Buttons

After the 3 recommendations, always output a `quickreplies` block. Use **real names and amounts** from the live data — no placeholders:

```quickreplies
["⏸ Pause [AdSet Name]", "📈 Add 20% Budget ($X → $Y/day)", "🎨 Refresh Creative", "👥 Adjust Audience"]
```

Rules:
- Button 1 — most urgent: pause, cap, or fix the critical item
- Button 2 — budget action: scale winner or cut loser (show exact dollar amounts)
- Button 3 — creative action → will load `creative-manager`
- Button 4 — audience action → will load `targeting-audiences`
- If the fix is a pixel/tracking issue, replace Button 4 with: "🔍 Check Tracking Setup" → `tracking-conversions`

---

### D3 — Operational Skill Routing

When the user clicks an action button, **immediately load the correct skill and execute**. Do not ask for confirmation unless the action is irreversible (delete/permanent pause with no recovery path).

| Action | Skill to Load | Tool to Call |
|---|---|---|
| Pause / resume adset or ad | `adset-manager` | `update_ad_set(status:"PAUSED")` / `update_ad(status:"PAUSED")` |
| Adjust budget (± %) | `adset-manager` | `update_ad_set(daily_budget: new_cents)` — show before/after |
| New creative or copy variations | `creative-manager` | Generates copyvariations + uploads new creative |
| Narrow / widen audience | `targeting-audiences` | Edits adset targeting JSON — show before/after reach estimate |
| Check pixel or lead form | `tracking-conversions` | Pixel audit or lead form health check |
| Duplicate top ad | `ad-manager` | `copy_campaign` or duplicate ad with new creative_id |
| Change bid strategy | `adset-manager` | `update_ad_set(bid_strategy, bid_amount)` |
| Scale budget on winner | `adset-manager` | `update_ad_set(daily_budget: current × 1.2)` |

**After executing any fix:** always show an updated `insights` card (before vs after values) and add:
```quickreplies
["Check results in 24h", "Apply to other campaigns", "Undo this change", "Run full health audit"]
```

---

## Strategy Workflow

Full guided flow (Steps 1–11) for creating a campaign from scratch. NEVER call a create tool until you have ALL required information. Walk through each step using option cards. Keep each step to ONE options/metrics block + max 1 sentence of context. No paragraphs between steps.

**Progress:** Always show step progress at the top of each step as plain text: `Step 2 of 11 — Page`. This tells the user where they are in the flow.

### Step 1 — Objective

Show immediately with no preamble:

```options
{"title":"What's your campaign goal?","options":[
  {"id":"SALES","title":"Sales","description":"Drive purchases, WhatsApp conversations, or website conversions"},
  {"id":"LEADS","title":"Leads","description":"Collect leads via forms, Messenger, or WhatsApp"},
  {"id":"TRAFFIC","title":"Traffic","description":"Send people to your website or app"},
  {"id":"AWARENESS","title":"Awareness","description":"Reach people likely to remember your ads"},
  {"id":"ENGAGEMENT","title":"Engagement","description":"More likes, comments, shares, or video views"},
  {"id":"APP_PROMOTION","title":"App Promotion","description":"Get more app installs or in-app actions"}
]}
```

### Step 1b — Conversion Location (Destination)

**This step is mandatory.** The destination determines `optimization_goal`, the correct CTA, and which tracking to set up. Show immediately after Step 1 — no preamble.

Options vary by objective:

**If Sales or Leads:**
```options
{"title":"Where do you want to get results?","options":[
  {"id":"WEBSITE","title":"Website","description":"Drive conversions on your website — requires Meta Pixel"},
  {"id":"WHATSAPP","title":"WhatsApp","description":"Start WhatsApp conversations — optimization_goal: CONVERSATIONS"},
  {"id":"MESSENGER","title":"Messenger","description":"Start Messenger conversations — optimization_goal: CONVERSATIONS"},
  {"id":"INSTAGRAM_DM","title":"Instagram DM","description":"Start Instagram DM conversations — optimization_goal: CONVERSATIONS"},
  {"id":"LEAD_FORM","title":"Instant Lead Form","description":"Collect leads inside Facebook/Instagram — no website needed"},
  {"id":"CALLS","title":"Phone Calls","description":"Drive calls directly from the ad"}
]}
```

**If Traffic:**
```options
{"title":"Where should traffic go?","options":[
  {"id":"WEBSITE","title":"Website / Landing Page","description":"Send clicks to a URL — optimization_goal: LINK_CLICKS or LANDING_PAGE_VIEWS"},
  {"id":"WHATSAPP","title":"WhatsApp","description":"Click-to-WhatsApp — optimization_goal: CONVERSATIONS"},
  {"id":"APP","title":"App","description":"Send traffic to your mobile app"}
]}
```

**If Awareness or Engagement:** skip this step — destination is always the ad placement itself.

**If App Promotion:** skip this step — destination is always the app store.

**Save the destination** — it drives all downstream decisions:

| Destination | optimization_goal | Primary Metric | CTA Options |
|---|---|---|---|
| Website (purchase) | `OFFSITE_CONVERSIONS` | ROAS / CPA | SHOP_NOW, BUY_NOW, GET_OFFER |
| Website (lead) | `OFFSITE_CONVERSIONS` | CPL | SIGN_UP, LEARN_MORE, CONTACT_US |
| WhatsApp | `CONVERSATIONS` | Cost per Conversation | SEND_WHATSAPP_MESSAGE, WHATSAPP_MESSAGE |
| Messenger | `CONVERSATIONS` | Cost per Conversation | SEND_MESSAGE |
| Instagram DM | `CONVERSATIONS` | Cost per Conversation | SEND_MESSAGE |
| Lead Form | `LEAD_GENERATION` | CPL | SIGN_UP, APPLY_NOW, LEARN_MORE |
| Phone Calls | `CALL` | Cost per Call | CALL_NOW |
| Website (traffic) | `LINK_CLICKS` or `LANDING_PAGE_VIEWS` | CPC / Cost per LPV | LEARN_MORE, SHOP_NOW |

**If destination = WhatsApp**, immediately ask before proceeding:

> "What's your business WhatsApp number? (E.164 format, e.g. +85298765432)"

Save as `whatsapp_phone_number` — required in Step 11 for the ad creative spec. Validate: must start with `+` followed by country code and number, no spaces or dashes.

### Step 2 — Page

Call `get_pages` and present as options (use page NAME as title, NEVER raw IDs):

```options
{"title":"Which Page will run this campaign?","options":[
  {"id":"PAGE_ID_1","title":"Your Business Page Name","description":"Facebook Page"},
  {"id":"PAGE_ID_2","title":"Your Other Page Name","description":"Facebook Page"}
]}
```

### Step 3 — Ad Format

```options
{"title":"Choose your ad format","options":[
  {"id":"IMAGE","title":"Single Image","description":"One static image — best for simple, clear messaging"},
  {"id":"VIDEO","title":"Single Video","description":"Video ad — best for storytelling and engagement"},
  {"id":"CAROUSEL","title":"Carousel","description":"2-10 scrollable cards — best for showcasing multiple products"},
  {"id":"COLLECTION","title":"Collection","description":"Cover image/video + product grid — best for e-commerce browsing"},
  {"id":"EXISTING_POST","title":"Boost Existing Post","description":"Promote a post already on your Page"}
]}
```

> Note: For WhatsApp/Messenger destination, IMAGE and VIDEO formats are recommended. Carousel works but is less common for conversation campaigns.

### Step 4 — Creative Upload & Spec Validation

Based on the chosen format, show the required specs BEFORE asking for the asset:

**For Image:**
> Upload your ad image. Recommended specs:
> - **Feed**: 1080x1080 (1:1) — best for engagement
> - **Stories/Reels**: 1080x1920 (9:16) — full-screen vertical
> - Max 30MB. JPG or PNG. Min 600x600.

After user uploads, call `upload_ad_image`. Show the image **name** (not the raw hash — hash is for internal use only).

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

**Language detection first:** If the user's messages or business name suggest a non-English market (HK → Traditional Chinese/Cantonese, TW → Traditional Chinese, CN → Simplified Chinese, MY/SG → English or Malay, JP → Japanese), generate copy in that language by default. Ask if unsure: "Should the ad copy be in English or [local language]?"

Generate 3 ad copy variations using ```copyvariations block. Match tone to industry AND destination:

| Industry | Tone |
|---|---|
| Fashion / Beauty / Lifestyle | Aspirational, sensory, emotion-driven |
| F&B / Food | Sensory, cravings-focused, urgency |
| Healthcare / Medical / Wellness | Trust-building, reassuring, benefit-focused |
| Tech / SaaS | Feature-driven, problem-solving, efficiency |
| Finance / Insurance / Real Estate | Authority, security, ROI-focused |
| Education / Courses | Transformation, outcome-focused, curiosity |
| B2B / Professional Services | Professional, results-oriented, credibility |
| Retail / E-commerce | Offer-led, urgency, social proof |

For WhatsApp/Messenger destination, copy should invite conversation — end with a soft CTA that encourages a reply (e.g. "Send us a message to find out more", "Chat with us today").

Each variation must include: primary text (under 125 chars), headline (under 40 chars), and CTA.

Then present CTA selection — show only CTAs relevant to the destination chosen in Step 1b:

**For Website (Sales/Purchase):**
```options
{"title":"Choose your call-to-action","options":[
  {"id":"SHOP_NOW","title":"Shop Now","description":"Best for e-commerce and product sales"},
  {"id":"BUY_NOW","title":"Buy Now","description":"Direct purchase intent"},
  {"id":"GET_OFFER","title":"Get Offer","description":"Best for promotions and discounts"},
  {"id":"LEARN_MORE","title":"Learn More","description":"Softer entry, best for higher-ticket items"}
]}
```

**For WhatsApp / Messenger / Instagram DM:**
```options
{"title":"Choose your call-to-action","options":[
  {"id":"SEND_WHATSAPP_MESSAGE","title":"Send WhatsApp Message","description":"Opens WhatsApp chat with your business"},
  {"id":"WHATSAPP_MESSAGE","title":"WhatsApp Us","description":"Alternative WhatsApp CTA"},
  {"id":"SEND_MESSAGE","title":"Send Message","description":"For Messenger or Instagram DM destination"},
  {"id":"CONTACT_US","title":"Contact Us","description":"Generic contact CTA"}
]}
```

**For Lead Form / Lead Gen:**
```options
{"title":"Choose your call-to-action","options":[
  {"id":"SIGN_UP","title":"Sign Up","description":"Best for newsletters and registrations"},
  {"id":"APPLY_NOW","title":"Apply Now","description":"Best for jobs, finance, courses"},
  {"id":"GET_QUOTE","title":"Get Quote","description":"Best for services"},
  {"id":"LEARN_MORE","title":"Learn More","description":"Lower friction entry"}
]}
```

**For Traffic:**
```options
{"title":"Choose your call-to-action","options":[
  {"id":"LEARN_MORE","title":"Learn More","description":"Best for content and awareness-to-traffic"},
  {"id":"SHOP_NOW","title":"Shop Now","description":"Best for product browsing"},
  {"id":"BOOK_TRAVEL","title":"Book Now","description":"Best for travel and hospitality"},
  {"id":"DOWNLOAD","title":"Download","description":"Best for apps and digital content"}
]}
```

Ask for the landing page URL.

### Step 6 — Audience & Targeting

Present targeting approach:

```options
{"title":"How do you want to target?","options":[
  {"id":"BROAD","title":"Broad Targeting","description":"Let Meta find the best audience — recommended for most campaigns"},
  {"id":"INTEREST","title":"Interest-Based","description":"Target by specific interests, behaviors, and demographics"},
  {"id":"CUSTOM","title":"Custom Audience","description":"Retarget website visitors, video viewers, or customer lists"},
  {"id":"LOOKALIKE","title":"Lookalike Audience","description":"Reach new people similar to your best customers"},
  {"id":"SAVED","title":"Saved Audience","description":"Use a previously saved targeting preset"}
]}
```

**If BROAD:** Use `{"geo_locations":{"countries":["XX"]},"age_min":18,"age_max":65,"targeting_optimization":"none"}`. Ask for country only (1 question). Meta's algorithm handles the rest.

**If INTEREST-BASED:** Ask for target country, age range, and gender. Then ask: "What's the product/service? I'll find relevant interests." Call `targeting_search` with 2-3 keywords and present results as options. Show audience size **in the target country** (use `get_reach_estimate` after selecting interests — not the global Meta audience size).

**If CUSTOM AUDIENCE:** Call `get_custom_audiences` and present existing audiences. If none exist, suggest loading the targeting-audiences skill to create one first.

**If LOOKALIKE:** Call `get_custom_audiences` to show source audience options, then ask for target country.

**If SAVED AUDIENCE:** Call `get_saved_audiences` and present options.

After targeting is set, call `get_reach_estimate` and show:

```metrics
{"metrics":[
  {"label":"Estimated Reach in [Country]","value":"1.2M - 3.5M"},
  {"label":"Target Country","value":"Hong Kong"},
  {"label":"Age Range","value":"25-45"},
  {"label":"Interests","value":"3 selected"}
]}
```

If reach < 50,000 — warn: "Audience is narrow. Consider broadening age range or adding more interests."
If reach > 50,000,000 — warn: "Audience is very broad. Consider adding interests or narrowing demographics."

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

**Currency detection:** Call `get_ad_account_details` to read the account currency. Show all budget amounts in the account's actual currency (HKD, SGD, USD, GBP, etc.) — never hardcode USD.

Present budget options based on objective and destination. These are USD equivalents — multiply by local currency rate if account currency differs:

| Destination / Goal | Recommended Starting Budget | Why |
|---|---|---|
| WhatsApp / Messenger conversations | $15-25/day | Conversation campaigns need sufficient reach to generate enough chats |
| Website purchase (ROAS) | $20-30/day | Needs conversion events for algorithm to optimise |
| Lead Form / Lead gen | $15-25/day | Needs lead events for optimisation |
| Website traffic | $10-20/day | Lower cost per result, less data needed |
| Awareness / Reach | $10-15/day | Efficient at lower budgets |
| Engagement | $10-15/day | Low cost per engagement |
| App Promotion | $20-30/day | Needs install data |

```options
{"title":"Daily budget (in [ACCOUNT_CURRENCY])","options":[
  {"id":"CONSERVATIVE","title":"[LOCAL_EQUIV of $10]/day","description":"Conservative — good for testing, limited delivery"},
  {"id":"RECOMMENDED","title":"[LOCAL_EQUIV of $20]/day","description":"Recommended starting budget for this goal"},
  {"id":"AGGRESSIVE","title":"[LOCAL_EQUIV of $50]/day","description":"Aggressive — faster learning phase"},
  {"id":"CUSTOM","title":"Custom Amount","description":"Set your own daily budget"}
]}
```

> Replace `[LOCAL_EQUIV]` with the actual amount in the account currency. E.g. for HKD: HK$80/day, HK$160/day, HK$390/day.

Then schedule:

```options
{"title":"Campaign schedule","options":[
  {"id":"ONGOING","title":"Run Continuously","description":"Start now, run until you pause it"},
  {"id":"SCHEDULED","title":"Set Start & End Date","description":"Run for a specific period"}
]}
```

If scheduled, ask for start date and end date. Call `get_minimum_budgets` to validate the budget meets Meta's minimums.

### Step 9 — Pixel & Tracking

**Skip this step entirely for WhatsApp, Messenger, Instagram DM, and Phone Call destinations** — pixel tracking is not used for conversation-based campaigns. Go directly to Step 10.

For Website, Lead Form, and Traffic destinations: call `get_pixels` and present available pixels:

```options
{"title":"Select your tracking pixel","options":[
  {"id":"PIXEL_ID_1","title":"Your Pixel Name","description":"Website pixel — tracks conversions"},
  {"id":"NONE","title":"Skip Pixel","description":"Not recommended — Meta can't optimize for conversions"}
]}
```

If no pixel exists, warn: "No tracking pixel found. Without a pixel, Meta can't optimize for conversions. Want me to create one?"

Offer UTM parameters:

```options
{"title":"Add UTM tracking?","options":[
  {"id":"AUTO","title":"Auto-generate UTMs","description":"utm_source=facebook&utm_medium=cpc&utm_campaign=[name]"},
  {"id":"CUSTOM","title":"Custom UTMs","description":"Set your own UTM parameters"},
  {"id":"NONE","title":"Skip UTMs","description":"No URL tracking parameters"}
]}
```

### Step 10 — Review & Confirm

Show ALL settings as a summary:

```steps
{"title":"Campaign Review — Ready to Launch","steps":[
  {"label":"Campaign","description":"[Name] · [Objective] · PAUSED","priority":"high"},
  {"label":"Destination","description":"[Destination e.g. WhatsApp / Website / Lead Form]","priority":"high"},
  {"label":"Page","description":"[Page Name]","priority":"high"},
  {"label":"Creative","description":"[Format] · [Asset name — NOT raw hash] · [Headline]","priority":"high"},
  {"label":"Ad Copy","description":"[First 60 chars of primary text…] · CTA: [CTA label]","priority":"high"},
  {"label":"Audience","description":"[Country] · Ages [min]-[max] · [Gender] · [Targeting type + summary]","priority":"high"},
  {"label":"Placements","description":"[Placement choice]","priority":"medium"},
  {"label":"Budget","description":"[AMOUNT + CURRENCY]/day · [Schedule]","priority":"high"},
  {"label":"Tracking","description":"[Pixel name or 'Not required for this destination'] · [UTM status]","priority":"medium"}
]}
```

Then ask: **"Should I create this campaign?"**

### Step 11 — Create, Pre-Flight & Preview

After user confirms, create ALL entities in sequence:

1. `create_campaign`: name, objective (map from Step 1: SALES→OUTCOME_SALES, LEADS→OUTCOME_LEADS, TRAFFIC→OUTCOME_TRAFFIC, AWARENESS→OUTCOME_AWARENESS, ENGAGEMENT→OUTCOME_ENGAGEMENT, APP_PROMOTION→OUTCOME_APP_PROMOTION), status=PAUSED, special_ad_categories=NONE

2. `create_ad_set`: campaign_id, name, daily_budget (IN CENTS — multiply dollars × 100), billing_event=IMPRESSIONS, bid_strategy=LOWEST_COST_WITHOUT_CAP, status=PAUSED, targeting (JSON with geo_locations, age_min, age_max, genders, targeting_optimization="none"), PLUS these fields based on destination:

   | Destination | optimization_goal | promoted_object |
   |---|---|---|
   | Website (purchase) | `OFFSITE_CONVERSIONS` | `{"pixel_id":"ID","custom_event_type":"PURCHASE"}` |
   | Website (lead) | `OFFSITE_CONVERSIONS` | `{"pixel_id":"ID","custom_event_type":"LEAD"}` |
   | WhatsApp | `CONVERSATIONS` | omit |
   | Messenger | `CONVERSATIONS` | omit |
   | Instagram DM | `CONVERSATIONS` | omit |
   | Lead Form | `LEAD_GENERATION` | omit |
   | Traffic (clicks) | `LINK_CLICKS` | omit |
   | Traffic (LPV) | `LANDING_PAGE_VIEWS` | omit |
   | App | `APP_INSTALLS` | `{"application_id":"APP_ID","object_store_url":"URL"}` |

3. `create_ad_creative`: name, object_story_spec (JSON with page_id + link_data for image/carousel OR video_data for video). For WhatsApp destination, include `link_data.call_to_action.type="SEND_WHATSAPP_MESSAGE"` and `link_data.call_to_action.value.whatsapp_phone_number="NUMBER"`.

4. `create_ad`: adset_id, name, creative_id, status=PAUSED

5. `preflight_check`: run pre-launch checklist on the campaign

Present preflight results as a checklist:
- Pass: "Campaign objective set"
- Fail: "No ads found" — Fix: Create at least one ad with a creative
- Warn: "Budget below recommended minimum"

If any FAIL items, do NOT activate — help the user fix them first. If all pass: call `get_ad_preview` **twice** — once with `ad_format=MOBILE_FEED_STANDARD` and once with `ad_format=DESKTOP_FEED_STANDARD` — then output both as an `adpreview` block:

```adpreview
[
  { "format": "MOBILE_FEED_STANDARD", "html": "[body from first get_ad_preview call]" },
  { "format": "DESKTOP_FEED_STANDARD", "html": "[body from second get_ad_preview call]" }
]
```

Then show summary:

```metrics
{"metrics":[
  {"label":"Campaign","value":"[Name]"},
  {"label":"Status","value":"Paused — Ready to launch"},
  {"label":"Daily Budget","value":"$[amount]"},
  {"label":"Objective","value":"[Objective]"}
]}
```

Then ask: **"Pre-flight check passed. Ready to go live?"**

After activation:

```quickreplies
["Check campaign status", "Create A/B test", "Save as template", "Create another campaign"]
```

## Operational Handoff

After the campaign plan is finalized (Step 10 approved), execution proceeds through operational skills:

- **`ad-manager`** — handles the actual API calls to create campaign, ad set, and ad entities (Step 11 execution)
- **`creative-manager`** — handles creative upload, ad creative creation, and preview generation (Steps 4-5 execution)

When the user confirms the plan, proceed directly to Step 11 execution. If the user wants to modify creatives after launch, load `creative-manager`. If the user wants to adjust ad sets, budgets, or statuses post-launch, load `ad-manager`.

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

## Quick Reference

### Campaign Objectives

| Objective | API Value | Use Case | Recommended Budget |
|---|---|---|---|
| Sales | `OUTCOME_SALES` | Purchases, catalog sales | $20-30/day |
| Leads | `OUTCOME_LEADS` | Lead forms, Messenger | $20-30/day |
| Traffic | `OUTCOME_TRAFFIC` | Website or app visits | $10-20/day |
| Awareness | `OUTCOME_AWARENESS` | Brand awareness, reach | $10-15/day |
| Engagement | `OUTCOME_ENGAGEMENT` | Post engagement, page likes | $10-15/day |
| App Promotion | `OUTCOME_APP_PROMOTION` | App installs | $20-30/day |

### Bid Strategies

| Strategy | API Value | Behavior |
|---|---|---|
| Lowest Cost | `LOWEST_COST_WITHOUT_CAP` | Spend full budget for max results. Default. |
| Bid Cap | `LOWEST_COST_WITH_BID_CAP` | Keep bid under a specified cap |
| Cost Cap | `COST_CAP` | Keep average cost per result under a target |
| Min ROAS | `LOWEST_COST_WITH_MIN_ROAS` | Optimize for minimum return on ad spend |

### Campaign Statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | Campaign is running |
| `PAUSED` | Campaign is paused; can be resumed |
| `DELETED` | Soft-deleted; hidden but retrievable |
| `ARCHIVED` | Read-only, preserved for reporting |

### Budget Types

| Type | Notes |
|---|---|
| `daily_budget` | Max spend per day, in cents. Distributed across the day. |
| `lifetime_budget` | Total spend over lifetime, in cents. Requires `stop_time`. |
| `spend_cap` | Hard cap on total campaign spend, in cents. Additional safeguard. |

Daily and lifetime budgets are mutually exclusive. A campaign must have exactly one of them.

### Campaign Hierarchy

```
Campaign
 └── Ad Set (targeting, budget, schedule)
      └── Ad (creative, copy, CTA)
```

To inspect a campaign's full structure, call the adsets endpoint, then for each ad set call the ads endpoint.
