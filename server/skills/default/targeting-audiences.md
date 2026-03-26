---
name: targeting-audiences
description: Search and configure Facebook ad targeting — find interests, behaviors, demographics, estimate audience reach, validate targeting specs, manage custom audiences, lookalike audiences, and saved audiences. Use this skill whenever the user wants to define who sees their ads, search for targeting interests, estimate audience size, create custom or lookalike audiences, upload customer lists, or save reusable targeting presets. Triggers for audience targeting, interest search, demographic targeting, reach estimation, and audience management.
---

# Targeting & Audiences

## Targeting API Endpoints

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

## Audience API Endpoints

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

## Reference

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

### Audience Subtypes

| Subtype     | Description                                      |
| ----------- | ------------------------------------------------ |
| `CUSTOM`    | General custom audience (default)                |
| `WEBSITE`   | Website visitors via Meta Pixel                  |
| `APP`       | App activity audience                            |
| `VIDEO`     | Users who engaged with video content             |
| `LOOKALIKE` | Lookalike audience (created via lookalike endpoint) |

### Lookalike Ratio

The `ratio` field in `lookalike_spec` controls audience size:

- Range: `0.01` to `0.20` (1% to 20% of the country population).
- Lower ratios (0.01-0.03) = higher similarity to the source audience.
- Higher ratios (0.10-0.20) = larger reach but less similarity.
- `type` can be `"similarity"` (optimize for closeness) or `"reach"` (optimize for size).

### Hashed PII Format for Customer Lists

When adding or removing users from a custom audience, provide pre-hashed SHA-256 values:

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

### Reach Estimate Interpretation

The reach estimate response includes:

- `users_lower_bound` — Conservative estimate of audience size.
- `users_upper_bound` — Optimistic estimate of audience size.
- Use these to gauge whether targeting is too narrow (< 1,000) or too broad (> 100M) for effective delivery.

## Workflow Guidance

### Chat-Based Audience Creation Flow

Users can create custom audiences simply by chatting. The flow should be interactive with clickable options — NOT walls of text.

**Golden Rules:**

1. ALWAYS use ```options blocks for presenting choices — NEVER list options as plain text bullets
2. ALWAYS call API tools first to get real data (pages, videos, IG accounts) before presenting options — NEVER ask users to provide IDs manually
3. Use `get_page_videos` to list actual videos when creating video audiences — show video titles and IDs as clickable options
4. Gather info efficiently — use smart defaults (retention=30d website, 365d engagement). Auto-generate names if not provided.
5. When user provides enough info upfront, skip to confirmation — don't re-ask what you already know.
6. NEVER write more than 2 sentences before or after an ```options block. Let the UI cards do the talking. No explanatory paragraphs.
7. Option card titles MUST be human-readable names — NEVER put raw numeric Meta IDs in the "title" field. Use the page name, IG username, video title, etc. The numeric ID goes in the "id" field only.

- `special_ad_categories` is a CAMPAIGN-level field. NEVER ask about it when creating audiences.

**Flow:**

1. **Detect intent** — user mentions audience, retargeting, custom audience, lookalike, etc.
2. **Show audience type as ```options** — IMMEDIATELY present types (Website, Video Viewers, Instagram, Page, Lookalike, Customer List) as clickable options. No preamble.
3. **Gather info with ```options** — every choice (pixel, page, video, engagement type) must be an options card. Max 1 sentence between cards.
4. **Confirm with ```steps** — show summary of what will be created as a steps card, then ask exactly: **"Should I proceed?"** (this triggers Confirm/Cancel buttons in the UI)
5. **After creation** — show a ```metrics card with audience name, type, ID, estimated size, retention period. Then say: "Your audience is ready! You can view and manage it in the Audiences module." Then ```quickreplies: ["[audiences] View in Audiences", "Create ad set with this audience", "Create lookalike from this"]

**Keep users in our UI:** After creating an audience, do NOT send users to Meta Ads Manager or Business Suite. Show a ```metrics card with audience details, direct them to the **Audiences module** in our app, and include **"[audiences] View in Audiences"** as the FIRST quick reply. Do NOT link to business.facebook.com or any external Meta URL.

---

### WEBSITE Audience (Pixel-Based Retargeting)

1. Call `get_pixels` to list available pixels
2. If multiple pixels, show a table and ask which one
3. Ask: which event? Options: all visitors, specific pages, time spent, purchase, add to cart, lead, view content
4. For URL filtering, ask the condition type: "contains", "doesn't contain", or "equals"
5. Ask about retention days (default 30, max 180)
6. Ask if they want to include more people (additional inclusion rules) or exclude people (exclusion rules)
7. Call `create_custom_audience` with: name, description, subtype="WEBSITE", pixel_id=PIXEL_ID, retention_days=30
8. For specific pages, also pass rule: `{"url":{"i_contains":"/product"}}` (or `{"not_i_contains":"..."}` or `{"eq":"..."}`)
9. The system auto-builds the correct Meta v19 event_sources format — you just pass pixel_id and optionally a simple URL rule
10. Do NOT build event_sources/inclusions yourself for WEBSITE — the system handles it

---

### ENGAGEMENT Audience (Video Viewers)

Video sources: Facebook Page videos, Instagram videos, Campaign video ads, or direct Video IDs.

IMPORTANT: Use interactive options — NOT walls of text. Present choices as clickable options cards.

**Steps:**

1. **Choose video source** — call `get_pages` AND `get_connected_instagram_accounts` in parallel. Then present ALL sources as options:

