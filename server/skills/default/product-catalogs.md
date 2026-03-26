---
name: product-catalogs
description: Manage product catalogs, feeds, product sets, and batch operations for dynamic product ads
layer: operational
depends_on: [campaign-advisor]
safety:
  - Validate feed URL before scheduling automatic ingestion
  - Max 5000 products per batch operation
  - Catalog deletion requires explicit "delete" confirmation
  - Run diagnostics after every feed upload or batch operation
  - Verify product data format before batch submission (prices in cents, valid URLs)
---

# Product Catalogs

## API Endpoints

### Catalogs

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalogs?businessId=BIZ_ID` | List catalogs for a business |
| GET | `/api/catalogs/:id` | Get a single catalog |
| POST | `/api/catalogs` | Create a catalog |
| PATCH | `/api/catalogs/:id` | Update a catalog |
| DELETE | `/api/catalogs/:id` | Delete a catalog |

### Products

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalogs/:id/products?limit=50` | List products in a catalog |
| POST | `/api/catalogs/:id/products/batch` | Batch create/update/delete products |

### Product Sets

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalogs/:id/product-sets` | List product sets |
| POST | `/api/catalogs/:id/product-sets` | Create a product set |
| PATCH | `/api/catalogs/product-sets/:id` | Update a product set |
| DELETE | `/api/catalogs/product-sets/:id` | Delete a product set |

### Product Feeds

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/catalogs/:id/feeds` | List feeds |
| POST | `/api/catalogs/:id/feeds` | Create a feed |
| PATCH | `/api/catalogs/feeds/:id` | Update a feed |
| DELETE | `/api/catalogs/feeds/:id` | Delete a feed |

### Diagnostics

```
GET /api/catalogs/:id/diagnostics
```
Returns catalog health info including product errors, warnings, and feed ingestion issues.

## Execution Workflow

Every write operation MUST follow this four-step pattern.

### Creating a Catalog

**Step 1 READ** -- Check existing catalogs.

```
GET /api/catalogs?businessId=BIZ_ID
```

```metrics
Business: BIZ_ID
Existing Catalogs: 2
- "Main Product Catalog" (1,245 products)
- "Holiday Collection" (89 products)
```

**Step 2 CONFIRM** -- Show the catalog configuration.

```steps
Action: CREATE catalog
Business: BIZ_ID
Name: "Summer 2026 Catalog"
Vertical: commerce
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
POST /api/catalogs
```

**Step 4 VERIFY** -- Confirm creation.

```
GET /api/catalogs/:new_id
```

```metrics
Catalog Created Successfully
ID: 789012...
Name: "Summer 2026 Catalog"
Vertical: commerce
Products: 0
```

```quickreplies
["Add products via batch", "Create a product feed", "Create a product set", "View diagnostics"]
```

### Batch Product Operations

**Step 1 READ** -- Fetch current catalog state.

```
GET /api/catalogs/:id
GET /api/catalogs/:id/products?limit=10
```

```metrics
Catalog: "Summer 2026 Catalog"
Current Products: 1,245
```

**Step 2 CONFIRM** -- Show batch summary.

**SAFETY CHECK**: Max 5000 products per batch. If more, split into multiple batches.

```steps
Action: BATCH operation on catalog 789012...
Operations:
  - CREATE: 15 new products
  - UPDATE: 8 products (price changes)
  - DELETE: 3 products (discontinued)
Total items: 26 (within 5000 limit ✓)

Sample creates:
  SKU-101: "Blue T-Shirt" $29.99
  SKU-102: "Red Hoodie" $49.99

Sample updates:
  SKU-045: price $19.99 → $24.99
  SKU-067: availability "in stock" → "out of stock"

Sample deletes:
  SKU-003, SKU-017, SKU-089
```

Verify data format:
- Prices must be in **cents** (2999 = $29.99)
- URLs must be valid and publicly accessible
- Required fields: `retailer_id`, `name`, `price`, `currency`, `availability`, `url`, `image_url`

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
POST /api/catalogs/:id/products/batch
```

**Step 4 VERIFY** -- Run diagnostics to confirm.

```
GET /api/catalogs/:id/diagnostics
GET /api/catalogs/:id/products?limit=10
```

```metrics
Batch Complete
Created: 15 ✓
Updated: 8 ✓
Deleted: 3 ✓
Diagnostics: 0 errors, 0 warnings
Total Products: 1,257
```

```quickreplies
["Run diagnostics", "Create product set", "Submit another batch", "View products"]
```

### Creating a Product Feed

**Step 1 READ** -- Check existing feeds.

```
GET /api/catalogs/:id/feeds
```

```metrics
Catalog: "Summer 2026 Catalog"
Existing Feeds: 1
- "Daily Product Feed" (last fetch: Mar 25, status: OK)
```

**Step 2 CONFIRM** -- Show feed configuration.

**SAFETY CHECK**: Validate the feed URL is accessible before scheduling.

```steps
Action: CREATE product feed
Catalog: 789012...
Name: "Automated Daily Feed"
URL: https://example.com/feed.csv
Schedule: DAILY at 4:00 AM
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Only after user confirms.

```
POST /api/catalogs/:id/feeds
```

**Step 4 VERIFY** -- Confirm feed creation and check initial diagnostics.

```
GET /api/catalogs/:id/feeds
GET /api/catalogs/:id/diagnostics
```

```metrics
Feed Created Successfully
ID: 345678...
Name: "Automated Daily Feed"
Schedule: DAILY at 4:00 AM
Status: pending first fetch
```

