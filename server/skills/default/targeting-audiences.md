---
name: targeting-audiences
description: Plan audience targeting strategies — custom audiences, lookalikes, saved audiences, and interest targeting with interactive source selection
layer: strategic
depends_on: [insights-reporting]
leads_to: [ad-manager, campaign-manager]
---

# Targeting & Audiences

## API Endpoints

### Search Targeting Options

```
GET /api/targeting/search?adAccountId=act_XXX&q=keyword
```

Search for interests, behaviors, and demographics by keyword.

### Browse Targeting Categories

```
GET /api/targeting/browse?adAccountId=act_XXX
```

Browse the full tree of available targeting categories.

### Get Targeting Suggestions

```
GET /api/targeting/suggestions?adAccountId=act_XXX&targeting_list=...
```

Get recommended targeting options based on an existing targeting list.

### Validate a Targeting Spec

```
POST /api/targeting/validate
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "targeting_spec": {
    "geo_locations": { "countries": ["US"] },
    "age_min": 25,
    "age_max": 54,
    "genders": [1],
    "flexible_spec": [
      { "interests": [{ "id": "6003139266461", "name": "Fitness" }] }
    ]
  }
}
```

Returns whether the targeting spec is valid and any errors.

### Reach Estimate

```
POST /api/targeting/reach-estimate
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "targeting_spec": { ... }
}
```

Returns estimated audience size (lower bound, upper bound).

### Delivery Estimate

```
POST /api/targeting/delivery-estimate
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "targeting_spec": { ... },
  "optimization_goal": "OFFSITE_CONVERSIONS"
}
```

Returns estimated daily reach, results, and cost ranges for the given optimization goal.

### Broad Targeting Categories

```
GET /api/targeting/broad-categories?adAccountId=act_XXX
```

List broad targeting categories (top-level interests and behaviors).

### Saved Audiences

```
GET /api/targeting/saved-audiences?adAccountId=act_XXX
```

List all saved audiences for the ad account.

```
POST /api/targeting/saved-audiences
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "My Saved Audience",
  "targeting": { ... }
}
```

Create a reusable saved audience.

```
DELETE /api/targeting/saved-audiences/:id
```

Delete a saved audience by ID.

### Custom Audiences

```
GET /api/meta/customaudiences?adAccountId=act_XXX
```

List all custom audiences for the ad account.

```
POST /api/meta/customaudiences
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "My Custom Audience",
  "subtype": "WEBSITE"
}
```

Create a new custom audience. `subtype` is optional and defaults to `WEBSITE`.

```
GET /api/meta/customaudiences/:id
```

Get details for a specific custom audience.

```
PATCH /api/meta/customaudiences/:id
```

Update an existing custom audience (name, description, etc.).

```
DELETE /api/meta/customaudiences/:id
```

Delete a custom audience.

### Customer List Management

**Add users to a custom audience:**

```
POST /api/meta/customaudiences/:id/users
```

**Remove users from a custom audience:**

```
DELETE /api/meta/customaudiences/:id/users
```

Provide hashed PII (see Hashed PII Format below).

### Lookalike Audiences

```
POST /api/meta/lookalike-audiences
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "Lookalike - Top Customers US 1%",
  "origin_audience_id": "23851234567890",
  "lookalike_spec": {
    "type": "similarity",
    "country": "US",
    "ratio": 0.01
  }
}
```

## Strategy Workflow

