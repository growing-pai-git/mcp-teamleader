# MCP Teamleader Focus — Growing Pai internal code


A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for **Teamleader Focus CRM**, maintained for internal use at **Growing Pai**. Gives AI assistants (Claude, etc.) the ability to manage contacts, companies, deals, tasks, events, invoices, and timesheets directly in Teamleader.

> **Growing Pai team members:** everyone can use this MCP to manage contacts, companies, tasks, events, projects, notes, lookups, and — importantly — **log their own timesheets/effort** via the Time Tracking tools.

## Features

- 📇 **Contacts** — Full CRUD, tag/untag, link/unlink to companies
- 🏢 **Companies** — Full CRUD, tag/untag
- 💰 **Deals** — List, get, create, update (relink customer, edit description), move phase, win/lose, delete
- 📁 **Projects** — Full next-gen projects module: list, get, create, update (incl. start/end dates), close/reopen, duplicate, delete, manage owners/assignees/customers/deals/quotations
- ✅ **Tasks** — Full CRUD, complete/reopen, schedule to calendar
- 📅 **Events** — List, get, create, update, cancel calendar events
- ⏱️ **Time Tracking** — List, get, add, update, delete timesheet entries — **open to everyone**, this is how you log your hours/effort
- 🧾 **Invoices** — List, get, create, update (draft), book, delete
- 📝 **Quotations** — List, get, create, update, accept, send, download, delete
- 🗒️ **Notes** — List, create, update notes on any entity
- 🔎 **Lookups** — Users, teams, departments, work types, activity types, tax rates, products, product categories, deal phases/pipelines/sources, lost reasons, custom fields
- 🔐 **OAuth2** — Automatic token refresh with rotation support

## Prerequisites

You need a **Teamleader Focus** account with API access:

