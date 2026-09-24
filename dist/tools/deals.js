"use strict";
/**
 * Teamleader Deals Tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDealTools = registerDealTools;
const zod_1 = require("zod");
function registerDealTools(server, client) {
    // ── List Deals ───────────────────────────────────────────────────────────
    server.tool("teamleader_list_deals", "List deals/opportunities from Teamleader Focus with optional filtering and pagination", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
        term: zod_1.z.string().optional().describe("Search term to filter deals"),
        phase_id: zod_1.z.string().optional().describe("Filter by deal phase ID"),
        responsible_user_id: zod_1.z.string().optional().describe("Filter by responsible user ID"),
        updated_since: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 date - only deals updated after this date"),
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
        if (params.phase_id)
            filter.phase_id = params.phase_id;
        if (params.responsible_user_id)
            filter.responsible_user_id = params.responsible_user_id;
        if (params.updated_since)
            filter.updated_since = params.updated_since;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "deals.list",
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
    // ── Get Deal ─────────────────────────────────────────────────────────────
    server.tool("teamleader_get_deal", "Get detailed information about a specific deal", {
        id: zod_1.z.string().describe("The deal ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "deals.info",
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
    // ── Create Deal ──────────────────────────────────────────────────────────
    server.tool("teamleader_create_deal", "Create a new deal/opportunity in Teamleader Focus", {
        title: zod_1.z.string().describe("Deal title"),
        customer_type: zod_1.z.enum(["contact", "company"]).describe("Customer type"),
        customer_id: zod_1.z.string().describe("Customer ID (contact or company)"),
        phase_id: zod_1.z.string().describe("Deal phase ID"),
        estimated_value_amount: zod_1.z.number().optional().describe("Estimated value amount"),
        estimated_value_currency: zod_1.z
            .string()
            .optional()
            .describe("Currency code (e.g. 'EUR', 'USD')"),
        estimated_closing_date: zod_1.z
            .string()
            .optional()
            .describe("Estimated closing date (YYYY-MM-DD)"),
        estimated_probability: zod_1.z
            .number()
            .optional()
            .describe("Estimated probability (0-1)"),
        responsible_user_id: zod_1.z
            .string()
            .optional()
            .describe("Responsible user ID"),
        department_id: zod_1.z.string().optional().describe("Department ID"),
        source_id: zod_1.z.string().optional().describe("Source ID"),
    }, async (params) => {
        const body = {
            title: params.title,
            lead: {
                customer: {
                    type: params.customer_type,
                    id: params.customer_id,
                },
            },
            phase_id: params.phase_id,
        };
        if (params.estimated_value_amount !== undefined &&
            params.estimated_value_currency) {
            body.estimated_value = {
                amount: params.estimated_value_amount,
                currency: params.estimated_value_currency,
            };
        }
        if (params.estimated_closing_date)
            body.estimated_closing_date = params.estimated_closing_date;
        if (params.estimated_probability !== undefined)
            body.estimated_probability = params.estimated_probability;
        if (params.responsible_user_id)
            body.responsible_user_id = params.responsible_user_id;
        if (params.department_id)
            body.department_id = params.department_id;
        if (params.source_id)
            body.source_id = params.source_id;
        const result = await client.request({
            endpoint: "deals.create",
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
    // ── Update Deal ──────────────────────────────────────────────────────────
    server.tool("teamleader_update_deal", "Update an existing deal in Teamleader Focus. Supports relinking the customer (lead), editing the description (summary), value, closing date, probability, responsible user, source and department. Note: to change the deal's phase use teamleader_move_deal, and to mark it won/lost use teamleader_win_deal / teamleader_lose_deal.", {
        id: zod_1.z.string().describe("The deal ID to update"),
        title: zod_1.z.string().optional().describe("Deal title"),
        summary: zod_1.z
            .string()
            .optional()
            .describe("Deal description / summary (the free-text description shown on the deal)"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Relink the deal to a different customer: customer type. Must be provided together with customer_id."),
        customer_id: zod_1.z
            .string()
            .optional()
            .describe("Relink the deal to a different customer: customer ID (contact or company). Must be provided together with customer_type."),
        contact_person_id: zod_1.z
            .string()
            .optional()
            .describe("Optional contact person ID at the customer (only used when relinking the customer)"),
        estimated_value_amount: zod_1.z.number().optional().describe("Estimated value amount"),
        estimated_value_currency: zod_1.z
            .string()
            .optional()
            .describe("Currency code (e.g. 'EUR', 'USD')"),
        estimated_closing_date: zod_1.z
            .string()
            .optional()
            .describe("Estimated closing date (YYYY-MM-DD)"),
        estimated_probability: zod_1.z
            .number()
            .optional()
            .describe("Estimated probability (0-1)"),
        responsible_user_id: zod_1.z
            .string()
            .optional()
            .describe("Responsible user ID"),
        source_id: zod_1.z.string().optional().describe("Deal source ID"),
        department_id: zod_1.z.string().optional().describe("Department ID"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.title)
            body.title = params.title;
        if (params.summary !== undefined)
            body.summary = params.summary;
        if (params.customer_type && params.customer_id) {
            body.lead = {
                customer: {
                    type: params.customer_type,
                    id: params.customer_id,
                },
                ...(params.contact_person_id
                    ? { contact_person_id: params.contact_person_id }
                    : {}),
            };
        }
        if (params.estimated_value_amount !== undefined &&
            params.estimated_value_currency) {
            body.estimated_value = {
                amount: params.estimated_value_amount,
                currency: params.estimated_value_currency,
            };
        }
        if (params.estimated_closing_date)
            body.estimated_closing_date = params.estimated_closing_date;
        if (params.estimated_probability !== undefined)
            body.estimated_probability = params.estimated_probability;
        if (params.responsible_user_id)
            body.responsible_user_id = params.responsible_user_id;
        if (params.source_id)
            body.source_id = params.source_id;
        if (params.department_id)
            body.department_id = params.department_id;
        await client.request({
            endpoint: "deals.update",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Deal ${params.id} updated`,
                    }),
                },
            ],
        };
    });
    // ── Move Deal (change phase) ─────────────────────────────────────────────
    server.tool("teamleader_move_deal", "Move a deal to a different phase in its pipeline (e.g. advance it to a later stage). Use teamleader_list_deal_phases or the deal's pipeline to find the target phase_id.", {
        id: zod_1.z.string().describe("The deal ID"),
        phase_id: zod_1.z.string().describe("The target deal phase ID to move the deal into"),
    }, async (params) => {
        await client.request({
            endpoint: "deals.move",
            body: { id: params.id, phase_id: params.phase_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Deal ${params.id} moved to phase ${params.phase_id}`,
                    }),
                },
            ],
        };
    });
    // ── Win Deal ─────────────────────────────────────────────────────────────
    server.tool("teamleader_win_deal", "Mark a deal as won. This formally flips the deal's status to 'won' in Teamleader Focus.", {
        id: zod_1.z.string().describe("The deal ID to mark as won"),
    }, async (params) => {
        await client.request({
            endpoint: "deals.win",
            body: { id: params.id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Deal ${params.id} marked as won`,
                    }),
                },
            ],
        };
    });
    // ── Lose Deal ────────────────────────────────────────────────────────────
    server.tool("teamleader_lose_deal", "Mark a deal as lost, optionally with a lost reason and extra info.", {
        id: zod_1.z.string().describe("The deal ID to mark as lost"),
        reason_id: zod_1.z
            .string()
            .optional()
            .describe("Optional lost reason ID (see Teamleader lost reasons)"),
        extra_info: zod_1.z
            .string()
            .optional()
            .describe("Optional extra info explaining why the deal was lost"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.reason_id)
            body.reason_id = params.reason_id;
        if (params.extra_info)
            body.extra_info = params.extra_info;
        await client.request({
            endpoint: "deals.lose",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Deal ${params.id} marked as lost`,
                    }),
                },
            ],
        };
    });
    // ── Delete Deal ────────────────────────────────────────────────────────────
    server.tool("teamleader_delete_deal", "Delete a deal from Teamleader Focus. This is irreversible.", {
        id: zod_1.z.string().describe("The deal ID to delete"),
    }, { destructiveHint: true }, async (params) => {
        await client.request({ endpoint: "deals.delete", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Deal ${params.id} deleted`,
                    }),
                },
            ],
        };
    });
}
//# sourceMappingURL=deals.js.map