```quickreplies
["Run diagnostics", "View products", "Create product set", "Update feed schedule"]
```

### Creating a Product Set

**Step 1 READ** -- Fetch catalog products to understand available filter options.

```
GET /api/catalogs/:id/products?limit=50
```

**Step 2 CONFIRM** -- Show the product set filter.

```steps
Action: CREATE product set
Catalog: 789012...
Name: "Summer Sale Items"
Filter:
  - product_type contains "summer"
  - price_amount less_than 5000 ($50.00)
Estimated match: ~45 products
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** then **Step 4 VERIFY** as above.

### Deleting a Catalog

**Step 1 READ** -- Check catalog contents and linked ads.

```
GET /api/catalogs/:id
GET /api/catalogs/:id/products?limit=5
GET /api/catalogs/:id/product-sets
GET /api/catalogs/:id/feeds
```

```metrics
Catalog: "Holiday Collection"
Products: 89
Product Sets: 3
Feeds: 1
```

**Step 2 CONFIRM** -- Warn about impact.

```steps
⚠ DESTRUCTIVE ACTION
Deleting catalog 789012... will permanently remove:
  - 89 products
  - 3 product sets
  - 1 feed
  - Any dynamic ads using this catalog will stop delivering

Alternative: Remove products individually or archive the catalog.
```

Ask: **"Type 'delete' to confirm permanent deletion."**

**Step 3 EXECUTE** -- Only after explicit "delete" confirmation.

**Step 4 VERIFY** -- Confirm deletion.

## Safety Guardrails

- **Batch size limit**: Max 5000 products per batch operation. For larger catalogs, split into multiple batches and confirm each batch separately.
- **Data validation**: Before submitting a batch, verify prices are in cents (integer), URLs are valid, and all required fields are present (`retailer_id`, `name`, `price`, `currency`, `availability`, `url`, `image_url`).
- **Feed validation**: Validate the feed URL is accessible before scheduling automatic ingestion. A broken URL will silently fail.
- **Post-operation diagnostics**: ALWAYS run `GET /api/catalogs/:id/diagnostics` after batch operations or feed creation to catch issues early.
- **Deletions**: Catalog and product set deletions require explicit "delete" confirmation. Warn about linked dynamic ads that will stop delivering.
- **Bulk batch operations**: If multiple batches needed, max 10 batches in sequence. Confirm each batch before proceeding.

## Quick Reference

### Catalog Hierarchy

```
Catalog
 ├── Products (individual items)
 ├── Product Sets (filtered subgroups for targeting)
 └── Feeds (automated product data import)
```

### Verticals

| Vertical | Use case |
|---|---|
| `commerce` | Standard e-commerce products (most common) |
| `hotels` | Hotel rooms and properties |
| `flights` | Airline flights |
| `destinations` | Travel destinations |
| `home_listings` | Real estate listings |
| `vehicles` | Automotive inventory |

### Required Product Fields (commerce)

| Field | Type | Example |
|---|---|---|
| retailer_id | string | `"SKU-001"` |
| name | string | `"Blue T-Shirt"` |
| price | integer | `2999` (cents = $29.99) |
| currency | string | `"USD"` |
| availability | string | `"in stock"` or `"out of stock"` |
| url | string | Product page URL |
| image_url | string | Product image URL |

### Batch Operation Methods

| Method | Use |
|---|---|
| `CREATE` | Add new products |
| `UPDATE` | Modify existing products (match by `retailer_id`) |
| `DELETE` | Remove products (match by `retailer_id`) |

Example batch body:
```json
{
  "requests": [
    {
      "method": "CREATE",
      "data": {
        "retailer_id": "SKU-001",
        "name": "Blue T-Shirt",
        "price": 2999,
        "currency": "USD",
        "availability": "in stock",
        "url": "https://example.com/product/sku-001",
        "image_url": "https://example.com/images/sku-001.jpg"
      }
    }
  ]
}
```

### Product Set Filter Operators

| Operator | Example |
|---|---|
| `contains` | `{ "product_type": { "contains": "summer" } }` |
| `not_contains` | `{ "product_type": { "not_contains": "winter" } }` |
| `is_any` | `{ "brand": { "is_any": ["Nike", "Adidas"] } }` |
| `is_not_any` | `{ "brand": { "is_not_any": ["Generic"] } }` |
| `less_than` | `{ "price_amount": { "less_than": 5000 } }` |
| `greater_than` | `{ "price_amount": { "greater_than": 1000 } }` |

Combine with `and`/`or` logic for complex filters.

### Feed Schedules

| Interval | Description |
|---|---|
| `HOURLY` | Fetch every hour |
| `DAILY` | Fetch once per day at specified hour |
| `WEEKLY` | Fetch once per week |

Example:
```json
{
  "name": "Daily Product Feed",
  "schedule": {
    "interval": "DAILY",
    "url": "https://example.com/feed.csv",
    "hour": 4
  }
}
```

### Diagnostics Error Types

| Type | Severity | Action |
|---|---|---|
| `FATAL` | Critical | Must fix before products can be used in ads |
| `WARNING` | Medium | Products may underperform or have limited delivery |
| `INFO` | Low | Suggestions for improvement |

Common diagnostic issues:
- Missing required fields (e.g., `image_url` not set)
- Invalid URLs (broken product or image links)
- Price format errors (must be integer cents, not decimal)
- Feed fetch failures (URL returned an error)
