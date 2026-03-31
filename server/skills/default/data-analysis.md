---
name: data-analysis
description: Performance analysis, diagnostics, and business intelligence. Covers performance overview, cost diagnostics, capital loss detection, scaling opportunities, and business management.
layer: analytical
leads_to: [campaign-manager, adset-manager, creative-manager, targeting-audiences, tracking-conversions, automation-rules]
---

# Data Analysis

## Scenario Router

Parse user intent → pick ONE scenario → follow its output structure.

| Scenario | Triggers | Strategic Lens |
|---|---|---|
| A — 預算配比效率 | "overview", "how are my ads", "last 7 days", general check-in | Spend efficiency across funnel stages — is TOFU/MOFU/BOFU balanced? |
| B — 素材 vs 市場 | "why is cost high", "diagnose", "what's wrong" | Creative Decay vs Auction Pressure — walk through causal evidence |
| C — 資本損耗 | "what should I pause", "worst performers", "stop loss" | Quantify capital hemorrhage, generate kill list |
| D — 邊際紅利 | "which should I scale", "best performers", "add budget" | Find low-freq low-CPA winners with scaling room |
| E — 業務管理 | "account health", "business manager", "team", "pixels", "account status" | Business/account infrastructure health and management |

Default if unclear → Scenario A.

---

## Funnel Classification

Classify each campaign by optimization_goal:
- **TOFU 認知 (Awareness)**: REACH, THRUPLAY, POST_ENGAGEMENT — 純曝光，建立品牌認知
- **MOFU 考慮 (Consideration)**: LINK_CLICKS, LANDING_PAGE_VIEWS, PROFILE_VISIT — 主動探索，表達興趣
- **BOFU 轉化 (Conversion)**: CONVERSATIONS, LEAD_GENERATION, OFFSITE_CONVERSIONS, VALUE, APP_INSTALLS — 採取行動，完成轉化

---

## Goal → Primary Metric Map

| optimization_goal | Primary Metric | Primary Action Type |
|---|---|---|
| CONVERSATIONS | Cost/Conversation | `onsite_conversion.messaging_conversation_started_7d` |
| LEAD_GENERATION | CPL | `lead` or `onsite_conversion.lead_grouped` |
| OFFSITE_CONVERSIONS (purchase) | ROAS + CPA | `purchase` / `offsite_conversion.fb_pixel_purchase` |
| OFFSITE_CONVERSIONS (lead) | CPL | `offsite_conversion.fb_pixel_lead` |
| OFFSITE_CONVERSIONS (other) | Cost/LPV | `landing_page_view` |
| LINK_CLICKS | CPC + CTR | `link_click` |
| LANDING_PAGE_VIEWS | Cost/LPV | `landing_page_view` |
| PROFILE_VISIT | Cost/Click | `link_click` (proxy) |
| REACH | CPM + Reach | impressions/reach |
| THRUPLAY | Cost/ThruPlay | `video_thruplay_watched_actions` |
| POST_ENGAGEMENT | CPE | `post_engagement` |
| APP_INSTALLS | CPI | `mobile_app_install` |
| VALUE | ROAS | `purchase` + `action_values` |

**ROAS rule:** Only compute when goal = VALUE or OFFSITE_CONVERSIONS+purchase. Never for messaging/leads.

---

## Data (already loaded by analyze_performance)

`analyze_performance()` returns:
```
{ current_7d, previous_7d, baseline_30d, _benchmarks, account_summary }
```

`_benchmarks[goal]` = { avg_cost_per_result, total_spend, total_results, campaign_count, primary_action_type }

