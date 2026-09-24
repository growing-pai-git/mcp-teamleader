"use strict";
/**
 * Teamleader Events Tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEventTools = registerEventTools;
const zod_1 = require("zod");
function registerEventTools(server, client) {
    // ── List Events ──────────────────────────────────────────────────────────
    server.tool("teamleader_list_events", "List calendar events from Teamleader Focus with optional filtering and pagination", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
        starts_after: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 datetime - events starting after this date"),
        starts_before: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 datetime - events starting before this date"),
        ends_after: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 datetime - events ending after this date"),
        ends_before: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 datetime - events ending before this date"),
    }, async (params) => {
        const body = {};
        if (params.page || params.page_size) {
            body.page = {
                number: params.page ?? 1,
                size: params.page_size ?? 20,
            };
        }
        const filter = {};
        if (params.starts_after)
            filter.starts_after = params.starts_after;
        if (params.starts_before)
            filter.starts_before = params.starts_before;
        if (params.ends_after)
            filter.ends_after = params.ends_after;
        if (params.ends_before)
            filter.ends_before = params.ends_before;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "events.list",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
    // ── Get Event ────────────────────────────────────────────────────────────
    server.tool("teamleader_get_event", "Get detailed information about a specific event", {
        id: zod_1.z.string().describe("The event ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "events.info",
            body: { id: params.id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
    // ── Create Event ─────────────────────────────────────────────────────────
    server.tool("teamleader_create_event", "Create a new calendar event in Teamleader Focus", {
        title: zod_1.z.string().describe("Event title"),
        description: zod_1.z.string().optional().describe("Event description"),
        activity_type_id: zod_1.z.string().describe("Activity type ID"),
        starts_at: zod_1.z.string().describe("Start datetime (ISO 8601)"),
        ends_at: zod_1.z.string().describe("End datetime (ISO 8601)"),
        location: zod_1.z.string().optional().describe("Event location"),
        work_type_id: zod_1.z.string().optional().describe("Work type ID"),
        attendee_ids: zod_1.z
            .array(zod_1.z.object({
            type: zod_1.z.enum(["user", "contact"]).describe("Attendee type"),
            id: zod_1.z.string().describe("Attendee ID"),
        }))
            .optional()
            .describe("List of attendees"),
        links: zod_1.z
            .array(zod_1.z.object({
            type: zod_1.z
                .enum(["company", "contact", "deal"])
                .describe("Linked entity type ('deal' only for meetings/calls)"),
            id: zod_1.z.string().describe("Linked entity ID"),
        }))
            .optional()
            .describe("Entities (company/contact/deal) to link the event to"),
    }, async (params) => {
        const body = {
            title: params.title,
            activity_type_id: params.activity_type_id,
            starts_at: params.starts_at,
            ends_at: params.ends_at,
        };
        if (params.description)
            body.description = params.description;
        if (params.location)
            body.location = params.location;
        if (params.work_type_id)
            body.work_type_id = params.work_type_id;
        if (params.attendee_ids)
            body.attendees = params.attendee_ids;
        if (params.links)
            body.links = params.links;
        const result = await client.request({
            endpoint: "events.create",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(result, null, 2),
                },
            ],
        };
    });
    // ── Update Event ───────────────────────────────────────────────────────────
    server.tool("teamleader_update_event", "Update a calendar event (title, description, times, location, work type, attendees, links).", {
        id: zod_1.z.string().describe("The event ID to update"),
        title: zod_1.z.string().optional().describe("Event title"),
        description: zod_1.z.string().optional().describe("Event description"),
        starts_at: zod_1.z.string().optional().describe("Start datetime (ISO 8601)"),
        ends_at: zod_1.z.string().optional().describe("End datetime (ISO 8601)"),
        location: zod_1.z.string().optional().describe("Event location"),
        work_type_id: zod_1.z.string().optional().describe("Work type ID"),
        attendee_ids: zod_1.z
            .array(zod_1.z.object({
            type: zod_1.z.enum(["user", "contact"]).describe("Attendee type"),
            id: zod_1.z.string().describe("Attendee ID"),
        }))
            .optional()
            .describe("List of attendees (replaces existing)"),
        links: zod_1.z
            .array(zod_1.z.object({
            type: zod_1.z
                .enum(["company", "contact", "deal"])
                .describe("Linked entity type"),
            id: zod_1.z.string().describe("Linked entity ID"),
        }))
            .optional()
            .describe("Entities to link the event to (replaces existing)"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.title)
            body.title = params.title;
        if (params.description !== undefined)
            body.description = params.description;
        if (params.starts_at)
            body.starts_at = params.starts_at;
        if (params.ends_at)
            body.ends_at = params.ends_at;
        if (params.location)
            body.location = params.location;
        if (params.work_type_id)
            body.work_type_id = params.work_type_id;
        if (params.attendee_ids)
            body.attendees = params.attendee_ids;
        if (params.links)
            body.links = params.links;
        await client.request({ endpoint: "events.update", body });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Event ${params.id} updated` }),
                },
            ],
        };
    });
    // ── Cancel Event ───────────────────────────────────────────────────────────
    server.tool("teamleader_cancel_event", "Cancel a calendar event for all attendees.", {
        id: zod_1.z.string().describe("The event ID to cancel"),
    }, { destructiveHint: true }, async (params) => {
        await client.request({ endpoint: "events.cancel", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Event ${params.id} cancelled` }),
                },
            ],
        };
    });
}
//# sourceMappingURL=events.js.map