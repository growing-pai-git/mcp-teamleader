"use strict";
/**
 * Teamleader Invoices Tools
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerInvoiceTools = registerInvoiceTools;
const zod_1 = require("zod");
const product_categories_js_1 = require("../api/product-categories.js");
/** Zod shape of a single invoice line, shared by create and update. */
const lineItemSchema = zod_1.z.object({
    quantity: zod_1.z.number().describe("Quantity"),
    description: zod_1.z.string().describe("Line item description"),
    unit_price_amount: zod_1.z.number().describe("Unit price amount"),
    unit_price_currency: zod_1.z.string().describe("Currency code (e.g. 'EUR')"),
    tax_rate_id: zod_1.z.string().describe("Tax rate ID"),
    product_id: zod_1.z.string().optional().describe("Product ID (optional)"),
    product_category_id: zod_1.z
        .string()
        .optional()
        .describe(`The "Rekening" (bookkeeping account) of this line. Defaults to the ` +
        `category with ledger account ${product_categories_js_1.DEFAULT_LEDGER_ACCOUNT_NUMBER} ` +
        `(Omzet) when omitted — only pass this to book the line on a ` +
        `different account (see teamleader_list_product_categories).`),
});
/**
 * Map tool line items onto the API shape, guaranteeing every line carries a
 * product_category_id — that's the "Rekening" column in Teamleader. Lines
 * without one create bookkeeping problems downstream, so the default (700000
 * Omzet) is filled in whenever the caller didn't specify one.
 */
