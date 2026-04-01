---
name: insights-reporting
description: Analyze Facebook ad performance with diagnostic statuses and strategic recommendations
layer: analytical
leads_to: [campaign-manager, adset-manager, creative-manager, targeting-audiences, tracking-conversions]
preview: "📊 Campaign A: ROAS 3.2x, CPA $12 — performing well\n🚨 Campaign B: ROAS 0.8x, Freq 4.2 — creative fatigue detected\n🚀 Action: Pause Campaign B, scale Campaign A budget +20%"
---

# Insights & Reporting

## Scenario Routing (classify BEFORE writing)

Read the user's message → pick ONE scenario → follow its output structure.

| Scenario | Triggers | Strategic Lens |
|---|---|---|
| A — 預算配比效率 | "overview", "how are my ads", "last 7 days", general check-in | Spend efficiency across funnel stages — is TOFU/MOFU/BOFU balanced? |
| B — 素材 vs 市場 | "why is cost high", "diagnose", "what's wrong" | Creative Decay vs Auction Pressure — walk through causal evidence |
| C — 資本損耗 | "what should I pause", "worst performers", "stop loss" | Quantify capital hemorrhage, generate kill list |
| D — 邊際紅利 | "which should I scale", "best performers", "add budget" | Find low-freq low-CPA winners with scaling room |

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

## Diagnostic Evaluation (5 signals)

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

## Output Format — Per-Scenario, Two Panels, Zero Redundancy

Text appears in BOTH panels. Canvas blocks + tables appear ONLY in canvas. Write ALL chat text first, then canvas blocks at the end with NO text between them.

---

### Scenario A — 預算配比效率（General Overview）

**Chat（深度診斷報告）:**
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

**Canvas（視覺儀表板）:**
1. `metrics` — Spend, Results, CPR, CTR (with WoW%)
2. `budget` — Donut: 預算分佈 by funnel stage (TOFU/MOFU/BOFU)
3. `comparison` — Bar: 本週 vs 上週 CPA by campaign (a_label="上週", b_label="本週")
4. `trend` — Line: 7日 Daily Spend + Conversions
5. Campaign table: 狀態 | 廣告名稱 | 漏斗 | 消耗 | 成本 | WoW | 操盤建議

---

### Scenario B — 素材 vs 市場（Diagnosis: Why is cost rising?）

**Chat（因果診斷報告）:**
1. **[Executive Summary]** — 1 句定性：係素材問題定市場問題？
2. **[Evidence Chain]** — 逐步排查：
   - #### 假設 1：創意吸引力衰退 — CTR 走勢 + Frequency 交叉。如果 CTR 跌 + Freq > 2.5 → 素材疲勞確認
   - #### 假設 2：流量競爭加劇 — CPM 走勢 + CTR 穩定。如果 CPM 升 + CTR 持平 → 市場競價壓力
   - #### 結論 — 明確判定根因，引用具體數據
3. **[Campaign-Level Breakdown]** — 逐個 campaign 歸因：邊個係素材問題、邊個係市場問題
4. `steps` block: 🎨 素材疲勞對策 (high) → ⚔️ 競價壓力對策 (medium) → 📊 監察指標 (low)
5. `insights` block — top 3 findings
6. `quickreplies` — "幫我換素材", "調整出價策略", "睇下受眾重疊", "對比其他時段"

**Canvas（診斷儀表板）:**
1. `metrics` — Spend, CPA, CTR, CPM (with WoW%)
2. `comparison` — Bar: 本週 vs 上週 CTR + CPM per campaign (show both metrics)
3. `trend` — Line: 7日 CTR + Frequency 走勢（two series: "CTR", "Frequency"）
4. Campaign table: 狀態 | 廣告名稱 | CPA | CTR | CPM | Freq | 根因 | 對策

---

### Scenario C — 資本損耗（Stop Loss: What to pause?）

**Chat（止血報告）:**
1. **[Executive Summary]** — 1 句量化損耗：「本週有 $X 預算流失，佔總支出 Y%」
2. **[Kill List]** — 按損耗金額排序，每個 campaign：
   - 消耗 vs 成果（如有）
   - 超額成本 = actual_spend - (benchmark_CPA × results)
   - 明確建議：暫停 / 減 budget / 觀察
3. **[Savings Projection]** — 如果執行建議，預計每週慳幾多
4. `steps` block: 🚨 即刻暫停 (high) → ⚠️ 減半 budget (medium) → 👀 觀察多 3 日 (low)
5. `insights` block — top 3 findings
6. `quickreplies` — "幫我 pause 晒", "淨係 pause 最差嗰個", "設定止損線", "重新分配 budget"

**Canvas（損耗儀表板）:**
1. `metrics` — Total Waste, Campaigns at Risk, Avg CPA vs Benchmark, Active Campaign Count
2. `budget` — Donut: 有效支出 vs 浪費支出 (items: [{ name: "有效支出", spend: X }, { name: "浪費支出", spend: Y }])
3. `comparison` — Bar: 每個 campaign 嘅 CPA vs Benchmark (a_label="Benchmark", b_label="實際 CPA")
4. Campaign table: 狀態 | 廣告名稱 | 消耗 | 成果 | CPA | 超額成本 | 建議動作

---

### Scenario D — 邊際紅利（Scale Up: Best performers）

**Chat（加碼報告）:**
1. **[Executive Summary]** — 1 句定調：「有 X 個 campaign 處於爆發模式，Frequency 仲有空間」
2. **[Winner Analysis]** — 每個贏家 campaign：
   - CPA vs benchmark（低幾多%）
   - Frequency headroom（距離飽和仲有幾多）
   - 建議加碼幅度（e.g. +30% daily budget）
3. **[Budget Reallocation Plan]** — 從邊度搬錢過嚟：cut losers → fund winners
4. `steps` block: 🚀 即刻加碼 (high) → 🔄 預算搬遷 (medium) → 📊 設定監察閾值 (low)
5. `insights` block — top 3 findings
6. `quickreplies` — "幫我加 budget", "開 lookalike 受眾", "複製贏家 campaign", "設定自動規則"

**Canvas（增長儀表板）:**
1. `metrics` — Winner Count, Avg CPA (winners), Frequency Headroom, Scaling Potential ($)
2. `budget` — Donut: 贏家 vs 一般 vs 蝕錢 campaign spend分佈
3. `trend` — Line: 贏家 campaigns 7日 CPA + Conversions 走勢
4. `comparison` — Bar: 贏家 CPA vs Account Avg (a_label="帳戶平均", b_label="贏家")
5. Campaign table: 狀態 | 廣告名稱 | CPA | vs基準 | Freq | Headroom | 建議加碼

---

### Global Constraints (all scenarios)
- Messaging campaigns: 絕對不准出現 ROAS
- Every metric includes WoW% (🔴 > +15%, 🟡 ±15%, 🟢 < -15%)
- Strip campaign name prefixes (Sales_Wts_FB_ etc)
- 註明 48h attribution window at report bottom
- Chat 內不准重複 Canvas 嘅表格數字

---

## Handoff

After analysis, save alert context then transfer back:

```
update_workflow_context({ data: {
  insights_alert: { metric, value, prev, trend, status, campaign_id, optimization_goal }
}})
```

| Diagnostic | Recommended Next Skill |
|---|---|
| 🚨 Budget Leaking | `tracking-conversions` → `campaign-manager` |
| ⚠️ Creative Decay | `creative-manager` |
| ⚔️ Auction Pressure | `campaign-manager` |
| 🚀 Growth Breakout | `campaign-manager` + `targeting-audiences` |
