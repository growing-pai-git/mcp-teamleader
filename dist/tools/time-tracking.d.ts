/**
 * Teamleader Time Tracking Tools
 *
 * Lets you log hours worked against a subject (a task, ticket, milestone,
 * event, company, or contact). Not gated by ADMIN — every user of this MCP
 * can log their own time.
 *
 * Note: Teamleader's time-tracking `subject.type` is a distinct enum from
 * other Teamleader "subject" fields (e.g. notes) — it does NOT include
 * "deal" or "project" directly. To log time against a project, log it
 * against a task/todo/milestone that belongs to that project instead.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { TeamleaderClient } from "../api/client.js";
export declare function registerTimeTrackingTools(server: McpServer, client: TeamleaderClient): void;
//# sourceMappingURL=time-tracking.d.ts.map