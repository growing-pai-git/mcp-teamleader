/**
 * Dev check: does every invoice line get a "Rekening" (product category)?
 *
 * Spawns the built MCP server over stdio, creates a DRAFT invoice with a line
 * that deliberately omits product_category_id, reads the invoice back to show
 * which bookkeeping account the line landed on, and deletes the draft again.
 *
 * Usage (from the project root):
 *   cp loadEnv.ps1.example loadEnv.ps1   # fill in your own credentials, once
 *   . .\loadEnv.ps1
 *   node scripts/check-rekening-default.mjs
 *
 * Required: TEST_CUSTOMER_ID, TEST_DEPARTMENT_ID, TEST_TAX_RATE_ID — set these
 * to IDs from your own Teamleader account (Settings > Departments, Settings >
 * Tax rates, and any existing company/contact) before running.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

for (const name of [
  "TEAMLEADER_CLIENT_ID",
  "TEAMLEADER_CLIENT_SECRET",
  "TEAMLEADER_REFRESH_TOKEN",
  "ADMIN",
  "TEST_CUSTOMER_ID",
  "TEST_DEPARTMENT_ID",
  "TEST_TAX_RATE_ID",
]) {
  if (!process.env[name]) {
    console.error(`Missing ${name} — run  . .\\loadEnv.ps1  first.`);
    process.exit(1);
  }
}

const DEPARTMENT = process.env.TEST_DEPARTMENT_ID;
const TAX_RATE = process.env.TEST_TAX_RATE_ID;
const CUSTOMER = process.env.TEST_CUSTOMER_ID;

const transport = new StdioClientTransport({
  command: process.execPath,
  args: ["dist/index.js"],
  env: process.env,
});
const client = new Client({ name: "rekening-check", version: "1.0.0" }, {});
await client.connect(transport);

const call = async (name, args) => {
  const res = await client.callTool({ name, arguments: args });
  const text = res.content?.[0]?.text ?? "";
  if (res.isError) throw new Error(`${name} failed: ${text}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

let invoiceId;
try {
  const created = await call("teamleader_create_invoice", {
    customer_type: "company",
    customer_id: CUSTOMER,
    department_id: DEPARTMENT,
    payment_term_type: "after_invoice_date",
    payment_term_days: 30,
    note: "TEST - rekening default check, safe to delete",
    line_items: [
      {
        quantity: 1,
        description: "TEST line without product_category_id",
        unit_price_amount: 1,
        unit_price_currency: "EUR",
        tax_rate_id: TAX_RATE,
      },
    ],
  });
  invoiceId = created?.data?.id;
  console.log("created draft:", invoiceId);

  const info = await call("teamleader_get_invoice", { id: invoiceId });
  for (const line of info?.data?.grouped_lines?.[0]?.line_items ?? []) {
    console.log(
      "line:",
      line.description,
      "\n  rekening:",
      JSON.stringify(line.product_category ?? line.product_category_id ?? null)
    );
  }
} finally {
  if (invoiceId) {
    await call("teamleader_delete_invoice", { id: invoiceId });
    console.log("deleted draft:", invoiceId);
  }
  await client.close();
}
