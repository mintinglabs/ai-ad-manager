---
name: automation-rules
description: Create, manage, and configure Meta automated rules — pause/scale/notify based on performance triggers. The execution layer for automation rule management.
layer: system
---

# Automation Rules

## Tools

- `get_ad_rules()` — list all automated rules with status and specs
- `get_ad_rule(rule_id)` — get details of a single rule
- `create_ad_rule(name, evaluation_spec, execution_spec, schedule_spec)` — create a new rule
- `update_ad_rule(rule_id, ...)` — update an existing rule
- `delete_ad_rule(rule_id)` — delete a rule
- `get_ad_rule_history(rule_id)` — view execution history

## Rule Creation Flow

Be conversational — NOT a wizard. Parse what the user already provided.

**Step 1: Understand Intent**
If the user describes what they want (e.g. "pause campaigns with high CPA"), map it directly to a rule config. If vague, show the 6 common templates as options:

```options
{"title":"Choose a rule template","options":[
  {"id":"scale","title":"Scale Winning Ads","desc":"Increase budget +20% when ROAS > 3.0","tag":"Growth"},
  {"id":"pause_roas","title":"Pause Low ROAS","desc":"Stop ads when ROAS drops below 1.2","tag":"Protection"},
  {"id":"fatigue","title":"Anti-Fatigue","desc":"Pause when frequency exceeds 5","tag":"Protection"},
  {"id":"cost_cap","title":"Cost Cap Protection","desc":"Decrease bid when CPA exceeds threshold","tag":"Efficiency"},
  {"id":"cleanup","title":"Nightly Cleanup","desc":"Pause ads with 0 conversions in 7 days","tag":"Cleanup"},
  {"id":"custom","title":"Custom Rule","desc":"Define your own trigger and action","tag":"Advanced"}
]}
```

**Step 2: Collect Missing Info (ONE message, not one-at-a-time)**
Required fields — skip what's already clear from context:
- **What to monitor**: which metric (CPA, ROAS, frequency, spend, CTR, etc.)
- **Threshold**: the trigger value (e.g. CPA > $50, ROAS < 1.2)
- **Action**: what happens (pause, increase budget, decrease bid, notify)
- **Scope**: campaigns, ad sets, or ads (default: all active campaigns)
- **Frequency**: how often to check (default: daily)

**Step 3: Show Confirmation**
Present a setupcard with the complete rule config before executing:

```setupcard
{"title":"Rule Configuration","subtitle":"Review before creating","items":[
  {"label":"Rule Name","value":"Pause High CPA Campaigns","icon":"shield"},
  {"label":"Trigger","value":"CPA > $50 in last 7 days","icon":"target"},
  {"label":"Action","value":"Pause campaign","icon":"sparkles"},
  {"label":"Applies to","value":"All active campaigns","icon":"target"},
  {"label":"Check frequency","value":"Daily","icon":"dollar"}
]}
```

```quickreplies
["Create Rule", "Edit Settings", "Cancel"]
```

**Step 4: Execute**
On confirmation, call `create_ad_rule` with the proper Meta API format.

## Meta API Format Reference

### evaluation_spec
```json
{
  "evaluation_type": "SCHEDULE",
  "filters": [
    {
      "field": "entity_type",
      "value": "CAMPAIGN",
      "operator": "EQUAL"
    },
    {
      "field": "time_preset",
      "value": "LAST_7_DAYS",
      "operator": "EQUAL"
    },
    {
      "field": "spent",
      "value": 0,
      "operator": "GREATER_THAN"
    },
    {
      "field": "cost_per_action_type",
      "value": 5000,
      "operator": "GREATER_THAN"
    }
  ]
}
```

**Important notes on evaluation_spec:**
- `entity_type` filter is REQUIRED: "CAMPAIGN", "ADSET", or "AD"
- `time_preset` filter is REQUIRED: "TODAY", "LAST_3_DAYS", "LAST_7_DAYS", "LAST_14_DAYS", "LAST_30_DAYS", "LIFETIME"
- Currency values are in CENTS (e.g. $50 CPA = 5000)
- Always include a `spent > 0` filter to avoid pausing campaigns that haven't spent yet

