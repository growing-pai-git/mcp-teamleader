/**
 * Teamleader Quotations Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import type {
  Quotation,
  TeamleaderListResponse,
  TeamleaderInfoResponse,
} from "../types/index.js";

/**
 * Zod shape of a single quotation line, shared by create and update.
 *
 * Note: unlike invoice lines, quotation lines have no "Rekening"
 * (product_category_id) — quotations.create/update simply don't accept the
 * field. The bookkeeping account is decided when the quotation is turned into
 * an invoice, which is where we default it.
 */
const lineItemSchema = z.object({
  quantity: z.number().describe("Quantity"),
  description: z.string().describe("Line item description"),
  unit_price_amount: z.number().describe("Unit price (excl. tax)"),
  tax_rate_id: z.string().describe("Tax rate ID"),
  extended_description: z
    .string()
    .optional()
    .describe("Additional description (supports Markdown)"),
  discount_value: z.number().optional().describe("Discount percentage (0–100)"),
  product_id: z.string().optional().describe("Product ID (optional)"),
});

type LineItemInput = z.infer<typeof lineItemSchema>;

/** Map tool line items onto the quotation API shape. */
function buildLineItems(items: LineItemInput[]): Record<string, unknown>[] {
  return items.map((item) => ({
    quantity: item.quantity,
    description: item.description,
    unit_price: { amount: item.unit_price_amount, tax: "excluding" },
    tax_rate_id: item.tax_rate_id,
    ...(item.extended_description && {
      extended_description: item.extended_description,
    }),
    ...(item.discount_value !== undefined && {
      discount: { type: "percentage", value: item.discount_value },
    }),
    ...(item.product_id && { product_id: item.product_id }),
  }));
}