async function buildLineItems(client, items, departmentId) {
    // Resolved lazily and once: skips the lookup when every line is explicit.
    let defaultCategoryId;
    const lines = [];
    for (const item of items) {
        const productCategoryId = item.product_category_id ??
            (defaultCategoryId ??= await (0, product_categories_js_1.resolveDefaultProductCategoryId)(client, departmentId));
        lines.push({
            quantity: item.quantity,
            description: item.description,
            unit_price: {
                amount: item.unit_price_amount,
                currency: item.unit_price_currency,
                tax: "excluding",
            },
            tax_rate_id: item.tax_rate_id,
            product_category_id: productCategoryId,
            ...(item.product_id && { product_id: item.product_id }),
        });
    }
    return lines;
}
function registerInvoiceTools(server, client) {
    // ── List Invoices ────────────────────────────────────────────────────────
    server.tool("teamleader_list_invoices", "List invoices from Teamleader Focus with optional filtering and pagination", {
        page: zod_1.z.number().optional().describe("Page number (default: 1)"),
        page_size: zod_1.z.number().optional().describe("Page size (default: 20, max: 100)"),
        department_id: zod_1.z.string().optional().describe("Filter by department ID"),
        status: zod_1.z
            .array(zod_1.z.string())
            .optional()
            .describe("Filter by status (e.g. ['draft', 'outstanding', 'paid'])"),
        updated_since: zod_1.z
            .string()
            .optional()
            .describe("ISO 8601 date - only invoices updated after this date"),
        invoice_date_after: zod_1.z
            .string()
            .optional()
            .describe("Filter invoices dated after (YYYY-MM-DD)"),
        invoice_date_before: zod_1.z
            .string()
            .optional()
            .describe("Filter invoices dated before (YYYY-MM-DD)"),
    }, async (params) => {
        const body = {};
        if (params.page || params.page_size) {
            body.page = {
                number: params.page ?? 1,
                size: params.page_size ?? 20,
            };
        }
        const filter = {};
        if (params.department_id)
            filter.department_id = params.department_id;
        if (params.status)
            filter.status = params.status;
        if (params.updated_since)
            filter.updated_since = params.updated_since;
        if (params.invoice_date_after)
            filter.invoice_date_after = params.invoice_date_after;
        if (params.invoice_date_before)
            filter.invoice_date_before = params.invoice_date_before;
        if (Object.keys(filter).length > 0)
            body.filter = filter;
        const result = await client.request({
            endpoint: "invoices.list",
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
    // ── Get Invoice ──────────────────────────────────────────────────────────
    server.tool("teamleader_get_invoice", "Get detailed information about a specific invoice", {
        id: zod_1.z.string().describe("The invoice ID"),
    }, async (params) => {
        const result = await client.request({
            endpoint: "invoices.info",
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
    // ── Create Invoice (Draft) ───────────────────────────────────────────────
    server.tool("teamleader_create_invoice", `Create a new draft invoice in Teamleader Focus. Every line item is booked ` +
        `on a "Rekening" (bookkeeping account): ledger ` +
        `${product_categories_js_1.DEFAULT_LEDGER_ACCOUNT_NUMBER} (Omzet) is filled in automatically ` +
        `unless a line passes its own product_category_id.`, {
        customer_type: zod_1.z.enum(["contact", "company"]).describe("Customer type"),
        customer_id: zod_1.z.string().describe("Customer ID"),
        department_id: zod_1.z.string().describe("Department ID"),
        payment_term_type: zod_1.z
            .string()
            .describe("Payment term type (e.g. 'cash', 'end_of_month', 'after_invoice_date')"),
        payment_term_days: zod_1.z
            .number()
            .optional()
            .describe("Number of days for payment term"),
        invoice_date: zod_1.z
            .string()
            .optional()
            .describe("Invoice date (YYYY-MM-DD, defaults to today)"),
        note: zod_1.z.string().optional().describe("Note to include on the invoice"),
        line_items: zod_1.z
            .array(lineItemSchema)
            .describe("Line items for the invoice"),
    }, async (params) => {
        const body = {
            invoicee: {
                customer: {
                    type: params.customer_type,
                    id: params.customer_id,
                },
            },
            department_id: params.department_id,
            payment_term: {
                type: params.payment_term_type,
                ...(params.payment_term_days !== undefined && {
                    days: params.payment_term_days,
                }),
            },
            grouped_lines: [
                {
                    line_items: await buildLineItems(client, params.line_items, params.department_id),
                },
            ],
        };
        if (params.invoice_date)
            body.invoice_date = params.invoice_date;
        if (params.note)
            body.note = params.note;
        const result = await client.request({
            endpoint: "invoices.draft",
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
    // ── Update Invoice (draft) ───────────────────────────────────────────────
    server.tool("teamleader_update_invoice", "Update a DRAFT invoice in Teamleader Focus. Use this to change the invoice date, note, customer, payment term, purchase order number, linked project, or line items. Note: booked (finalized) invoices cannot be updated with this tool — Teamleader only allows editing drafts (a booked invoice can only be edited in the UI if 'edit booked invoices' is enabled).", {
        id: zod_1.z.string().describe("The invoice ID to update (must be a draft)"),
        invoice_date: zod_1.z
            .string()
            .optional()
            .describe("New invoice date (YYYY-MM-DD)"),
        note: zod_1.z
            .string()
            .optional()
            .describe("Note/comments on the invoice (pass empty string to clear)"),
        purchase_order_number: zod_1.z
            .string()
            .optional()
            .describe("Purchase order number"),
        project_id: zod_1.z.string().optional().describe("Link the invoice to a project ID"),
        customer_type: zod_1.z
            .enum(["contact", "company"])
            .optional()
            .describe("Relink the invoicee: customer type (with customer_id)"),
        customer_id: zod_1.z
            .string()
            .optional()
            .describe("Relink the invoicee: customer ID (with customer_type)"),
        payment_term_type: zod_1.z
            .string()
            .optional()
            .describe("Payment term type (e.g. 'cash', 'end_of_month', 'after_invoice_date')"),
        payment_term_days: zod_1.z
            .number()
            .optional()
            .describe("Number of days for the payment term"),
        line_items: zod_1.z
            .array(lineItemSchema)
            .optional()
            .describe("Replace the invoice's line items. If provided, replaces all existing lines."),
    }, async (params) => {
        const body = { id: params.id };
        if (params.invoice_date)
            body.invoice_date = params.invoice_date;
        if (params.note !== undefined)
            body.note = params.note;
        if (params.purchase_order_number)
            body.purchase_order_number = params.purchase_order_number;
        if (params.project_id)
            body.project_id = params.project_id;
        if (params.customer_type && params.customer_id) {
            body.invoicee = {
                customer: { type: params.customer_type, id: params.customer_id },
            };
        }
        if (params.payment_term_type) {
            body.payment_term = {
                type: params.payment_term_type,
                ...(params.payment_term_days !== undefined && {
                    days: params.payment_term_days,
                }),
            };
        }
        if (params.line_items) {
            // Ledger accounts are configured per department, so look up the
            // invoice's department before resolving the default "Rekening".
            const invoice = await client.request({
                endpoint: "invoices.info",
                body: { id: params.id },
            });
            const departmentId = invoice?.data?.department?.id;
            body.grouped_lines = [
                {
                    line_items: await buildLineItems(client, params.line_items, departmentId),
                },
            ];
        }
        await client.request({
            endpoint: "invoices.update",
            body,
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Invoice ${params.id} updated`,
                    }),
                },
            ],
        };
    });
    // ── Delete Invoice ─────────────────────────────────────────────────────────
    server.tool("teamleader_delete_invoice", "Delete an invoice in Teamleader Focus. Only possible for draft invoices or the last booked invoice. This is irreversible.", {
        id: zod_1.z.string().describe("The invoice ID to delete"),
    }, async (params) => {
        await client.request({
            endpoint: "invoices.delete",
            body: { id: params.id },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Invoice ${params.id} deleted`,
                    }),
                },
            ],
        };
    });
    // ── Book Invoice ─────────────────────────────────────────────────────────
    server.tool("teamleader_book_invoice", "Book (finalize) a draft invoice, assigning it an invoice number. The booking date 'on' becomes the invoice date.", {
        id: zod_1.z.string().describe("The draft invoice ID to book"),
        on: zod_1.z
            .string()
            .describe("The booking / invoice date (YYYY-MM-DD)"),
    }, async (params) => {
        await client.request({
            endpoint: "invoices.book",
            body: { id: params.id, on: params.on },
        });
        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify({
                        success: true,
                        message: `Invoice ${params.id} booked on ${params.on}`,
                    }),
                },
            ],
        };
    });
}
//# sourceMappingURL=invoices.js.map