Extract primary result: `actions.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
Extract primary cost: `cost_per_action_type.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`

---

## Output Format — Two Panels, Zero Redundancy

### Chat Output
Text analysis + interactive blocks (quickreplies, steps, insights). Chat text goes FIRST with analysis narrative.

### Canvas Dashboard Output
Structured JSON for the interactive dashboard panel. Output as a `dashboard` code block at the END of response, AFTER all chat text. The frontend renders them independently — chat panel shows text, canvas panel shows dashboard.

```dashboard
{
  "scenario": "A",
  "title": "Performance Overview",
  "dateRange": "2026-03-24 to 2026-03-31",
  "kpis": [
    {"label": "Total Spend", "value": "$16,234", "change": "+12%", "trend": "up"},
    {"label": "Results", "value": "450", "change": "+8%", "trend": "up"},
    {"label": "Cost/Result", "value": "$36.08", "change": "-5%", "trend": "down"},
    {"label": "CTR", "value": "1.82%", "change": "+0.3%", "trend": "up"}
  ],
  "charts": [
    {"type": "budget", "data": {...}},
    {"type": "comparison", "data": {...}},
    {"type": "trend", "data": {...}}
  ],
  "campaigns": [
    {"id": "123", "name": "...", "status": "🚀", "spend": 5200, "cpa": 32, "ctr": 2.1, "wow": "+8%", "diagnosis": "Growth breakout", "action": "Scale budget +30%"}
  ],
  "recommendations": [
    {"severity": "warning", "text": "Pause Campaign X — saving $500/wk", "action": "pause_campaign", "params": {"campaign_id": "456"}},
    {"severity": "success", "text": "Scale Campaign Y — add $200/day", "action": "update_campaign", "params": {"campaign_id": "789", "daily_budget": 40000}}
  ]
}
```

CRITICAL: The dashboard block is SEPARATE from chat text. Chat text goes first with analysis narrative. Dashboard block goes at END of response. The frontend renders them independently — chat panel shows text, canvas panel shows dashboard.

---

## §overview — 預算配比效率（General Overview）

### Chat（深度診斷報告）:
1. **[Executive Summary]** — 1 句盤面定調（dominant status + total spend + key finding）
2. **[Full Funnel Strategy]** — #### TOFU 引流 / #### MOFU 興趣 / #### BOFU 轉化 sub-headers. 每層：spend share vs result share、效率指標、同比變化。指出漏斗失衡。
3. **[Five Pillars Analysis]**:
   - 🎯 漏斗策略 — TOFU/MOFU/BOFU 預算配比是否合理
   - 🎨 素材疲勞 — Hook Rate (CTR) + Frequency 交叉分析
   - 👥 受眾精準度 — Frequency 飽和度、覆蓋率變化
   - 💰 預算節奏 — Daily spend 穩定性、邊際效益遞減訊號
   - 📱 渠道拆解 — 各 placement/目標 表現差異
4. `steps` block: 🚨 即時止血 → 📈 分階段加碼 → 🎨 素材迭代
5. `insights` block — top 3 findings
6. `quickreplies` — "深入分析邊個 campaign?", "幫我 pause 蝕錢嗰啲", "邊個值得加 budget?", "睇下素材健康度"

### Canvas Dashboard:
```dashboard
{
  "scenario": "A",
  "title": "Performance Overview",
  "dateRange": "...",
  "kpis": [
    {"label": "Spend", "value": "...", "change": "...", "trend": "..."},
    {"label": "Results", "value": "...", "change": "...", "trend": "..."},
    {"label": "CPR", "value": "...", "change": "...", "trend": "..."},
    {"label": "CTR", "value": "...", "change": "...", "trend": "..."}
  ],
  "charts": [
    {"type": "budget", "data": {"items": [{"name": "TOFU", "spend": ...}, {"name": "MOFU", "spend": ...}, {"name": "BOFU", "spend": ...}]}},
    {"type": "comparison", "data": {"a_label": "上週", "b_label": "本週", "items": [{"name": "...", "a": ..., "b": ...}]}},
    {"type": "trend", "data": {"series": [{"name": "Daily Spend", "values": [...]}, {"name": "Conversions", "values": [...]}]}}
  ],
  "campaigns": [
    {"id": "...", "name": "...", "status": "...", "funnel": "TOFU|MOFU|BOFU", "spend": ..., "cpa": ..., "wow": "...", "action": "..."}
  ],
  "recommendations": [...]
}
```

Campaign table columns: 狀態 | 廣告名稱 | 漏斗 | 消耗 | 成本 | WoW | 操盤建議

---

## §diagnostics — 素材 vs 市場（Diagnosis: Why is cost rising?）

### Chat（因果診斷報告）:
1. **[Executive Summary]** — 1 句定性：係素材問題定市場問題？
2. **[Evidence Chain]** — 逐步排查：
   - #### 假設 1：創意吸引力衰退 — CTR 走勢 + Frequency 交叉。如果 CTR 跌 + Freq > 2.5 → 素材疲勞確認
   - #### 假設 2：流量競爭加劇 — CPM 走勢 + CTR 穩定。如果 CPM 升 + CTR 持平 → 市場競價壓力
   - #### 結論 — 明確判定根因，引用具體數據
3. **[Campaign-Level Breakdown]** — 逐個 campaign 歸因：邊個係素材問題、邊個係市場問題
4. `steps` block: 🎨 素材疲勞對策 (high) → ⚔️ 競價壓力對策 (medium) → 📊 監察指標 (low)
5. `insights` block — top 3 findings
6. `quickreplies` — "幫我換素材", "調整出價策略", "睇下受眾重疊", "對比其他時段"

### Canvas Dashboard:
```dashboard
{
  "scenario": "B",
  "title": "Cost Diagnosis",
  "dateRange": "...",
  "kpis": [
    {"label": "Spend", "value": "...", "change": "...", "trend": "..."},
    {"label": "CPA", "value": "...", "change": "...", "trend": "..."},
    {"label": "CTR", "value": "...", "change": "...", "trend": "..."},
    {"label": "CPM", "value": "...", "change": "...", "trend": "..."}
  ],
  "charts": [
    {"type": "comparison", "data": {"a_label": "上週", "b_label": "本週", "items": [{"name": "...", "a_ctr": ..., "b_ctr": ..., "a_cpm": ..., "b_cpm": ...}]}},
    {"type": "trend", "data": {"series": [{"name": "CTR", "values": [...]}, {"name": "Frequency", "values": [...]}]}}
  ],
  "campaigns": [
    {"id": "...", "name": "...", "status": "...", "cpa": ..., "ctr": ..., "cpm": ..., "frequency": ..., "root_cause": "...", "action": "..."}
  ],
  "recommendations": [...]
}
```

Campaign table columns: 狀態 | 廣告名稱 | CPA | CTR | CPM | Freq | 根因 | 對策

---

## §capital-loss — 資本損耗（Stop Loss: What to pause?）

### Chat（止血報告）:
1. **[Executive Summary]** — 1 句量化損耗：「本週有 $X 預算流失，佔總支出 Y%」
2. **[Kill List]** — 按損耗金額排序，每個 campaign：
   - 消耗 vs 成果（如有）
   - 超額成本 = actual_spend - (benchmark_CPA × results)
   - 明確建議：暫停 / 減 budget / 觀察
3. **[Savings Projection]** — 如果執行建議，預計每週慳幾多
4. `steps` block: 🚨 即刻暫停 (high) → ⚠️ 減半 budget (medium) → 👀 觀察多 3 日 (low)
5. `insights` block — top 3 findings
6. `quickreplies` — "幫我 pause 晒", "淨係 pause 最差嗰個", "設定止損線", "重新分配 budget"

### Canvas Dashboard:
```dashboard
{
  "scenario": "C",
  "title": "Capital Loss Report",
  "dateRange": "...",
  "kpis": [
    {"label": "Total Waste", "value": "...", "change": "...", "trend": "..."},
    {"label": "Campaigns at Risk", "value": "...", "change": "...", "trend": "..."},
    {"label": "Avg CPA vs Benchmark", "value": "...", "change": "...", "trend": "..."},
    {"label": "Active Campaigns", "value": "...", "change": "...", "trend": "..."}
  ],
  "charts": [
    {"type": "budget", "data": {"items": [{"name": "有效支出", "spend": ...}, {"name": "浪費支出", "spend": ...}]}},
    {"type": "comparison", "data": {"a_label": "Benchmark", "b_label": "實際 CPA", "items": [{"name": "...", "a": ..., "b": ...}]}}
  ],
  "campaigns": [
    {"id": "...", "name": "...", "status": "...", "spend": ..., "results": ..., "cpa": ..., "excess_cost": ..., "action": "pause|reduce|watch"}
  ],
  "recommendations": [
    {"severity": "critical", "text": "Pause Campaign X — saving $.../wk", "action": "pause_campaign", "params": {"campaign_id": "..."}},
    {"severity": "warning", "text": "Reduce Campaign Y budget by 50%", "action": "update_campaign", "params": {"campaign_id": "...", "daily_budget": ...}}
  ]
}
```

Campaign table columns: 狀態 | 廣告名稱 | 消耗 | 成果 | CPA | 超額成本 | 建議動作

---

## §scaling — 邊際紅利（Scale Up: Best performers）

### Chat（加碼報告）:
1. **[Executive Summary]** — 1 句定調：「有 X 個 campaign 處於爆發模式，Frequency 仲有空間」
2. **[Winner Analysis]** — 每個贏家 campaign：
   - CPA vs benchmark（低幾多%）
   - Frequency headroom（距離飽和仲有幾多）
   - 建議加碼幅度（e.g. +30% daily budget）
3. **[Budget Reallocation Plan]** — 從邊度搬錢過嚟：cut losers → fund winners
4. `steps` block: 🚀 即刻加碼 (high) → 🔄 預算搬遷 (medium) → 📊 設定監察閾值 (low)
5. `insights` block — top 3 findings
6. `quickreplies` — "幫我加 budget", "開 lookalike 受眾", "複製贏家 campaign", "設定自動規則"

### Canvas Dashboard:
```dashboard
{
  "scenario": "D",
  "title": "Scaling Opportunities",
  "dateRange": "...",
  "kpis": [
    {"label": "Winner Count", "value": "...", "change": "...", "trend": "..."},
    {"label": "Avg CPA (winners)", "value": "...", "change": "...", "trend": "..."},
    {"label": "Freq Headroom", "value": "...", "change": "...", "trend": "..."},
    {"label": "Scaling Potential", "value": "...", "change": "...", "trend": "..."}
  ],
  "charts": [
    {"type": "budget", "data": {"items": [{"name": "贏家", "spend": ...}, {"name": "一般", "spend": ...}, {"name": "蝕錢", "spend": ...}]}},
    {"type": "trend", "data": {"series": [{"name": "CPA", "values": [...]}, {"name": "Conversions", "values": [...]}]}},
    {"type": "comparison", "data": {"a_label": "帳戶平均", "b_label": "贏家", "items": [{"name": "...", "a": ..., "b": ...}]}}
  ],
  "campaigns": [
    {"id": "...", "name": "...", "status": "🚀", "cpa": ..., "vs_benchmark": "...", "frequency": ..., "headroom": ..., "action": "Scale +30%"}
  ],
  "recommendations": [
    {"severity": "success", "text": "Scale Campaign X — add $200/day", "action": "update_campaign", "params": {"campaign_id": "...", "daily_budget": ...}},
    {"severity": "info", "text": "Create lookalike from Campaign Y audience", "action": "create_lookalike", "params": {"source_campaign_id": "..."}}
  ]
}
```

Campaign table columns: 狀態 | 廣告名稱 | CPA | vs基準 | Freq | Headroom | 建議加碼

---

## §business-mgmt — 業務管理（Business & Account Management）

### API Endpoints

#### Ad Accounts

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/meta/adaccounts` | List all ad accounts |
| GET | `/api/meta/adaccounts/:id/details` | Get ad account details |
| GET | `/api/meta/adaccounts/:id/activities` | Get account activity log |
| GET | `/api/meta/adaccounts/:id/users` | List users with access |
| GET | `/api/meta/adaccounts/:id/minimum-budgets` | Get minimum budget thresholds |
| GET | `/api/meta/adaccounts/:id/instagram-accounts` | List connected Instagram accounts |

