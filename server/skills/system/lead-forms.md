---
name: lead-forms
description: Create and manage Meta lead generation forms (Instant Forms) — design questions, privacy policy, thank-you pages, and retrieve submitted leads.
layer: system
---

# Instant Forms (Lead Generation)

## Tools

- `get_lead_forms(page_id)` — list all lead forms for a Facebook page
- `get_lead_form_leads(form_id)` — get leads submitted to a specific form
- `create_lead_form(page_id, name, questions, privacy_policy, thank_you_page)` — create a new lead form

## Prerequisites

Before creating a lead form, you need a Facebook Page ID. Get it via:
1. `get_pages()` — list connected pages
2. Use the page_id from the result

## Lead Form Creation Flow

Be conversational — collect all info in ONE message if possible.

**Step 1: Understand Intent**
If the user is vague, show common form templates:

```options
{"title":"Choose a form template","options":[
  {"id":"contact","title":"Contact Form","desc":"Name, Email, Phone — for general inquiries","tag":"Popular"},
  {"id":"newsletter","title":"Newsletter Signup","desc":"Email only — fast and high conversion","tag":"Simple"},
  {"id":"consultation","title":"Book a Consultation","desc":"Name, Email, Phone + custom question","tag":"Service"},
  {"id":"custom","title":"Custom Form","desc":"Design your own question set","tag":"Advanced"}
]}
```

**Step 2: Collect Required Info**
Ask in ONE message for anything missing:
- **Form name**: descriptive name (e.g. "Spring Sale Lead Form")
- **Questions**: which fields to collect
- **Privacy policy URL**: required by Meta
- **Thank-you page**: title + body text shown after submission

**Step 3: Show Confirmation**

```setupcard
{"title":"Lead Form Configuration","subtitle":"Review before creating","items":[
  {"label":"Form Name","value":"Spring Sale Lead Form","icon":"target"},
  {"label":"Questions","value":"Full Name, Email, Phone","icon":"sparkles"},
  {"label":"Privacy Policy","value":"https://example.com/privacy","icon":"shield"},
  {"label":"Thank You","value":"Thanks! We'll be in touch within 24 hours.","icon":"target"}
]}
```

```quickreplies
["Create Form", "Edit Questions", "Add Custom Question", "Cancel"]
```

**Step 4: Execute**
Call `create_lead_form` with the proper format.

## API Format Reference

### Question Types (Standard Fields)
These are pre-built Meta fields — no custom label needed:
- `{"type": "EMAIL"}` — Email address
- `{"type": "FULL_NAME"}` — Full name
- `{"type": "PHONE"}` — Phone number
- `{"type": "CITY"}` — City
- `{"type": "STATE"}` — State/Province
- `{"type": "ZIP"}` — Postal code
- `{"type": "POST_CODE"}` — Post code
- `{"type": "COUNTRY"}` — Country
- `{"type": "COMPANY_NAME"}` — Company name
- `{"type": "JOB_TITLE"}` — Job title
- `{"type": "DOB"}` — Date of birth
- `{"type": "GENDER"}` — Gender
- `{"type": "MARITAL_STATUS"}` — Marital status
- `{"type": "RELATIONSHIP_STATUS"}` — Relationship status
- `{"type": "MILITARY_STATUS"}` — Military status
- `{"type": "WORK_EMAIL"}` — Work email
- `{"type": "WORK_PHONE_NUMBER"}` — Work phone

### Custom Questions
For custom questions, use:
```json
{
  "type": "CUSTOM",
  "key": "preferred_time",
  "label": "What time works best for a callback?",
  "options": [
    {"key": "morning", "value": "Morning (9am-12pm)"},
    {"key": "afternoon", "value": "Afternoon (12pm-5pm)"},
    {"key": "evening", "value": "Evening (5pm-8pm)"}
  ]
}
```

For open-ended custom questions (no options):
```json
{
  "type": "CUSTOM",
  "key": "additional_info",
  "label": "Anything else you'd like us to know?"
}
```

### Privacy Policy (Required)
```json
{
  "url": "https://example.com/privacy",
  "link_text": "Privacy Policy"
}
```

### Thank You Page
```json
{
  "title": "Thanks for your interest!",
  "body": "We'll contact you within 24 hours."
}
```

### Full Example
```json
{
  "page_id": "123456789",
  "name": "Spring Sale Lead Form",
  "questions": [
    {"type": "FULL_NAME"},
    {"type": "EMAIL"},
    {"type": "PHONE"},
    {"type": "CUSTOM", "key": "budget", "label": "What's your monthly budget?", "options": [
      {"key": "under_1k", "value": "Under $1,000"},
      {"key": "1k_5k", "value": "$1,000 - $5,000"},
      {"key": "over_5k", "value": "Over $5,000"}
    ]}
  ],
  "privacy_policy": {"url": "https://example.com/privacy", "link_text": "Privacy Policy"},
  "thank_you_page": {"title": "Thank you!", "body": "Our team will reach out shortly."}
}
```

## Common Templates

### Contact Form
```
questions: [FULL_NAME, EMAIL, PHONE]
thank_you: "Thanks! We'll be in touch within 24 hours."
```

### Newsletter Signup
```
questions: [EMAIL]
thank_you: "You're subscribed! Check your inbox for a welcome email."
```

### Consultation Booking
```
questions: [FULL_NAME, EMAIL, PHONE, CUSTOM("What service are you interested in?")]
thank_you: "Booking confirmed! We'll call you to finalize the details."
```

### Event Registration
```
questions: [FULL_NAME, EMAIL, PHONE, COMPANY_NAME, JOB_TITLE]
thank_you: "You're registered! See you at the event."
```

## Viewing Leads

When the user asks to see leads or download leads:
1. `get_lead_forms(page_id)` — list forms
2. `get_lead_form_leads(form_id)` — get submitted leads
3. Display leads in a table format with metrics:

```metrics
[{"label":"Total Leads","value":"142","change":"+23%","trend":"up","vs":"vs last 7d"},
 {"label":"Today","value":"8","change":"+3","trend":"up"},
 {"label":"Top Form","value":"Spring Sale","change":"67 leads","trend":"up"}]
```

## After Creation

1. Confirm form was created with form ID
2. Remind: form needs to be linked to a campaign ad set to start collecting leads
3. Offer next actions:

```quickreplies
["View My Forms", "Create Lead Ad Campaign", "Download Leads", "Create Another Form"]
```

## Visual Blocks for Lead Forms

| Scenario | Block to use |
|---|---|
| Form setup confirmation | `setupcard` — form fields + settings |
| Form completion rate analysis | `funnel` — form views → opens → submits |
| Lead form performance KPIs | `metrics` — CPL, completion rate, total leads |
| Compare forms | `comparison` — form A vs form B performance |