### Available filter fields
| Field | Description | Unit |
|-------|-------------|------|
| `spent` | Total spend | cents |
| `cost_per_action_type` | Cost per result (CPA) | cents |
| `impressions` | Total impressions | count |
| `cpm` | Cost per 1000 impressions | cents |
| `cpc` | Cost per click | cents |
| `ctr` | Click-through rate | percentage (e.g. 1.5) |
| `reach` | Unique people reached | count |
| `frequency` | Average times each person saw the ad | decimal |
| `clicks` | Total clicks | count |
| `actions:offsite_conversion.fb_pixel_purchase` | Purchase conversions | count |
| `action_values:offsite_conversion.fb_pixel_purchase` | Purchase value | cents |

### execution_spec

**Pause/Unpause:**
```json
{
  "execution_type": "PAUSE"
}
```

**Change Budget (increase by percentage):**
```json
{
  "execution_type": "CHANGE_BUDGET",
  "execution_options": {
    "field": "daily_budget",
    "value": 20,
    "operator": "INCREASE",
    "unit": "PERCENTAGE"
  }
}
```

**Change Budget (decrease by fixed amount in cents):**
```json
{
  "execution_type": "CHANGE_BUDGET",
  "execution_options": {
    "field": "daily_budget",
    "value": 1000,
    "operator": "DECREASE",
    "unit": "ABSOLUTE"
  }
}
```

**Send Notification:**
```json
{
  "execution_type": "SEND_NOTIFICATION"
}
```

### schedule_spec
```json
{
  "schedule_type": "DAILY"
}
```
Options: `SEMI_HOURLY`, `HOURLY`, `DAILY`, `CUSTOM`

## Common Rule Recipes

### 1. Pause High CPA Campaigns
```
name: "Pause High CPA"
evaluation_spec.filters:
  - entity_type = CAMPAIGN
  - time_preset = LAST_7_DAYS
  - spent > 0
  - cost_per_action_type > [threshold in cents]
execution_spec.execution_type: PAUSE
schedule_spec.schedule_type: DAILY
```

### 2. Scale Winning Ads (ROAS-based)
Note: Meta API doesn't support ROAS as a direct filter field. Instead use purchase value / spend:
```
name: "Scale High Performers"
evaluation_spec.filters:
  - entity_type = CAMPAIGN
  - time_preset = LAST_7_DAYS
  - spent > 5000
  - action_values:offsite_conversion.fb_pixel_purchase > [min_revenue in cents]
execution_spec: CHANGE_BUDGET +20% daily_budget
schedule_spec.schedule_type: DAILY
```

### 3. Anti-Fatigue (High Frequency)
```
name: "Anti-Fatigue Guard"
evaluation_spec.filters:
  - entity_type = ADSET
  - time_preset = LAST_7_DAYS
  - frequency > 5
execution_spec.execution_type: PAUSE
schedule_spec.schedule_type: DAILY
```

### 4. Nightly Cleanup (No Results)
```
name: "Cleanup Zero Results"
evaluation_spec.filters:
  - entity_type = AD
  - time_preset = LAST_7_DAYS
  - spent > 1000
  - impressions > 1000
  - actions:offsite_conversion.fb_pixel_purchase < 1
execution_spec.execution_type: PAUSE
schedule_spec.schedule_type: DAILY
```

### 5. Budget Cap Alert
```
name: "Daily Spend Alert"
evaluation_spec.filters:
  - entity_type = CAMPAIGN
  - time_preset = TODAY
  - spent > [alert_threshold in cents]
execution_spec.execution_type: SEND_NOTIFICATION
schedule_spec.schedule_type: HOURLY
```

## After Creation

1. Confirm rule was created successfully with the rule ID
2. Show the rule summary
3. Offer next actions:

```quickreplies
["View All Rules", "Create Another Rule", "Test Rule Logic", "Back to Dashboard"]
```

## Error Handling

- If `create_ad_rule` fails with permission error → suggest the user check their ad account permissions
- If filter field is invalid → map the user's description to the correct Meta API field name
- Budget/CPA values must be in CENTS — always convert (e.g. user says "$50" → use 5000)
- Always ask for the account's currency context — HKD $50 ≠ USD $50
