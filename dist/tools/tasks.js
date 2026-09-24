"use strict";
/**
 * Teamleader Tasks Tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTaskTools = registerTaskTools;
const zod_1 = require("zod");
function registerTaskTools(server, client) {
    // ── List Tasks ───────────────────────────────────────────────────────────
    server.tool("teamleader_list_tasks", "List tasks from Teamleader Focus with optional filtering and pagination", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
        term: zod_1.z.string().optional().describe("Search term to filter tasks"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Customer type to filter by"),
        customer_id: zod_1.z
            .string()
            .optional()
            .describe("Customer ID to filter by"),
    }, async (params) => {
        const body = {};
        if (params.page || params.page_size) {
            body.page = {
                number: params.page ?? 1,
                size: params.page_size ?? 20,
            };
        }
        const filter = {};
        if (params.term)
            filter.term = params.term;
        if (params.customer_type && params.customer_id) {
            filter.customer = {
                type: params.customer_type,
                id: params.customer_id,
            };
        }
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "tasks.list",
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
    // ── Create Task ──────────────────────────────────────────────────────────
    server.tool("teamleader_create_task", "Create a new task in Teamleader Focus", {
        title: zod_1.z.string().describe("Task title (required by Teamleader)"),
        description: zod_1.z.string().optional().describe("Task description / extra details"),
        due_on: zod_1.z
            .string()
            .describe("Due date (YYYY-MM-DD) - required by Teamleader"),
        deal_id: zod_1.z.string().optional().describe("Link the task to a deal ID"),
        project_id: zod_1.z
            .string()
            .optional()
            .describe("Link the task to a project ID (new projects module)"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Link task to a customer type"),
        customer_id: zod_1.z
            .string()
            .optional()
            .describe("Link task to a customer ID"),
        assignee_type: zod_1.z
            .string()
            .optional()
            .describe("Assignee type (e.g. 'user')"),
        assignee_id: zod_1.z
            .string()
            .optional()
            .describe("Assignee ID"),
        work_type_id: zod_1.z
            .string()
            .optional()
            .describe("Work type ID"),
    }, async (params) => {
        const body = {
            title: params.title,
            due_on: params.due_on,
        };
        if (params.description)
            body.description = params.description;
        if (params.deal_id)
            body.deal_id = params.deal_id;
        if (params.project_id)
            body.project_id = params.project_id;
        if (params.customer_type && params.customer_id) {
            body.customer = {
                type: params.customer_type,
                id: params.customer_id,
            };
        }
        if (params.assignee_type && params.assignee_id) {
            body.assignee = {
                type: params.assignee_type,
                id: params.assignee_id,
            };
        }
        if (params.work_type_id)
            body.work_type_id = params.work_type_id;
        const result = await client.request({
            endpoint: "tasks.create",
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
    // ── Get Task ───────────────────────────────────────────────────────────────
    server.tool("teamleader_get_task", "Get detailed information about a specific task.", {
        id: zod_1.z.string().describe("The task ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "tasks.info",
            body: { id: params.id },
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Update Task ────────────────────────────────────────────────────────────
    server.tool("teamleader_update_task", "Update an existing task (title, description, due date, work type, assignee, customer, linked deal/project).", {
        id: zod_1.z.string().describe("The task ID to update"),
        title: zod_1.z.string().optional().describe("Task title"),
        description: zod_1.z.string().optional().describe("Task description"),
        due_on: zod_1.z.string().optional().describe("Due date (YYYY-MM-DD)"),
        work_type_id: zod_1.z.string().optional().describe("Work type ID"),
        deal_id: zod_1.z.string().optional().describe("Linked deal ID"),
        project_id: zod_1.z.string().optional().describe("Linked project ID (new projects module)"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Customer type (with customer_id)"),
        customer_id: zod_1.z.string().optional().describe("Customer ID (with customer_type)"),
        assignee_type: zod_1.z
            .enum(["user", "team"])
            .optional()
            .describe("Assignee type (with assignee_id)"),
        assignee_id: zod_1.z.string().optional().describe("Assignee ID (with assignee_type)"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.title)
            body.title = params.title;
        if (params.description !== undefined)
            body.description = params.description;
        if (params.due_on)
            body.due_on = params.due_on;
        if (params.work_type_id)
            body.work_type_id = params.work_type_id;
        if (params.deal_id)
            body.deal_id = params.deal_id;
        if (params.project_id)
            body.project_id = params.project_id;
        if (params.customer_type && params.customer_id) {
            body.customer = { type: params.customer_type, id: params.customer_id };
        }
        if (params.assignee_type && params.assignee_id) {
            body.assignee = { type: params.assignee_type, id: params.assignee_id };
        }
        await client.request({ endpoint: "tasks.update", body });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Task ${params.id} updated` }),
                },
            ],
        };
    });
    // ── Complete / Reopen / Delete Task ──────────────────────────────────────
    server.tool("teamleader_complete_task", "Mark a task as complete.", { id: zod_1.z.string().describe("The task ID to complete") }, async (params) => {
        await client.request({ endpoint: "tasks.complete", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Task ${params.id} completed` }),
                },
            ],
        };
    });
    server.tool("teamleader_reopen_task", "Reopen a task that had been marked as complete.", { id: zod_1.z.string().describe("The task ID to reopen") }, async (params) => {
        await client.request({ endpoint: "tasks.reopen", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Task ${params.id} reopened` }),
                },
            ],
        };
    });
    server.tool("teamleader_delete_task", "Delete a task. This is irreversible.", { id: zod_1.z.string().describe("The task ID to delete") }, async (params) => {
        await client.request({ endpoint: "tasks.delete", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Task ${params.id} deleted` }),
                },
            ],
        };
    });
    // ── Schedule Task ────────────────────────────────────────────────────────
    server.tool("teamleader_schedule_task", "Schedule a task in the calendar by giving it a start and end time. Returns the created calendar event.", {
        id: zod_1.z.string().describe("The task ID to schedule"),
        starts_at: zod_1.z.string().describe("Start datetime (ISO 8601, e.g. 2016-02-04T16:00:00+00:00)"),
        ends_at: zod_1.z.string().describe("End datetime (ISO 8601)"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "tasks.schedule",
            body: { id: params.id, starts_at: params.starts_at, ends_at: params.ends_at },
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
}
//# sourceMappingURL=tasks.js.map