```options
{"title":"Choose video source","options":[
  {"id":"fb:PAGE_ID_1","title":"TopGlow Medical","description":"Facebook Page"},
  {"id":"fb:PAGE_ID_2","title":"My Brand HK","description":"Facebook Page"},
  {"id":"ig:IG_ID_1","title":"@businessfocus.io","description":"Instagram"},
  {"id":"ig:IG_ID_2","title":"@topglow.hk","description":"Instagram"}
]}
```

2. **Show videos** — based on source type:
   - Facebook Page: call `get_page_videos` with page_id
   - Instagram: call `get_ig_media` with ig_account_id (and page_id if available from the IG account's pageId field)
   Use VIDEO TITLE (or caption) as the title:

```options
{"title":"Select videos","options":[
  {"id":"all","title":"All Videos","description":"Any video on this page"},
  {"id":"VIDEO_ID_1","title":"Summer Collection Promo","description":"Jan 15 - 12.5K views"},
  {"id":"VIDEO_ID_2","title":"Behind the Scenes","description":"Feb 3 - 8.2K views"}
]}
```

3. **Engagement type** — present as options:

```options
{"title":"What level of engagement?","options":[
  {"id":"3s","title":"3 seconds viewed","description":"Broadest audience - anyone who watched at least 3 seconds"},
  {"id":"10s","title":"10 seconds viewed","description":"More engaged viewers"},
  {"id":"thruplay","title":"ThruPlay / 15 seconds","description":"Completed or watched at least 15 seconds"},
  {"id":"25pct","title":"25% viewed","description":"Watched at least a quarter of the video"},
  {"id":"50pct","title":"50% viewed","description":"Watched at least half"},
  {"id":"75pct","title":"75% viewed","description":"Highly engaged viewers"},
  {"id":"95pct","title":"95% viewed","description":"Nearly completed - most engaged"}
]}
```

4. Auto-default retention=365 days. Confirm summary, then call `create_custom_audience`.

**Key rules:**

- ALWAYS call `get_pages` + `get_connected_instagram_accounts` to show real sources, then `get_page_videos` or `get_ig_media` for videos — never ask users to provide IDs manually
- Use ```options blocks for EVERY choice — do NOT present choices as bullet-point text
- If user provides video IDs directly, skip to step 3

**Rule JSON format for engagement audiences:**

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

- Just needs name, description, subtype="CUSTOM"
- `customer_file_source` auto-defaults to "USER_PROVIDED_ONLY"
- Then use `add_users_to_audience` to upload hashed data

---

### INSTAGRAM Engagement Audience

Use options cards for every choice.

1. Call `get_connected_instagram_accounts` then present as ```options block (use @username as title, NOT numeric ID)
2. Present engagement types as ```options:

```options
{"title":"What type of IG engagement?","options":[
  {"id":"all","title":"All engagement","description":"Anyone who interacted with your profile or content"},
  {"id":"visit","title":"Profile visitors","description":"People who visited your profile"},
  {"id":"post","title":"Post/ad engagement","description":"Reactions, comments, shares, saves"},
  {"id":"message","title":"Sent a message","description":"People who DM'd your account"},
  {"id":"saved","title":"Saved a post","description":"People who saved your posts or ads"}
]}
```

3. Auto-default retention=365. Confirm and create.

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

Use options cards for every choice.

1. Call `get_pages` then present as ```options block (use page NAME as title, NOT numeric ID)
2. Present engagement types as ```options:

```options
{"title":"What type of Page engagement?","options":[
  {"id":"engaged","title":"Any engagement","description":"Reactions, shares, comments, link clicks on posts/ads"},
  {"id":"liked","title":"Page likes/follows","description":"People who currently like or follow your Page"},
  {"id":"visited","title":"Page visitors","description":"Anyone who visited your Page"},
  {"id":"cta","title":"CTA button clicks","description":"People who clicked Call, Message, etc."},
  {"id":"messaged","title":"Sent a message","description":"People who messaged your Page"}
]}
```

3. Auto-default retention=365. Confirm and create.

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

1. Call `get_custom_audiences` to list existing audiences as source options
2. Ask: which source audience, target country, and size ratio (1-10%)?
3. Call `create_lookalike_audience` with: name, origin_audience_id, lookalike_spec={"country":"XX","ratio":0.01}
4. Ratio is decimal: 1% = 0.01, 5% = 0.05, 10% = 0.10
5. Smaller ratio = more similar to source, larger = broader reach

---

### SAVED Audience (Interest/Behavior Targeting)

1. Ask: what demographics and interests to target?
2. Use `targeting_search` to find interest/behavior IDs by keyword (e.g., search "fitness" to get interest IDs)
3. Use `targeting_browse` to explore available targeting categories
4. Call `create_saved_audience` with name and targeting spec:

```json
{
  "name": "My Saved Audience",
  "targeting": {
    "geo_locations": {"countries": ["SG"]},
    "age_min": 25,
    "age_max": 65,
    "genders": [1, 2],
    "flexible_spec": [
      {"interests": [{"id": "6003139266461", "name": "Fitness"}]}
    ]
  }
}
```

5. Saved audiences are reusable targeting templates — great for frequently used targeting combos

---

### LEAD AD Audience

- Build rule with event_sources type "lead_gen_form": people who opened or submitted lead forms
- retention_seconds max: 90 days (7776000)

---

### OFFLINE EVENTS Audience

- Build rule with event_sources type "offline_event_set"
- retention_seconds max: 180 days (15552000)

---

### Retention Limits

| Audience Type | Max Retention |
|---------------|---------------|
| Website | 180 days |
| Lead Ad | 90 days |
| Offline | 180 days |
| Mobile App | 180 days |
| Video | 365 days |
| Instagram | 365 days |
| Facebook Page | 365 days |
| Facebook Event | 365 days |
| Shopping | 365 days |
| Catalogue | 365 days |
| AR | 365 days |
