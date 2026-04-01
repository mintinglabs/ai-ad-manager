---
name: audience-creation
description: Create all audience types — video, website, engagement, lookalike, saved, customer list. Unified 3-stage flow with self-contained chat cards.
layer: strategic
preview: "🎯 Video viewers (75%) from Page — 8,200 people\n👥 Lookalike 1% from purchasers — 210,000 reach\n🔒 Exclude: past 30-day converters"
---

# Audience Creation

## Scenario Router

Parse user intent → pick audience type:
- VIDEO → §video (uses videoaudience block)
- WEBSITE → §website (uses websiteaudience block)
- IG_ENGAGEMENT → §ig-engagement (uses engagementaudience block)
- FB_PAGE_ENGAGEMENT → §fb-page-engagement (uses engagementaudience block)
- AD_ENGAGEMENT → §ad-engagement (uses engagementaudience block)
- LEAD_FORM → §lead-form (uses engagementaudience block)
- CUSTOMER_LIST → §customer-list (setupcard only)
- LOOKALIKE → §lookalike (uses lookalikeaudience block)
- SAVED → §saved (uses savedaudience block)

## 3-Stage Flow

Stage 1: CHOOSE — options card with audience type selector
Stage 2: CONFIGURE — self-contained card per type (all local, no messages)
Stage 3: CONFIRM — user clicks Confirm in card → one message → agent creates

**Golden Rules:**
1. ALWAYS call API tools first to get real data before presenting cards — NEVER ask users to provide IDs manually
2. Show the card in ONE response — no "What do you want to do?" preamble
3. After showing the card, STOP and WAIT for user to confirm. Do NOT call `create_custom_audience` until the user sends confirmation
4. Show audience ID in the post-creation metrics
5. `special_ad_categories` is a CAMPAIGN-level field. NEVER ask about it when creating audiences

---

## Entry Point

When user mentions audience, retargeting, custom audience, or lookalike, show the purpose card:

```options
{"title":"你想建立邊種受眾？","options":[
  {"id":"RETARGET","title":"再行銷 (Retargeting)","description":"重新接觸已經認識你品牌嘅人"},
  {"id":"PROSPECT","title":"搵新客 (Prospecting)","description":"搵同你現有客群相似嘅人"},
  {"id":"SAVE","title":"儲存受眾設定 (Saved Audience)","description":"根據興趣同人口統計建立常用受眾"}
]}
```

Then based on selection, show the retarget source options OR go directly to Lookalike/Saved.

**If RETARGET:**

```options
{"title":"你想 Retarget 邊類人？","options":[
  {"id":"VIDEO","title":"影片觀眾 (Video Viewers)","description":"睇過你 Facebook 或 Instagram 影片嘅人"},
  {"id":"WEBSITE","title":"網站訪客 (Website Visitors)","description":"透過 Meta Pixel 追蹤到嘅訪客"},
  {"id":"INSTAGRAM","title":"Instagram 互動者","description":"同你 IG 帳號互動過嘅人"},
  {"id":"PAGE","title":"Facebook 專頁互動者","description":"同你 Facebook 專頁互動過嘅人"},
  {"id":"AD_ENGAGEMENT","title":"廣告互動者","description":"同你特定廣告互動過嘅人"},
  {"id":"LEAD_AD","title":"Lead Form 互動者","description":"開過或提交過你 Lead Form 嘅人"},
  {"id":"WHATSAPP","title":"WhatsApp 聯絡人","description":"同你 WhatsApp Business 互動過嘅人"},
  {"id":"CUSTOMER_LIST","title":"客戶名單","description":"上傳你嘅客戶 Email 或電話名單"}
]}
```

After this ONE selection, go directly to the self-contained card for that audience type. No more intermediate steps.

---

## §video

**FIRST ACTIONS** (call in parallel):
1. `get_pages()`
2. `get_connected_instagram_accounts()`

Output a `videoaudience` block with the pages and IG accounts data. The frontend renders a complete card with dropdowns + video list that fetches and updates instantly. Do NOT call `get_page_videos` — the frontend handles it.

