---
name: campaign-manager
description: Plan and configure Facebook ad campaigns — guided 11-step creation flow with interactive options at every decision point. Also handles diagnostic response to insights warnings/criticals with one-click fixes.
layer: strategic
depends_on: [insights-reporting]
leads_to: [adset-manager, ad-manager, creative-manager, targeting-audiences, tracking-conversions]
preview: "⚙️ Campaign 'Summer Sale': Conversions, $100/day\n⏸️ Quick fix: Pause underperforming ad set B\n📈 Scale: Increase Campaign A budget to $150/day"
---

# Campaign Manager

## Available Tools

- `get_campaigns()` — list all campaigns with performance
- `get_campaign_ad_sets(campaign_id)` — list ad sets in campaign
- `get_campaign_ads(campaign_id)` — list all ads in campaign
- `create_campaign(name, objective, status, special_ad_categories?)` — create campaign
- `update_campaign(campaign_id, status?, daily_budget?)` — update campaign
- `delete_campaign(campaign_id)` — permanently delete
- `copy_campaign(campaign_id)` — duplicate campaign

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
