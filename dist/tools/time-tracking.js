"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTimeTrackingTools = registerTimeTrackingTools;
const zod_1 = require("zod");
const TIME_TRACKING_SUBJECT_TYPES = [
    "company",
    "contact",
    "event",
    "milestone",
    "nextgenTask",
    "ticket",
    "todo",
];
function registerTimeTrackingTools(server, client) {
    // ── List Time Tracking Entries ──────────────────────────────────────────
    server.tool("teamleader_list_time_tracking", "List logged time-tracking entries, optionally filtered by user, subject, or date range.", {
        ids: zod_1.z.array(zod_1.z.string()).optional().describe("Filter by specific time tracking entry IDs"),
        user_id: zod_1.z.string().optional().describe("Filter by the user who logged the time"),
        subject_type: zod_1.z
            .enum(TIME_TRACKING_SUBJECT_TYPES)
            .optional()
            .describe("Type of the entity time was logged against (with subject_id)"),
        subject_id: zod_1.z.string().optional().describe("ID of the entity time was logged against (with subject_type)"),
        started_after: zod_1.z.string().optional().describe("ISO 8601 datetime — only entries started at/after this"),
        started_before: zod_1.z.string().optional().describe("ISO 8601 datetime — only entries started at/before this"),
        ended_after: zod_1.z.string().optional().describe("ISO 8601 datetime — only entries ended at/after this"),
        ended_before: zod_1.z.string().optional().describe("ISO 8601 datetime — only entries ended at/before this"),
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
    }, async (params) => {
        const body = {};
        const filter = {};
        if (params.ids && params.ids.length > 0)
            filter.ids = params.ids;
        if (params.user_id)
            filter.user_id = params.user_id;
        if (params.subject_type && params.subject_id) {
            filter.subject = { type: params.subject_type, id: params.subject_id };
        }
        if (params.started_after)
            filter.started_after = params.started_after;
        if (params.started_before)
            filter.started_before = params.started_before;
        if (params.ended_after)
            filter.ended_after = params.ended_after;
        if (params.ended_before)
            filter.ended_before = params.ended_before;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        if (params.page || params.page_size) {
            body.page = { number: params.page ?? 1, size: params.page_size ?? 20 };
        }
        const result = await client.request({
            endpoint: "timeTracking.list",
            body,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Get Time Tracking Entry ─────────────────────────────────────────────
    server.tool("teamleader_get_time_tracking", "Get detailed information about a specific time-tracking entry.", { id: zod_1.z.string().describe("The time tracking entry ID") }, async (params) => {
        const result = await client.request({
            endpoint: "timeTracking.info",
            body: { id: params.id },
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Add Time Tracking Entry ──────────────────────────────────────────────
    server.tool("teamleader_add_time_tracking", "Log time worked (e.g. '1 hour of effort') against a subject such as a task/todo, ticket, milestone, event, company, or contact. " +
        "Provide either duration_minutes or duration_seconds together with started_at. " +
        "Note: Teamleader splits an entry that spans midnight into multiple entries automatically.", {
        subject_type: zod_1.z
            .enum(TIME_TRACKING_SUBJECT_TYPES)
            .describe("Type of the entity to log time against"),
        subject_id: zod_1.z.string().describe("ID of the entity to log time against"),
        started_at: zod_1.z
            .string()
            .describe("Start of the tracked period, ISO 8601 datetime (e.g. 2026-07-25T09:00:00+02:00)"),
        duration_minutes: zod_1.z
            .number()
            .optional()
            .describe("Duration in minutes (e.g. 60 for one hour). Provide this or duration_seconds."),
        duration_seconds: zod_1.z
            .number()
            .optional()
            .describe("Duration in seconds (e.g. 3600 for one hour). Provide this or duration_minutes."),
        description: zod_1.z.string().optional().describe("Description of the work done"),
        work_type_id: zod_1.z.string().optional().describe("Work type ID (see teamleader_list_work_types)"),
        invoiceable: zod_1.z.boolean().optional().describe("Whether this time is billable to the customer"),
        user_id: zod_1.z
            .string()
            .optional()
            .describe("Log time on behalf of a different user (defaults to the authenticated user)"),
    }, async (params) => {
        const duration = params.duration_seconds ??
            (params.duration_minutes !== undefined ? params.duration_minutes * 60 : undefined);
        if (duration === undefined) {
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify({
                            error: "Provide either duration_minutes or duration_seconds.",
                        }),
                    },
                ],
                isError: true,
            };
        }
        const body = {
            subject: { type: params.subject_type, id: params.subject_id },
            started_at: params.started_at,
            duration,
        };
        if (params.description)
            body.description = params.description;
        if (params.work_type_id)
            body.work_type_id = params.work_type_id;
        if (params.invoiceable !== undefined)
            body.invoiceable = params.invoiceable;
        if (params.user_id)
            body.user_id = params.user_id;
        const result = await client.request({
            endpoint: "timeTracking.add",
            body,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Update Time Tracking Entry ───────────────────────────────────────────
    server.tool("teamleader_update_time_tracking", "Update an existing time-tracking entry (duration, description, work type, subject, started_at, invoiceable).", {
        id: zod_1.z.string().describe("The time tracking entry ID to update"),
        duration_minutes: zod_1.z.number().optional().describe("New duration in minutes"),
        duration_seconds: zod_1.z.number().optional().describe("New duration in seconds"),
        description: zod_1.z.string().optional().describe("New description"),
        work_type_id: zod_1.z.string().optional().describe("New work type ID"),
        subject_type: zod_1.z
            .enum(TIME_TRACKING_SUBJECT_TYPES)
            .optional()
            .describe("New subject type (with subject_id)"),
        subject_id: zod_1.z.string().optional().describe("New subject ID (with subject_type)"),
        started_at: zod_1.z.string().optional().describe("New start datetime, ISO 8601"),
        invoiceable: zod_1.z.boolean().optional().describe("Whether this time is billable"),
    }, async (params) => {
        const body = { id: params.id };
        const duration = params.duration_seconds ??
            (params.duration_minutes !== undefined ? params.duration_minutes * 60 : undefined);
        if (duration !== undefined)
            body.duration = duration;
        if (params.description !== undefined)
            body.description = params.description;
        if (params.work_type_id)
            body.work_type_id = params.work_type_id;
        if (params.subject_type && params.subject_id) {
            body.subject = { type: params.subject_type, id: params.subject_id };
        }
        if (params.started_at)
            body.started_at = params.started_at;
        if (params.invoiceable !== undefined)
            body.invoiceable = params.invoiceable;
        await client.request({ endpoint: "timeTracking.update", body });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Time tracking entry ${params.id} updated` }),
                },
            ],
        };
    });
    // ── Delete Time Tracking Entry ───────────────────────────────────────────
    server.tool("teamleader_delete_time_tracking", "Delete a time-tracking entry. This is irreversible.", { id: zod_1.z.string().describe("The time tracking entry ID to delete") }, { destructiveHint: true }, async (params) => {
        await client.request({ endpoint: "timeTracking.delete", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Time tracking entry ${params.id} deleted` }),
                },
            ],
        };
    });
}
//# sourceMappingURL=time-tracking.js.map