```videoaudience
{"pages":[mapped from get_pages — {"id":"PAGE_ID","name":"Page Name"} for each],"igAccounts":[mapped from get_connected_instagram_accounts — {"id":"IG_ID","username":"username"} for each]}
```

Tell the user: "請喺下面設定影片受眾條件，揀選影片，然後撳「Confirm」。"

Do NOT call `create_custom_audience` until user sends confirmation with their video selections.

**When user clicks Confirm** with selected videos → call `create_custom_audience` with:
```
subtype: "ENGAGEMENT"
name: auto-generate "[Page Name] Video Viewers — [Date]"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "PAGE_ID", type: "page" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "video_watched" }, { field: "video.video_id", operator: "is_any", value: [SELECTED_VIDEO_IDS] }] } }] } }
```

**Video engagement event map:**

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

## §website

**FIRST ACTIONS:** `get_pixels()`

Output a `websiteaudience` block with the pixels list.

```websiteaudience
{"pixels":[{"id":"PIXEL_ID","name":"Pixel Name"}]}
```

The frontend card handles visitor type selection (all visitors, specific pages, purchase, add to cart, lead) and retention period. If user picks "specific pages", the card prompts for URL keyword inline.

Do NOT call `create_custom_audience` until user sends confirmation.

**When user clicks Confirm** → call `create_custom_audience` with:
```
subtype: "WEBSITE"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "PIXEL_ID", type: "pixel" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "url", operator: "i_contains", value: "URL_KEYWORD" }] } }] } }
```

For event-based (purchase, add_to_cart, lead):
```
filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "Purchase" }] }
```

---

## §ig-engagement

**FIRST ACTIONS:** `get_connected_instagram_accounts()`

Output an `engagementaudience` block with mode=ig.

```engagementaudience
{"mode":"ig","accounts":[{"id":"IG_ID","username":"@username"}],"pages":[]}
```

The frontend card handles engagement type selection and retention period.

Do NOT call `create_custom_audience` until user sends confirmation.

**When user clicks Confirm** → call `create_custom_audience` with:
```
subtype: "ENGAGEMENT"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "IG_ID", type: "ig_business" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "EVENT_VALUE" }] } }] } }
```

**IG engagement event map:**

| Event | Value |
|---|---|
| All engagement | `ig_business_profile_all` |
| Profile visit | `ig_business_profile_visit` |
| Post/Ad engaged | `ig_user_interacted_ad_or_organic` |
| Sent DM | `ig_user_messaged` |
| Saved | `ig_user_saved_media` |
| WhatsApp button | `ig_whatsapp_button_click` |

---

## §fb-page-engagement

**FIRST ACTIONS:** `get_pages()`

Output an `engagementaudience` block with mode=fb_page.

```engagementaudience
{"mode":"fb_page","pages":[{"id":"PAGE_ID","name":"Page Name"}]}
```

The frontend card handles engagement type selection and retention period.

Do NOT call `create_custom_audience` until user sends confirmation.

**When user clicks Confirm** → call `create_custom_audience` with:
```
subtype: "ENGAGEMENT"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "PAGE_ID", type: "page" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "EVENT_VALUE" }] } }] } }
```

**Page engagement event map:**

| Event | Value |
|---|---|
| Any engagement | `page_engaged` |
| Likes/follows | `page_liked` |
| CTA clicks | `page_cta_clicked` |
| Messages | `page_messaged` |
| Page visits | `page_visited` |
| WhatsApp | `page_whatsapp_button_clicked` |

---

## §ad-engagement

**FIRST ACTIONS:** `get_campaigns()`

Output an `engagementaudience` block with mode=ad.

```engagementaudience
{"mode":"ad","campaigns":[{"id":"CAMP_ID","name":"Campaign Name"}]}
```

The frontend card handles campaign/ad selection and engagement type. After Campaign selected, the frontend fetches ads via the API. Map `effective_object_story_id` for rule.

Do NOT call `create_custom_audience` until user sends confirmation.

**When user clicks Confirm** → call `create_custom_audience` with:
```
subtype: "ENGAGEMENT"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "PAGE_ID", type: "page" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "ad_engaged" }, { field: "post.id", operator: "is_any", value: [SELECTED_STORY_IDS] }] } }] } }
```

