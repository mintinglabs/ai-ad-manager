---
name: targeting-audiences
description: Plan audience targeting strategies — custom audiences, lookalikes, saved audiences, and interest targeting with interactive source selection
layer: strategic
depends_on: [insights-reporting]
leads_to: [ad-manager, campaign-manager]
---

# Targeting & Audiences

## Strategy Workflow

Interactive audience planning flow. ALWAYS use ```options cards for every choice. NEVER list options as plain text bullets. Max 1-2 sentences between cards. Option titles MUST be human-readable names — NEVER raw IDs.

**Progress:** Show step progress at the start of each step: `Step 2 of 4 — Engagement type`. Audience flows are shorter (3-5 steps) so users know they're close.

**Golden Rules:**

1. ALWAYS call API tools first to get real data (pages, videos, IG accounts) before presenting options — NEVER ask users to provide IDs manually
2. Gather info efficiently — use smart defaults (retention=30d website, 365d engagement). Auto-generate names if not provided.
3. When user provides enough info upfront, skip to confirmation.
4. `special_ad_categories` is a CAMPAIGN-level field. NEVER ask about it when creating audiences.
5. ALWAYS offer the exclusion step before final confirmation — it's a key quality-of-life feature that prevents wasted spend.

### Entry Point — Audience Type Selection

Show immediately when user mentions audience, retargeting, custom audience, or lookalike. Split into two cards — first ask the goal, then show relevant types:

```options
{"title":"What's the purpose of this audience?","options":[
  {"id":"RETARGET","title":"Retarget warm audiences","description":"Re-engage people who already know your brand"},
  {"id":"PROSPECT","title":"Find new customers","description":"Reach people similar to your best customers"},
  {"id":"SAVE","title":"Save a targeting preset","description":"Reusable interest/demographic targeting for future campaigns"}
]}
```

**If RETARGET:**

```options
{"title":"Who do you want to retarget?","options":[
  {"id":"WEBSITE","title":"Website Visitors","description":"People who visited your site via Meta Pixel"},
  {"id":"VIDEO","title":"Video Viewers","description":"People who watched your Facebook or Instagram videos"},
  {"id":"INSTAGRAM","title":"Instagram Engagers","description":"People who interacted with your Instagram profile"},
  {"id":"PAGE","title":"Facebook Page Engagers","description":"People who interacted with your Facebook Page"},
  {"id":"LEAD_AD","title":"Lead Form Engagers","description":"People who opened or submitted your lead form"},
  {"id":"WHATSAPP","title":"WhatsApp Contacts","description":"People who messaged your WhatsApp Business account"},
  {"id":"CUSTOMER_LIST","title":"Customer List","description":"Upload your own customer data (emails, phones)"}
]}
```

**If PROSPECT:**

```options
{"title":"What should the new audience be based on?","options":[
  {"id":"LOOKALIKE","title":"Lookalike Audience","description":"Find people similar to your existing customers or followers"},
  {"id":"INTEREST","title":"Interest & Behavior Targeting","description":"Target by interests, behaviors, and demographics (Saved Audience)"}
]}
```

---

### WEBSITE Audience (Pixel-Based Retargeting)

**Step 1 — Select Pixel:** Call `get_pixels` and present as options.

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

Confirm summary with ```steps, then call `create_custom_audience` with: name, description, subtype="WEBSITE", pixel_id, retention_days. The system auto-builds the correct Meta v19 event_sources format — just pass pixel_id and optionally a simple URL rule. Do NOT build event_sources/inclusions yourself for WEBSITE.

---

### VIDEO Audience (Engagement)

**Step 1 — Choose video source:** Call `get_pages` AND `get_connected_instagram_accounts` in parallel. Present ALL sources. Allow multi-select to combine FB + IG videos.

**Step 2 — Show videos:** Based on source type:
- Facebook Page: call `get_page_videos` with page_id
- Instagram: call `get_ig_media` with ig_account_id

If more than 8 videos, offer filter first (All / Top Performers / Recent 90 days), then show filtered list sorted by views descending, cap at 12.

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

Auto-default retention=365 days. Confirm summary, then call `create_custom_audience` with subtype="ENGAGEMENT".

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
|---|---|
| 3 seconds | `video_watched` |
| 10 seconds | `video_watched` |
| ThruPlay / 15s | `video_completed` |
| 25% | `video_watched_25_percent` |
| 50% | `video_watched_50_percent` |
| 75% | `video_watched_75_percent` |
| 95% | `video_watched_95_percent` |

