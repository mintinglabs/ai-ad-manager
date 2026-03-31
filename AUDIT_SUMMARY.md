# AI Ad Manager — Comprehensive Audit & Missing Features Summary

## 3 Core Modules: Campaign Creation, Data Analysis, Audience Creation

---

## MODULE 1: CAMPAIGN CREATION

### Current 3-Stage Flow
| Stage | What | Status |
|-------|------|--------|
| **Stage 1: Strategy** | Objective, destination, budget, page, CTA | ✅ Working |
| **Stage 2: Audience** | Saved, Custom targeting, or Lookalike | ✅ Working (with handoff to audience agent) |
| **Stage 3: Creative** | Format, media upload, copy variations, preview | ⚠️ Partially working |

### 3 Entry Paths
| Path | Trigger | Status |
|------|---------|--------|
| **Brief** (with materials) | User uploads images/videos first | ✅ Working — auto-detects assets, skips format picker |
| **Boost** (existing post) | "Boost my post" | ⚠️ Works but no post analytics preview |
| **Guided** (no materials) | "Create a campaign" | ✅ Working — full 3-stage wizard |

### Scenarios to Cover

#### Scenario A: Create with uploaded materials
```
User drags images → auto-detect → Stage 1 (objective pre-filled) → Stage 2 (audience) → Stage 3 (copy gen from visual analysis) → Launch
```
**Gaps:** No mixed media (image+video), no resume if upload fails

#### Scenario B: Create from page post
```
User says "boost my post" → post picker → Stage 1 (simplified) → Stage 2 → Skip Stage 3 → Launch
```
**Gaps:** No post performance preview before boosting, no multi-post boost

#### Scenario C: Create from scratch (guided)
```
User says "create campaign" → Stage 1 (full wizard) → Stage 2 → Stage 3 (format picker → upload → copy) → Launch
```
**Gaps:** No "simple mode" for beginners vs "advanced" for pros

#### Scenario D: Bulk from spreadsheet
```
User uploads CSV/Excel → parse campaigns table → validate IDs → create all PAUSED → report
```
**Gaps:** No partial failure resume, no template download, inconsistent objective mapping

#### Scenario E: Clone existing campaign
```
User says "duplicate Campaign X with different audience"
```
**Status:** ❌ NOT IMPLEMENTED — no clone flow

#### Scenario F: Edit existing campaign
```
User says "change budget on Campaign X to $500/day"
```
**Status:** ⚠️ Works via executor but no guided wizard, just direct API call

### Missing Features
- [ ] **Campaign resume** — if user leaves mid-Stage 2, no way to continue
- [ ] **Campaign cloning** — can't duplicate an existing campaign as template
- [ ] **Pre-confirm validation** — Confirm button works even with "Select..." fields
- [ ] **Currency detection** — budget options hardcoded, should detect from account
- [ ] **Audience size estimate** — no reach preview before confirming targeting
- [ ] **Video processing timeout** — if video never becomes ready, flow hangs
- [ ] **Stage rollback** — editing Stage 1 from Stage 3 should reset 2+3, but state management unclear
- [ ] **Ad scheduling/dayparting** — not supported
- [ ] **Placement selection** — always Advantage+, no manual placement option
- [ ] **Auto-fill from message** — "Sales campaign, $500/day, HK" should pre-fill all fields

---

## MODULE 2: DATA ANALYSIS

### Current Scenarios
| Scenario | Trigger | Output |
|----------|---------|--------|
| **A: Overview** | "How are my ads?" | Full funnel + 5 pillars + campaign table |
| **B: Diagnostics** | "Why is cost high?" | Root cause (creative decay vs auction pressure) |
| **C: Capital Loss** | "What should I pause?" | Kill list + savings projection |
| **D: Scaling** | "Which should I scale?" | Winners + budget reallocation plan |

### What Works
- ✅ 4 analysis scenarios with structured output
- ✅ 5-signal diagnostic decision tree (budget leak, creative decay, auction pressure, stable, growth)
- ✅ Multiple chart types (funnel, comparison, budget donut, trend line)
- ✅ KPI cards with week-over-week trends
- ✅ Campaign table with per-campaign diagnostics

### Canvas Panel Problems
| Problem | Impact |
|---------|--------|
| **Content duplication** — canvas shows same as chat | 50% wasted screen space |
| **Auto-opens uninvited** — distracts user | Bad UX |
| **No independent value** — just re-renders chat content | Useless panel |
| **No drill-down** — can't click campaign to see details | Not interactive |
| **No date range picker** — locked to 7d | Inflexible |
| **No export** — can't download data as CSV/PNG | Missing basic feature |
| **No filtering** — can't hide paused campaigns | Missing basic feature |

