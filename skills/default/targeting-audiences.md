---
name: targeting-audiences
description: Search and configure Facebook ad targeting — find interests, behaviors, demographics, estimate audience reach, validate targeting specs, manage custom audiences, lookalike audiences, and saved audiences. Use this skill whenever the user wants to define who sees their ads, search for targeting interests, estimate audience size, create custom or lookalike audiences, upload customer lists, or save reusable targeting presets. Triggers for audience targeting, interest search, demographic targeting, reach estimation, and audience management.
---

# Targeting & Audiences

## Targeting API Endpoints

### Search Targeting Options

```
GET /api/targeting/search?adAccountId=act_XXX&q=keyword
```

Search for interests, behaviors, and demographics by keyword.

### Browse Targeting Categories

```
GET /api/targeting/browse?adAccountId=act_XXX
```

Browse the full tree of available targeting categories.

### Get Targeting Suggestions

```
GET /api/targeting/suggestions?adAccountId=act_XXX&targeting_list=...
```

Get recommended targeting options based on an existing targeting list.

### Validate a Targeting Spec

```
POST /api/targeting/validate
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "targeting_spec": {
    "geo_locations": { "countries": ["US"] },
    "age_min": 25,
    "age_max": 54,
    "genders": [1],
    "flexible_spec": [
      { "interests": [{ "id": "6003139266461", "name": "Fitness" }] }
    ]
  }
}
```

Returns whether the targeting spec is valid and any errors.

### Reach Estimate

```
POST /api/targeting/reach-estimate
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "targeting_spec": { ... }
}
```

Returns estimated audience size (lower bound, upper bound).

### Delivery Estimate

```
POST /api/targeting/delivery-estimate
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "targeting_spec": { ... },
  "optimization_goal": "OFFSITE_CONVERSIONS"
}
```

Returns estimated daily reach, results, and cost ranges for the given optimization goal.

### Broad Targeting Categories

```
GET /api/targeting/broad-categories?adAccountId=act_XXX
```

List broad targeting categories (top-level interests and behaviors).

### Saved Audiences

```
GET /api/targeting/saved-audiences?adAccountId=act_XXX
```

List all saved audiences for the ad account.

```
POST /api/targeting/saved-audiences
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "My Saved Audience",
  "targeting": { ... }
}
```

Create a reusable saved audience.

```
DELETE /api/targeting/saved-audiences/:id
```

Delete a saved audience by ID.

## Audience API Endpoints

### Custom Audiences

```
GET /api/meta/customaudiences?adAccountId=act_XXX
```

List all custom audiences for the ad account.

```
POST /api/meta/customaudiences
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "My Custom Audience",
  "subtype": "WEBSITE"
}
```

Create a new custom audience. `subtype` is optional and defaults to `WEBSITE`.

```
GET /api/meta/customaudiences/:id
```

Get details for a specific custom audience.

```
PATCH /api/meta/customaudiences/:id
```

Update an existing custom audience (name, description, etc.).

```
DELETE /api/meta/customaudiences/:id
```

Delete a custom audience.

### Customer List Management

**Add users to a custom audience:**

```
POST /api/meta/customaudiences/:id/users
```

**Remove users from a custom audience:**

```
DELETE /api/meta/customaudiences/:id/users
```

Provide hashed PII (see Hashed PII Format below).

### Lookalike Audiences

```
POST /api/meta/lookalike-audiences
```

Body:

```json
{
  "adAccountId": "act_XXX",
  "name": "Lookalike - Top Customers US 1%",
  "origin_audience_id": "23851234567890",
  "lookalike_spec": {
    "type": "similarity",
    "country": "US",
    "ratio": 0.01
  }
}
```

## Reference

### Targeting Spec Structure

```json
{
  "geo_locations": {
    "countries": ["US", "CA"],
    "regions": [{ "key": "4081" }],
    "cities": [{ "key": "2420605", "radius": 25, "distance_unit": "mile" }]
  },
  "age_min": 18,
  "age_max": 65,
  "genders": [0, 1, 2],
  "flexible_spec": [
    {
      "interests": [{ "id": "6003139266461", "name": "Fitness" }],
      "behaviors": [{ "id": "6002714895372", "name": "Engaged Shoppers" }]
    }
  ],
  "exclusions": {
    "interests": [{ "id": "...", "name": "..." }]
  },
  "custom_audiences": [{ "id": "23851234567890" }],
  "excluded_custom_audiences": [{ "id": "23851234567891" }],
  "locales": [6, 24]
}
```

- `genders`: `0` = all, `1` = male, `2` = female.
- `flexible_spec` entries within the same object are OR-ed; separate objects are AND-ed.

### Audience Subtypes

| Subtype     | Description                                      |
| ----------- | ------------------------------------------------ |
| `CUSTOM`    | General custom audience (default)                |
| `WEBSITE`   | Website visitors via Meta Pixel                  |
| `APP`       | App activity audience                            |
| `VIDEO`     | Users who engaged with video content             |
| `LOOKALIKE` | Lookalike audience (created via lookalike endpoint) |

### Lookalike Ratio

The `ratio` field in `lookalike_spec` controls audience size:

- Range: `0.01` to `0.20` (1% to 20% of the country population).
- Lower ratios (0.01-0.03) = higher similarity to the source audience.
- Higher ratios (0.10-0.20) = larger reach but less similarity.
- `type` can be `"similarity"` (optimize for closeness) or `"reach"` (optimize for size).

### Hashed PII Format for Customer Lists

When adding or removing users from a custom audience, provide pre-hashed SHA-256 values:

```json
{
  "schema": ["EMAIL", "PHONE", "FN", "LN"],
  "data": [
    ["a1b2c3...(sha256 of email)", "d4e5f6...(sha256 of phone)", "...", "..."]
  ]
}
```

- Hash each field individually with SHA-256 before sending.
- Normalize before hashing: lowercase emails, remove spaces, use E.164 phone format.
- Supported fields: `EMAIL`, `PHONE`, `FN` (first name), `LN` (last name), `ZIP`, `CT` (city), `ST` (state), `COUNTRY`, `DOBY` (birth year), `DOBM` (birth month), `DOBD` (birth day), `GEN` (gender), `MADID` (mobile advertiser ID).

### Reach Estimate Interpretation

The reach estimate response includes:

- `users_lower_bound` — Conservative estimate of audience size.
- `users_upper_bound` — Optimistic estimate of audience size.
- Use these to gauge whether targeting is too narrow (< 1,000) or too broad (> 100M) for effective delivery.
