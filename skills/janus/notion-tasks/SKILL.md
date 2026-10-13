---
name: Notion Tasks & Projects
description: Query, create, and update the household's Notion task and project databases (Recurring Tasks, Projects, Consumables). Load BEFORE any Notion tool call for exact property names and people/status filter formats.
channels: [chat, whatsapp, email]
roles: [admin, member]
---

# Notion Tasks & Projects

Use EXACT property names — never guess or abbreviate. Configure database IDs in the
Janus Notion integration settings or environment variables (`NOTION_RECURRING_TASKS_DB`,
`NOTION_PROJECTS_DB`, etc.). Never call `recall_facts` to look up a database ID.

## Tools

- `query_notion_database(database_id, filter?, sorts?)` — read pages.
- `create_notion_page(database_id, properties, children?)` — create a page.
- `update_notion_page(page_id, properties)` — update a page.
- `get_notion_database(database_id)` — discover real property names if a write
  fails with "property not found", then retry.

## Databases (Standard Schemas)

### 1. Recurring Tasks Tracker
- **Title:** "Task"
- **Properties:** "Assignee" (people), "Description" (rich_text), "Due date" (date, lowercase 'd'), "Effort level" (select: 5 mins/10 mins/15 min/30 mins/45 mins/1 hr/1hr 30mins/2 hrs/3 hrs), "Priority" (select: High/Medium/Low), "Recur Interval" (number), "Recur Unit" (select: N/A/Day(s)/Week(s)/Month(s)/Year(s)), "Status" (status: Not started/In progress/Done), "Summary" (rich_text), "Task type" (multi_select), "Past due" (formula, read-only)

### 2. Projects Database
- **Title:** "Project name"
- **Properties:**
  - "Assignee" (people)
  - "Attach file" (files — READ ONLY via API; cannot upload programmatically)
  - "Budget" (number/$)
  - "Due Date" (date — capital 'D')
  - "End value" (number)
  - "% Complete" (number/percent)
  - "Priority" (select: High/Medium/Low)
  - "Start date" (date)
  - "Status" (status: Not started/In progress/Done/Cancelled)
  - "Team" (multi_select or people)
- Notes go in page BODY (children blocks), NOT as a property.

### 3. Consumables & Inventory
- **Title:** "Name"
- **Properties:** "Category" (select), "Condition" (rich_text), "Last ordered date" (date), "Location" (select), "Notes" (rich_text), "Quantity in stock" (number), "Reorder minimum" (number), "Supplier" (select)

## Operations

- If creation fails with "property not found", call `get_notion_database` to
  discover real names, then retry.
- Notes/descriptions in Projects go in the page BODY, NOT as
  a property.
- **Defaults for new projects:** Status = "Not started", Priority = "Medium",
  completion = 0. Never create with just a title.
- **People field format:** `{ "Assignee": { "people": [{ "object": "user", "id": "NOTION-UUID" }] } }`
- **Status filtering:** use `"status"` not `"select"`:
  `{ "property": "Status", "status": { "equals": "In progress" } }`
- **People filtering:** `{ "property": "Assignee", "people": { "contains": "<NOTION-UUID>" } }`
- NEVER say you need "a specific user ID" — the household directory has all UUIDs.
