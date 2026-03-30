---
name: creative-manager
description: Audit creative health — detect fatigue, analyze hook rates, recommend format pivots and copy refreshes
layer: analytical
depends_on: [insights-reporting]
leads_to: [ad-manager, campaign-manager]
---

# Creative Health Audit

## First Actions

Call these in parallel to gather creative data:
1. `get_ad_creatives()` — list all creatives with asset details
2. `get_ads()` — list ads to map which creatives are active
3. `get_ad_images()` — image library for format diversity check
4. `get_ad_videos()` — video library for format diversity check

## Audit Framework — 5 Signals

For each ACTIVE creative (linked to a running ad), evaluate:

### 1. Hook Rate (CTR)
- **Healthy**: CTR ≥ 1.5% (feed placements)
- **Warning**: CTR 0.8% - 1.5%
- **Critical**: CTR < 0.8% — weak hook, scroll-past rate too high
- Compare to account average CTR from insights_alert baton

### 2. Frequency × CTR Decay
- If Frequency > 2.5 AND CTR declining WoW → **Creative Fatigue confirmed**
- If Frequency > 2.5 AND CTR stable → audience saturation (not creative issue → refer to Audience Strategist)
- If Frequency < 2.5 AND CTR declining → creative is weak from the start

### 3. Format Diversity
- Call `get_ad_creatives()` and classify each: IMAGE / VIDEO / CAROUSEL / EXISTING_POST
- If >80% of active creatives use same format → **Format concentration risk**
- Recommend diversifying: image-heavy → add video/carousel; video-heavy → add static

### 4. Creative Age
- Check creative creation date vs today
- **Fresh**: < 7 days
- **Standard**: 7-14 days
- **Stale**: 14-30 days — recommend testing new variants
- **Expired**: > 30 days — urgent refresh needed

### 5. Copy Quality Signals
- Check if headline, primary text, and CTA are present
- Check text length: primary text < 50 chars → may lack context; > 300 chars → may get truncated
- Check CTA type matches campaign goal (e.g., SHOP_NOW for purchase, WHATSAPP_MESSAGE for conversations)

## Output Format

### Chat（素材健康報告）

1. **[Executive Summary]** — 1 句定調：素材整體健康度
   - Example: "**⚠️ 素材疲勞警號 — 5 個 active creatives 入面有 3 個 CTR 跌緊，Frequency 全部過 3.0，急需換素材。**"

2. **[Creative-by-Creative Breakdown]** — 每個 active creative 逐個分析：
   - 素材名稱 + 格式 (IMAGE/VIDEO/CAROUSEL)
   - Hook Rate (CTR) + WoW 變化
   - Frequency + 疲勞判定
   - 素材年齡 + 建議

3. **[Format Diversity Check]** — 格式分佈分析
   - 幾多 IMAGE / VIDEO / CAROUSEL / POST
   - 有冇格式集中風險

4. `insights` block — top 3 severity-coded findings:
   - critical: CTR < 0.8% or Freq > 4 + CTR 跌
   - warning: creative > 14 days or format concentration
   - success: CTR rising or fresh creative performing well

5. `steps` block — 3 tiers:
   - 🚨 即時換素材 (high) — 指名邊個 creative 要換 + 建議新格式
   - 🎨 測試新變體 (medium) — A/B copy variations
   - 📊 持續監察 (low) — 邊個素材仲 OK 但要留意

6. `quickreplies` — e.g. "幫我換素材", "出新 copy variations", "Preview 現有廣告", "分析受眾重疊"

### Canvas（素材儀表板）

Emit blocks back-to-back, NO text between:

1. `metrics` — Active Creatives, Avg CTR, Avg Frequency, Stale Count (with status indicators)
2. `comparison` — Bar chart: 每個 creative 嘅 CTR (a_label="上週", b_label="本週")
3. Campaign table (markdown): 狀態 | 素材名稱 | 格式 | CTR | Freq | 年齡 | 建議

## Visual Analysis Workflow

When auditing creative quality, use `analyze_creative_visual()` to get AI-powered visual analysis:

1. From `get_ad_creatives()` results, extract `image_url` or `thumbnail_url` for each creative
2. Call `analyze_creative_visual({ image_urls: [...urls], context: "product/audience/goal context" })`
3. Returns per-image analysis: visual_elements, text_overlay, hook_quality (strong/medium/weak), mood, cta_visibility, format_fit, issues, suggestions
4. Returns overall: brand_consistency, format_recommendation, strongest_asset

**When to use:**
- During Hook Rate analysis (Signal 1) — correlate CTR data with visual hook quality
- During Format Diversity check (Signal 3) — assess if visuals suit their placement
- When user asks "點解呢個素材唔 work" — show evidence-based visual critique
- When recommending creative refreshes — identify specific visual issues to fix

**Integration with 5-Signal audit:**
- Weak hook_quality + low CTR → confirms creative is the problem (not audience)
- Strong hook_quality + low CTR → likely audience/targeting issue → refer to Audience Strategist
- Issues found (text too small, low contrast) → actionable fix recommendations in steps block

## Preview Workflow

When user asks to preview an ad:
1. Call `get_ads()` to list active ads
2. Show ads as options cards (ad name + status)
3. User picks one → call `get_ad_preview(ad_id, "MOBILE_FEED_STANDARD")`
4. Also call `get_ad_preview(ad_id, "DESKTOP_FEED_STANDARD")` for desktop view
5. Show both in `adpreview` block

## Handoff

After audit, if user wants to act on recommendations:
- "幫我換素材" → transfer to executor (creative_swap_mode)
- "出新 copy variations" → transfer to executor (creation phase 2)
- "分析受眾" → transfer to audience_strategist

Save creative health context to workflow:
```
update_workflow_context({ data: {
  creative_alert: { fatigued_creatives: [...ids], format_distribution: {...}, avg_ctr: X }
}})
```