#### Businesses

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/meta/businesses` | List all businesses |
| GET | `/api/meta/businesses/:id/details` | Get business details |
| GET | `/api/meta/businesses/:id/adaccounts` | List ad accounts under a business |
| GET | `/api/meta/businesses/:id/users` | List team members |
| GET | `/api/meta/businesses/:id/system-users` | List system users |
| GET | `/api/meta/businesses/:id/owned-pages` | List owned Pages |
| GET | `/api/meta/businesses/:id/owned-pixels` | List owned pixels |
| GET | `/api/meta/businesses/:id/owned-catalogs` | List owned catalogs |
| GET | `/api/meta/businesses/:id/owned-instagram` | List owned Instagram accounts |
| GET | `/api/meta/businesses/:id/client-adaccounts` | List client ad accounts |
| POST | `/api/meta/businesses/:id/claim-adaccount` | Claim an ad account |

##### Claim an Ad Account

`POST /api/meta/businesses/:id/claim-adaccount`

Body:
```json
{
  "adaccount_id": "act_123456789"
}
```

#### Pages

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/api/meta/pages` | List Facebook Pages the user manages |
| GET | `/api/meta/pages/:id/ads` | List ads associated with a specific Page |

The pages endpoint returns `id`, `name`, `engagement`, `fan_count`, and `category` for each page.

