---
name: targeting-audiences
description: Plan audience targeting strategies — custom audiences, lookalikes, saved audiences, and interest targeting with single-card creation UI
layer: strategic
depends_on: [insights-reporting]
leads_to: [ad-manager, campaign-manager]
---

# Targeting & Audiences

## Single-Card Creation Pattern

**CRITICAL UX RULE:** Every audience type uses a **setupcard with inline dropdowns** — the user configures everything in ONE card, NOT through multiple chat steps. For video/post audiences, show a **mediagrid** block alongside the setupcard.

**The server-side tool (`get_page_videos`, `get_ig_media`) automatically emits the full video list as a mediagrid directly to the frontend via SSE.** You do NOT need to re-serialize all videos — the frontend already has the complete list. Just reference it in your text: "請喺上面揀選影片" (Select videos above).

**Golden Rules:**
1. ALWAYS call API tools first to get real data before presenting cards — NEVER ask users to provide IDs manually
2. Show the setupcard + mediagrid in ONE response — no "What do you want to do?" preamble
3. Every field uses `type:"select"` (immediate dropdown) or `editable:true` (hover to edit)
4. After user confirms, call `create_custom_audience` immediately — no extra confirmation step
5. Show audience ID in the post-creation metrics
6. `special_ad_categories` is a CAMPAIGN-level field. NEVER ask about it when creating audiences.

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

After this ONE selection, go directly to the single-card for that audience type. No more intermediate steps.

---

## VIDEO Audience — Single-Card

**FIRST ACTIONS** (call in parallel, before showing any UI):
1. `get_pages()`
2. `get_connected_instagram_accounts()`
3. `get_page_videos(page_id)` — for the first/primary page

Then show BOTH blocks in ONE response:

**Block 1 — Config setupcard:**

```setupcard
{"phase":1,"status":"active","title":"建立影片受眾","icon":"target","items":[
  {"label":"影片來源","value":"Facebook Page","type":"select","options":[
    {"id":"fb","title":"Facebook Page"},
    {"id":"ig","title":"Instagram Account"}
  ]},
  {"label":"專頁/帳號","value":"[First page name]","type":"select","options":[
    mapped from get_pages results — {"id":"PAGE_ID","title":"Page Name"} for each
  ]},
  {"label":"互動程度","value":"睇咗至少 3 秒","type":"select","options":[
    {"id":"3s","title":"睇咗至少 3 秒","description":"最闊嘅受眾"},
    {"id":"10s","title":"睇咗至少 10 秒"},
    {"id":"thruplay","title":"ThruPlay (15 秒)","description":"睇完或睇咗 15 秒以上"},
    {"id":"25pct","title":"睇咗 25%"},
    {"id":"50pct","title":"睇咗 50%","description":"有明顯興趣"},
    {"id":"75pct","title":"睇咗 75%","description":"高參與度"},
    {"id":"95pct","title":"睇咗 95%","description":"幾乎睇晒，最高意向"}
  ]},
  {"label":"保留期","value":"365 日","editable":true,"options":[
    {"id":"30","title":"30 日"},
    {"id":"90","title":"90 日"},
    {"id":"180","title":"180 日"},
    {"id":"365","title":"365 日 (預設)"}
  ]}
]}
```

**Block 2 — Video selector:** The server already emitted the full video list via SSE mediagrid. Just tell the user: "請喺上面嘅影片列表揀選你想用嘅片（可多選），然後撳「Confirm」。"

If the server mediagrid doesn't appear (e.g. tool returned error), fall back to outputting a mediagrid block yourself with ALL videos from the API response. Do NOT truncate.

**When user clicks Confirm** with selected videos → call `create_custom_audience` with:
```
subtype: "ENGAGEMENT"
name: auto-generate "[Page Name] Video Viewers — [Date]"
rule: { inclusions: { operator: "or", rules: [{ event_sources: [{ id: "PAGE_ID", type: "page" }], retention_seconds: RETENTION, filter: { operator: "and", filters: [{ field: "event", operator: "eq", value: "video_watched" }, { field: "video.video_id", operator: "is_any", value: [SELECTED_VIDEO_IDS] }] } }] } }
```

**Engagement event map:**
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

## WEBSITE Audience — Single-Card

Call `get_pixels()` first.

```setupcard
{"phase":1,"status":"active","title":"建立網站訪客受眾","icon":"target","items":[
  {"label":"Pixel","value":"[First pixel name]","type":"select","options":[
    mapped from get_pixels — {"id":"PIXEL_ID","title":"Pixel Name"}
  ]},
  {"label":"訪客類型","value":"所有網站訪客","type":"select","options":[
    {"id":"all","title":"所有網站訪客","description":"去過任何頁面嘅人"},
    {"id":"specific","title":"特定頁面訪客","description":"去過某啲 URL 嘅人"},
    {"id":"purchase","title":"購買者","description":"完成購買嘅人"},
    {"id":"add_to_cart","title":"加入購物車","description":"加過貨入 Cart 嘅人"},
    {"id":"lead","title":"Lead 提交者","description":"提交過表單嘅人"}
  ]},
  {"label":"保留期","value":"30 日","editable":true,"options":[
    {"id":"7","title":"7 日"},
    {"id":"14","title":"14 日"},
    {"id":"30","title":"30 日 (預設)"},
    {"id":"60","title":"60 日"},
    {"id":"90","title":"90 日"},
    {"id":"180","title":"180 日 (最長)"}
  ]}
]}
```