---

## §lead-form

**FIRST ACTIONS:** `get_pages()`

Output an `engagementaudience` block with mode=lead.

```engagementaudience
{"mode":"lead","pages":[{"id":"PAGE_ID","name":"Page Name"}]}
```

The frontend card handles lead form interaction type (opened, submitted, opened but not submitted) and retention period.

Do NOT call `create_custom_audience` until user sends confirmation.

**When user clicks Confirm** → call `create_custom_audience` with:
```
subtype: "ENGAGEMENT"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "PAGE_ID", type: "page" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "EVENT_VALUE" }] } }] } }
```

**Lead form event values:**
| Event | Value |
|---|---|
| Opened form | `lead_generation_opened` |
| Submitted form | `lead_generation_submitted` |
| Opened but not submitted | Use inclusions for `lead_generation_opened` + exclusions for `lead_generation_submitted` |

---

## §customer-list

Use setupcard (no dedicated card component — keep simple):

```setupcard
{"phase":1,"status":"active","title":"建立客戶名單受眾","icon":"target","items":[
  {"label":"資料類型","value":"Email","type":"select","options":[
    {"id":"email","title":"Email"},
    {"id":"phone","title":"電話號碼"},
    {"id":"mixed","title":"混合 (Email + 電話 + 姓名)"}
  ]},
  {"label":"資料來源","value":"用戶提供","type":"select","options":[
    {"id":"USER_PROVIDED_ONLY","title":"用戶提供"},
    {"id":"PARTNER_PROVIDED_ONLY","title":"合作夥伴提供"},
    {"id":"BOTH_USER_AND_PARTNER_PROVIDED","title":"兩者都有"}
  ]}
]}
```

Create audience shell, then show CSV upload instructions.

---

## §lookalike

**FIRST ACTIONS:** `get_custom_audiences()`

Output a `lookalikeaudience` block.

```lookalikeaudience
{"audiences":[{"id":"AUD_ID","name":"Audience Name","size":"~500K"}]}
```

The frontend card handles source audience selection, target country, and similarity ratio.

> Source must have >= 100 people. Warn if too small.

Do NOT call `create_lookalike_audience` until user sends confirmation.

**Lookalike ratio guide:**
| Ratio | Best For |
|---|---|
| 1% (0.01) | Conversions |
| 2-3% | Balanced |
| 5% | Traffic |
| 10-20% | Awareness |

---

## §saved

**FIRST ACTIONS:** `targeting_search()` with keywords from user message

Output a `savedaudience` block.

```savedaudience
{"interests":[{"id":"INT_ID","name":"Interest Name"}]}
```

The frontend card handles location, gender, age range, and interest selection/search.

After config → `get_reach_estimate` → show size warning if < 50K or > 10M.

**Targeting spec structure:**
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

---

## Post-Creation Flow

After creating ANY audience, show audience ID:

```metrics
[
  {"label":"受眾名稱","value":"[Name]"},
  {"label":"受眾 ID","value":"[Audience ID from API response]"},
  {"label":"類型","value":"[e.g. Video Viewers · 365 days]"},
  {"label":"預計大小","value":"[Size or '填充中 — 24-48 小時']"}
]
```

```quickreplies
["用呢個受眾建立 Ad Set", "建立 Lookalike", "建立另一個受眾", "分析受眾表現"]
```

---

## Engagement Event Maps (Complete Reference)

### Video Events
| Selection | Event Value |
|---|---|
| 3 seconds | `video_watched` |
| 10 seconds | `video_watched` |
| ThruPlay / 15s | `video_completed` |
| 25% | `video_watched_25_percent` |
| 50% | `video_watched_50_percent` |
| 75% | `video_watched_75_percent` |
| 95% | `video_watched_95_percent` |

### Instagram Events
| Event | Value |
|---|---|
| All engagement | `ig_business_profile_all` |
| Profile visit | `ig_business_profile_visit` |
| Post/Ad engaged | `ig_user_interacted_ad_or_organic` |
| Sent DM | `ig_user_messaged` |
| Saved | `ig_user_saved_media` |
| WhatsApp button | `ig_whatsapp_button_click` |