---

### CUSTOMER LIST Audience

> **Important:** Users cannot SHA-256 hash data in chat. This flow creates the audience shell — user must upload hashed data via Meta Business Suite or CRM.

**Step 1 — Data type:** EMAIL / PHONE / MIXED (emails + phones + names)

**Step 2 — Source:** USER_PROVIDED_ONLY / PARTNER_PROVIDED_ONLY / BOTH_USER_AND_PARTNER_PROVIDED

**Step 3 — Create the audience shell** with subtype="CUSTOM", customer_file_source. Then show upload instructions:

> 1. Prepare CSV: email, phone (E.164: +85298765432), first_name, last_name
> 2. SHA-256 hash each field (use Meta's template or CRM export)
> 3. Go to **Meta Business Suite → Audiences → [Name] → Add people**
> 4. Upload hashed CSV

---

### LEAD AD Audience (Lead Form Engagers)

**Step 1 — Select Page:** Call `get_pages` and present.

**Step 2 — Engagement type:**

```options
{"title":"What lead form interaction?","options":[
  {"id":"lead_opened","title":"Opened the Lead Form","description":"Anyone who opened — including those who didn't submit"},
  {"id":"lead_submitted","title":"Submitted the Lead Form","description":"People who completed and submitted"},
  {"id":"lead_not_submitted","title":"Opened but Didn't Submit","description":"High-intent people who started but didn't finish — great for retargeting"}
]}
```

Auto-default retention=90 days (max for lead ad audiences). Create with event_sources type "page", events: `lead_generation_opened` / `leadgen_submitted`.

---

### WHATSAPP Contacts Audience

**Step 1 — Select Page** (with WhatsApp Business connected): Call `get_pages`.

**Step 2 — Interaction type:**

```options
{"title":"What WhatsApp interaction?","options":[
  {"id":"ALL","title":"All Interactions","description":"Anyone who sent or received messages — broadest"},
  {"id":"SENT_MESSAGE","title":"Sent You a Message","description":"People who messaged first — highest intent"},
  {"id":"OPENED_CONVERSATION","title":"Opened a Conversation","description":"People who opened a WhatsApp thread"}
]}
```

Auto-default retention=365 days. Use subtype="ENGAGEMENT" with event_source type `whatsapp_business_account`.

**Event values:**

| Event | Value |
|---|---|
| All interactions | `WABA_MESSAGE` |
| Sent a message | `WABA_MESSAGE` |
| Opened conversation | `WABA_CONVERSATION_STARTED_7D` |

---

### INSTAGRAM Engagement Audience

**Step 1 — Select account:** Call `get_connected_instagram_accounts` and present (@username as title).

**Step 2 — Engagement type:**

```options
{"title":"What type of IG engagement?","options":[
  {"id":"all","title":"All Engagement","description":"Anyone who interacted with your profile or content"},
  {"id":"visit","title":"Profile Visitors","description":"People who visited your profile"},
  {"id":"post","title":"Post/Ad Engagement","description":"Reactions, comments, shares, saves"},
  {"id":"message","title":"Sent a DM","description":"People who sent a direct message"},
  {"id":"saved","title":"Saved a Post","description":"People who saved your posts or ads"},
  {"id":"whatsapp","title":"Clicked WhatsApp Button","description":"People who tapped your WhatsApp contact button"}
]}
```

Auto-default retention=365. Use event_source type `ig_business`.

**Event values:**

| Event | Value |
|---|---|
| All engagement | `ig_business_profile_all` |
| Visited profile | `ig_business_profile_visit` |
| Sent message | `ig_user_messaged` |
| Saved post/ad | `ig_user_saved_media` |
| Engaged with post/ad | `ig_user_interacted_ad_or_organic` |
| Clicked WhatsApp button | `ig_whatsapp_button_click` |

---

### FACEBOOK PAGE Engagement Audience

**Step 1 — Select page:** Call `get_pages` (page NAME as title).

**Step 2 — Engagement type:**

```options
{"title":"What type of Page engagement?","options":[
  {"id":"engaged","title":"Any Engagement","description":"Reactions, shares, comments, link clicks"},
  {"id":"liked","title":"Page Likes/Follows","description":"People who currently like or follow"},
  {"id":"visited","title":"Page Visitors","description":"Anyone who visited your Page"},
  {"id":"cta","title":"CTA Button Clicks","description":"People who clicked Call, Message, WhatsApp, etc."},
  {"id":"messaged","title":"Sent a Message","description":"People who messaged via Messenger"},
  {"id":"whatsapp","title":"Clicked WhatsApp Button","description":"People who tapped WhatsApp on your Page"}
]}
```

Auto-default retention=365. Use event_source type `page`.

**Event values:**

| Event | Value |
|---|---|
| Any engagement | `page_engaged` |
| Likes/follows | `page_liked` |
| CTA clicks | `page_cta_clicked` |
| Messages | `page_messaged` |
| Page visits | `page_visited` |
| WhatsApp button | `page_whatsapp_button_clicked` |

---

### LOOKALIKE Audience

**Step 1 — Source audience:** Call `get_custom_audiences` and present existing audiences (name + estimated size).

**Step 2 — Target country:** Show common options (HK, TW, SG, MY, US, GB, AU, Other).

> **Minimum source size:** Source must have ≥100 people. Warn if selected source is small.

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

**Step 1 — What are you promoting?** Ask for product/service/industry.

**Step 2 — Location:** Common options (HK, TW, SG, MY, US, GB, Other).

**Step 3 — Demographics:** Gender (All/Male/Female) + age range (default 18-65).

**Step 4 — Interest discovery:** Call `targeting_search` with 2-3 keywords from Step 1. Present results as options cards.

**Step 5 — Validate and estimate:** Call `get_reach_estimate` with full targeting spec. Show size:
- < 50K → warn: narrow, may limit delivery
- > 10M in small market → warn: very broad

Confirm and create saved audience.

---

### Exclusion Step (offer for ALL audience types)

After main audience is defined and before confirmation, always offer:

```options
{"title":"Do you want to exclude anyone?","options":[
  {"id":"NONE","title":"No exclusions","description":"Show ads to the full audience"},
  {"id":"EXISTING_CUSTOMERS","title":"Exclude existing customers","description":"Avoid wasting budget on converted users"},
  {"id":"RECENT_CONVERTERS","title":"Exclude recent converters","description":"Exclude people who converted in the last 30 days"},
  {"id":"CUSTOM","title":"Exclude a specific audience","description":"Choose any existing custom audience"}
]}
```

If user picks exclusion, call `get_custom_audiences` to let them select, then add to rule JSON under `exclusions`.

---

### Post-Creation Flow

After creating ANY audience, show:

```metrics
[
  {"label":"Audience Name","value":"[Name]"},
  {"label":"Type","value":"[Type e.g. Website Visitors · 30 days]"},
  {"label":"Estimated Size","value":"[Size or 'Populating — 24-48 hours']"},
  {"label":"Exclusions","value":"[Name or 'None']"}
]
```

Then quickreplies:

```quickreplies
["Create ad set with this audience", "Create lookalike from this", "Build another audience", "Analyse audience performance"]
```

**Keep users in our UI:** Do NOT send users to Meta Ads Manager or Business Suite.

---

## Quick Reference

### Retention Limits

| Audience Type | Max | Default |
|---|---|---|
| Website | 180 days | 30 days |
| Lead Ad | 90 days | 30 days |
| Video / IG / Page / WhatsApp | 365 days | 365 days |

### Lookalike Ratio Guide

| Ratio | Size | Best For |
|---|---|---|
| 1% (0.01) | Smallest | Conversions |
| 2-3% | Small-Medium | Balanced |
| 5% | Medium | Traffic, engagement |
| 10-20% | Large | Awareness |

`type` can be `"similarity"` (closeness) or `"reach"` (size).

### Targeting Spec Structure

```json
{
  "geo_locations": { "countries": ["HK"] },
  "age_min": 18, "age_max": 65,
  "genders": [0],
  "flexible_spec": [{ "interests": [{ "id": "6003139266461", "name": "Fitness" }] }],
  "custom_audiences": [{ "id": "23851234567890" }],
  "excluded_custom_audiences": [{ "id": "23851234567891" }]
}
```

- `genders`: 0=all, 1=male, 2=female
- `flexible_spec` entries within same object = OR; separate objects = AND

## Handoff

After audience work, transfer back to ad_manager. Suggest next actions based on what was created.