Interactive audience planning flow. ALWAYS use ```options cards for every choice. NEVER list options as plain text bullets. Max 1-2 sentences between cards. Option titles MUST be human-readable names — NEVER raw IDs.

**Golden Rules:**

1. ALWAYS call API tools first to get real data (pages, videos, IG accounts) before presenting options — NEVER ask users to provide IDs manually
2. Gather info efficiently — use smart defaults (retention=30d website, 365d engagement). Auto-generate names if not provided.
3. When user provides enough info upfront, skip to confirmation.
4. `special_ad_categories` is a CAMPAIGN-level field. NEVER ask about it when creating audiences.

### Entry Point — Audience Type Selection

Show immediately when user mentions audience, retargeting, custom audience, or lookalike:

```options
{"title":"What type of audience do you want to create?","options":[
  {"id":"WEBSITE","title":"Website Visitors","description":"Retarget people who visited your site via Meta Pixel"},
  {"id":"VIDEO","title":"Video Viewers","description":"People who watched your Facebook or Instagram videos"},
  {"id":"CUSTOM","title":"Customer List","description":"Upload your own customer data (emails, phones)"},
  {"id":"INSTAGRAM","title":"Instagram Engagers","description":"People who interacted with your Instagram profile"},
  {"id":"PAGE","title":"Facebook Page Engagers","description":"People who interacted with your Facebook Page"},
  {"id":"LOOKALIKE","title":"Lookalike Audience","description":"Find new people similar to your best customers"},
  {"id":"SAVED","title":"Saved Audience","description":"Reusable interest/demographic targeting preset"}
]}
```

---

### WEBSITE Audience (Pixel-Based Retargeting)

**Step 1 — Select Pixel:** Call `get_pixels` and present as options:

```options
{"title":"Which pixel tracks your website?","options":[
  {"id":"PIXEL_ID_1","title":"Your Pixel Name","description":"Active — tracking events"},
  {"id":"PIXEL_ID_2","title":"Another Pixel","description":"Active — tracking events"}
]}
```

**Step 2 — Event type:**

```options
{"title":"Who should be in this audience?","options":[
  {"id":"all_visitors","title":"All Website Visitors","description":"Anyone who visited any page"},
  {"id":"specific_pages","title":"Specific Page Visitors","description":"People who visited certain URLs"},
  {"id":"time_spent","title":"Top Time Spent","description":"Top 5%, 10%, or 25% by time on site"},
  {"id":"purchase","title":"Purchasers","description":"People who completed a purchase"},
  {"id":"add_to_cart","title":"Add to Cart","description":"People who added items to cart"},
  {"id":"lead","title":"Lead Submissions","description":"People who submitted a lead form"},
  {"id":"view_content","title":"Content Viewers","description":"People who viewed product/content pages"}
]}
```

**Step 3 — URL filter (if specific pages):**

```options
{"title":"How should URLs be matched?","options":[
  {"id":"contains","title":"URL Contains","description":"Match pages with a keyword in the URL (e.g., /product)"},
  {"id":"not_contains","title":"URL Does Not Contain","description":"Exclude pages with a keyword"},
  {"id":"equals","title":"URL Equals","description":"Match an exact page URL"}
]}
```

**Step 4 — Retention:**

```options
{"title":"How far back should we look?","options":[
  {"id":"7","title":"7 days","description":"Very recent visitors only"},
  {"id":"14","title":"14 days","description":"Recent visitors"},
  {"id":"30","title":"30 days (Recommended)","description":"Standard retargeting window"},
  {"id":"60","title":"60 days","description":"Extended window"},
  {"id":"90","title":"90 days","description":"Broad retargeting"},
  {"id":"180","title":"180 days (Maximum)","description":"Longest allowed for website audiences"}
]}
```

Confirm summary with ```steps, then call `create_custom_audience` with: name, description, subtype="WEBSITE", pixel_id=PIXEL_ID, retention_days. The system auto-builds the correct Meta v19 event_sources format — you just pass pixel_id and optionally a simple URL rule. Do NOT build event_sources/inclusions yourself for WEBSITE.

---

### VIDEO Audience (Engagement)

Video sources: Facebook Page videos, Instagram videos, Campaign video ads, or direct Video IDs.

**Step 1 — Choose video source:** Call `get_pages` AND `get_connected_instagram_accounts` in parallel. Present ALL sources:

```options
{"title":"Choose video source","options":[
  {"id":"fb:PAGE_ID_1","title":"TopGlow Medical","description":"Facebook Page"},
  {"id":"fb:PAGE_ID_2","title":"My Brand HK","description":"Facebook Page"},
  {"id":"ig:IG_ID_1","title":"@businessfocus.io","description":"Instagram"},
  {"id":"ig:IG_ID_2","title":"@topglow.hk","description":"Instagram"}
]}
```