### Missing Features — HIGH PRIORITY
- [ ] **Interactive charts** — click bar → drill down to that campaign
- [ ] **Date range picker** — 7d, 14d, 30d, custom range
- [ ] **Campaign detail view** — click campaign → see its ads, audiences, creatives, daily trend
- [ ] **Filter controls** — by status, objective, funnel stage
- [ ] **Export** — CSV for data, PNG for charts
- [ ] **Actionable recommendations** — "Pause Campaign X" button tied to executor (not just text)
- [ ] **Analysis → Action chaining** — analyst recommends → auto-route to executor/creative/audience agent

### Missing Features — MEDIUM PRIORITY
- [ ] **Placement/device breakdown** — no mobile vs desktop split
- [ ] **Age/gender breakdown** — no demographic analysis
- [ ] **Creative performance** — no per-ad metrics (need separate query)
- [ ] **Audience overlap visualization** — frequency is shown but not overlap
- [ ] **Prediction** — "This campaign will saturate in 3 days" based on frequency curve
- [ ] **Scheduled reports** — email weekly summary
- [ ] **Alerts** — "Notify when CPA exceeds $50"

### Canvas Panel Redesign Needed
**Current:** Duplicates chat content → useless
**Should be:** Independent dashboard with:
- Charts with interactive drill-down
- Date range + filter controls
- Campaign detail side panel (click to expand)
- Export buttons
- Comparison builder (select 2 campaigns to compare)

---

## MODULE 3: AUDIENCE CREATION

### Current Types & Status
| Type | Modal | Chat | Gaps |
|------|-------|------|------|
| **Video (FB Page)** | ✅ | ✅ VideoAudienceCard | Complete |
| **Video (IG)** | ✅ | ✅ VideoAudienceCard | Complete |
| **Video (Campaign)** | ✅ Modal only | ❌ Not in chat card | Missing in chat |
| **Video (Manual ID)** | ✅ Modal only | ❌ | Missing in chat |
| **Website (Pixel)** | ✅ | ✅ setupcard | Complete |
| **IG Engagement** | ✅ General | ✅ General + post-specific | Modal missing post picker |
| **FB Page Engagement** | ✅ General | ✅ General + post-specific | Modal missing post picker |
| **Ad Engagement** | ❌ NO MODAL TAB | ⚠️ Chat only | Missing modal UI |
| **Lead Form** | ⚠️ No form picker | ✅ Chat has forms | Missing form dropdown |
| **WhatsApp** | ❌ | ❌ | NOT IMPLEMENTED anywhere |
| **Customer List (CSV)** | ✅ Full | ⚠️ No upload in chat | Chat can't accept CSV |
| **Lookalike** | ✅ | ✅ | Complete |
| **Saved (Interest)** | ❌ Redirects to chat | ✅ | Missing modal UI |
| **Bulk creation** | ❌ | ❌ | NOT SUPPORTED |

### Proposed 3-Stage Flow
```
Stage 1: CHOOSE  →  Stage 2: CONFIGURE  →  Stage 3: CONFIRM
```

**Stage 1: Choose audience type**
- Single card with tabs: Retarget | Prospect | Saved
- Under Retarget: Video / Website / IG / Page / Ad / Lead / WhatsApp / Customer List
- One click → go straight to Stage 2

**Stage 2: Configure (self-contained card, no messages)**
- Dropdowns + video/post list that updates instantly
- Like VideoAudienceCard but for ALL types
- Each type has its own card component

**Stage 3: Confirm**
- Summary of what will be created
- One Confirm button → creates audience → shows result

### Missing Features
- [ ] **Campaign-sourced videos** — VideoAudienceCard only has FB Page + IG, not Campaign
- [ ] **Manual video ID input** — not in VideoAudienceCard
- [ ] **Post picker for IG/FB engagement** — need MediaGridCard for posts
- [ ] **Ad engagement audience** — entire flow missing
- [ ] **WhatsApp audience** — documented but not built
- [ ] **Saved audience in modal** — only chat redirect
- [ ] **Bulk audience creation** — create 5 audiences at once
- [ ] **Audience size estimate** — show before confirm
- [ ] **Audience→Campaign connection** — after creating, one-click "Use in new campaign"

---

## CROSS-MODULE SCENARIOS

### Scenario 1: Full Funnel Setup
```
User: "I want to set up a full funnel campaign"
1. Analyst: Analyze existing performance → identify gaps (no TOFU? no retargeting?)
2. Audience: Create 3 audiences (cold/warm/hot)
3. Campaign: Create 3 campaigns (awareness → consideration → conversion)
4. Each with appropriate targeting from audiences created
```
**Status:** ❌ Not supported as a connected flow — user must do each step manually