#### Batch API

`POST /api/meta/batch`

Body:
```json
{
  "batch": [
    { "method": "GET", "relative_url": "me/adaccounts?fields=name,account_status" },
    { "method": "GET", "relative_url": "me/businesses?fields=name,verification_status" }
  ]
}
```

Use the batch endpoint to combine multiple Graph API calls into a single HTTP request. Responses are returned in the same order as the requests. Maximum 50 requests per batch call.

#### Ad Library

`GET /api/meta/ad-library?search_terms=...&ad_reached_countries=...`

Search the public Facebook Ad Library for active ads. Required parameters:
- `search_terms` -- keyword or advertiser name
- `ad_reached_countries` -- comma-separated country codes (e.g., `US`, `GB`)

#### Reach & Frequency

`POST /api/meta/reach-frequency`

Body:
```json
{
  "adAccountId": "act_123456789",
  "budget": 500000,
  "prediction_mode": "REACH",
  "start_time": 1700000000,
  "stop_time": 1700600000
}
```

Generates a reach and frequency prediction for campaign planning.

### Account Health Check

Run this workflow whenever a user selects an ad account, asks about account status, or requests an overview.

**Step 1 -- Gather account data using batch API:**
```json
{
  "batch": [
    { "method": "GET", "relative_url": "act_XXX?fields=name,account_status,balance,amount_spent,currency,business,timezone_name,disable_reason,funding_source_details" },
    { "method": "GET", "relative_url": "act_XXX/campaigns?fields=name,status,objective&limit=50" },
    { "method": "GET", "relative_url": "act_XXX/pixels?fields=name,last_fired_time,is_created_by_business" },
    { "method": "GET", "relative_url": "act_XXX/insights?fields=spend,impressions,clicks,ctr,purchase_roas&date_preset=last_7d" }
  ]
}
```