**Step 2 — Show videos:** Based on source type:
- Facebook Page: call `get_page_videos` with page_id
- Instagram: call `get_ig_media` with ig_account_id (and page_id if available from the IG account's pageId field)

Present with VIDEO TITLE (or caption) as the title:

```options
{"title":"Select videos","options":[
  {"id":"all","title":"All Videos","description":"Any video on this page"},
  {"id":"VIDEO_ID_1","title":"Summer Collection Promo","description":"Jan 15 - 12.5K views"},
  {"id":"VIDEO_ID_2","title":"Behind the Scenes","description":"Feb 3 - 8.2K views"}
]}
```

**Step 3 — Engagement level:**

```options
{"title":"What level of engagement?","options":[
  {"id":"3s","title":"3 seconds viewed","description":"Broadest audience — anyone who watched at least 3 seconds"},
  {"id":"10s","title":"10 seconds viewed","description":"More engaged viewers"},
  {"id":"thruplay","title":"ThruPlay / 15 seconds","description":"Completed or watched at least 15 seconds"},
  {"id":"25pct","title":"25% viewed","description":"Watched at least a quarter of the video"},
  {"id":"50pct","title":"50% viewed","description":"Watched at least half"},
  {"id":"75pct","title":"75% viewed","description":"Highly engaged viewers"},
  {"id":"95pct","title":"95% viewed","description":"Nearly completed — most engaged"}
]}
```

Auto-default retention=365 days. Confirm summary, then call `create_custom_audience`.

**Rule JSON format:**

For Facebook Page videos, use `"type":"page"`. For Instagram videos, use `"type":"ig_business"`.

```json
{
  "inclusions": {
    "operator": "or",
    "rules": [{
      "event_sources": [{"id": "PAGE_OR_IG_ID", "type": "page or ig_business"}],
      "retention_seconds": SECONDS,
      "filter": {
        "operator": "and",
        "filters": [
          {"field": "event", "operator": "eq", "value": "video_watched"},
          {"field": "video.video_id", "operator": "is_any", "value": ["VIDEO_ID_1", "VIDEO_ID_2"]}
        ]
      }
    }]
  }
}
```

**Engagement event values:**

| Selection | Event Value |
|-----------|-------------|
| 3 seconds | `video_watched` |
| 10 seconds | `video_watched` |
| ThruPlay / 15s | `video_completed` |
| 25% | `video_watched_25_percent` |
| 50% | `video_watched_50_percent` |
| 75% | `video_watched_75_percent` |
| 95% | `video_watched_95_percent` |

---

### CUSTOM Audience (Customer List)

**Step 1 — Data type:**

```options
{"title":"What customer data do you have?","options":[
  {"id":"EMAIL","title":"Email Addresses","description":"Upload a list of customer emails"},
  {"id":"PHONE","title":"Phone Numbers","description":"Upload a list of phone numbers"},
  {"id":"MIXED","title":"Multiple Fields","description":"Emails + phones + names for better match rates"}
]}
```

**Step 2 — Source:**

```options
{"title":"Where did this data come from?","options":[
  {"id":"USER_PROVIDED_ONLY","title":"Collected Directly","description":"Data you collected from your customers (CRM, signups)"},
  {"id":"PARTNER_PROVIDED_ONLY","title":"From Partners","description":"Data provided by business partners"},
  {"id":"BOTH","title":"Mixed Sources","description":"Combination of direct and partner data"}
]}
```

Create with name, description, subtype="CUSTOM", then use `add_users_to_audience` to upload hashed data. Normalize before hashing: lowercase emails, remove spaces, use E.164 phone format.

---

### INSTAGRAM Engagement Audience

**Step 1 — Select account:** Call `get_connected_instagram_accounts` and present (use @username as title):

```options
{"title":"Which Instagram account?","options":[
  {"id":"IG_ID_1","title":"@yourbusiness","description":"10.5K followers"},
  {"id":"IG_ID_2","title":"@yourbrand","description":"25K followers"}
]}
```

**Step 2 — Engagement type:**

```options
{"title":"What type of IG engagement?","options":[
  {"id":"all","title":"All Engagement","description":"Anyone who interacted with your profile or content"},
  {"id":"visit","title":"Profile Visitors","description":"People who visited your profile"},
  {"id":"post","title":"Post/Ad Engagement","description":"Reactions, comments, shares, saves"},
  {"id":"message","title":"Sent a Message","description":"People who DM'd your account"},
  {"id":"saved","title":"Saved a Post","description":"People who saved your posts or ads"}
]}
```

Auto-default retention=365. Confirm and create.

**Rule JSON format:**

```json
{
  "inclusions": {
    "operator": "or",
    "rules": [{
      "event_sources": [{"id": "IG_ACCOUNT_ID", "type": "ig_business"}],
      "retention_seconds": SECONDS,
      "filter": {
        "operator": "and",
        "filters": [
          {"field": "event", "operator": "eq", "value": "EVENT_VALUE"}
        ]
      }
    }]
  }
}
```

**For multiple include/exclude rules:**

```json
{
  "inclusions": {"operator": "or", "rules": [RULE1, RULE2]},
  "exclusions": {"operator": "or", "rules": [RULE3]}
}
```

**Event values:**

| Event | Value |
|-------|-------|
| All engagement | `ig_business_profile_all` |
| Visited profile | `ig_business_profile_visit` |
| Sent message | `ig_user_messaged` |
| Saved post/ad | `ig_user_saved_media` |
| Engaged with post/ad | `ig_user_interacted_ad_or_organic` |

---

### FACEBOOK PAGE Engagement Audience

**Step 1 — Select page:** Call `get_pages` and present (use page NAME as title):

```options
{"title":"Which Facebook Page?","options":[
  {"id":"PAGE_ID_1","title":"Your Business Page","description":"15K likes"},
  {"id":"PAGE_ID_2","title":"Your Other Page","description":"8K likes"}
]}
```

**Step 2 — Engagement type:**

```options
{"title":"What type of Page engagement?","options":[
  {"id":"engaged","title":"Any Engagement","description":"Reactions, shares, comments, link clicks on posts/ads"},
  {"id":"liked","title":"Page Likes/Follows","description":"People who currently like or follow your Page"},
  {"id":"visited","title":"Page Visitors","description":"Anyone who visited your Page"},
  {"id":"cta","title":"CTA Button Clicks","description":"People who clicked Call, Message, etc."},
  {"id":"messaged","title":"Sent a Message","description":"People who messaged your Page"}
]}
```

Auto-default retention=365. Confirm and create.

**Rule JSON format:**

```json
{
  "inclusions": {
    "operator": "or",
    "rules": [{
      "event_sources": [{"id": "PAGE_ID", "type": "page"}],
      "retention_seconds": SECONDS,
      "filter": {
        "operator": "and",
        "filters": [
          {"field": "event", "operator": "eq", "value": "EVENT_VALUE"}
        ]
      }
    }]
  }
}
```

**Event values:**

| Event | Value |
|-------|-------|
| Any engagement | `page_engaged` |
| Likes/follows | `page_liked` |
| CTA clicks | `page_cta_clicked` |
| Messages | `page_messaged` |
| Page visits | `page_visited` |

---

### LOOKALIKE Audience

**Step 1 — Source audience:** Call `get_custom_audiences` and present existing audiences:

```options
{"title":"Which audience should the lookalike be based on?","options":[
  {"id":"AUD_ID_1","title":"Website Purchasers - 30d","description":"Custom audience · 12,500 people"},
  {"id":"AUD_ID_2","title":"Email Subscribers","description":"Customer list · 8,200 people"},
  {"id":"AUD_ID_3","title":"Video Viewers 75%","description":"Engagement audience · 45,000 people"}
]}
```

**Step 2 — Target country:** Ask user for the country.

**Step 3 — Lookalike size:**

```options
{"title":"How similar should the lookalike be?","options":[
  {"id":"0.01","title":"1% (Most Similar)","description":"Smallest, highest quality — best for conversions"},
  {"id":"0.02","title":"2%","description":"Slightly broader, still high quality"},
  {"id":"0.03","title":"3%","description":"Good balance of quality and reach"},
  {"id":"0.05","title":"5%","description":"Broader reach, moderate similarity"},
  {"id":"0.10","title":"10%","description":"Large audience, lower similarity"},
  {"id":"0.20","title":"20% (Broadest)","description":"Maximum reach — best for awareness campaigns"}
]}
```

Confirm and call `create_lookalike_audience`. Ratio is decimal: 1% = 0.01.

---

### SAVED Audience (Interest/Behavior Targeting)

**Step 1 — Demographics:**

```options
{"title":"Target gender","options":[
  {"id":"0","title":"All Genders","description":"No gender restriction"},
  {"id":"1","title":"Male","description":"Male only"},
  {"id":"2","title":"Female","description":"Female only"}
]}
```

Ask for target country and age range.

**Step 2 — Interest discovery:** Ask for their niche/industry, call `targeting_search` with keywords, present results:

```options
{"title":"Select interests to target","options":[
  {"id":"6003139266461","title":"Fitness and wellness","description":"Interest · 450M people"},
  {"id":"6003384248805","title":"Yoga","description":"Interest · 200M people"},
  {"id":"6003659278981","title":"Running","description":"Interest · 300M people"}
]}
```

Use `targeting_browse` to explore available targeting categories if needed.

**Step 3 — Validate and estimate:** Call `get_reach_estimate` and show:

```metrics
{"metrics":[
  {"label":"Estimated Audience Size","value":"2.5M - 5.0M"},
  {"label":"Location","value":"United States"},
  {"label":"Age","value":"25-45"},
  {"label":"Interests","value":"Fitness, Yoga, Running"}
]}
```

Confirm and call `create_saved_audience`.

---

### Post-Creation Flow

After creating ANY audience, show:

```metrics
{"metrics":[
  {"label":"Audience Name","value":"[Name]"},
  {"label":"Type","value":"[Type]"},
  {"label":"Audience ID","value":"[ID]"},
  {"label":"Estimated Size","value":"[Size]"},
  {"label":"Retention","value":"[Days] days"}
]}
```

Then: "Your audience is ready! You can view and manage it in the Audiences module."

```quickreplies
["[audiences] View in Audiences", "Create ad set with this audience", "Create lookalike from this", "Analyze audience performance"]
```

**Keep users in our UI:** After creating an audience, do NOT send users to Meta Ads Manager or Business Suite. Direct them to the **Audiences module** in our app. Do NOT link to business.facebook.com or any external Meta URL.

## Analytical Handoff

After creating audiences, recommend loading `insights-reporting` to analyze audience performance. Key questions to answer:

- Which audience segments have the lowest CPA?
- Which custom audiences are delivering the best ROAS?
- Are lookalike audiences outperforming interest-based targeting?
- Which retention windows produce the most conversions?

When user selects "Analyze audience performance" from quickreplies, load `insights-reporting` with the audience context.

## Operational Handoff

After audience strategy is planned, execution proceeds through:

- **`ad-manager`** — create ad sets using the planned audience targeting
- **`campaign-manager`** — build a full campaign using the audience in Step 6

## Quick Reference

### Audience Subtypes

| Subtype | Description |
|---------|-------------|
| `CUSTOM` | General custom audience (default) |
| `WEBSITE` | Website visitors via Meta Pixel |
| `APP` | App activity audience |
| `VIDEO` | Users who engaged with video content |
| `LOOKALIKE` | Lookalike audience (created via lookalike endpoint) |

### Retention Limits

| Audience Type | Max Retention | Default |
|---------------|---------------|---------|
| Website | 180 days | 30 days |
| Lead Ad | 90 days | 30 days |
| Offline | 180 days | 30 days |
| Mobile App | 180 days | 30 days |
| Video | 365 days | 365 days |
| Instagram | 365 days | 365 days |
| Facebook Page | 365 days | 365 days |
| Facebook Event | 365 days | 365 days |
| Shopping | 365 days | 365 days |
| Catalogue | 365 days | 365 days |
| AR | 365 days | 365 days |

### Lookalike Ratio Guide

| Ratio | Size | Best For |
|-------|------|----------|
| 1% (0.01) | Smallest | Conversions, high-value actions |
| 2-3% (0.02-0.03) | Small-Medium | Balanced quality and reach |
| 5% (0.05) | Medium | Traffic, engagement |
| 10% (0.10) | Large | Broad awareness |
| 20% (0.20) | Maximum | Maximum reach campaigns |

`type` can be `"similarity"` (optimize for closeness) or `"reach"` (optimize for size).

### Targeting Spec Structure

```json
{
  "geo_locations": {
    "countries": ["US", "CA"],
    "regions": [{ "key": "4081" }],
    "cities": [{ "key": "2420605", "radius": 25, "distance_unit": "mile" }]
  },
  "age_min": 18,
  "age_max": 65,
  "genders": [0, 1, 2],
  "flexible_spec": [
    {
      "interests": [{ "id": "6003139266461", "name": "Fitness" }],
      "behaviors": [{ "id": "6002714895372", "name": "Engaged Shoppers" }]
    }
  ],
  "exclusions": {
    "interests": [{ "id": "...", "name": "..." }]
  },
  "custom_audiences": [{ "id": "23851234567890" }],
  "excluded_custom_audiences": [{ "id": "23851234567891" }],
  "locales": [6, 24]
}
```

- `genders`: `0` = all, `1` = male, `2` = female.
- `flexible_spec` entries within the same object are OR-ed; separate objects are AND-ed.

### Reach Estimate Interpretation

- `users_lower_bound` — Conservative estimate of audience size.
- `users_upper_bound` — Optimistic estimate of audience size.
- Too narrow: < 1,000 — broaden targeting.
- Too broad: > 100M — add interests or narrow demographics.

### Hashed PII Format for Customer Lists

```json
{
  "schema": ["EMAIL", "PHONE", "FN", "LN"],
  "data": [
    ["a1b2c3...(sha256 of email)", "d4e5f6...(sha256 of phone)", "...", "..."]
  ]
}
```

- Hash each field individually with SHA-256 before sending.
- Normalize before hashing: lowercase emails, remove spaces, use E.164 phone format.
- Supported fields: `EMAIL`, `PHONE`, `FN` (first name), `LN` (last name), `ZIP`, `CT` (city), `ST` (state), `COUNTRY`, `DOBY` (birth year), `DOBM` (birth month), `DOBD` (birth day), `GEN` (gender), `MADID` (mobile advertiser ID).
