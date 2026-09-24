#!/usr/bin/env node

/**
 * MCP Server for Teamleader Focus CRM
 *
 * Provides tools to manage contacts, companies, deals, tasks, events, and invoices
 * via the Teamleader Focus API.
 *
 * Environment variables:
 *   TEAMLEADER_CLIENT_ID     - OAuth2 client ID
 *   TEAMLEADER_CLIENT_SECRET - OAuth2 client secret
 *   TEAMLEADER_REFRESH_TOKEN - OAuth2 refresh token
 *   ADMIN                    - (optional) secret value that unlocks invoice,
 *                              deal, and quotation ("offers") tools. Checked
 *                              against a stored hash, not a plaintext
 *                              comparison. Any other value, or leaving it
 *                              unset, hides those tools entirely for this
 *                              session.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TeamleaderAuth } from "./api/auth.js";
import { TeamleaderClient } from "./api/client.js";
import { registerContactTools } from "./tools/contacts.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerDealTools } from "./tools/deals.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerEventTools } from "./tools/events.js";
import { registerInvoiceTools } from "./tools/invoices.js";
import { registerQuotationTools } from "./tools/quotations.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerLookupTools } from "./tools/lookups.js";
import { registerNoteTools } from "./tools/notes.js";
import { registerTimeTrackingTools } from "./tools/time-tracking.js";

// SHA-256 of the required ADMIN value. Stored hashed (not in plaintext) so
// reading this source file doesn't reveal the actual secret — only someone
// who already knows it can produce a matching hash.
const ADMIN_VALUE_HASH =
  "96ff824d9bbf945c478cb4c8e1ca7ecc51e8b0b658b9616791603a7f652913fb";

function isAdminValue(value: string | undefined): boolean {
  if (!value) return false;
  const candidateHash = createHash("sha256").update(value).digest();
  const expectedHash = Buffer.from(ADMIN_VALUE_HASH, "hex");
  // Constant-time compare so response timing can't leak how much of the
  // guess was correct.
  return (
    candidateHash.length === expectedHash.length &&
    timingSafeEqual(candidateHash, expectedHash)
  );
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Please set it in your MCP configuration.`
    );
  }
  return value;
}

async function main(): Promise<void> {
  // Validate environment
  const clientId = getRequiredEnv("TEAMLEADER_CLIENT_ID");
  const clientSecret = getRequiredEnv("TEAMLEADER_CLIENT_SECRET");
  const refreshToken = getRequiredEnv("TEAMLEADER_REFRESH_TOKEN");

  // Initialize auth and API client
  const auth = new TeamleaderAuth({
    clientId,
    clientSecret,
    refreshToken,
  });
  const client = new TeamleaderClient(auth);

  // Create MCP server
  const server = new McpServer({
    name: "teamleader",
    version: "1.0.1",
    description:
      "MCP server for Teamleader Focus CRM — manage contacts, companies, deals, tasks, events, invoices, and projects.",
  });

  // Only the correct secret unlocks financially sensitive tools (invoices,
  // deals, quotations/offers). Anyone else running this MCP simply never
  // sees those tools registered — they don't exist in their session.
  const isAdmin = isAdminValue(process.env.ADMIN);

  // Register all tools
  registerContactTools(server, client);
  registerCompanyTools(server, client);
  registerTaskTools(server, client);
  registerEventTools(server, client);
  registerProjectTools(server, client, isAdmin);
  registerLookupTools(server, client, isAdmin);
  registerNoteTools(server, client);
  registerTimeTrackingTools(server, client);

  if (isAdmin) {
    registerDealTools(server, client);
    registerInvoiceTools(server, client);
    registerQuotationTools(server, client);
  } else {
    console.error(
      "[teamleader-mcp] ADMIN env var missing or incorrect — deals, invoices, " +
        "and quotations tools are disabled for this session."
    );
  }

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await server.close();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
