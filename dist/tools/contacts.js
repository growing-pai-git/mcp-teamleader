"use strict";
/**
 * Teamleader Contacts Tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerContactTools = registerContactTools;
const zod_1 = require("zod");
function registerContactTools(server, client) {
    // ── List Contacts ────────────────────────────────────────────────────────
    server.tool("teamleader_list_contacts", "List contacts from Teamleader Focus with optional filtering and pagination", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
        term: zod_1.z.string().optional().describe("Search term to filter contacts"),
        tags: zod_1.z.array(zod_1.z.string()).optional().describe("Filter by tags"),
        updated_since: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 date - only contacts updated after this date"),
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
        if (params.updated_since)
            filter.updated_since = params.updated_since;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "contacts.list",
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
    // ── Get Contact ──────────────────────────────────────────────────────────
    server.tool("teamleader_get_contact", "Get detailed information about a specific contact", {
        id: zod_1.z.string().describe("The contact ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "contacts.info",
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
    // ── Create Contact ───────────────────────────────────────────────────────
    server.tool("teamleader_create_contact", "Create a new contact in Teamleader Focus", {
        first_name: zod_1.z.string().describe("First name"),
        last_name: zod_1.z.string().describe("Last name"),
        email: zod_1.z.string().optional().describe("Primary email address"),
        phone: zod_1.z.string().optional().describe("Phone number"),
        mobile: zod_1.z.string().optional().describe("Mobile number"),
        language: zod_1.z.string().optional().describe("Language code (e.g. 'en', 'fr', 'nl')"),
        gender: zod_1.z.enum(["male", "female"]).optional().describe("Gender"),
        tags: zod_1.z.array(zod_1.z.string()).optional().describe("Tags to assign"),
    }, async (params) => {
        const body = {
            first_name: params.first_name,
            last_name: params.last_name,
        };
        if (params.email) {
            body.emails = [{ type: "primary", email: params.email }];
        }
        const telephones = [];
        if (params.phone)
            telephones.push({ type: "phone", number: params.phone });
        if (params.mobile)
            telephones.push({ type: "mobile", number: params.mobile });
        if (telephones.length > 0)
            body.telephones = telephones;
        if (params.language)
            body.language = params.language;
        if (params.gender)
            body.gender = params.gender;
        if (params.tags)
            body.tags = params.tags;
        const result = await client.request({
            endpoint: "contacts.add",
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
    // ── Update Contact ───────────────────────────────────────────────────────
    server.tool("teamleader_update_contact", "Update an existing contact in Teamleader Focus", {
        id: zod_1.z.string().describe("The contact ID to update"),
        first_name: zod_1.z.string().optional().describe("First name"),
        last_name: zod_1.z.string().optional().describe("Last name"),
        email: zod_1.z.string().optional().describe("Primary email address"),
        phone: zod_1.z.string().optional().describe("Phone number"),
        mobile: zod_1.z.string().optional().describe("Mobile number"),
        language: zod_1.z.string().optional().describe("Language code"),
        gender: zod_1.z.enum(["male", "female"]).optional().describe("Gender"),
        tags: zod_1.z.array(zod_1.z.string()).optional().describe("Tags to assign"),
    }, async (params) => {
        const body = { id: params.id };
        if (params.first_name)
            body.first_name = params.first_name;
        if (params.last_name)
            body.last_name = params.last_name;
        if (params.email) {
            body.emails = [{ type: "primary", email: params.email }];
        }
        const telephones = [];
        if (params.phone)
            telephones.push({ type: "phone", number: params.phone });
        if (params.mobile)
            telephones.push({ type: "mobile", number: params.mobile });
        if (telephones.length > 0)
            body.telephones = telephones;
        if (params.language)
            body.language = params.language;
        if (params.gender)
            body.gender = params.gender;
        if (params.tags)
            body.tags = params.tags;
        await client.request({
            endpoint: "contacts.update",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Contact ${params.id} updated` }),
                },
            ],
        };
    });
    // ── Delete Contact ─────────────────────────────────────────────────────────
    server.tool("teamleader_delete_contact", "Delete a contact from Teamleader Focus. This is irreversible.", {
        id: zod_1.z.string().describe("The contact ID to delete"),
    }, { destructiveHint: true }, async (params) => {
        await client.request({ endpoint: "contacts.delete", body: { id: params.id } });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Contact ${params.id} deleted` }),
                },
            ],
        };
    });
    // ── Tag / Untag Contact ────────────────────────────────────────────────────
    server.tool("teamleader_tag_contact", "Add one or more tags to a contact (creates the tag if it doesn't exist). Unlike update, this does not overwrite existing tags.", {
        id: zod_1.z.string().describe("The contact ID"),
        tags: zod_1.z.array(zod_1.z.string()).describe("Tags to add"),
    }, async (params) => {
        await client.request({
            endpoint: "contacts.tag",
            body: { id: params.id, tags: params.tags },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Tagged contact ${params.id}` }),
                },
            ],
        };
    });
    server.tool("teamleader_untag_contact", "Remove one or more tags from a contact.", {
        id: zod_1.z.string().describe("The contact ID"),
        tags: zod_1.z.array(zod_1.z.string()).describe("Tags to remove"),
    }, async (params) => {
        await client.request({
            endpoint: "contacts.untag",
            body: { id: params.id, tags: params.tags },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({ success: true, message: `Untagged contact ${params.id}` }),
                },
            ],
        };
    });
    // ── Link / Unlink Contact ↔ Company ──────────────────────────────────────
    server.tool("teamleader_link_contact_to_company", "Link a contact to a company, optionally with a position and decision-maker flag.", {
        id: zod_1.z.string().describe("The contact ID"),
        company_id: zod_1.z.string().describe("The company ID to link the contact to"),
        position: zod_1.z.string().optional().describe("The contact's position at the company"),
        decision_maker: zod_1.z
            .boolean()
            .optional()
            .describe("Whether the contact is a decision maker at the company"),
    }, async (params) => {
        const body = {
            id: params.id,
            company_id: params.company_id,
        };
        if (params.position)
            body.position = params.position;
        if (params.decision_maker !== undefined)
            body.decision_maker = params.decision_maker;
        await client.request({ endpoint: "contacts.linkToCompany", body });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Linked contact ${params.id} to company ${params.company_id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_update_contact_company_link", "Update the details (position, decision-maker flag) of an existing contact–company link.", {
        id: zod_1.z.string().describe("The contact ID"),
        company_id: zod_1.z.string().describe("The company ID the contact is linked to"),
        position: zod_1.z.string().optional().describe("The contact's position at the company"),
        decision_maker: zod_1.z
            .boolean()
            .optional()
            .describe("Whether the contact is a decision maker at the company"),
    }, async (params) => {
        const body = {
            id: params.id,
            company_id: params.company_id,
        };
        if (params.position)
            body.position = params.position;
        if (params.decision_maker !== undefined)
            body.decision_maker = params.decision_maker;
        await client.request({ endpoint: "contacts.updateCompanyLink", body });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Updated link between contact ${params.id} and company ${params.company_id}`,
                    }),
                },
            ],
        };
    });
    server.tool("teamleader_unlink_contact_from_company", "Unlink a contact from a company.", {
        id: zod_1.z.string().describe("The contact ID"),
        company_id: zod_1.z.string().describe("The company ID to unlink the contact from"),
    }, async (params) => {
        await client.request({
            endpoint: "contacts.unlinkFromCompany",
            body: { id: params.id, company_id: params.company_id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Unlinked contact ${params.id} from company ${params.company_id}`,
                    }),
                },
            ],
        };
    });
}
//# sourceMappingURL=contacts.js.map