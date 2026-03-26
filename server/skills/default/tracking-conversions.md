---
name: tracking-conversions
description: Set up pixels, send server-side conversion events via CAPI, and create custom conversions
layer: operational
depends_on: [campaign-advisor]
safety:
  - Always use test_event_code first before sending production events
  - Verify events appear in Events Manager Test Events tab before going live
  - Include event_id for deduplication when sending from both pixel and CAPI
  - All PII in user_data must be SHA256 hashed before sending
  - Custom conversions require verification before use in optimization
---

# Tracking & Conversions

## API Endpoints

### Pixels

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pixels?adAccountId=act_XXX` | List all pixels for an ad account |
| GET | `/api/pixels/:id` | Get a single pixel |
| POST | `/api/pixels` | Create a new pixel |
| PATCH | `/api/pixels/:id` | Update pixel settings |
| GET | `/api/pixels/:id/stats` | Get pixel event stats |
| POST | `/api/pixels/:id/events` | Send server-side events via Conversions API |

### Custom Conversions

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/conversions?adAccountId=act_XXX` | List custom conversions |
| POST | `/api/conversions` | Create a custom conversion |
| PATCH | `/api/conversions/:id` | Update a custom conversion |
| DELETE | `/api/conversions/:id` | Delete a custom conversion |

## Execution Workflow

Every write operation MUST follow this four-step pattern.

### 7-Step Pixel Setup Wizard

#### Step 1: Check Existing Setup (READ)

```
GET /api/pixels?adAccountId=act_XXX
```

```metrics
Ad Account: act_XXX
Existing Pixels: 1
| Pixel | ID | Last Event |
|-------|----|-----------|
| "My Website Pixel" | 123456789 | Mar 25, 2026 |
```

If no pixels exist, proceed to Step 2. If a pixel exists, skip to Step 3.

#### Step 2: Create Pixel (CONFIRM + EXECUTE)

```steps
Action: CREATE pixel
Ad Account: act_XXX
Name: "My Website Pixel"
```

Ask: **"Should I proceed?"**

After confirmation, create the pixel and provide the base code:

```
POST /api/pixels
```

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
```

```metrics
Pixel Created
ID: 123456789
Name: "My Website Pixel"
Status: Active
```

#### Step 3: Choose Event Type

Present options for the user to select:

```quickreplies
["Track Purchases (e-commerce)", "Track Leads (lead gen)", "Track Page Views only (awareness)", "Custom event"]
```

#### Step 4: Send Test Event (READ + CONFIRM + EXECUTE)

**SAFETY CHECK**: Always use `test_event_code` for the first event. Never send directly to production.

```steps
Action: SEND test event via Conversions API
Pixel: 123456789
Event: Purchase
Test Mode: YES (test_event_code: TEST12345)
Data:
  - event_time: current timestamp
  - action_source: website
  - user_data: hashed email
  - custom_data: currency USD, value $99.99
  - event_source_url: https://example.com/thank-you
  - event_id: test_order_001
```

Ask: **"Should I proceed?"**

After confirmation:

```
POST /api/pixels/:id/events
```

Body:
```json
{
  "data": [{
    "event_name": "Purchase",
    "event_time": 1711000000,
    "action_source": "website",
    "user_data": { "em": ["hashed_email"] },
    "custom_data": { "currency": "USD", "value": 99.99 },
    "event_source_url": "https://example.com/thank-you",
    "event_id": "test_order_001"
  }],
  "test_event_code": "TEST12345"
}
```

#### Step 5: Verify in Events Manager

```metrics
Test Event Sent Successfully
Event: Purchase
Value: $99.99
Test Code: TEST12345
```

Instruct the user: "Check Events Manager > Test Events to verify the event appeared. Test events are automatically discarded after 24 hours."

Ask: **"Did the event appear in Events Manager?"**

#### Step 6: Create Custom Conversion (Optional)

If the user wants value-based rules:

```steps
Action: CREATE custom conversion
Ad Account: act_XXX
Name: "High-Value Purchase"
Rule: URL contains "thank-you"
Event Source: pixel 123456789
Event Type: Purchase
Default Value: $100
```

Ask: **"Should I proceed?"**

```
POST /api/conversions
```

#### Step 7: Next Actions

```quickreplies
["Send another test event", "Create custom conversion", "Create website audience from pixel", "Set up campaign with this pixel", "Remove test_event_code for production"]
```

### Sending Production Events (After Testing)

**Step 1 READ** -- Verify pixel stats show test events were received.

```
GET /api/pixels/:id/stats
```

```metrics
Pixel: 123456789
Recent Events:
| Event | Count (24h) | Last Received |
|-------|-------------|---------------|
| PageView | 1,245 | 2 min ago |
| Purchase (test) | 3 | 1 hour ago |
```

**Step 2 CONFIRM** -- Show what will change.

```steps
Action: SEND production event (no test_event_code)
⚠ This event will count toward ad optimization and reporting.
Pixel: 123456789
Event: Purchase
Value: $49.99
event_id: order_12345 (for deduplication)
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** -- Send without `test_event_code`.

