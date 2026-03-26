---
name: product-catalogs
description: Manage Facebook product catalogs for dynamic product ads (DPA) — create catalogs, manage products, product sets, product feeds, and run diagnostics. Use this skill whenever the user wants to set up dynamic product ads, manage their product feed, create product sets for targeting, batch update products, or troubleshoot catalog issues. Triggers for product catalog, DPA, dynamic ads, product feed, product set, e-commerce ads, and catalog management.
---

# Product Catalogs Skill

## API Endpoints

### Catalogs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalogs?businessId=BIZ_ID` | List catalogs for a business |
| GET | `/api/catalogs/:id` | Get a single catalog |
| POST | `/api/catalogs` | Create a catalog |
| PATCH | `/api/catalogs/:id` | Update a catalog |
| DELETE | `/api/catalogs/:id` | Delete a catalog |

#### Create a Catalog
`POST /api/catalogs`

Body:
```json
{
  "businessId": "BIZ_ID",
  "name": "My Product Catalog",
  "vertical": "commerce"
}
```

### Products

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalogs/:id/products?limit=50` | List products in a catalog |
| POST | `/api/catalogs/:id/products/batch` | Batch create/update/delete products |

#### Batch Product Operations
`POST /api/catalogs/:id/products/batch`

Body:
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
    },
    {
      "method": "UPDATE",
      "data": {
        "retailer_id": "SKU-002",
        "availability": "out of stock"
      }
    },
    {
      "method": "DELETE",
      "data": {
        "retailer_id": "SKU-003"
      }
    }
  ]
}
```

Supported batch methods: `CREATE`, `UPDATE`, `DELETE`.

### Product Sets

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalogs/:id/product-sets` | List product sets |
| POST | `/api/catalogs/:id/product-sets` | Create a product set |
| PATCH | `/api/catalogs/product-sets/:id` | Update a product set |
| DELETE | `/api/catalogs/product-sets/:id` | Delete a product set |

#### Create a Product Set
`POST /api/catalogs/:id/product-sets`

Body:
```json
{
  "name": "Summer Sale Items",
  "filter": {
    "product_type": { "contains": "summer" },
    "price_amount": { "less_than": 5000 }
  }
}
```

Product set filters support operators like `contains`, `not_contains`, `is_any`, `is_not_any`, `less_than`, `greater_than`, and combinations with `and`/`or` logic.

### Product Feeds

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/catalogs/:id/feeds` | List feeds |
| POST | `/api/catalogs/:id/feeds` | Create a feed |
| PATCH | `/api/catalogs/feeds/:id` | Update a feed |
| DELETE | `/api/catalogs/feeds/:id` | Delete a feed |

#### Create a Feed
`POST /api/catalogs/:id/feeds`

Body:
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

Feed schedules support `HOURLY`, `DAILY`, and `WEEKLY` intervals.

### Diagnostics
`GET /api/catalogs/:id/diagnostics`

Returns diagnostic information about catalog health, including product errors, warnings, and feed ingestion issues.

## Verticals

When creating a catalog, `vertical` must be one of:
- **commerce** — standard e-commerce products (most common)
- **hotels** — hotel rooms and properties
- **flights** — airline flights
- **destinations** — travel destinations
- **home_listings** — real estate listings
- **vehicles** — automotive inventory

Each vertical expects different required fields on its products. For example, `commerce` requires `retailer_id`, `name`, `price`, `currency`, `availability`, `url`, and `image_url`, while `hotels` requires `hotel_id`, `name`, `base_price`, and `address`.

## Diagnostics Interpretation

The diagnostics endpoint returns objects with:
- **type** — `FATAL`, `WARNING`, or `INFO`.
- **title** — a short description of the issue.
- **affected_items** — count of products affected.
- **sample_items** — example product IDs with the issue.

Common issues:
- Missing required fields (e.g., `image_url` not set).
- Invalid URLs (broken product or image links).
- Price format errors (must be integer cents, not decimal).
- Feed fetch failures (the scheduled URL returned an error).

Use diagnostics proactively after feed uploads or batch operations to catch problems before they affect ad delivery.
