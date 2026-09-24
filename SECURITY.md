# Access control — team vs. admin

**Goal:** teammates can run projects/tasks/timesheets/CRM but should not see
invoices, deals, or the euros/margins we make on top of them. Only the admin's
install has that.

## How it's enforced

The real enforcement is done **entirely in Teamleader**, via the user behind each
install's OAuth token — not in this MCP code (which runs on each machine and can
be edited):

- **You (admin):** keep the current token — it authenticates as `x@y.com` (Founder, full access).
- **Teammates:** use a token for the restricted **`XXXX`** user, whose Teamleader permissions have financial access turned off.

Because Teamleader applies that user's permissions to every API call, a teammate's
token simply can't read invoices/deals/margins — the API returns `403` or empty
values regardless of what the MCP does.

The MCP also has an optional `ADMIN` env var (see README) that hides the Deals,
Invoices, and Quotations tools unless it's set to the right value. Treat this as a
**convenience gate only** — the check runs in code on the user's own machine, so
anyone with the unpacked `dist/index.js` can trivially patch it out or call the
Teamleader API directly with their own token. It is not a substitute for step 1
below; it just avoids exposing sensitive tools by accident.

## Setup

### 1. Restrict the `XXXX` user in Teamleader
Teamleader → Settings → Users → `XXXX`, give it a permission profile with:
- **no** Invoicing / credit notes
- **no** Deals (or at least no financial visibility)
- **no** "Costs on projects" (so project cost/margin come back empty for them)

Verify by logging into the Teamleader web app as `XXXX` and confirming invoices/deals aren't visible.

### 2. Mint the XXXX refresh token
Register the redirect URI `http://localhost:8123/oauth/callback` on the integration
(Teamleader Marketplace → your integration → settings), then:

```bash
# In a PRIVATE browser window, log in to Teamleader as XXXX first.
TEAMLEADER_CLIENT_ID=<client id> TEAMLEADER_CLIENT_SECRET=<client secret> \
  node scripts/get-refresh-token.mjs
# Open the printed URL in that same browser, approve, copy the printed
# TEAMLEADER_REFRESH_TOKEN.
```

### 3. Configure the installs
- **Your install** (`.env` here): unchanged — your admin token.
- **Teammate installs**: same `CLIENT_ID`/`CLIENT_SECRET`, `TEAMLEADER_REFRESH_TOKEN` = the `XXXX` token.

## Honest limit

This is enforced by the `XXXX` user's Teamleader permissions (step 1). If that
user can still see invoices in the Teamleader web app, its token can too — so
getting step 1 right is the whole job.