export function registerQuotationTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Quotations ──────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_quotations",
    "List quotations (offertes) from Teamleader Focus with optional filtering and pagination",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      page_size: z.number().optional().describe("Page size (default: 20, max: 100)"),
      deal_id: z.string().optional().describe("Filter by deal ID"),
      status: z
        .array(z.string())
        .optional()
        .describe("Filter by status (e.g. ['draft', 'sent', 'accepted', 'declined'])"),
      updated_since: z
        .string()
        .optional()
        .describe("ISO 8601 date - only quotations updated after this date"),
    },
    async (params) => {
      const body: Record<string, unknown> = {};

      if (params.page || params.page_size) {
        body.page = {
          number: params.page ?? 1,
          size: params.page_size ?? 20,
        };
      }

      const filter: Record<string, unknown> = {};
      if (params.deal_id) filter.deal_id = params.deal_id;
      if (params.status) filter.status = params.status;
      if (params.updated_since) filter.updated_since = params.updated_since;
      if (Object.keys(filter).length > 0) body.filter = filter;

      const result = await client.request<TeamleaderListResponse<Quotation>>({
        endpoint: "quotations.list",
        body,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Get Quotation ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_get_quotation",
    "Get detailed information about a specific quotation (offerte)",
    {
      id: z.string().describe("The quotation ID"),
    },
    async (params) => {
      const result = await client.request<TeamleaderInfoResponse<Quotation>>({
        endpoint: "quotations.info",
        body: { id: params.id },
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Create Quotation ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_create_quotation",
    "Create a new quotation (offerte) in Teamleader Focus. A quotation must be linked to an existing deal.",
    {
      deal_id: z.string().describe("ID of the deal this quotation belongs to (required)"),
      currency_code: z
        .string()
        .describe("ISO currency code (e.g. 'EUR', 'USD')"),
      text: z.string().optional().describe("Introduction/body text for the quotation"),
      document_template_id: z
        .string()
        .optional()
        .describe("Document template ID to use for the quotation layout"),
      expiry_date: z
        .string()
        .optional()
        .describe("Expiry date (YYYY-MM-DD)"),
      expiry_action: z
        .enum(["lock", "none"])
        .optional()
        .describe("Action after expiry: 'lock' or 'none' (default: 'none')"),
      line_items: z
        .array(lineItemSchema)
        .optional()
        .describe("Line items for the quotation"),
      section_title: z
        .string()
        .optional()
        .describe("Optional section title for the line items group"),
      document_discount_value: z
        .number()
        .optional()
        .describe("Document-level discount percentage (0–100)"),
      document_discount_description: z
        .string()
        .optional()
        .describe("Description for the document-level discount"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        deal_id: params.deal_id,
        currency: { code: params.currency_code, exchange_rate: 1 },
      };

      if (params.text) body.text = params.text;
      if (params.document_template_id)
        body.document_template_id = params.document_template_id;

      if (params.expiry_date || params.expiry_action) {
        body.expiry = {
          ...(params.expiry_date && { expires_after: params.expiry_date }),
          ...(params.expiry_action && { action_after_expiry: params.expiry_action }),
        };
      }

      if (params.line_items && params.line_items.length > 0) {
        const group: Record<string, unknown> = {
          line_items: buildLineItems(params.line_items),
        };
        if (params.section_title) {
          group.section = { title: params.section_title };
        }
        body.grouped_lines = [group];
      }

      if (params.document_discount_value !== undefined) {
        body.discounts = [
          {
            type: "percentage",
            value: params.document_discount_value,
            ...(params.document_discount_description && {
              description: params.document_discount_description,
            }),
          },
        ];
      }

      const result = await client.request<{ data: { id: string; type: string } }>({
        endpoint: "quotations.create",
        body,
      });

      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Update Quotation ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_update_quotation",
    "Update an existing quotation (offerte): currency, intro text, expiry, document template, and line items. Providing line_items replaces all existing lines.",
    {
      id: z.string().describe("The quotation ID to update"),
      currency_code: z
        .string()
        .optional()
        .describe("ISO currency code (e.g. 'EUR'). Required by the API if changing lines."),
      text: z.string().optional().describe("Introduction/body text (Markdown)"),
      document_template_id: z
        .string()
        .optional()
        .describe("Document template ID"),
      expiry_date: z.string().optional().describe("Expiry date (YYYY-MM-DD)"),
      expiry_action: z
        .enum(["lock", "none"])
        .optional()
        .describe("Action after expiry"),
      line_items: z
        .array(lineItemSchema)
        .optional()
        .describe("Replace the quotation's line items"),
      section_title: z
        .string()
        .optional()
        .describe("Optional section title for the line items group"),
    },
    async (params) => {
      const body: Record<string, unknown> = { id: params.id };
      if (params.currency_code)
        body.currency = { code: params.currency_code, exchange_rate: 1 };
      if (params.text !== undefined) body.text = params.text;
      if (params.document_template_id)
        body.document_template_id = params.document_template_id;
      if (params.expiry_date || params.expiry_action) {
        body.expiry = {
          ...(params.expiry_date && { expires_after: params.expiry_date }),
          ...(params.expiry_action && { action_after_expiry: params.expiry_action }),
        };
      }
      if (params.line_items && params.line_items.length > 0) {
        const group: Record<string, unknown> = {
          line_items: buildLineItems(params.line_items),
        };
        if (params.section_title) group.section = { title: params.section_title };
        body.grouped_lines = [group];
      }

      await client.request({ endpoint: "quotations.update", body });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Quotation ${params.id} updated` }),
          },
        ],
      };
    }
  );

  // ── Accept Quotation ───────────────────────────────────────────────────────
  server.tool(
    "teamleader_accept_quotation",
    "Mark a quotation as accepted.",
    { id: z.string().describe("The quotation ID to accept") },
    async (params) => {
      await client.request({ endpoint: "quotations.accept", body: { id: params.id } });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Quotation ${params.id} accepted` }),
          },
        ],
      };
    }
  );

  // ── Delete Quotation ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_delete_quotation",
    "Delete a quotation. This is irreversible.",
    { id: z.string().describe("The quotation ID to delete") },
    async (params) => {
      await client.request({ endpoint: "quotations.delete", body: { id: params.id } });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Quotation ${params.id} deleted` }),
          },
        ],
      };
    }
  );

  // ── Download Quotation ─────────────────────────────────────────────────────
  server.tool(
    "teamleader_download_quotation",
    "Get a temporary download URL for a quotation PDF.",
    {
      id: z.string().describe("The quotation ID"),
      format: z
        .enum(["pdf"])
        .optional()
        .describe("Download format (only 'pdf' is supported)"),
    },
    async (params) => {
      const result = await client.request<{
        data: { location: string; expires: string };
      }>({
        endpoint: "quotations.download",
        body: { id: params.id, format: params.format ?? "pdf" },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Send Quotation ─────────────────────────────────────────────────────────
  server.tool(
    "teamleader_send_quotation",
    "Send one or more quotations (from the same deal) to recipients by email via Teamleader. The '#LINK' shortcode in the content is replaced with the CloudSign signing URL.",
    {
      quotation_ids: z
        .array(z.string())
        .describe("Quotation IDs to send (must all belong to the same deal)"),
      to_emails: z
        .array(z.string())
        .describe("Recipient email addresses (the 'to' field)"),
      subject: z.string().describe("Email subject"),
      content: z
        .string()
        .describe("Email body. Use '#LINK' where the CloudSign signing link should appear."),
      language: z
        .string()
        .describe("Language code for the email (e.g. 'nl', 'en', 'fr')"),
      cc_emails: z.array(z.string()).optional().describe("CC email addresses"),
      bcc_emails: z.array(z.string()).optional().describe("BCC email addresses"),
      from_sender_type: z
        .enum(["user", "department"])
        .optional()
        .describe("Sender type (with from_sender_id and from_email)"),
      from_sender_id: z.string().optional().describe("Sender user/department ID"),
      from_email: z.string().optional().describe("Sender email address"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        quotations: params.quotation_ids,
        subject: params.subject,
        content: params.content,
        language: params.language,
        recipients: {
          to: params.to_emails.map((email) => ({ email_address: email })),
          ...(params.cc_emails && {
            cc: params.cc_emails.map((email) => ({ email_address: email })),
          }),
          ...(params.bcc_emails && {
            bcc: params.bcc_emails.map((email) => ({ email_address: email })),
          }),
        },
      };
      if (params.from_sender_type && params.from_sender_id && params.from_email) {
        body.from = {
          sender: { type: params.from_sender_type, id: params.from_sender_id },
          email_address: params.from_email,
        };
      }

      await client.request({ endpoint: "quotations.send", body });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              message: `Sent ${params.quotation_ids.length} quotation(s)`,
            }),
          },
        ],
      };
    }
  );
}