**Step 2 -- Assess account health:**

| Dimension | Check | Weight |
|-----------|-------|--------|
| Account Status | Is account ACTIVE (status=1)? | Critical |
| Business Verification | Is parent business verified? | High |
| Payment Method | Is funding source valid and not expired? | Critical |
| Pixel Health | Is pixel firing? Last fired < 24h ago? | High |
| Campaign Structure | Are campaigns organized with clear naming? | Medium |
| Active Campaigns | Are there campaigns currently delivering? | Medium |
| Spend Trend | Is spend consistent or erratic? | Low |

**Step 3 -- Present with dashboard block:**

### Canvas Dashboard (Scenario E):
```dashboard
{
  "scenario": "E",
  "title": "Account Health",
  "dateRange": "...",
  "kpis": [
    {"label": "Account Status", "value": "...", "change": "", "trend": "..."},
    {"label": "Active Campaigns", "value": "...", "change": "...", "trend": "..."},
    {"label": "Last 7d Spend", "value": "...", "change": "...", "trend": "..."},
    {"label": "Pixel Status", "value": "...", "change": "", "trend": "..."}
  ],
  "charts": [],
  "campaigns": [],
  "recommendations": [
    {"severity": "critical|warning|success|info", "text": "...", "action": "...", "params": {...}}
  ]
}
```

