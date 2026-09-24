/**
 * Teamleader Notes Tools
 *
 * Notes can be attached to many entity types (contacts, companies, deals,
 * projects, invoices, quotations, etc.).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";

const NOTE_SUBJECT_TYPES = [
  "company",
  "contact",
  "creditNote",
  "deal",
  "invoice",
  "nextgenProject",
  "product",
  "project",
  "quotation",
  "subscription",
] as const;

export function registerNoteTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Notes ─────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_notes",
    "List notes attached to a specific subject (e.g. a contact, company, deal or project).",
    {
      subject_type: z
        .enum(NOTE_SUBJECT_TYPES)
        .describe("The type of entity the notes are attached to"),
      subject_id: z.string().describe("The ID of the entity"),
      page: z.number().optional().describe("Page number"),
      page_size: z.number().optional().describe("Page size"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        filter: { subject: { type: params.subject_type, id: params.subject_id } },
      };
      if (params.page || params.page_size) {
        body.page = { number: params.page ?? 1, size: params.page_size ?? 20 };
      }
      const result = await client.request({ endpoint: "notes.list", body });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Create Note ────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_create_note",
    "Add a note to a subject (contact, company, deal, project, invoice, quotation, etc.). Optionally notify users.",
    {
      subject_type: z
        .enum(NOTE_SUBJECT_TYPES)
        .describe("The type of entity to attach the note to"),
      subject_id: z.string().describe("The ID of the entity"),
      content: z.string().describe("The note content"),
      notify_user_ids: z
        .array(z.string())
        .optional()
        .describe("User IDs to notify about this note"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        subject: { type: params.subject_type, id: params.subject_id },
        content: params.content,
      };
      if (params.notify_user_ids && params.notify_user_ids.length > 0) {
        body.notify = params.notify_user_ids.map((id) => ({ type: "user", id }));
      }
      const result = await client.request<{ data: { id: string; type: string } }>({
        endpoint: "notes.create",
        body,
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Update Note ────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_update_note",
    "Update the content of an existing note.",
    {
      id: z.string().describe("The note ID"),
      content: z.string().describe("The new note content"),
    },
    async (params) => {
      await client.request({
        endpoint: "notes.update",
        body: { id: params.id, content: params.content },
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Note ${params.id} updated` }),
          },
        ],
      };
    }
  );
}
