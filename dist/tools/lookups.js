"use strict";
/**
 * Teamleader Lookup / Configuration Tools
 *
 * Read-only "list" endpoints that surface the IDs needed by the create/update
 * tools of other modules: users, teams, departments, work types, activity
 * types, tax rates, products, product categories, and deal
 * phases/pipelines/sources/lost reasons, plus custom field definitions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerLookupTools = registerLookupTools;
const zod_1 = require("zod");
// Allowlist of product fields safe to show non-admins. Same reasoning as the
// project redaction: allowlist rather than blocklist, so custom fields or
// future API additions we don't know the name of are dropped by default
// instead of silently passing through. Confirmed against the real Teamleader
// product schema (id, name, description, code, purchase_price, selling_price,
// unit, tax) — only purchase_price/selling_price are withheld.
const PRODUCT_SAFE_FIELDS = ["id", "name", "description", "code", "unit", "tax"];
function redactProductForNonAdmin(product) {
    const clean = {};
    for (const field of PRODUCT_SAFE_FIELDS) {
        if (field in product) {
            clean[field] = product[field];
        }
    }
    return clean;
}
/** Helper to register a simple paginated list endpoint with optional filters. */
function registerSimpleList(server, client, opts) {
    server.tool(opts.name, opts.description, {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z
            .number()
            .optional()
            .describe("Page size (default: 20, max: 100)"),
        ...(opts.supportsTerm
            ? { term: zod_1.z.string().optional().describe("Search term filter") }
            : {}),
        ...(opts.supportsDepartment
            ? {
                department_id: zod_1.z
                    .string()
                    .optional()
                    .describe("Filter by department ID"),
            }
            : {}),
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
        if (params.department_id)
            filter.department_id = params.department_id;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = (await client.request({ endpoint: opts.endpoint, body }));
        if (opts.redactItem && Array.isArray(result?.data)) {
            result.data = result.data.map(opts.redactItem);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
}
function registerLookupTools(server, client, isAdmin) {
    // ── Current user ───────────────────────────────────────────────────────────
    server.tool("teamleader_get_current_user", "Get the currently authenticated Teamleader user (useful to find your own user ID, account, language and timezone).", {}, async () => {
        const result = await client.request({ endpoint: "users.me" });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    // ── Users & teams ────────────────────────────────────────────────────────
    registerSimpleList(server, client, {
        name: "teamleader_list_users",
        description: "List users (co-workers) in the Teamleader account. Use to find user IDs for responsible_user_id / assignee / owner fields.",
        endpoint: "users.list",
        supportsTerm: true,
    });
    registerSimpleList(server, client, {
        name: "teamleader_list_teams",
        description: "List teams in the Teamleader account (with members and team lead).",
        endpoint: "teams.list",
        supportsTerm: true,
    });
    // ── Departments ────────────────────────────────────────────────────────────
    registerSimpleList(server, client, {
        name: "teamleader_list_departments",
        description: "List departments (company entities). Use to find department_id for invoices, quotations, projects, tax rates.",
        endpoint: "departments.list",
    });
    // ── Work types & activity types ────────────────────────────────────────────
    registerSimpleList(server, client, {
        name: "teamleader_list_work_types",
        description: "List work types. Use to find work_type_id for tasks, events and time tracking.",
        endpoint: "workTypes.list",
        supportsTerm: true,
    });
    registerSimpleList(server, client, {
        name: "teamleader_list_activity_types",
        description: "List activity types (task, meeting, call). Use to find activity_type_id when creating events.",
        endpoint: "activityTypes.list",
    });
    // ── Tax rates ──────────────────────────────────────────────────────────────
    registerSimpleList(server, client, {
        name: "teamleader_list_tax_rates",
        description: "List available tax rates. Use to find tax_rate_id for invoice and quotation line items. Optionally filter by department.",
        endpoint: "taxRates.list",
        supportsDepartment: true,
    });
    // ── Products & categories ──────────────────────────────────────────────────
    registerSimpleList(server, client, {
        name: "teamleader_list_products",
        description: "List products. Use to find product_id for invoice/quotation line items.",
        endpoint: "products.list",
        supportsTerm: true,
        redactItem: isAdmin ? undefined : redactProductForNonAdmin,
    });
    server.tool("teamleader_get_product", "Get details for a single product, including selling price, tax rate and category.", {
        id: zod_1.z.string().describe("The product ID"),
    }, async (params) => {
        const result = (await client.request({
            endpoint: "products.info",
            body: { id: params.id },
        }));
        if (!isAdmin && result?.data) {
            result.data = redactProductForNonAdmin(result.data);
        }
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    registerSimpleList(server, client, {
        name: "teamleader_list_product_categories",
        description: "List product categories. Use to find product_category_id. Optionally filter by department.",
        endpoint: "productCategories.list",
        supportsDepartment: true,
    });
    // ── Deal metadata ──────────────────────────────────────────────────────────
    server.tool("teamleader_list_deal_phases", "List deal phases (stages), sorted by their order in the flow. Use to find phase_id for creating deals or moving them. Optionally filter by pipeline.", {
        deal_pipeline_id: zod_1.z
            .string()
            .optional()
            .describe("Filter phases belonging to a specific pipeline"),
        page: zod_1.z.number().optional().describe("Page number"),
        page_size: zod_1.z.number().optional().describe("Page size"),
    }, async (params) => {
        const body = {};
        if (params.page || params.page_size) {
            body.page = { number: params.page ?? 1, size: params.page_size ?? 20 };
        }
        if (params.deal_pipeline_id)
            body.filter = { deal_pipeline_id: params.deal_pipeline_id };
        const result = await client.request({ endpoint: "dealPhases.list", body });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
    registerSimpleList(server, client, {
        name: "teamleader_list_deal_pipelines",
        description: "List deal pipelines. The response meta includes the default pipeline ID. Use to find pipeline/phase IDs.",
        endpoint: "dealPipelines.list",
    });
    registerSimpleList(server, client, {
        name: "teamleader_list_deal_sources",
        description: "List deal sources. Use to find source_id when creating/updating deals.",
        endpoint: "dealSources.list",
    });
    registerSimpleList(server, client, {
        name: "teamleader_list_lost_reasons",
        description: "List lost reasons for deals. Use to find reason_id when marking a deal as lost.",
        endpoint: "lostReasons.list",
    });
    // ── Custom field definitions ───────────────────────────────────────────────
    server.tool("teamleader_list_custom_field_definitions", "List custom field definitions. Use to discover custom field IDs and their configuration (options for select fields) per context (contact, company, deal, project, invoice, etc.).", {
        context: zod_1.z
            .enum([
            "contact",
            "company",
            "deal",
            "project",
            "milestone",
            "product",
            "invoice",
            "subscription",
            "ticket",
        ])
            .optional()
            .describe("Filter definitions by the entity context they apply to"),
        page: zod_1.z.number().optional().describe("Page number"),
        page_size: zod_1.z.number().optional().describe("Page size"),
    }, async (params) => {
        const body = {};
        if (params.page || params.page_size) {
            body.page = { number: params.page ?? 1, size: params.page_size ?? 20 };
        }
        if (params.context)
            body.filter = { context: params.context };
        const result = await client.request({
            endpoint: "customFieldDefinitions.list",
            body,
        });
        return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
    });
}
//# sourceMappingURL=lookups.js.map