#!/usr/bin/env node
"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const node_crypto_1 = require("node:crypto");
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const auth_js_1 = require("./api/auth.js");
const client_js_1 = require("./api/client.js");
const contacts_js_1 = require("./tools/contacts.js");
const companies_js_1 = require("./tools/companies.js");
const deals_js_1 = require("./tools/deals.js");
const tasks_js_1 = require("./tools/tasks.js");
const events_js_1 = require("./tools/events.js");
const invoices_js_1 = require("./tools/invoices.js");
const quotations_js_1 = require("./tools/quotations.js");
const projects_js_1 = require("./tools/projects.js");
const lookups_js_1 = require("./tools/lookups.js");
const notes_js_1 = require("./tools/notes.js");
const time_tracking_js_1 = require("./tools/time-tracking.js");
// SHA-256 of the required ADMIN value. Stored hashed (not in plaintext) so
// reading this source file doesn't reveal the actual secret — only someone
// who already knows it can produce a matching hash.
const ADMIN_VALUE_HASH = "96ff824d9bbf945c478cb4c8e1ca7ecc51e8b0b658b9616791603a7f652913fb";
function isAdminValue(value) {
    if (!value)
        return false;
    const candidateHash = (0, node_crypto_1.createHash)("sha256").update(value).digest();
    const expectedHash = Buffer.from(ADMIN_VALUE_HASH, "hex");
    // Constant-time compare so response timing can't leak how much of the
    // guess was correct.
    return (candidateHash.length === expectedHash.length &&
        (0, node_crypto_1.timingSafeEqual)(candidateHash, expectedHash));
}
function getRequiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}. ` +
            `Please set it in your MCP configuration.`);
    }
    return value;
}
async function main() {
    // Validate environment
    const clientId = getRequiredEnv("TEAMLEADER_CLIENT_ID");
    const clientSecret = getRequiredEnv("TEAMLEADER_CLIENT_SECRET");
    const refreshToken = getRequiredEnv("TEAMLEADER_REFRESH_TOKEN");
    // Initialize auth and API client
    const auth = new auth_js_1.TeamleaderAuth({
        clientId,
        clientSecret,
        refreshToken,
    });
    const client = new client_js_1.TeamleaderClient(auth);
    // Create MCP server
    const server = new mcp_js_1.McpServer({
        name: "teamleader",
        version: "1.0.0",
        description: "MCP server for Teamleader Focus CRM — manage contacts, companies, deals, tasks, events, invoices, and projects.",
    });
    // Only the correct secret unlocks financially sensitive tools (invoices,
    // deals, quotations/offers). Anyone else running this MCP simply never
    // sees those tools registered — they don't exist in their session.
    const isAdmin = isAdminValue(process.env.ADMIN);
    // Register all tools
    (0, contacts_js_1.registerContactTools)(server, client);
    (0, companies_js_1.registerCompanyTools)(server, client);
    (0, tasks_js_1.registerTaskTools)(server, client);
    (0, events_js_1.registerEventTools)(server, client);
    (0, projects_js_1.registerProjectTools)(server, client, isAdmin);
    (0, lookups_js_1.registerLookupTools)(server, client, isAdmin);
    (0, notes_js_1.registerNoteTools)(server, client);
    (0, time_tracking_js_1.registerTimeTrackingTools)(server, client);
    if (isAdmin) {
        (0, deals_js_1.registerDealTools)(server, client);
        (0, invoices_js_1.registerInvoiceTools)(server, client);
        (0, quotations_js_1.registerQuotationTools)(server, client);
    }
    else {
        console.error("[teamleader-mcp] ADMIN env var missing or incorrect — deals, invoices, " +
            "and quotations tools are disabled for this session.");
    }
    // Start server
    const transport = new stdio_js_1.StdioServerTransport();
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
//# sourceMappingURL=index.js.map