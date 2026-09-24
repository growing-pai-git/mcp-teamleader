/**
 * Teamleader Projects Tools (next-gen "projects-v2" module)
 *
 * Wraps the new Teamleader Focus projects module. All endpoints live under
 * the `/projects-v2` prefix, e.g. `projects-v2/projects.create`.
 *
 * Covers the full project lifecycle: create, read, update (incl. start/end
 * dates), close/reopen, duplicate, delete, plus managing owners, assignees,
 * customers, deals and quotations.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeamleaderClient } from "../api/client.js";
export declare function registerProjectTools(server: McpServer, client: TeamleaderClient, isAdmin: boolean): void;
//# sourceMappingURL=projects.d.ts.map