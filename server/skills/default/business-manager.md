---
name: business-manager
description: Navigate Facebook Business Manager -- view businesses, ad accounts, pages, pixels, and team members with account health analysis
layer: analytical
leads_to: [campaign-manager, tracking-conversions, targeting-audiences, creative-manager]
---

# Business Manager

## API Endpoints

### Ad Accounts

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meta/adaccounts` | List all ad accounts |
| GET | `/api/meta/adaccounts/:id/details` | Get ad account details |
| GET | `/api/meta/adaccounts/:id/activities` | Get account activity log |
| GET | `/api/meta/adaccounts/:id/users` | List users with access |
| GET | `/api/meta/adaccounts/:id/minimum-budgets` | Get minimum budget thresholds |
| GET | `/api/meta/adaccounts/:id/instagram-accounts` | List connected Instagram accounts |

### Businesses

| Method | Endpoint | Description |
|--------|----------|-------------|
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

#### Claim an Ad Account
`POST /api/meta/businesses/:id/claim-adaccount`

Body:
```json
{
  "adaccount_id": "act_123456789"
}
```

### Pages

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meta/pages` | List Facebook Pages the user manages |
| GET | `/api/meta/pages/:id/ads` | List ads associated with a specific Page |

The pages endpoint returns `id`, `name`, `engagement`, `fan_count`, and `category` for each page.

### Batch API

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

Use the batch endpoint to combine multiple Graph API calls into a single HTTP request. Responses are returned in the same order as the requests.

### Ad Library

`GET /api/meta/ad-library?search_terms=...&ad_reached_countries=...`

Search the public Facebook Ad Library for active ads. Required parameters:
- `search_terms` -- keyword or advertiser name
- `ad_reached_countries` -- comma-separated country codes (e.g., `US`, `GB`)

### Reach & Frequency

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

---

## Analysis Workflow

### Account Health Check

Run this workflow whenever a user selects an ad account, asks about account status, or requests an overview. This provides a comprehensive health assessment that identifies issues requiring strategic action.

**Step 1 -- Gather account data using batch API for efficiency:**

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

**Step 2 -- Assess account health across these dimensions:**

```score
| Dimension | Check | Weight |
|-----------|-------|--------|
| Account Status | Is account ACTIVE (status=1)? | Critical |
| Business Verification | Is parent business verified? | High |
| Payment Method | Is funding source valid and not expired? | Critical |
| Pixel Health | Is pixel firing? Last fired < 24h ago? | High |
| Campaign Structure | Are campaigns organized with clear naming? | Medium |
| Active Campaigns | Are there campaigns currently delivering? | Medium |
| Spend Trend | Is spend consistent or erratic? | Low |
```

**Step 3 -- Present findings with structured blocks:**

```metrics
Account Status, Active Campaigns count, Last 7d Spend, Pixel Status
```

```insights
List each issue found with severity: critical / warning / success.
Example: "Account status UNSETTLED -- payment method needs updating" (critical)
Example: "Pixel last fired 3 days ago -- may indicate tracking issues" (warning)
Example: "Business verified, all permissions granted" (success)
```

```steps
Prioritized remediation plan based on severity.
```

```quickreplies
Lead to strategic skills based on findings.
```

### Business Portfolio Overview

When user asks to see their businesses or wants an overview:

1. GET `/api/meta/businesses` -- list all businesses
2. For each business, use batch API to fetch ad accounts, pages, pixels, and Instagram accounts in one call
3. Present as a structured portfolio view

```metrics
Total Businesses, Total Ad Accounts, Active Accounts, Connected Pages
```

Markdown table with business name, verification status, ad account count, and health indicators.

### Team & Permissions Audit

When user asks about team members or access:

1. GET `/api/meta/businesses/:id/users` -- team members
2. GET `/api/meta/businesses/:id/system-users` -- system users
3. GET `/api/meta/adaccounts/:id/users` -- per-account access

```insights
Flag: users with admin access who shouldn't have it, system users without recent activity, missing roles for key functions.
```

---

## Strategic Handoff

After analyzing account health, recommend the appropriate strategic skill based on findings.

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

**Example handoff language:**

- "Your pixel hasn't fired in 48 hours. I recommend loading `tracking-conversions` to diagnose and fix your event setup."
- "You have 3 campaigns with ROAS below 1x. Load `campaign-manager` to review budgets and pause underperformers."
- "Account health looks good. Load `insights-reporting` for a full performance analysis, or `campaign-manager` to optimize active campaigns."

---

## Batch API Usage Patterns

The batch endpoint is the most efficient way to gather account health data. Use these patterns:

### Dashboard Load (single account)

```json
{
  "batch": [
    { "method": "GET", "relative_url": "act_123/campaigns?fields=name,status&limit=10" },
    { "method": "GET", "relative_url": "act_123/insights?fields=spend,impressions&date_preset=last_7d" },
    { "method": "GET", "relative_url": "act_123?fields=account_status,balance" }
  ]
}
```

### Multi-Account Health Check

```json
{
  "batch": [
    { "method": "GET", "relative_url": "act_111?fields=name,account_status,amount_spent" },
    { "method": "GET", "relative_url": "act_222?fields=name,account_status,amount_spent" },
    { "method": "GET", "relative_url": "act_333?fields=name,account_status,amount_spent" }
  ]
}
```

### Full Business Inventory

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

Each batch response includes `code` (HTTP status), `headers`, and `body` (JSON string that must be parsed). Maximum 50 requests per batch call.

---

## Quick Reference

### Account Statuses

| Code | Status | Can Run Ads? | Action Required |
|------|--------|--------------|-----------------|
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

---

## Important Rules

- NEVER say "I'll check" or "Let me look" -- just call the tools and present results
- Use batch API whenever fetching data from multiple entities to minimize round trips
- Always check account_status before recommending any campaign actions -- disabled accounts cannot run ads
- If no businesses found, guide user to create one at business.facebook.com
- If no ad account selected, say: "Select an ad account from the sidebar to get started."
- Always present account health findings with severity levels so users know what to fix first
- End every analysis with quickreplies that lead to the appropriate strategic skill