### Business Portfolio Overview

When user asks to see their businesses or wants an overview:

1. GET `/api/meta/businesses` -- list all businesses
2. For each business, use batch API to fetch ad accounts, pages, pixels, and Instagram accounts in one call
3. Present as a structured portfolio view with dashboard block

### Team & Permissions Audit

When user asks about team members or access:

1. GET `/api/meta/businesses/:id/users` -- team members
2. GET `/api/meta/businesses/:id/system-users` -- system users
3. GET `/api/meta/adaccounts/:id/users` -- per-account access

Flag: users with admin access who shouldn't have it, system users without recent activity, missing roles for key functions.

### Batch API Usage Patterns

#### Dashboard Load (single account)
```json
{
  "batch": [
    { "method": "GET", "relative_url": "act_123/campaigns?fields=name,status&limit=10" },
    { "method": "GET", "relative_url": "act_123/insights?fields=spend,impressions&date_preset=last_7d" },
    { "method": "GET", "relative_url": "act_123?fields=account_status,balance" }
  ]
}
```

#### Multi-Account Health Check
```json
{
  "batch": [
    { "method": "GET", "relative_url": "act_111?fields=name,account_status,amount_spent" },
    { "method": "GET", "relative_url": "act_222?fields=name,account_status,amount_spent" },
    { "method": "GET", "relative_url": "act_333?fields=name,account_status,amount_spent" }
  ]
}
```

#### Full Business Inventory
```json
{
  "batch": [
    { "method": "GET", "relative_url": "BIZ_ID/owned_ad_accounts?fields=name,account_status&limit=50" },
    { "method": "GET", "relative_url": "BIZ_ID/owned_pages?fields=name,fan_count&limit=50" },
    { "method": "GET", "relative_url": "BIZ_ID/owned_pixels?fields=name,last_fired_time" },
    { "method": "GET", "relative_url": "BIZ_ID/owned_instagram_accounts?fields=username,follow_count" }
  ]
}
```

---

## 5-Signal Decision Tree

```
cpa_deviation_pct = ((campaign_cost - _benchmarks[goal].avg_cost_per_result) / avg) * 100
ctr_delta_pct     = ((current_ctr - prev_ctr) / prev_ctr) * 100
cpm_delta_pct     = ((current_cpm - prev_cpm) / prev_cpm) * 100
frequency         = current period value
result_count      = current period primary results (0 vs >0)
```

**Decision tree (first match wins):**

| Status | Condition |
|---|---|
| 🚨 預算流失警告 | spend > 0 AND results = 0 |
| ⚠️ 創意吸引力衰退 | CPA > +20% AND CTR < -10% AND freq > 2.5 |
| ⚔️ 流量競爭加劇 | CPA > +20% AND CTR stable AND CPM > +15% |
| ⚖️ 表現穩定運行 | CPA within ±20% |
| 🚀 爆發增長模式 | CPA < -20% AND CTR stable/improving |
| 📊 數據積累中 | < 3 days data or < $10 spend → skip diagnosis |

**Frequency signal:** ≤3 healthy, 3-5 saturation approaching, >5 audience saturated.

---

## Global Constraints (all scenarios)

- Messaging campaigns: 絕對不准出現 ROAS
- Every metric includes WoW% (🔴 > +15%, 🟡 ±15%, 🟢 < -15%)
- Strip campaign name prefixes (Sales_Wts_FB_ etc)
- 註明 48h attribution window at report bottom
- Chat 內不准重複 Canvas 嘅表格數字
- NEVER say "I'll check" or "Let me look" -- just call the tools and present results
- Use batch API whenever fetching data from multiple entities to minimize round trips
- Always check account_status before recommending any campaign actions -- disabled accounts cannot run ads
- If no businesses found, guide user to create one at business.facebook.com
- If no ad account selected, say: "Select an ad account from the sidebar to get started."
- Always present account health findings with severity levels so users know what to fix first

