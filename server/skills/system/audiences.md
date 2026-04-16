---
name: audiences
description: All audience creation, targeting strategy, and optimization — custom audiences, lookalikes, saved audiences, interest targeting, and audience health management.
layer: system
---

# Audience Operations

## Tools

- `get_custom_audiences()` — list custom audiences
- `get_saved_audiences()` — list saved audiences
- `create_custom_audience(name, subtype, rule)` — create custom audience (video, website, engagement, customer list)
- `targeting_search(query, type)` — search interests, behaviors, demographics
- `get_reach_estimate(targeting_spec)` — estimate audience size
- `get_pages()` — list pages (needed for video/engagement audiences)
- `get_connected_instagram_accounts()` — list IG accounts
- `get_page_videos(page_id)` — list page videos (for video audiences)
- `get_page_posts(page_id)` — list page posts
- `get_ig_posts(ig_account_id)` — list IG posts
- `get_pixels()` — list pixels (for website audiences)
- `get_campaigns()` — list campaigns (for ad engagement audiences)

## Audience Types

| Type | Key Parameters | Best for |
|---|---|---|
| Website visitors | pixel, URL rules, retention 1-180 days | Retargeting warm traffic |
| Video viewers | page, videos, retention 1-365 days | Retargeting engaged viewers |
| Page engagement | page, interaction type, retention | Retargeting social engagers |
| IG engagement | IG account, interaction type, retention | Retargeting IG followers |
| Ad engagement | campaign, retention | Retargeting ad interactors |
| Lead form | page, form, interaction type | Re-engaging leads |
| Customer list | CSV with emails/phones | CRM retargeting + lookalikes |
| Lookalike | source audience, country, 1-10% | Finding new customers |
| Saved audience | location, age, gender, interests | Cold prospecting |

## Strategic Audience Building

### When user says "build me an audience"

Don't just ask for parameters. Think like a strategist:

1. **Understand the goal**: Are they prospecting (new customers) or retargeting (warm traffic)?
2. **Recommend a strategy**, not just an audience:
   - **Prospecting**: "I'd create a 1% lookalike from your best customers + a broad interest audience. Test both."
   - **Retargeting**: "Let's create a funnel: website visitors (last 30 days) who didn't convert, plus video viewers (75% watched) from your recent campaigns."
3. **Check what data they have**: Pixel installed? Customer list? Video views? Choose the best source.
4. **Size matters**: 
   - Lookalike 1% = most similar, smallest (~2M in most countries)
   - Lookalike 5% = broader, cheaper CPM
   - Interest audiences = should be 1M-10M for best delivery
   - Retargeting = even 1,000 people is fine
5. **Always show size estimate** after creation

### Audience Naming Convention

Auto-generate names that are useful in Ads Manager:
- `[Type] — [Source] — [Window] — [Date]`
- Example: `LAL 1% — Purchase Customers — US — 20260416`
- Example: `WCA — All Visitors — 30d — 20260416`
- Example: `Interest — Skincare + Beauty — F25-45`

### Funnel-Based Audience Strategy

Before recommending a funnel, **check what the user actually has**:
1. `get_pixels()` — do they have a pixel? What events are tracked?
2. `get_custom_audiences()` — what audiences already exist?
3. `get_page_videos(page_id)` — do they have video content for video viewer audiences?
4. `get_campaigns()` — are they running any campaigns already?

Then recommend based on what's available:

**If they have a pixel with events:**
- TOF: Lookalike from purchasers/converters (1-3%) + broad Advantage+
- MOF: Website visitors who didn't convert (14-30 days)
- BOF: Add to cart but didn't purchase (7-14 days), lead form openers

**If they have video content but no pixel:**
- TOF: Interest targeting + broad Advantage+
- MOF: Video viewers who watched 50%+ (30-60 days)
- BOF: Video viewers who watched 95% + Page engagers (14 days)

**If they're brand new (nothing):**
- Start with Advantage+ broad targeting (let Meta's algorithm find the right people)
- After 500+ engagements, create lookalikes from engagers
- Don't overthink targeting at the start — creative quality matters more than targeting

**Always tell the user where they are:**
"You have a pixel with purchase events and 3 existing audiences. You're missing a retargeting audience for website visitors who didn't buy — let me create that."

### Overlap Detection

When reviewing audiences:
1. Check if multiple audiences target the same people
2. Warn: "Your 'Website Visitors 30d' and 'Page Engagers 30d' likely overlap by 40-60%. You're bidding against yourself."
3. Suggest: "Exclude Page Engagers from the Website Visitors ad set, or merge them into one audience."

## Visual Blocks for Audiences

Each audience type has a dedicated visual block — use these instead of setupcard:

| Audience type | Block to use |
|---|---|
| Video viewers | `videoaudience` — video selector with pages + IG |
| Page/post engagement | `engagementaudience` — engagement type selector |
| Lookalike | `lookalikeaudience` — source audience + % picker |
| Website visitors | `websiteaudience` — pixel + URL rule builder |
| Saved/interest | `savedaudience` — interest targeting builder |
| Funnel strategy overview | `funnel` — TOF/MOF/BOF visualization |

## Rules

- Auto-generate audience name if user doesn't provide one
- Show audience size estimate after creation
- Warn if audience too small (<1,000) or too large (>50M for retargeting)
- Check for obvious overlaps with existing audiences
- Only ask for what's missing from user's request
- Always recommend exclusions: "Exclude existing customers from prospecting campaigns"
- If brand memory has target audience info, use it to pre-fill targeting
