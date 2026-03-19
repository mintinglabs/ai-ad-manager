---
name: business-manager
description: Navigate Facebook Business Manager — view businesses, ad accounts, pages, pixels, Instagram accounts, team members, and system users. Use this skill whenever the user wants to see their business portfolio, switch between ad accounts, view team permissions, check connected Instagram accounts, claim ad accounts, or manage business assets. Triggers for business manager, ad account selection, team management, asset overview, and account switching.
---

# Business Manager Skill

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

The pages endpoint returns `id`, `name`, `engagement`, `fan_count`, and `category` for each page. Use this to find pages for creating page-linked ad creatives or viewing page-level ad performance.

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

Use the batch endpoint to combine multiple Graph API calls into a single HTTP request. Each item in the `batch` array is an independent request with its own `method` and `relative_url`. Responses are returned in the same order as the requests.

### Ad Library
`GET /api/meta/ad-library?search_terms=...&ad_reached_countries=...`

Search the public Facebook Ad Library for active ads. Useful for competitor research. Required parameters:
- `search_terms` — keyword or advertiser name.
- `ad_reached_countries` — comma-separated country codes (e.g., `US`, `GB`).

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

## Account Statuses

Ad account `account_status` values:
| Code | Status |
|------|--------|
| 1 | ACTIVE |
| 2 | DISABLED |
| 3 | UNSETTLED |
| 7 | PENDING_RISK_REVIEW |
| 8 | PENDING_SETTLEMENT |
| 9 | IN_GRACE_PERIOD |
| 100 | PENDING_CLOSURE |
| 101 | CLOSED |
| 201 | ANY_ACTIVE |
| 202 | ANY_CLOSED |

Only accounts with status `1` (ACTIVE) can create and run ads. Accounts in `3` (UNSETTLED) need a payment method update. Accounts in `7` (PENDING_RISK_REVIEW) are under review by Facebook and cannot serve ads until cleared.

## Business Verification Statuses

Business `verification_status` values:
- **not_verified** — business has not started verification.
- **pending** — verification documents submitted, under review.
- **verified** — business is verified and can access advanced features (e.g., Custom Audiences from customer lists, certain API permissions).

Verification is required for some advertising features and higher API rate limits.

## Batch API Usage

The batch endpoint is valuable when you need to fetch data from multiple entities at once. For example, to load an overview dashboard:

```json
{
  "batch": [
    { "method": "GET", "relative_url": "act_123/campaigns?fields=name,status&limit=10" },
    { "method": "GET", "relative_url": "act_123/insights?fields=spend,impressions&date_preset=last_7d" },
    { "method": "GET", "relative_url": "act_123?fields=account_status,balance" }
  ]
}
```

This returns all three responses in a single round trip. Each response includes a `code` (HTTP status), `headers`, and `body` (JSON string that must be parsed).