---

## Handoff

After analysis, save alert context then transfer back:

```
update_workflow_context({ data: {
  insights_alert: { metric, value, prev, trend, status, campaign_id, optimization_goal }
}})
```

### Performance Diagnostics → Next Skill

| Diagnostic | Recommended Next Skill |
|---|---|
| 🚨 Budget Leaking | `tracking-conversions` → `campaign-manager` |
| ⚠️ Creative Decay | `creative-manager` |
| ⚔️ Auction Pressure | `campaign-manager` |
| 🚀 Growth Breakout | `campaign-manager` + `targeting-audiences` |

### Account Health → Next Skill

| Finding | Severity | Recommended Skill | Action |
|---------|----------|-------------------|--------|
| Account DISABLED or UNSETTLED | Critical | None (manual fix) | Direct user to Meta Business Settings to resolve payment/policy |
| Account PENDING_RISK_REVIEW | Critical | None (wait) | Inform user to wait for Meta review; no action possible |
| Pixel not firing or missing | Critical | `tracking-conversions` | Fix pixel setup, verify events |
| Pixel firing but no conversions | Warning | `tracking-conversions` | Debug event mapping and attribution |
| Business not verified | Warning | None (manual fix) | Direct user to Business Verification in Meta settings |
| No active campaigns | Info | `campaign-manager` | Create or reactivate campaigns |
| Campaigns active but no spend | Warning | `campaign-manager` | Check budgets, scheduling, audience size |
| High spend, low ROAS | Warning | `campaign-manager` | Budget reallocation, pause underperformers |
| No Instagram account connected | Info | None (manual fix) | Connect IG in Business Settings for IG placements |
| Audience overlap across ad sets | Warning | `targeting-audiences` | Consolidate or exclude overlapping audiences |
| Creative diversity low | Warning | `creative-manager` | Test new formats and copy variations |
| No automation rules set | Info | `automation-rules` | Set up budget and performance guardrails |

---

## Quick Reference

### Account Statuses

| Code | Status | Can Run Ads? | Action Required |
|------|--------|-------------|-----------------|
| 1 | ACTIVE | Yes | None |
| 2 | DISABLED | No | Appeal in Meta Business Settings |
| 3 | UNSETTLED | No | Update payment method |
| 7 | PENDING_RISK_REVIEW | No | Wait for Meta review |
| 8 | PENDING_SETTLEMENT | No | Wait for settlement |
| 9 | IN_GRACE_PERIOD | Limited | Resolve billing issues promptly |
| 100 | PENDING_CLOSURE | No | Contact Meta support |
| 101 | CLOSED | No | Cannot be reopened |
| 201 | ANY_ACTIVE | Filter | Used for filtering only |
| 202 | ANY_CLOSED | Filter | Used for filtering only |

### Business Verification Statuses

| Status | Description | Impact |
|--------|-------------|--------|
| `not_verified` | Has not started verification | Limited features, lower API limits |
| `pending` | Documents submitted, under review | Waiting -- no action needed |
| `verified` | Business is verified | Full access to Custom Audiences, higher API limits |

### Disable Reasons

| Code | Reason |
|------|--------|
| 0 | NONE |
| 1 | ADS_INTEGRITY_POLICY |
| 2 | ADS_IP_REVIEW |
| 3 | RISK_PAYMENT |
| 4 | GRAY_ACCOUNT_SHUT_DOWN |
| 5 | ADS_AFC_REVIEW |
| 6 | BUSINESS_INTEGRITY_RAR |
| 7 | PERMANENT_CLOSE |

### WoW Change Indicators

| Indicator | Condition |
|-----------|-----------|
| 🔴 | Change > +15% (cost metrics) or < -15% (performance metrics) |
| 🟡 | Change within ±15% |
| 🟢 | Change < -15% (cost metrics) or > +15% (performance metrics) |