1. Go to the [Teamleader Marketplace](https://marketplace.focus.teamleader.eu/) or [Developer Portal](https://developer.focus.teamleader.eu/)
2. Register an integration to get your **Client ID** and **Client Secret**
3. Complete the OAuth2 flow to obtain a **Refresh Token** — the included helper script makes this easy:
   ```bash
   TEAMLEADER_CLIENT_ID=... TEAMLEADER_CLIENT_SECRET=... node scripts/get-refresh-token.mjs
   ```
   In case this does not work (Teamleader might block this), you can use the default in Postman.

## Quick Start

### From the ZIP download

1. Unzip the folder anywhere on your machine — dependencies are bundled, no `npm install` needed.
2. Point your MCP client at `dist/index.js` directly (see the Claude Desktop / Cursor examples below, using `node` as the command and the full path to `dist/index.js` as the argument).

### Build your own Claude Desktop bundle (.mcpb)

The extension manifest lives in [`mcpb/manifest.json`](./mcpb/manifest.json). To package your own `growing-pai-teamleader.mcpb` from source:

```bash
npm ci
npm run build
node scripts/build-mcpb.mjs
```

The script stages the bundle in `build/mcpb/` (manifest, compiled `dist/`, production dependencies only) and packs it with the official [`@anthropic-ai/mcpb`](https://www.npmjs.com/package/@anthropic-ai/mcpb) CLI. No credentials are baked in — each installer enters their own in Claude Desktop.

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TEAMLEADER_CLIENT_ID` | ✅ | Your OAuth2 Client ID |
| `TEAMLEADER_CLIENT_SECRET` | ✅ | Your OAuth2 Client Secret |
| `TEAMLEADER_REFRESH_TOKEN` | ✅ | Your OAuth2 Refresh Token |
| `ADMIN` | ❌ | Optional password that unlocks the Deals, Invoices, and Quotations tools. This is a convenience gate, not a real security boundary — see [SECURITY.md](./SECURITY.md). Leave it unset to run without those tools. |
| `TEAMLEADER_DEFAULT_LEDGER_ACCOUNT` | ❌ | Ledger account number used as the default "Rekening" on invoice lines (default: `700000`, Omzet). |
| `TEAMLEADER_DEFAULT_PRODUCT_CATEGORY_ID` | ❌ | Pin the default "Rekening" to a specific product category ID instead of looking it up by ledger number. |

### Invoice lines and the "Rekening"

Every invoice line in Teamleader is booked on a bookkeeping account — the "Rekening" column in the UI, which is a product category behind the scenes. `teamleader_create_invoice` and `teamleader_update_invoice` always fill it in: lines default to the category with ledger account `700000` (Omzet), and a line can override it with its own `product_category_id` (see `teamleader_list_product_categories`). If no category with that ledger account exists, the call fails instead of creating lines without a rekening.

Quotation lines have no equivalent — the Teamleader API does not accept `product_category_id` on `quotations.create` / `quotations.update`. The account is assigned when the quotation becomes an invoice.

### Admin Access

The Deals, Invoices, and Quotations tools are gated behind an optional `ADMIN` password. To unlock them, add `ADMIN=xxx` to your environment (alongside the three OAuth variables above), using whatever value your team has set as the shared secret. Leave it unset to run the server without those tools.

This gate is checked in application code, which runs on your own machine and can be edited — so it's a convenience switch to avoid exposing these tools by accident, **not a real access-control boundary**. Anyone with the unpacked `dist/index.js` could patch the check out, or call the Teamleader API directly with their own OAuth token. The actual security boundary is what the Teamleader token behind `TEAMLEADER_REFRESH_TOKEN` is permitted to do — see [SECURITY.md](./SECURITY.md).

### Claude Desktop

Add to your `claude_desktop_config.json`, use `node` with the full path to `dist/index.js` from the unzipped folder:

```json
{
  "mcpServers": {
    "teamleader": {
      "command": "node",
      "args": ["/full/path/to/mcp-teamleader/dist/index.js"],
      "env": {
        "TEAMLEADER_CLIENT_ID": "YOUR_CLIENT_ID",
        "TEAMLEADER_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "TEAMLEADER_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN",
        "ADMIN": "xxx"
      }
    }
  }
}
```


## Available Tools

### Contacts

| Tool | Description |
|------|-------------|
| `teamleader_list_contacts` | List contacts with filtering (term, tags, updated_since) and pagination |
| `teamleader_get_contact` | Get detailed info for a specific contact |
| `teamleader_create_contact` | Create a new contact (name, email, phone, tags...) |
| `teamleader_update_contact` | Update an existing contact |
| `teamleader_delete_contact` | Delete a contact |
| `teamleader_tag_contact` / `teamleader_untag_contact` | Add/remove tags without overwriting |
| `teamleader_link_contact_to_company` | Link a contact to a company (position, decision maker) |
| `teamleader_update_contact_company_link` | Update an existing contact–company link |
| `teamleader_unlink_contact_from_company` | Unlink a contact from a company |

### Companies

| Tool | Description |
|------|-------------|
| `teamleader_list_companies` | List companies with filtering (term, tags, VAT number) and pagination |
| `teamleader_get_company` | Get detailed info for a specific company |
| `teamleader_create_company` | Create a new company |
| `teamleader_update_company` | Update an existing company |
| `teamleader_delete_company` | Delete a company |
| `teamleader_tag_company` / `teamleader_untag_company` | Add/remove tags without overwriting |

### Deals

| Tool | Description |
|------|-------------|
| `teamleader_list_deals` | List deals with filtering (term, phase, responsible user) and pagination |
| `teamleader_get_deal` | Get detailed info for a specific deal |
| `teamleader_create_deal` | Create a new deal with customer, phase, and estimated value |
| `teamleader_update_deal` | Update a deal: title, **description (summary)**, **relink customer (lead)**, value, closing date, probability, responsible user, source, department |
| `teamleader_move_deal` | Move a deal to a different phase in its pipeline |
| `teamleader_win_deal` | Mark a deal as won |
| `teamleader_lose_deal` | Mark a deal as lost (optional reason and extra info) |
| `teamleader_delete_deal` | Delete a deal |

### Projects

Next-gen projects module (Teamleader `/projects-v2` endpoints). Requires the `projects` OAuth scope.

| Tool | Description |
|------|-------------|
| `teamleader_list_projects` | List projects with filtering (term, status, customer, deal, quotation) and pagination |
| `teamleader_get_project` | Get detailed info for a specific project |
| `teamleader_create_project` | Create a project (only title required); set start/end dates, budgets, billing method, owners, customer, assignee, links |
| `teamleader_update_project` | Update a project incl. adding/changing start & end dates, title, description, budgets |
| `teamleader_close_project` / `teamleader_reopen_project` | Close or reopen a project |
| `teamleader_duplicate_project` | Duplicate a project into a new one |
| `teamleader_delete_project` | Delete a project (requires a delete strategy) |
| `teamleader_assign_project` / `teamleader_unassign_project` | Assign/unassign a user or team |
| `teamleader_add_project_owner` / `teamleader_remove_project_owner` | Add/remove a project owner |
| `teamleader_add_project_customer` / `teamleader_remove_project_customer` | Add/remove a customer |
| `teamleader_add_project_deal` / `teamleader_remove_project_deal` | Link/unlink a deal |
| `teamleader_add_project_quotation` / `teamleader_remove_project_quotation` | Link/unlink a quotation |

### Tasks

| Tool | Description |
|------|-------------|
| `teamleader_list_tasks` | List tasks with filtering and pagination |
| `teamleader_get_task` | Get detailed info for a specific task |
| `teamleader_create_task` | Create a task (title, due date, work type, assignee, customer, deal/project) |
| `teamleader_update_task` | Update a task |
| `teamleader_complete_task` / `teamleader_reopen_task` | Complete or reopen a task |
| `teamleader_delete_task` | Delete a task |
| `teamleader_schedule_task` | Schedule a task into the calendar (creates an event) |

### Events

| Tool | Description |
|------|-------------|
| `teamleader_list_events` | List calendar events with date range filtering |
| `teamleader_get_event` | Get detailed info for a specific event |
| `teamleader_create_event` | Create a new calendar event (attendees, links, work type) |
| `teamleader_update_event` | Update a calendar event |
| `teamleader_cancel_event` | Cancel a calendar event for all attendees |

### Invoices

| Tool | Description |
|------|-------------|
| `teamleader_list_invoices` | List invoices with filtering (status, date range, department) |
| `teamleader_get_invoice` | Get detailed info for a specific invoice |
| `teamleader_create_invoice` | Create a new draft invoice with line items |
| `teamleader_update_invoice` | Update a **draft** invoice: change invoice date, note, customer, payment term, PO number, project, or line items |
| `teamleader_delete_invoice` | Delete an invoice (drafts or the last booked invoice) |
| `teamleader_book_invoice` | Book (finalize) a draft invoice on a given date |

### Quotations

| Tool | Description |
|------|-------------|
| `teamleader_list_quotations` | List quotations with filtering and pagination |
| `teamleader_get_quotation` | Get detailed info for a specific quotation |
| `teamleader_create_quotation` | Create a quotation on a deal with line items |
| `teamleader_update_quotation` | Update a quotation (currency, text, expiry, line items) |
| `teamleader_accept_quotation` | Mark a quotation as accepted |
| `teamleader_send_quotation` | Send quotations by email (CloudSign link via `#LINK`) |
| `teamleader_download_quotation` | Get a temporary PDF download URL |
| `teamleader_delete_quotation` | Delete a quotation |

### Time Tracking

This is how you log timesheets/effort in Teamleader.

Teamleader logs time against a `subject` — one of `company`, `contact`,
`event`, `milestone`, `nextgenTask`, `ticket`, or `todo`. Note there's no
direct `project` or `deal` subject type: to log time "on a project," log it
against a task/todo/milestone that belongs to that project.

| Tool | Description |
|------|-------------|
| `teamleader_list_time_tracking` | List logged time entries, filterable by user, subject, or date range |
| `teamleader_get_time_tracking` | Get detailed info for a specific time-tracking entry |
| `teamleader_add_time_tracking` | Log time (e.g. "1 hour of effort") against a subject — accepts `duration_minutes` or `duration_seconds` |
| `teamleader_update_time_tracking` | Update an existing entry (duration, description, work type, subject, start time, invoiceable) |
| `teamleader_delete_time_tracking` | Delete a time-tracking entry |

### Notes

| Tool | Description |
|------|-------------|
| `teamleader_list_notes` | List notes on a subject (contact, company, deal, project, invoice, quotation...) |
| `teamleader_create_note` | Add a note to a subject (optionally notify users) |
| `teamleader_update_note` | Update a note's content |

### Lookups & Configuration

Read-only helpers that surface the IDs required by the create/update tools.

| Tool | Description |
|------|-------------|
| `teamleader_get_current_user` | Current authenticated user (your user ID, account, timezone) |
| `teamleader_list_users` / `teamleader_list_teams` | Users and teams (for responsible/assignee/owner IDs) |
| `teamleader_list_departments` | Departments / company entities |
| `teamleader_list_work_types` | Work types (for tasks, events, time tracking) |
| `teamleader_list_activity_types` | Activity types (task/meeting/call) for events |
| `teamleader_list_tax_rates` | Tax rates (for invoice/quotation line items) |
| `teamleader_list_products` / `teamleader_get_product` | Products (for line items) |
| `teamleader_list_product_categories` | Product categories |
| `teamleader_list_deal_phases` | Deal phases (for creating/moving deals) |
| `teamleader_list_deal_pipelines` | Deal pipelines (incl. default) |
| `teamleader_list_deal_sources` | Deal sources |
| `teamleader_list_lost_reasons` | Lost reasons (for losing deals) |
| `teamleader_list_custom_field_definitions` | Custom field definitions and options per context |

## Not Yet Covered

The following Teamleader API areas are not (yet) exposed as tools. Ask to add any you need: credit notes, subscriptions, payment terms/methods, commercial & withholding tax discounts, price lists, units of measure, live timers (`timers.*` — start/stop/current, as opposed to the `timeTracking.*` tools which are covered), files, tickets, meetings & calls, mail templates, business types, legacy projects & milestones, and next-gen project **groups/tasks/materials/lines** (only the project entity itself is covered so far).

## Example Prompts

Once configured, you can ask your AI assistant things like:

- *"List all my contacts tagged with 'VIP'"*
- *"Create a new company called Acme Corp with email info@acme.example.com"*
- *"Show me all open deals worth more than €10,000"*
- *"Create a task to follow up with contact John Doe by next Friday"*
- *"Log 1 hour of effort on task X for today"*
- *"How many hours did I log this week?"*
- *"List all unpaid invoices from this month"*
- *"Create a draft invoice for company X with 2 line items"*

## API Reference

This MCP server wraps the [Teamleader Focus API](https://developer.focus.teamleader.eu/). Key details:

- **Base URL:** `https://api.focus.teamleader.eu`
- **Authentication:** OAuth2 with automatic token refresh
- **All endpoints use POST** with JSON body
- **Pagination:** Uses `page.number` and `page.size` parameters

## License
Made with ❤️ by [Growing Pai](https://growingpai.com)
