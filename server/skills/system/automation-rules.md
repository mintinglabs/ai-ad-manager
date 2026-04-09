---
name: Automation Rules
description: Plan automation strategies for ad rules, labels, and block lists — auto-pause, auto-scale, and notification rules with safety guardrails
layer: strategic
depends_on: [insights-reporting]
leads_to: [ad-manager]
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

## Strategy Workflow

Interactive rule planning flow. EVERY configuration choice MUST be an ```options card. Max 1-2 sentences between cards.

### Entry Point — What do you want to automate?

```options
{"title":"What would you like to automate?","options":[
  {"id":"RULE","title":"Create Automation Rule","description":"Auto-pause, auto-scale, or notify based on performance"},
  {"id":"TEMPLATE","title":"Use a Rule Template","description":"Start from a proven automation strategy"},
  {"id":"LABEL","title":"Manage Labels","description":"Organize campaigns, ad sets, and ads with tags"},
  {"id":"BLOCKLIST","title":"Publisher Block List","description":"Block specific sites/apps for brand safety"},
  {"id":"VIEW","title":"View Existing Rules","description":"See all active rules and their execution history"}
]}
```

---

### Rule Strategy Templates

When user selects "Use a Rule Template":

```options
{"title":"Choose a rule template","options":[
  {"id":"PAUSE_LOW_ROAS","title":"Auto-Pause Low ROAS","description":"Pause ads/ad sets with ROAS below your target — protects budget"},
  {"id":"PAUSE_HIGH_CPA","title":"Auto-Pause High CPA","description":"Pause ads when cost per action exceeds your limit"},
  {"id":"SCALE_WINNERS","title":"Scale Winners","description":"Increase budget on top-performing ad sets by up to 20%"},
  {"id":"KILL_SWITCH","title":"Spend Kill Switch","description":"Pause everything if daily spend exceeds a safety threshold"},
  {"id":"NOTIFY_PERFORMANCE","title":"Performance Alerts","description":"Get notified when metrics cross your thresholds — no auto-action"},
  {"id":"REACTIVATE","title":"Reactivate Recovered Ads","description":"Unpause ads that have improved after being auto-paused"}
]}
```

---

### Rule Configuration Flow

#### Step 1 — Rule Type

```options
{"title":"What should this rule do?","options":[
  {"id":"PAUSE","title":"Pause","description":"Automatically pause underperforming ads, ad sets, or campaigns"},
  {"id":"UNPAUSE","title":"Reactivate","description":"Unpause objects that meet recovery criteria"},
  {"id":"CHANGE_BUDGET","title":"Adjust Budget","description":"Increase or decrease budget based on performance"},
  {"id":"CHANGE_BID","title":"Adjust Bid","description":"Raise or lower bid amounts"},
  {"id":"NOTIFICATION","title":"Notify Only","description":"Send an alert without taking any action"}
]}
```

#### Step 2 — Apply To

```options
{"title":"What level should this rule apply to?","options":[
  {"id":"CAMPAIGN","title":"Campaigns","description":"Rule evaluates and acts on entire campaigns"},
  {"id":"ADSET","title":"Ad Sets","description":"Rule evaluates and acts on individual ad sets"},
  {"id":"AD","title":"Ads","description":"Rule evaluates and acts on individual ads"}
]}
```

#### Step 3 — Metric Condition

```options
{"title":"Which metric should trigger this rule?","options":[
  {"id":"cost_per_action_type","title":"Cost Per Action (CPA)","description":"Trigger when CPA is above or below a threshold"},
  {"id":"purchase_roas","title":"Return on Ad Spend (ROAS)","description":"Trigger based on revenue vs. spend ratio"},
  {"id":"spend","title":"Total Spend","description":"Trigger when spend crosses a threshold"},
  {"id":"ctr","title":"Click-Through Rate (CTR)","description":"Trigger based on click rate"},
  {"id":"cpm","title":"Cost Per 1000 Impressions (CPM)","description":"Trigger based on impression costs"},
  {"id":"impressions","title":"Impressions","description":"Trigger based on number of impressions"},
  {"id":"frequency","title":"Frequency","description":"Trigger when average frequency is too high"}
]}
```

Then present the operator:

```options
{"title":"Trigger when metric is...","options":[
  {"id":"GREATER_THAN","title":"Greater Than","description":"Trigger when metric exceeds your threshold"},
  {"id":"LESS_THAN","title":"Less Than","description":"Trigger when metric drops below your threshold"},
  {"id":"IN_RANGE","title":"In Range","description":"Trigger when metric is between two values"}
]}
```

Ask for the threshold value.

#### Step 4 — Budget Adjustment (if CHANGE_BUDGET)

```options
{"title":"How should the budget change?","options":[
  {"id":"INCREASE_10","title":"Increase by 10%","description":"Conservative scaling — safe for daily adjustments"},
  {"id":"INCREASE_15","title":"Increase by 15%","description":"Moderate scaling"},
  {"id":"INCREASE_20","title":"Increase by 20% (Maximum)","description":"Aggressive scaling — maximum allowed per rule execution"},
  {"id":"DECREASE_10","title":"Decrease by 10%","description":"Gentle pullback on underperformers"},
  {"id":"DECREASE_20","title":"Decrease by 20%","description":"Stronger pullback"},
  {"id":"SET_AMOUNT","title":"Set to Specific Amount","description":"Set an exact daily or lifetime budget"}
]}
```

#### Step 5 — Schedule

```options
{"title":"How often should this rule run?","options":[
  {"id":"HOURLY","title":"Every Hour","description":"Most responsive — best for spend alerts and kill switches"},
  {"id":"DAILY","title":"Once Per Day","description":"Standard — best for performance-based rules"},
  {"id":"DAILY_AM","title":"Daily at 6 AM","description":"Review overnight performance before the day starts"},
  {"id":"DAILY_PM","title":"Daily at 10 PM","description":"End-of-day performance review"}
]}
```

#### Step 6 — Review & Confirm

Show the complete rule as a summary:

```steps
{"title":"Rule Review — Ready to Create","steps":[
  {"label":"Rule Name","description":"[Auto-generated or user-provided name]","priority":"high"},
  {"label":"Action","description":"[PAUSE / CHANGE_BUDGET / etc.]","priority":"high"},
  {"label":"Applies To","description":"[Campaigns / Ad Sets / Ads]","priority":"high"},
  {"label":"Condition","description":"[Metric] [Operator] [Threshold]","priority":"high"},
  {"label":"Schedule","description":"[HOURLY / DAILY]","priority":"medium"},
  {"label":"Safety","description":"Max 20% budget change · 3-day learning buffer","priority":"medium"}
]}
```

Then ask: **"Should I create this rule?"**

---

### Template Configurations

#### Auto-Pause Low ROAS

Pre-filled config:
- Action: PAUSE
- Applies to: Ad Sets
- Condition: `purchase_roas` LESS_THAN user's target (ask for ROAS floor, suggest 1.5x)
- Schedule: DAILY
- Safety: Only evaluates ad sets with 3+ days of data and $20+ spend

#### Auto-Pause High CPA

Pre-filled config:
- Action: PAUSE
- Applies to: Ads
- Condition: `cost_per_action_type` GREATER_THAN user's CPA cap (ask for max CPA)
- Schedule: DAILY
- Safety: Only evaluates ads with 3+ days of data

#### Scale Winners

Pre-filled config:
- Action: CHANGE_BUDGET (multiply by 1.20 = +20%)
- Applies to: Ad Sets
- Condition: `purchase_roas` GREATER_THAN user's target (ask for min ROAS, suggest 3x)
- Schedule: DAILY
- Safety: Max 20% increase per execution, only ad sets with 3+ days of data

#### Spend Kill Switch

Pre-filled config:
- Action: PAUSE
- Applies to: Campaigns
- Condition: `spend` GREATER_THAN user's daily max (ask for threshold)
- Schedule: HOURLY
- Safety: Immediate action, no learning period required

#### Performance Alerts

Pre-filled config:
- Action: NOTIFICATION
- Applies to: Ad Sets
- Condition: user-selected metric and threshold
- Schedule: DAILY

#### Reactivate Recovered Ads

Pre-filled config:
- Action: UNPAUSE
- Applies to: Ads
- Condition: `purchase_roas` GREATER_THAN user's recovery threshold (ask, suggest 2x)
- Schedule: DAILY
- Safety: Only evaluates ads paused by automation (not manually paused)

---

### Label Management Flow

```options
{"title":"What do you want to do with labels?","options":[
  {"id":"CREATE","title":"Create a Label","description":"Create a new tag for organizing your ads"},
  {"id":"ASSIGN","title":"Assign a Label","description":"Tag a campaign, ad set, or ad"},
  {"id":"VIEW","title":"View All Labels","description":"See all existing labels"},
  {"id":"DELETE","title":"Delete a Label","description":"Remove an unused label"}
]}
```

Label assignment targets:

```options
{"title":"What do you want to label?","options":[
  {"id":"CAMPAIGN","title":"A Campaign","description":"Group campaigns by strategy, region, or client"},
  {"id":"ADSET","title":"An Ad Set","description":"Tag ad sets by audience type or funnel stage"},
  {"id":"AD","title":"An Ad","description":"Mark ads for review, approval, or creative variant"}
]}
```

---

### Block List Flow

```options
{"title":"Publisher block list action","options":[
  {"id":"CREATE","title":"Create Block List","description":"Block specific sites and apps from showing your ads"},
  {"id":"VIEW","title":"View Block Lists","description":"See all existing block lists"},
  {"id":"DELETE","title":"Delete Block List","description":"Remove a block list"}
]}
```

After creation:

```quickreplies
["View all rules", "Create another rule", "Check rule history", "View campaign performance"]
```

## Safety Guardrails

These guardrails are ALWAYS enforced. NEVER allow rules that violate them.

| Guardrail | Limit | Reason |
|-----------|-------|--------|
| Max budget increase per rule execution | 20% | Prevents runaway spend from compounding |
| Min data period before rule triggers | 3 days | Ensures statistical significance past learning phase |
| Min spend before CPA/ROAS evaluation | $20 | Avoids pausing ads with insufficient data |
| Kill switch schedule | HOURLY only | Spend alerts need fast reaction |
| Budget decrease floor | Cannot reduce below Meta minimum | Prevents ad set delivery failure |
| Reactivate rule | Only applies to auto-paused objects | Never overrides manual pauses |

When a user tries to set a budget increase above 20%, show:

> Budget increases are capped at 20% per rule execution to prevent runaway spend. A 20% daily increase compounds to 2.5x in one week. If you need faster scaling, run the rule HOURLY instead of DAILY.

When a user tries to create a rule without a learning period buffer:

> New ad sets need at least 3 days in Meta's learning phase before performance data is reliable. Rules that trigger too early may pause ads before they have a chance to optimize.

## Operational Handoff

After rule strategy is planned and confirmed, execution proceeds through:

- **`ad-manager`** — the rule creation API calls are executed, and the rule begins monitoring
- Load `insights-reporting` to review rule execution history and measure impact

When user confirms the rule plan, proceed directly to API creation. After rule is live, offer to review its impact.

## Quick Reference

### Rule Evaluation Types

| Type | Description |
|------|-------------|
| `SCHEDULE` | Evaluated on a recurring schedule (daily/hourly). Best for budget adjustments and performance reviews. |
| `TRIGGER` | Evaluated when a condition is met in real time. Best for immediate reactions like spend alerts. |

### Execution Types

| Type | Description |
|------|-------------|
| `PAUSE` | Pause the ad, ad set, or campaign |
| `UNPAUSE` | Reactivate a paused object |
| `CHANGE_BUDGET` | Increase or decrease daily/lifetime budget |
| `CHANGE_BID` | Adjust the bid amount |
| `NOTIFICATION` | Send notification without taking action |

### Schedule Types

| Type | Description |
|------|-------------|
| `DAILY` | Rule runs once per day at a specified time |
| `HOURLY` | Rule runs every hour |

### Example Rule JSON — Auto-Pause High CPA

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

### Example Rule JSON — Scale Winners (+20%)

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

### Example Rule JSON — Spend Alert

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