### Facebook Page Events
| Event | Value |
|---|---|
| Any engagement | `page_engaged` |
| Likes/follows | `page_liked` |
| CTA clicks | `page_cta_clicked` |
| Messages | `page_messaged` |
| Page visits | `page_visited` |
| WhatsApp | `page_whatsapp_button_clicked` |

### Lead Form Events
| Event | Value |
|---|---|
| Opened form | `lead_generation_opened` |
| Submitted form | `lead_generation_submitted` |
| Opened but not submitted | inclusions: `lead_generation_opened` + exclusions: `lead_generation_submitted` |

### WhatsApp Events
| Event | Value |
|---|---|
| All interaction | `whatsapp_business_messaging` |
| Sent message | `whatsapp_business_messaging_sent` |
| Opened conversation | `whatsapp_business_messaging_opened` |

---

## Retention Limits

| Audience Type | Max | Default |
|---|---|---|
| Website | 180 days | 30 days |
| Lead Ad | 90 days | 30 days |
| Video / IG / Page / WhatsApp | 365 days | 365 days |

---

## create_custom_audience Rule Structures

### Video Audience
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 31536000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "video_watched" },
            { "field": "video.video_id", "operator": "is_any", "value": ["VIDEO_ID_1", "VIDEO_ID_2"] }
          ]
        }
      }]
    }
  }
}
```

### Website Audience (all visitors)
```json
{
  "subtype": "WEBSITE",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PIXEL_ID", "type": "pixel" }],
        "retention_seconds": 2592000
      }]
    }
  }
}
```

### Website Audience (specific URL)
```json
{
  "subtype": "WEBSITE",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PIXEL_ID", "type": "pixel" }],
        "retention_seconds": 2592000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "url", "operator": "i_contains", "value": "URL_KEYWORD" }
          ]
        }
      }]
    }
  }
}
```

### Website Audience (event-based: purchase, add_to_cart, lead)
```json
{
  "subtype": "WEBSITE",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PIXEL_ID", "type": "pixel" }],
        "retention_seconds": 2592000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "Purchase" }
          ]
        }
      }]
    }
  }
}
```

### IG Engagement Audience
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "IG_ID", "type": "ig_business" }],
        "retention_seconds": 31536000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "ig_business_profile_all" }
          ]
        }
      }]
    }
  }
}
```

### Facebook Page Engagement Audience
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 31536000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "page_engaged" }
          ]
        }
      }]
    }
  }
}
```

### Ad Engagement Audience
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 31536000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "ad_engaged" },
            { "field": "post.id", "operator": "is_any", "value": ["STORY_ID_1", "STORY_ID_2"] }
          ]
        }
      }]
    }
  }
}
```

### Lead Form Audience (submitted)
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 7776000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "lead_generation_submitted" }
          ]
        }
      }]
    }
  }
}
```

### Lead Form Audience (opened but NOT submitted)
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 7776000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "lead_generation_opened" }
          ]
        }
      }]
    },
    "exclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 7776000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "lead_generation_submitted" }
          ]
        }
      }]
    }
  }
}
```

### WhatsApp Audience
```json
{
  "subtype": "ENGAGEMENT",
  "rule": {
    "inclusions": {
      "operator": "or",
      "rules": [{
        "event_sources": [{ "id": "PAGE_ID", "type": "page" }],
        "retention_seconds": 31536000,
        "filter": {
          "operator": "and",
          "filters": [
            { "field": "event", "operator": "eq", "value": "whatsapp_business_messaging" }
          ]
        }
      }]
    }
  }
}
```

### Customer List Audience
```json
{
  "subtype": "CUSTOM",
  "customer_file_source": "USER_PROVIDED_ONLY"
}
```

---

## Handoff

**If mid-creation** (workflow_context has `creation_stage: "stage2_custom_audience"`):
Save targeting spec to workflow_context and transfer back to **executor**.

**Otherwise** (normal audience work):
Transfer back to ad_manager.