If user picks "specific pages", ask for URL keyword in one follow-up. Then create.

---

## INSTAGRAM Engagement Audience — Single-Card

Call `get_connected_instagram_accounts()` first.

```setupcard
{"phase":1,"status":"active","title":"建立 IG 互動受眾","icon":"target","items":[
  {"label":"IG 帳號","value":"@[first username]","type":"select","options":[
    mapped from get_connected_instagram_accounts
  ]},
  {"label":"互動類型","value":"所有互動","type":"select","options":[
    {"id":"all","title":"所有互動","description":"同你 Profile 或內容有互動嘅人"},
    {"id":"visit","title":"瀏覽 Profile"},
    {"id":"post","title":"帖文/廣告互動","description":"Like、留言、分享、儲存"},
    {"id":"specific_post","title":"特定帖文互動","description":"揀選特定帖文"},
    {"id":"message","title":"發送 DM"},
    {"id":"saved","title":"儲存帖文"},
    {"id":"whatsapp","title":"撳過 WhatsApp 按鈕"}
  ]},
  {"label":"保留期","value":"365 日","editable":true,"options":[
    {"id":"30","title":"30 日"},
    {"id":"90","title":"90 日"},
    {"id":"180","title":"180 日"},
    {"id":"365","title":"365 日 (預設)"}
  ]}
]}
```

If "specific_post" selected → call `get_ig_posts()` → server emits mediagrid with all posts.

**IG Event values:**
| Event | Value |
|---|---|
| All engagement | `ig_business_profile_all` |
| Profile visit | `ig_business_profile_visit` |
| Post/Ad engaged | `ig_user_interacted_ad_or_organic` |
| Sent DM | `ig_user_messaged` |
| Saved | `ig_user_saved_media` |
| WhatsApp button | `ig_whatsapp_button_click` |

---

## FACEBOOK PAGE Engagement Audience — Single-Card

Call `get_pages()` first.

```setupcard
{"phase":1,"status":"active","title":"建立專頁互動受眾","icon":"target","items":[
  {"label":"Facebook 專頁","value":"[First page name]","type":"select","options":[
    mapped from get_pages
  ]},
  {"label":"互動類型","value":"所有互動","type":"select","options":[
    {"id":"engaged","title":"所有互動","description":"Like、分享、留言、連結點擊"},
    {"id":"specific_post","title":"特定帖文互動","description":"揀選特定帖文"},
    {"id":"liked","title":"專頁讚好/關注"},
    {"id":"visited","title":"專頁訪客"},
    {"id":"cta","title":"CTA 按鈕點擊"},
    {"id":"messaged","title":"發送訊息"},
    {"id":"whatsapp","title":"撳過 WhatsApp 按鈕"}
  ]},
  {"label":"保留期","value":"365 日","editable":true,"options":[
    {"id":"30","title":"30 日"},
    {"id":"90","title":"90 日"},
    {"id":"365","title":"365 日 (預設)"}
  ]}
]}
```

If "specific_post" → call `get_page_posts()` → server can emit mediagrid.

**Page Event values:**
| Event | Value |
|---|---|
| Any engagement | `page_engaged` |
| Likes/follows | `page_liked` |
| CTA clicks | `page_cta_clicked` |
| Messages | `page_messaged` |
| Page visits | `page_visited` |
| WhatsApp | `page_whatsapp_button_clicked` |

---

## AD ENGAGEMENT Audience — Single-Card

Call `get_campaigns()` first.

```setupcard
{"phase":1,"status":"active","title":"建立廣告互動受眾","icon":"target","items":[
  {"label":"搵法","value":"從 Campaign 入面搵","type":"select","options":[
    {"id":"campaign","title":"從 Campaign 入面搵"},
    {"id":"all","title":"瀏覽所有廣告"}
  ]},
  {"label":"Campaign","value":"Select...","type":"select","options":[
    mapped from get_campaigns
  ]},
  {"label":"互動類型","value":"所有互動","type":"select","options":[
    {"id":"engaged","title":"所有互動"},
    {"id":"clicked","title":"連結點擊"},
    {"id":"video_watched","title":"影片觀看"}
  ]},
  {"label":"保留期","value":"365 日","editable":true,"options":[
    {"id":"90","title":"90 日"},
    {"id":"180","title":"180 日"},
    {"id":"365","title":"365 日 (預設)"}
  ]}
]}
```

