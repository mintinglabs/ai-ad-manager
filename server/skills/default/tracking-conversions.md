---
name: tracking-conversions
description: Manage Facebook pixels, send server-side conversion events via Conversions API, and configure custom conversions. Use this skill whenever the user wants to set up tracking, create or manage pixels, send purchase/lead/custom events from their server, test conversion events, or create custom conversion rules. Triggers for pixel setup, conversion tracking, CAPI, server-side events, event testing, and custom conversions.
---

# Tracking & Conversions

## API Endpoints

### Pixels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/pixels?adAccountId=act_XXX` | List all pixels for an ad account |
| GET | `/api/pixels/:id` | Get a single pixel by ID |
| POST | `/api/pixels` | Create a new pixel |
| PATCH | `/api/pixels/:id` | Update pixel settings |
| GET | `/api/pixels/:id/stats` | Get pixel event stats |
| POST | `/api/pixels/:id/events` | Send server-side events via Conversions API |

#### Create Pixel Body

```json
{
  "adAccountId": "act_XXX",
  "name": "My Website Pixel"
}
```

#### Send Events Body (Conversions API)

```json
{
  "data": [
    {
      "event_name": "Purchase",
      "event_time": 1700000000,
      "action_source": "website",
      "user_data": {
        "em": "a]sha256_hashed_email",
        "ph": "sha256_hashed_phone"
      },
      "custom_data": {
        "currency": "USD",
        "value": 49.99
      },
      "event_source_url": "https://example.com/thank-you",
      "event_id": "order_12345"
    }
  ],
  "test_event_code": "TEST12345"
}
```

### Custom Conversions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/conversions?adAccountId=act_XXX` | List custom conversions |
| POST | `/api/conversions` | Create a custom conversion |
| PATCH | `/api/conversions/:id` | Update a custom conversion |
| DELETE | `/api/conversions/:id` | Delete a custom conversion |

#### Create Custom Conversion Body

```json
{
  "adAccountId": "act_XXX",
  "name": "High-Value Purchase",
  "rule": "{\"url\":{\"i_contains\":\"thank-you\"}}",
  "event_source_type": "pixel",
  "default_conversion_value": 100,
  "custom_event_type": "Purchase",
  "pixel": "pixel_id"
}
```

## Standard Event Names

| Event Name | Typical Use |
|------------|-------------|
| `Purchase` | Completed transaction |
| `ViewContent` | Viewed a product or landing page |
| `AddToCart` | Added item to shopping cart |
| `InitiateCheckout` | Started the checkout flow |
| `Lead` | Submitted a lead form |
| `CompleteRegistration` | Finished sign-up or registration |
| `Search` | Used site search |
| `Subscribe` | Subscribed to a service or plan |
| `StartTrial` | Started a free trial |
| `Contact` | Contacted the business |

## user_data Fields

All personally identifiable information must be hashed with SHA256 before sending.

| Field | Description |
|-------|-------------|
| `em` | Email address (SHA256 hashed) |
| `ph` | Phone number (SHA256 hashed) |
| `fn` | First name (SHA256 hashed) |
| `ln` | Last name (SHA256 hashed) |

## custom_data Fields

| Field | Description |
|-------|-------------|
| `currency` | ISO 4217 currency code (e.g., `USD`, `EUR`) |
| `value` | Monetary value of the event |
| `content_ids` | Array of product/content IDs |
| `content_type` | Type of content (`product` or `product_group`) |
| `order_id` | Unique order identifier |

## action_source Types

The `action_source` field tells Facebook where the conversion originated.

| Type | Description |
|------|-------------|
| `website` | Event occurred on a website |
| `app` | Event occurred in a mobile app |
| `phone_call` | Event came from a phone call |
| `chat` | Event came from a messaging conversation |
| `physical_store` | Event occurred in a physical retail location |

## Test Event Code

Use the `test_event_code` parameter to send events to the Test Events tab in Facebook Events Manager without affecting production data. Obtain the code from Events Manager > Test Events.

```json
{
  "data": [ ... ],
  "test_event_code": "TEST12345"
}
```

Test events appear in real time in the Events Manager dashboard and are automatically discarded after 24 hours.

## Deduplication with event_id

When sending the same event from both the browser pixel and the Conversions API, include an identical `event_id` in both payloads. Facebook will deduplicate events that share the same `event_name` and `event_id` within a 48-hour window, preventing double-counting.

```json
{
  "event_name": "Purchase",
  "event_id": "order_12345",
  "event_time": 1700000000,
  "action_source": "website",
  "user_data": { "em": "sha256_hash" },
  "custom_data": { "currency": "USD", "value": 49.99 }
}
```

## Pixel Setup Workflow

When the user asks about pixels, tracking, events, or CAPI, run this guided flow automatically:

### Step 1: Check existing setup
Call `get_pixels` FIRST. Show results as a table:

| Pixel | ID | Status |

If no pixels exist, offer to create one immediately.

### Step 2: Create pixel (if needed)
Call `create_pixel` and show the pixel ID. Provide the base code snippet:

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
```

### Step 3: Offer event setup via options card
Show an options card with common events:
- A: "Track Purchases" (e-commerce)
- B: "Track Leads" (lead gen)
- C: "Track Page Views only" (awareness)
- D: "Custom event"

### Step 4: Send test event
Use `send_conversion_event` with test_event_code. Example:

```json
{
  "data": [{
    "event_name": "Purchase",
    "event_time": 1711000000,
    "action_source": "website",
    "user_data": { "em": ["hashed_email"] },
    "custom_data": { "currency": "USD", "value": 99.99 }
  }],
  "test_event_code": "TEST12345"
}
```

### Step 5: Verify and next steps
Standard events: PageView, ViewContent, AddToCart, InitiateCheckout, Purchase, Lead, CompleteRegistration, Subscribe, Contact, Search

After sending test event, tell user: "Check Events Manager > Test Events to verify the event fired."

### Step 6: Create custom conversion (optional)
If user tracks purchases or leads, offer to create a custom conversion. Call `create_custom_conversion` to define value-based rules (e.g., "High-value purchase > $100").

### Step 7: Always end with next actions

```quickreplies
["Send another test event", "Create custom conversion", "Create website audience from pixel", "Set up campaign with this pixel"]
```
