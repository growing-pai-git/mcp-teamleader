"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerProjectTools = registerProjectTools;
const zod_1 = require("zod");
const PROJECT_COLORS = [
    "#00B2B2",
    "#008A8C",
    "#992600",
    "#ED9E00",
    "#D157D3",
    "#A400B2",
    "#0071F2",
    "#004DA6",
    "#64788F",
    "#C0C0C4",
    "#82828C",
    "#1A1C20",
];
// Allowlist of fields safe to show non-admins. This is deliberately an
// allowlist, not a blocklist of known money fields: Teamleader's actual API
// response is raw JSON and may carry fields our `Project` type doesn't know
// about (e.g. an org-specific custom field like "Contract Value" configured
// in the Teamleader account, or a field Teamleader adds to the API later).
// A blocklist only strips fields we thought to name; an allowlist strips
// everything else by default, which is the safe failure direction here.
//
// Hours/time budget/time tracked are intentionally kept — non-admins are
// allowed to see effort, just not money. Everything monetary (external_budget,
// internal_budget, price, fixed_price, cost, margin) and anything unknown
// (including custom fields) is dropped.
const PROJECT_SAFE_FIELDS = [
    "id",
    "project_key",
    "title",
    "description",
    "status",
    "billing_method",
    "time_budget",
    "time_tracked",
    "start_date",
    "end_date",
    "purchase_order_number",
    "company_entity",
    "owners",
    "color",
    "assignees",
    "customers",
    "deals",
    "quotations",
];
function redactForNonAdmin(project) {
    const clean = {};
    for (const field of PROJECT_SAFE_FIELDS) {
        if (field in project) {
            clean[field] = project[field];
        }
    }
    // The loop only ever copies allowlisted fields, so this will always have
    // `id`/`title` at runtime (Teamleader always returns them) even though
    // TS can't verify that statically from a dynamic key loop.
    return clean;
}
function registerProjectTools(server, client, isAdmin) {
    // ── List Projects ─────────────────────────────────────────────────────────
    server.tool("teamleader_list_projects", "List projects from the Teamleader Focus (next-gen) projects module, with optional filtering and pagination.", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z
            .number()
            .optional()
            .describe("Page size (default: 20, max: 100)"),
        term: zod_1.z
            .string()
            .optional()
            .describe("Search term - filters on project number, title, customer/assignee/owner names"),
        status: zod_1.z
            .enum([
            "open",
            "planned",
            "running",
            "overdue",
            "over_budget",
            "closed",
        ])
            .optional()
            .describe("Filter by project status"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Filter by customer type (with customer_id)"),
        customer_id: zod_1.z
            .string()
            .optional()
            .describe("Filter by customer ID (with customer_type)"),
        deal_id: zod_1.z.string().optional().describe("Filter by linked deal ID"),
        quotation_id: zod_1.z
            .string()
            .optional()
            .describe("Filter by linked quotation ID"),
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
        if (params.status)
            filter.status = params.status;
        if (params.customer_type && params.customer_id) {
            filter.customers = [
                { type: params.customer_type, id: params.customer_id },
            ];
        }
        if (params.deal_id)
            filter.deal_ids = [params.deal_id];
        if (params.quotation_id)
            filter.quotation_ids = [params.quotation_id];
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "projects-v2/projects.list",
            body,
        });
        if (!isAdmin) {
            result.data = result.data.map((p) => redactForNonAdmin(p));
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Get Project ──────────────────────────────────────────────────────────
    server.tool("teamleader_get_project", "Get detailed information about a specific project.", {
        id: zod_1.z.string().describe("The project ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "projects-v2/projects.info",
            body: { id: params.id },
        });
        if (!isAdmin) {
            result.data = redactForNonAdmin(result.data);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Create Project ─────────────────────────────────────────────────────────
    server.tool("teamleader_create_project", "Create a new project in Teamleader Focus (next-gen projects module). Only 'title' is required; everything else is optional. Set start_date/end_date to schedule the project. The creating user is automatically added as an owner.", {
        title: zod_1.z.string().describe("Project title"),
        description: zod_1.z.string().optional().describe("Project description"),
        start_date: zod_1.z
            .string()
            .optional()
            .describe("Project start date (YYYY-MM-DD). Should not be after end_date."),
        end_date: zod_1.z
            .string()
            .optional()
            .describe("Project end date (YYYY-MM-DD). Should not be before start_date."),
        billing_method: zod_1.z
            .enum(["time_and_materials", "fixed_price", "non_billable"])
            .optional()
            .describe("Billing method for the project"),
        owner_ids: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe("Additional owner user IDs (the creator is always an owner)"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Link a customer: type (with customer_id)"),
        customer_id: zod_1.z
            .string()
            .optional()
            .describe("Link a customer: ID (with customer_type)"),
        assignee_type: zod_1.z
            .enum(["user", "team"])
            .optional()
            .describe("Assign a user or team: type (with assignee_id)"),
        assignee_id: zod_1.z
            .string()
            .optional()
            .describe("Assign a user or team: ID (with assignee_type)"),
        deal_ids: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe("Deal IDs to link to the project"),
        quotation_ids: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe("Quotation IDs to link to the project"),
        company_entity_id: zod_1.z
            .string()
            .optional()
            .describe("Department / company entity ID"),
        purchase_order_number: zod_1.z
            .string()
            .optional()
            .describe("Purchase order number"),
        color: zod_1.z
            .enum(PROJECT_COLORS)
            .optional()
            .describe("Project color (hex value from the Teamleader palette)"),
        time_budget_value: zod_1.z
            .number()
            .optional()
            .describe("Time budget amount (with time_budget_unit)"),
        time_budget_unit: zod_1.z
            .enum(["hours", "minutes", "seconds"])
            .optional()
            .describe("Time budget unit (with time_budget_value)"),
        external_budget_amount: zod_1.z
            .number()
            .optional()
            .describe("External budget (aka 'budget') amount. Only for time_and_materials."),
        external_budget_currency: zod_1.z
            .string()
            .optional()
            .describe("External budget currency (currently only EUR supported)"),
        internal_budget_amount: zod_1.z
            .number()
            .optional()
            .describe("Internal budget (aka 'cost budget') amount"),
        internal_budget_currency: zod_1.z
            .string()
            .optional()
            .describe("Internal budget currency"),
        fixed_price_amount: zod_1.z
            .number()
            .optional()
            .describe("Fixed price amount. Only for fixed_price billing method."),
        fixed_price_currency: zod_1.z
            .string()
            .optional()
            .describe("Fixed price currency (currently only EUR supported)"),
    }, async (params) => {
        const body = { title: params.title };
        if (params.description !== undefined)
            body.description = params.description;
        if (params.start_date)
            body.start_date = params.start_date;
        if (params.end_date)
            body.end_date = params.end_date;
        if (params.billing_method)
            body.billing_method = params.billing_method;
        if (params.owner_ids && params.owner_ids.length > 0)
            body.owner_ids = params.owner_ids;
        if (params.customer_type && params.customer_id) {
            body.customers = [
                { type: params.customer_type, id: params.customer_id },
            ];
        }
        if (params.assignee_type && params.assignee_id) {
            body.assignees = [
                { type: params.assignee_type, id: params.assignee_id },
            ];
        }
        if (params.deal_ids && params.deal_ids.length > 0)
            body.deal_ids = params.deal_ids;
        if (params.quotation_ids && params.quotation_ids.length > 0)
            body.quotation_ids = params.quotation_ids;
        if (params.company_entity_id)
            body.company_entity_id = params.company_entity_id;
        if (params.purchase_order_number)
            body.purchase_order_number = params.purchase_order_number;
        if (params.color)
            body.color = params.color;
        if (params.time_budget_value !== undefined &&
            params.time_budget_unit) {
            body.time_budget = {
                value: params.time_budget_value,
                unit: params.time_budget_unit,
            };
        }
        if (params.external_budget_amount !== undefined &&
            params.external_budget_currency) {
            body.external_budget = {
                amount: params.external_budget_amount,
                currency: params.external_budget_currency,
            };
        }
        if (params.internal_budget_amount !== undefined &&
            params.internal_budget_currency) {
            body.internal_budget = {
                amount: params.internal_budget_amount,
                currency: params.internal_budget_currency,
            };
        }
        if (params.fixed_price_amount !== undefined &&
            params.fixed_price_currency) {
            body.fixed_price = {
                amount: params.fixed_price_amount,
                currency: params.fixed_price_currency,
            };
        }
        const result = await client.request({
            endpoint: "projects-v2/projects.create",
            body,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Update Project ─────────────────────────────────────────────────────────
    server.tool("teamleader_update_project", "Update an existing project. All fields except 'id' are optional. Use this to add or change the project's start_date/end_date, title, description, budgets, etc.", {
        id: zod_1.z.string().describe("The project ID to update"),
        title: zod_1.z.string().optional().describe("Project title"),
        description: zod_1.z
            .string()
            .optional()
            .describe("Project description"),
        start_date: zod_1.z
            .string()
            .optional()
            .describe("Project start date (YYYY-MM-DD). Should not be after end_date."),
        end_date: zod_1.z
            .string()
            .optional()
            .describe("Project end date (YYYY-MM-DD). Should not be before start_date."),
        billing_method: zod_1.z
            .enum(["time_and_materials", "fixed_price", "non_billable"])
            .optional()
            .describe("Billing method value"),
        billing_update_strategy: zod_1.z
            .enum(["none", "cascade"])
            .optional()
            .describe("Required when changing billing_method. 'none' = don't change group items; 'cascade' = also update groups/tasks/materials. Setting 'time_and_materials' requires 'none'; 'non_billable' requires 'cascade'."),
        company_entity_id: zod_1.z
            .string()
            .optional()
            .describe("Department / company entity ID"),
        purchase_order_number: zod_1.z
            .string()
            .optional()
            .describe("Purchase order number"),
        color: zod_1.z
            .enum(PROJECT_COLORS)
            .optional()
            .describe("Project color (hex value from the Teamleader palette)"),
        time_budget_value: zod_1.z
            .number()
            .optional()
            .describe("Time budget amount (with time_budget_unit)"),
        time_budget_unit: zod_1.z
            .enum(["hours", "minutes", "seconds"])
            .optional()
            .describe("Time budget unit (with time_budget_value)"),
        external_budget_amount: zod_1.z
            .number()
            .optional()
            .describe("External budget amount. Only for time_and_materials."),
        external_budget_currency: zod_1.z
            .string()
            .optional()
            .describe("External budget currency (currently only EUR supported)"),
        internal_budget_amount: zod_1.z
            .number()
            .optional()
            .describe("Internal budget (cost budget) amount"),
        internal_budget_currency: zod_1.z
            .string()
            .optional()
            .describe("Internal budget currency"),
        fixed_price_amount: zod_1.z
            .number()
            .optional()
            .describe("Fixed price amount. Only for fixed_price billing method."),
        fixed_price_currency: zod_1.z
            .string()
            .optional()
            .describe("Fixed price currency (currently only EUR supported)"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.title)
            body.title = params.title;
        if (params.description !== undefined)
            body.description = params.description;
        if (params.start_date)
            body.start_date = params.start_date;
        if (params.end_date)
            body.end_date = params.end_date;
        if (params.billing_method) {
            body.billing_method = {
                value: params.billing_method,
                update_strategy: params.billing_update_strategy ?? "none",
            };
        }
        if (params.company_entity_id)
            body.company_entity_id = params.company_entity_id;
        if (params.purchase_order_number)
            body.purchase_order_number = params.purchase_order_number;
        if (params.color)
            body.color = params.color;
        if (params.time_budget_value !== undefined &&
            params.time_budget_unit) {
            body.time_budget = {
                value: params.time_budget_value,
                unit: params.time_budget_unit,
            };
        }
        if (params.external_budget_amount !== undefined &&
            params.external_budget_currency) {
            body.external_budget = {
                amount: params.external_budget_amount,
                currency: params.external_budget_currency,
            };
        }
        if (params.internal_budget_amount !== undefined &&
            params.internal_budget_currency) {
            body.internal_budget = {
                amount: params.internal_budget_amount,
                currency: params.internal_budget_currency,
            };
        }
        if (params.fixed_price_amount !== undefined &&
            params.fixed_price_currency) {
            body.fixed_price = {
                amount: params.fixed_price_amount,
                currency: params.fixed_price_currency,
            };
        }
        await client.request({
            endpoint: "projects-v2/projects.update",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Project ${params.id} updated`,
                    }),
                },
            ],
        };
    });
    // ── Close Project ──────────────────────────────────────────────────────────
    server.tool("teamleader_close_project", "Mark a project as closed.", {
        id: zod_1.z.string().describe("The project ID to close"),
        closing_strategy: zod_1.z
            .enum(["mark_tasks_and_materials_as_done", "none"])
            .optional()
            .describe("How to handle underlying tasks/materials when closing (default: none)"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.close",
            body: {
                id: params.id,
                closing_strategy: params.closing_strategy ?? "none",
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Project ${params.id} closed`,
                    }),
                },
            ],
        };
    });
    // ── Reopen Project ─────────────────────────────────────────────────────────
    server.tool("teamleader_reopen_project", "Reopen a previously closed project.", {
        id: zod_1.z.string().describe("The project ID to reopen"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.reopen",
            body: { id: params.id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Project ${params.id} reopened`,
                    }),
                },
            ],
        };
    });
    // ── Duplicate Project ──────────────────────────────────────────────────────
    server.tool("teamleader_duplicate_project", "Duplicate an existing project into a new project with the given title.", {
        id: zod_1.z.string().describe("The project ID to duplicate"),
        title: zod_1.z.string().describe("Title for the new (duplicated) project"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "projects-v2/projects.duplicate",
            body: { id: params.id, title: params.title },
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Delete Project ─────────────────────────────────────────────────────────
    server.tool("teamleader_delete_project", "Delete a project. Requires a delete strategy to decide what happens to linked tasks and time trackings. This is irreversible.", {
        id: zod_1.z.string().describe("The project ID to delete"),
        delete_strategy: zod_1.z
            .enum([
            "unlink_tasks_and_time_trackings",
            "delete_tasks_and_time_trackings",
            "delete_tasks_unlink_time_trackings",
        ])
            .describe("What to do with linked tasks and time trackings on delete"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.delete",
            body: { id: params.id, delete_strategy: params.delete_strategy },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Project ${params.id} deleted`,
                    }),
                },
            ],
        };
    });
    // ── Assign / Unassign ────────────────────────────────────────────────────
    server.tool("teamleader_assign_project", "Assign a user or team to a project.", {
        id: zod_1.z.string().describe("The project ID"),
        assignee_type: zod_1.z
            .enum(["user", "team"])
            .describe("Type of assignee"),
        assignee_id: zod_1.z.string().describe("The user or team ID to assign"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.assign",
            body: {
                id: params.id,
                assignee: { type: params.assignee_type, id: params.assignee_id },
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Assigned ${params.assignee_type} ${params.assignee_id} to project ${params.id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_unassign_project", "Unassign a user or team from a project.", {
        id: zod_1.z.string().describe("The project ID"),
        assignee_type: zod_1.z
            .enum(["user", "team"])
            .describe("Type of assignee"),
        assignee_id: zod_1.z.string().describe("The user or team ID to unassign"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.unassign",
            body: {
                id: params.id,
                assignee: { type: params.assignee_type, id: params.assignee_id },
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Unassigned ${params.assignee_type} ${params.assignee_id} from project ${params.id}`,
                    }),
                },
            ],
        };
    });
    // ── Owners ─────────────────────────────────────────────────────────────────
    server.tool("teamleader_add_project_owner", "Add a user as an owner of a project.", {
        id: zod_1.z.string().describe("The project ID"),
        user_id: zod_1.z.string().describe("The user ID to add as owner"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.addOwner",
            body: { id: params.id, user_id: params.user_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Added owner ${params.user_id} to project ${params.id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_remove_project_owner", "Remove a user as an owner of a project.", {
        id: zod_1.z.string().describe("The project ID"),
        user_id: zod_1.z.string().describe("The user ID to remove as owner"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.removeOwner",
            body: { id: params.id, user_id: params.user_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Removed owner ${params.user_id} from project ${params.id}`,
                    }),
                },
            ],
        };
    });
    // ── Customers ────────────────────────────────────────────────────────────
    server.tool("teamleader_add_project_customer", "Add a customer (contact or company) to a project.", {
        id: zod_1.z.string().describe("The project ID"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .describe("Customer type"),
        customer_id: zod_1.z.string().describe("Customer ID"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.addCustomer",
            body: {
                id: params.id,
                customer: { type: params.customer_type, id: params.customer_id },
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Added customer ${params.customer_id} to project ${params.id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_remove_project_customer", "Remove a customer (contact or company) from a project.", {
        id: zod_1.z.string().describe("The project ID"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .describe("Customer type"),
        customer_id: zod_1.z.string().describe("Customer ID"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.removeCustomer",
            body: {
                id: params.id,
                customer: { type: params.customer_type, id: params.customer_id },
            },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Removed customer ${params.customer_id} from project ${params.id}`,
                    }),
                },
            ],
        };
    });
    // ── Deals ──────────────────────────────────────────────────────────────────
    server.tool("teamleader_add_project_deal", "Link a deal to a project.", {
        id: zod_1.z.string().describe("The project ID"),
        deal_id: zod_1.z.string().describe("The deal ID to link"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.addDeal",
            body: { id: params.id, deal_id: params.deal_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Linked deal ${params.deal_id} to project ${params.id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_remove_project_deal", "Unlink a deal from a project.", {
        id: zod_1.z.string().describe("The project ID"),
        deal_id: zod_1.z.string().describe("The deal ID to unlink"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.removeDeal",
            body: { id: params.id, deal_id: params.deal_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Unlinked deal ${params.deal_id} from project ${params.id}`,
                    }),
                },
            ],
        };
    });
    // ── Quotations ─────────────────────────────────────────────────────────────
    server.tool("teamleader_add_project_quotation", "Link a quotation to a project.", {
        id: zod_1.z.string().describe("The project ID"),
        quotation_id: zod_1.z.string().describe("The quotation ID to link"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.addQuotation",
            body: { id: params.id, quotation_id: params.quotation_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Linked quotation ${params.quotation_id} to project ${params.id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_remove_project_quotation", "Unlink a quotation from a project.", {
        id: zod_1.z.string().describe("The project ID"),
        quotation_id: zod_1.z.string().describe("The quotation ID to unlink"),
    }, async (params) => {
        await client.request({
            endpoint: "projects-v2/projects.removeQuotation",
            body: { id: params.id, quotation_id: params.quotation_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Unlinked quotation ${params.quotation_id} from project ${params.id}`,
                    }),
                },
            ],
        };
    });
}
//# sourceMappingURL=projects.js.map