After Campaign selected → call `get_campaign_ads` → show ads as mediagrid. Map `effective_object_story_id` for rule.

---

## LEAD AD Audience — Single-Card

```setupcard
{"phase":1,"status":"active","title":"建立 Lead Form 受眾","icon":"target","items":[
  {"label":"Facebook 專頁","value":"[Page name]","type":"select","options":[mapped from get_pages]},
  {"label":"互動類型","value":"開過 Lead Form","type":"select","options":[
    {"id":"opened","title":"開過 Lead Form","description":"開過但未必提交"},
    {"id":"submitted","title":"已提交 Lead Form"},
    {"id":"not_submitted","title":"開過但無提交","description":"高意向但未完成"}
  ]},
  {"label":"保留期","value":"90 日","editable":true,"options":[
    {"id":"30","title":"30 日"},
    {"id":"60","title":"60 日"},
    {"id":"90","title":"90 日 (最長)"}
  ]}
]}
```

---

## WHATSAPP Audience — Single-Card

```setupcard
{"phase":1,"status":"active","title":"建立 WhatsApp 受眾","icon":"target","items":[
  {"label":"Facebook 專頁","value":"[Page name]","type":"select","options":[mapped from get_pages]},
  {"label":"互動類型","value":"所有互動","type":"select","options":[
    {"id":"all","title":"所有互動","description":"發過或收過訊息嘅人"},
    {"id":"sent","title":"主動發訊息","description":"最高意向"},
    {"id":"opened","title":"開過對話"}
  ]},
  {"label":"保留期","value":"365 日","editable":true,"options":[
    {"id":"90","title":"90 日"},
    {"id":"180","title":"180 日"},
    {"id":"365","title":"365 日 (預設)"}
  ]}
]}
```

---

## CUSTOMER LIST Audience — Single-Card

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

## LOOKALIKE Audience — Single-Card

Call `get_custom_audiences()` first.

```setupcard
{"phase":1,"status":"active","title":"建立 Lookalike 受眾","icon":"target","items":[
  {"label":"來源受眾","value":"Select...","type":"select","options":[
    mapped from get_custom_audiences — {"id":"AUD_ID","title":"Audience Name (est. size)"}
  ]},
  {"label":"目標國家","value":"HK","type":"select","options":[
    {"id":"HK","title":"香港"},
    {"id":"TW","title":"台灣"},
    {"id":"SG","title":"新加坡"},
    {"id":"MY","title":"馬來西亞"},
    {"id":"US","title":"美國"},
    {"id":"GB","title":"英國"},
    {"id":"AU","title":"澳洲"}
  ]},
  {"label":"相似度","value":"1% (最相似)","type":"select","options":[
    {"id":"0.01","title":"1% (最相似)","description":"最小、最高質素"},
    {"id":"0.02","title":"2%"},
    {"id":"0.03","title":"3%","description":"質素同覆蓋嘅平衡"},
    {"id":"0.05","title":"5%"},
    {"id":"0.10","title":"10%","description":"較大覆蓋，相似度較低"},
    {"id":"0.20","title":"20% (最闊)"}
  ]}
]}
```

> Source must have ≥100 people. Warn if too small.

---

## SAVED Audience — Single-Card

Call `targeting_search` with 2-3 keywords from user's description.

```setupcard
{"phase":1,"status":"active","title":"建立興趣受眾","icon":"target","items":[
  {"label":"地區","value":"香港","type":"select","options":[
    {"id":"HK","title":"香港"},{"id":"TW","title":"台灣"},{"id":"SG","title":"新加坡"},{"id":"US","title":"美國"}
  ]},
  {"label":"性別","value":"所有","type":"select","options":[
    {"id":"0","title":"所有"},{"id":"2","title":"女性"},{"id":"1","title":"男性"}
  ]},
  {"label":"年齡","value":"18-65","editable":true,"options":[
    {"id":"18-35","title":"18-35"},{"id":"25-45","title":"25-45"},{"id":"18-65","title":"18-65 (預設)"}
  ]},
  {"label":"興趣","value":"[From targeting_search results]","type":"select","options":[
    mapped from targeting_search — {"id":"INTEREST_ID","title":"Interest Name"}
  ]}
]}
```

After config → `get_reach_estimate` → show size warning if < 50K or > 10M.

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

## Handoff

**If mid-creation** (workflow_context has `creation_stage: "stage2_custom_audience"`):
Save targeting spec to workflow_context and transfer back to **executor**.

**Otherwise** (normal audience work):
Transfer back to ad_manager.

---

## Quick Reference

### Retention Limits
| Audience Type | Max | Default |
|---|---|---|
| Website | 180 days | 30 days |
| Lead Ad | 90 days | 30 days |
| Video / IG / Page / WhatsApp | 365 days | 365 days |

### Lookalike Ratio Guide
| Ratio | Best For |
|---|---|
| 1% (0.01) | Conversions |
| 2-3% | Balanced |
| 5% | Traffic |
| 10-20% | Awareness |

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
