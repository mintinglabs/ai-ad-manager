---
name: automation-rules
description: Create and manage automated ad rules, ad labels, and publisher block lists for Facebook ads. Use this skill whenever the user wants to automate ad management (auto-pause when CPA too high, auto-increase budget when ROAS is good), organize campaigns with labels, or block specific publishers for brand safety. Triggers for automation, rules, auto-pause, auto-budget, labels, tagging, brand safety, and publisher blocking.
---

# Automation Rules, Labels & Block Lists

## API Endpoints

### Rules

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/rules?adAccountId=act_XXX` | List all rules for an ad account |
| GET | `/api/rules/:id` | Get a single rule by ID |
| POST | `/api/rules` | Create a new rule |
| PATCH | `/api/rules/:id` | Update an existing rule |
| DELETE | `/api/rules/:id` | Delete a rule |
| GET | `/api/rules/:id/history` | Get execution history for a rule |

#### Create/Update Rule Body

```json
{
  "adAccountId": "act_XXX",
  "name": "Pause high CPA ads",
  "schedule_spec": { ... },
  "evaluation_spec": { ... },
  "execution_spec": { ... }
}
```

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labels?adAccountId=act_XXX` | List all labels for an ad account |
| POST | `/api/labels` | Create a new label |
| PATCH | `/api/labels/:id` | Rename a label |
| DELETE | `/api/labels/:id` | Delete a label |
| POST | `/api/labels/assign` | Assign a label to an object |

#### Create Label Body

```json
{
  "adAccountId": "act_XXX",
  "name": "Top Performers"
}
```

#### Assign Label Body

```json
{
  "objectId": "campaign_or_adset_or_ad_id",
  "labelId": "label_id"
}
```

Labels can be assigned to campaigns, ad sets, or individual ads.

### Block Lists

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/meta/block-lists?adAccountId=act_XXX` | List all publisher block lists |
| POST | `/api/meta/block-lists` | Create a new block list |
| DELETE | `/api/meta/block-lists/:id` | Delete a block list |

#### Create Block List Body

```json
{
  "adAccountId": "act_XXX",
  "name": "Brand Safety Block List"
}
```

## Rule Evaluation Types

- **SCHEDULE** -- The rule is evaluated on a recurring schedule (e.g., every day at 2 AM). Best for daily budget adjustments or weekly performance reviews.
- **TRIGGER** -- The rule is evaluated when a specific condition is met in real time. Best for immediate reactions like pausing an ad when spend exceeds a threshold.

## Execution Types

| Type | Description |
|------|-------------|
| `PAUSE` | Pause the ad, ad set, or campaign |
| `UNPAUSE` | Reactivate a paused object |
| `CHANGE_BUDGET` | Increase or decrease the daily/lifetime budget |
| `CHANGE_BID` | Adjust the bid amount |
| `NOTIFICATION` | Send a notification without taking action |

## Schedule Types

| Type | Description |
|------|-------------|
| `DAILY` | Rule runs once per day at a specified time |
| `HOURLY` | Rule runs every hour |

## Example Rule Configurations

### Auto-pause when CPA is too high

```json
{
  "adAccountId": "act_XXX",
  "name": "Pause ads with CPA > $50",
  "schedule_spec": {
    "schedule_type": "DAILY"
  },
  "evaluation_spec": {
    "evaluation_type": "SCHEDULE",
    "filters": [
      {
        "field": "cost_per_action_type",
        "value": 50,
        "operator": "GREATER_THAN"
      }
    ]
  },
  "execution_spec": {
    "execution_type": "PAUSE"
  }
}
```

### Auto-increase budget when ROAS is good

```json
{
  "adAccountId": "act_XXX",
  "name": "Increase budget when ROAS > 3x",
  "schedule_spec": {
    "schedule_type": "DAILY"
  },
  "evaluation_spec": {
    "evaluation_type": "SCHEDULE",
    "filters": [
      {
        "field": "purchase_roas",
        "value": 3,
        "operator": "GREATER_THAN"
      }
    ]
  },
  "execution_spec": {
    "execution_type": "CHANGE_BUDGET",
    "execution_options": {
      "field": "daily_budget",
      "value": 1.2,
      "operator": "MULTIPLY"
    }
  }
}
```

### Notify when spend exceeds threshold

```json
{
  "adAccountId": "act_XXX",
  "name": "Alert when daily spend > $500",
  "schedule_spec": {
    "schedule_type": "HOURLY"
  },
  "evaluation_spec": {
    "evaluation_type": "TRIGGER",
    "filters": [
      {
        "field": "spend",
        "value": 500,
        "operator": "GREATER_THAN"
      }
    ]
  },
  "execution_spec": {
    "execution_type": "NOTIFICATION"
  }
}
```

## Label Assignment

Labels can be attached to any of the following object types:

- **Campaigns** -- Group campaigns by strategy, region, or client.
- **Ad Sets** -- Tag ad sets by audience type or funnel stage.
- **Ads** -- Mark individual ads for review, approval status, or creative variant.

Use `POST /api/labels/assign` with the target `objectId` and the `labelId` to create the association.
