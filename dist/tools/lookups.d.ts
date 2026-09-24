/**
 * Teamleader Lookup / Configuration Tools
 *
 * Read-only "list" endpoints that surface the IDs needed by the create/update
 * tools of other modules: users, teams, departments, work types, activity
 * types, tax rates, products, product categories, and deal
 * phases/pipelines/sources/lost reasons, plus custom field definitions.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeamleaderClient } from "../api/client.js";
export declare function registerLookupTools(server: McpServer, client: TeamleaderClient, isAdmin: boolean): void;
//# sourceMappingURL=lookups.d.ts.map