### Scenario 2: Analysis → Action
```
User: "Analyze my ads and fix the problems"
1. Analyst: Diagnoses creative decay + audience saturation
2. Auto-chain: Creative strategist → suggest new creatives
3. Auto-chain: Audience strategist → build new lookalike
4. Auto-chain: Executor → pause old, launch new
5. Summary: "Changed 5 things, projected savings $2k/week"
```
**Status:** ❌ Each step is manual — user must initiate each agent

### Scenario 3: Smart Campaign from Materials
```
User: Drops 3 images + product description PDF
1. Parse PDF → extract product name, price, features
2. Auto-fill: Objective (Sales), Destination (Website), CTA (Shop Now)
3. Suggest budget based on past performance
4. Auto-generate copy from product description + visual analysis
5. Show preview → Confirm → Launch
```
**Status:** ⚠️ Image upload works, PDF parsing works, but no auto-fill from PDF content

### Scenario 4: Audience-First Campaign
```
User creates video viewers audience → quick reply "Use in campaign"
→ Campaign creation pre-filled with audience targeting
→ Skip Stage 2 (audience already set)
```
**Status:** ⚠️ Quick reply exists but doesn't skip Stage 2 or pre-fill

---

## UX/UI ASSESSMENT

### What's Good
- ✅ Chat-based interface is natural and accessible
- ✅ SetupCard with inline dropdowns is clean
- ✅ VideoAudienceCard is polished and functional
- ✅ Activity log shows real-time tool execution
- ✅ Quick replies guide users to next actions
- ✅ Cantonese language support is excellent

### What Needs Work
| Issue | Module | Fix |
|-------|--------|-----|
| Canvas panel duplicates chat | Analysis | Redesign as independent dashboard |
| No drill-down on any chart | Analysis | Add click handlers → detail view |
| SetupCard dropdowns were sending messages | Campaign | Fixed but needs testing |
| No progress indicator for multi-step flows | All | Add stepper/progress bar |
| No "undo" or "go back" | Campaign | Add "Edit Stage 1" that properly resets later stages |
| Error messages are generic | All | Show specific Meta API error with suggested fix |
| No loading skeleton | All | Show placeholder UI while data loads |
| Mobile layout not optimized | All | Canvas panel shouldn't open on mobile |

---

## SCALABILITY: Adding New User Scenarios

### Current Architecture
Each scenario = skill markdown file + agent instructions + tool definitions + UI components

### To Add a New Scenario (e.g., "Create campaign from competitor ad"):
1. **Skill file**: `server/skills/default/pipeline/competitor-campaign.md`
2. **Instructions**: Add routing rule in `instructions.js` for executor
3. **Tools**: May need new tool (e.g., `get_ad_library_ads`)
4. **UI**: May need new card component if existing ones don't fit
5. **Routing**: Add intent → agent mapping in root agent

### Problem: Too Many Skills = Agent Confusion
- Each skill is ~5-10KB of instructions
- Agent loads 1-2 skills per request
- More skills = more chance of wrong routing
- **Recommendation**: Consolidate skills by module, not by micro-workflow

### Better Architecture for Scale
```
Module Skills (consolidated):
- campaign-creation.md — ALL campaign scenarios (brief, boost, guided, bulk, clone)
- data-analysis.md — ALL analysis scenarios (overview, diagnostics, losses, scaling)
- audience-creation.md — ALL audience types (video, website, IG, page, lookalike, saved)

Scenario Routing:
- Each skill has scenario router at top
- Agent picks scenario based on intent
- Shared components reused across scenarios
- New scenario = add section to existing skill, not new file
```

---

## ACTION PLAN (Priority Order)

### Phase 1: Fix Critical Gaps (Must-Have for Demo)
1. ✅ VideoAudienceCard — DONE
2. [ ] Test campaign creation end-to-end (all 3 paths)
3. [ ] Test audience creation for all types
4. [ ] Fix canvas panel — stop auto-open, show independent content
5. [ ] Add date range picker to analysis

### Phase 2: Complete Missing Scenarios
6. [ ] Add Campaign source + Manual ID to VideoAudienceCard
7. [ ] Build post picker for IG/FB Page engagement audiences
8. [ ] Add ad engagement audience flow
9. [ ] Implement audience→campaign pre-fill connection
10. [ ] Add campaign cloning

### Phase 3: UX Polish
11. [ ] Redesign canvas as interactive dashboard
12. [ ] Add drill-down on charts and tables
13. [ ] Add export (CSV/PNG)
14. [ ] Add progress stepper for multi-stage flows
15. [ ] Add pre-confirm validation (block if required fields missing)

### Phase 4: Advanced Scenarios
16. [ ] Analysis → Action auto-chaining
17. [ ] Full funnel setup wizard
18. [ ] Smart campaign from PDF materials
19. [ ] Bulk audience creation
20. [ ] Scheduled reports / alerts