**Step 4 VERIFY** -- Check pixel stats.

```
GET /api/pixels/:id/stats
```

### Creating a Custom Conversion

**Step 1 READ** -- Check existing custom conversions.

```
GET /api/conversions?adAccountId=act_XXX
```

```metrics
Ad Account: act_XXX
Existing Custom Conversions: 2
- "Purchase > $100" (pixel 123456)
- "Lead Form Submit" (pixel 123456)
```

**Step 2 CONFIRM** -- Show the conversion rule.

```steps
Action: CREATE custom conversion
Name: "High-Value Purchase"
Rule: URL contains "thank-you" AND value > 100
Pixel: 123456789
Event: Purchase
Default Value: $100
```

Ask: **"Should I proceed?"**

**Step 3 EXECUTE** then **Step 4 VERIFY** as above.

### Deleting a Custom Conversion

**Step 1 READ** -- Check if the conversion is used in any ad set optimization.

```
GET /api/conversions/:id
```

**Step 2 CONFIRM** -- Warn about impact.

```steps
⚠ DESTRUCTIVE ACTION
Deleting custom conversion "High-Value Purchase"
Any ad sets optimizing for this conversion will lose their optimization target.

Alternative: Update the rule instead of deleting.
```

Ask: **"Type 'delete' to confirm permanent deletion."**

**Step 3 EXECUTE** -- Only after explicit "delete" confirmation.

**Step 4 VERIFY** -- Confirm deletion.

## Safety Guardrails

- **Test before production**: ALWAYS send the first event with `test_event_code`. Never skip testing. Verify in Events Manager before removing the test code.
- **PII hashing**: All personally identifiable information in `user_data` MUST be SHA256 hashed before sending. Never send plain-text emails, phones, or names.
- **Deduplication**: When sending events from both browser pixel and CAPI, include identical `event_id` in both. Meta deduplicates within a 48-hour window.
- **Custom conversion verification**: After creating a custom conversion, verify it is receiving events before using it for ad set optimization.
- **Deletions**: Warn that deleting custom conversions may break ad set optimization. Suggest updating the rule instead.
- **Event timing**: `event_time` must be a Unix timestamp within the last 7 days. Older events are rejected.

## Quick Reference

### Standard Events

| Event Name | Typical Use |
|---|---|
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

### user_data Fields

All PII must be SHA256 hashed before sending.

| Field | Description |
|---|---|
| `em` | Email address (SHA256) |
| `ph` | Phone number (SHA256) |
| `fn` | First name (SHA256) |
| `ln` | Last name (SHA256) |

### custom_data Fields

| Field | Description |
|---|---|
| `currency` | ISO 4217 code (e.g., `USD`, `EUR`) |
| `value` | Monetary value of the event |
| `content_ids` | Array of product/content IDs |
| `content_type` | `product` or `product_group` |
| `order_id` | Unique order identifier |

### action_source Types

| Type | Description |
|---|---|
| `website` | Event on a website |
| `app` | Event in a mobile app |
| `phone_call` | From a phone call |
| `chat` | From a messaging conversation |
| `physical_store` | In a physical location |

### Deduplication

When sending from both pixel and CAPI, include identical `event_id`:

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

Meta deduplicates events with the same `event_name` + `event_id` within 48 hours.

### Custom Conversion Rule Format

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

### Pixel Base Code

```html
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s){...}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'PIXEL_ID');
fbq('track', 'PageView');
</script>
```

Replace `PIXEL_ID` with the actual pixel ID from Step 2.
