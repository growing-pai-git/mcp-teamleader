"use strict";
/**
 * Teamleader Companies Tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerCompanyTools = registerCompanyTools;
const zod_1 = require("zod");
function registerCompanyTools(server, client) {
    // ── List Companies ───────────────────────────────────────────────────────
    server.tool("teamleader_list_companies", "List companies from Teamleader Focus with optional filtering and pagination", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
        term: zod_1.z.string().optional().describe("Search term to filter companies"),
        tags: zod_1.z.array(zod_1.z.string()).optional().describe("Filter by tags"),
        vat_number: zod_1.z.string().optional().describe("Filter by VAT number"),
        updated_since: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 date - only companies updated after this date"),
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
        if (params.tags)
            filter.tags = params.tags;
        if (params.vat_number)
            filter.vat_number = params.vat_number;
        if (params.updated_since)
            filter.updated_since = params.updated_since;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "companies.list",
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
    // ── Get Company ──────────────────────────────────────────────────────────
    server.tool("teamleader_get_company", "Get detailed information about a specific company", {
        id: zod_1.z.string().describe("The company ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "companies.info",
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
    // ── Create Company ───────────────────────────────────────────────────────
    server.tool("teamleader_create_company", "Create a new company in Teamleader Focus", {
        name: zod_1.z.string().describe("Company name"),
        email: zod_1.z.string().optional().describe("Primary email address"),
        phone: zod_1.z.string().optional().describe("Phone number"),
        vat_number: zod_1.z.string().optional().describe("VAT number"),
        website: zod_1.z.string().optional().describe("Website URL"),
        language: zod_1.z.string().optional().describe("Language code (e.g. 'en', 'fr', 'nl')"),
        tags: zod_1.z.array(zod_1.z.string()).optional().describe("Tags to assign"),
    }, async (params) => {
        const body = {
            name: params.name,
        };
        if (params.email) {
            body.emails = [{ type: "primary", email: params.email }];
        }
        if (params.phone) {
            body.telephones = [{ type: "phone", number: params.phone }];
        }
        if (params.vat_number)
            body.vat_number = params.vat_number;
        if (params.website)
            body.website = params.website;
        if (params.language)
            body.language = params.language;
        if (params.tags)
            body.tags = params.tags;
        const result = await client.request({
            endpoint: "companies.add",
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
    // ── Update Company ─────────────────────────────────────────────────────────
    server.tool("teamleader_update_company", "Update an existing company in Teamleader Focus.", {
        id: zod_1.z.string().describe("The company ID to update"),
        name: zod_1.z.string().optional().describe("Company name"),
        email: zod_1.z.string().optional().describe("Primary email address"),
        phone: zod_1.z.string().optional().describe("Phone number"),
        vat_number: zod_1.z.string().optional().describe("VAT number"),
        website: zod_1.z.string().optional().describe("Website URL"),
        language: zod_1.z.string().optional().describe("Language code (e.g. 'en', 'fr', 'nl')"),
        business_type_id: zod_1.z.string().optional().describe("Business type ID"),
        responsible_user_id: zod_1.z
            .string()
            .optional()
            .describe("Responsible user ID"),
        remarks: zod_1.z.string().optional().describe("Remarks (Markdown supported)"),
        tags: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe("Tags (overwrites existing tags — use tag/untag tools to add/remove individually)"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.name)
            body.name = params.name;
        if (params.email)
            body.emails = [{ type: "primary", email: params.email }];
        if (params.phone)
            body.telephones = [{ type: "phone", number: params.phone }];
        if (params.vat_number)
            body.vat_number = params.vat_number;
        if (params.website)
            body.website = params.website;
        if (params.language)
            body.language = params.language;
        if (params.business_type_id)
            body.business_type_id = params.business_type_id;
        if (params.responsible_user_id)
            body.responsible_user_id = params.responsible_user_id;
        if (params.remarks !== undefined)
            body.remarks = params.remarks;
        if (params.tags)
            body.tags = params.tags;
        await client.request({ endpoint: "companies.update", body });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Company ${params.id} updated` }),
                },
            ],
        };
    });
    // ── Delete Company ─────────────────────────────────────────────────────────
    server.tool("teamleader_delete_company", "Delete a company from Teamleader Focus. This is irreversible.", {
        id: zod_1.z.string().describe("The company ID to delete"),
    }, async (params) => {
        await client.request({ endpoint: "companies.delete", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Company ${params.id} deleted` }),
                },
            ],
        };
    });
    // ── Tag / Untag Company ────────────────────────────────────────────────────
    server.tool("teamleader_tag_company", "Add one or more tags to a company (creates the tag if it doesn't exist). Does not overwrite existing tags.", {
        id: zod_1.z.string().describe("The company ID"),
        tags: zod_1.z.array(zod_1.z.string()).describe("Tags to add"),
    }, async (params) => {
        await client.request({
            endpoint: "companies.tag",
            body: { id: params.id, tags: params.tags },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Tagged company ${params.id}` }),
                },
            ],
        };
    });
    server.tool("teamleader_untag_company", "Remove one or more tags from a company.", {
        id: zod_1.z.string().describe("The company ID"),
        tags: zod_1.z.array(zod_1.z.string()).describe("Tags to remove"),
    }, async (params) => {
        await client.request({
            endpoint: "companies.untag",
            body: { id: params.id, tags: params.tags },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Untagged company ${params.id}` }),
                },
            ],
        };
    });
}
//# sourceMappingURL=companies.js.map