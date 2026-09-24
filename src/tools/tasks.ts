/**
 * Teamleader Tasks Tools
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TeamleaderClient } from "../api/client.js";
import type {
  Task,
  TeamleaderListResponse,
} from "../types/index.js";

export function registerTaskTools(
  server: McpServer,
  client: TeamleaderClient
): void {
  // ── List Tasks ───────────────────────────────────────────────────────────
  server.tool(
    "teamleader_list_tasks",
    "List tasks from Teamleader Focus with optional filtering and pagination",
    {
      page: z.number().optional().describe("Page number (default: 1)"),
      page_size: z.number().optional().describe("Page size (default: 20, max: 100)"),
      term: z.string().optional().describe("Search term to filter tasks"),
      customer_type: z
        .enum(["contact", "company"])
        .optional()
        .describe("Customer type to filter by"),
      customer_id: z
        .string()
        .optional()
        .describe("Customer ID to filter by"),
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
      if (params.term) filter.term = params.term;
      if (params.customer_type && params.customer_id) {
        filter.customer = {
          type: params.customer_type,
          id: params.customer_id,
        };
      }
      if (Object.keys(filter).length > 0) body.filter = filter;

      const result = await client.request<TeamleaderListResponse<Task>>({
        endpoint: "tasks.list",
        body,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // ── Create Task ──────────────────────────────────────────────────────────
  server.tool(
    "teamleader_create_task",
    "Create a new task in Teamleader Focus",
    {
      title: z.string().describe("Task title (required by Teamleader)"),
      description: z.string().optional().describe("Task description / extra details"),
      due_on: z
        .string()
        .describe("Due date (YYYY-MM-DD) - required by Teamleader"),
      deal_id: z.string().optional().describe("Link the task to a deal ID"),
      project_id: z
        .string()
        .optional()
        .describe("Link the task to a project ID (new projects module)"),
      customer_type: z
        .enum(["contact", "company"])
        .optional()
        .describe("Link task to a customer type"),
      customer_id: z
        .string()
        .optional()
        .describe("Link task to a customer ID"),
      assignee_type: z
        .string()
        .optional()
        .describe("Assignee type (e.g. 'user')"),
      assignee_id: z
        .string()
        .optional()
        .describe("Assignee ID"),
      work_type_id: z
        .string()
        .optional()
        .describe("Work type ID"),
    },
    async (params) => {
      const body: Record<string, unknown> = {
        title: params.title,
        due_on: params.due_on,
      };

      if (params.description) body.description = params.description;
      if (params.deal_id) body.deal_id = params.deal_id;
      if (params.project_id) body.project_id = params.project_id;
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
      if (params.work_type_id) body.work_type_id = params.work_type_id;

      const result = await client.request<{ data: { id: string; type: string } }>({
        endpoint: "tasks.create",
        body,
      });

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  // ── Get Task ───────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_get_task",
    "Get detailed information about a specific task.",
    {
      id: z.string().describe("The task ID"),
    },
    async (params) => {
      const result = await client.request<{ data: Task }>({
        endpoint: "tasks.info",
        body: { id: params.id },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  // ── Update Task ────────────────────────────────────────────────────────────
  server.tool(
    "teamleader_update_task",
    "Update an existing task (title, description, due date, work type, assignee, customer, linked deal/project).",
    {
      id: z.string().describe("The task ID to update"),
      title: z.string().optional().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      due_on: z.string().optional().describe("Due date (YYYY-MM-DD)"),
      work_type_id: z.string().optional().describe("Work type ID"),
      deal_id: z.string().optional().describe("Linked deal ID"),
      project_id: z.string().optional().describe("Linked project ID (new projects module)"),
      customer_type: z
        .enum(["contact", "company"])
        .optional()
        .describe("Customer type (with customer_id)"),
      customer_id: z.string().optional().describe("Customer ID (with customer_type)"),
      assignee_type: z
        .enum(["user", "team"])
        .optional()
        .describe("Assignee type (with assignee_id)"),
      assignee_id: z.string().optional().describe("Assignee ID (with assignee_type)"),
    },
    async (params) => {
      const body: Record<string, unknown> = { id: params.id };
      if (params.title) body.title = params.title;
      if (params.description !== undefined) body.description = params.description;
      if (params.due_on) body.due_on = params.due_on;
      if (params.work_type_id) body.work_type_id = params.work_type_id;
      if (params.deal_id) body.deal_id = params.deal_id;
      if (params.project_id) body.project_id = params.project_id;
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
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Task ${params.id} updated` }),
          },
        ],
      };
    }
  );

  // ── Complete / Reopen / Delete Task ──────────────────────────────────────
  server.tool(
    "teamleader_complete_task",
    "Mark a task as complete.",
    { id: z.string().describe("The task ID to complete") },
    async (params) => {
      await client.request({ endpoint: "tasks.complete", body: { id: params.id } });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Task ${params.id} completed` }),
          },
        ],
      };
    }
  );

  server.tool(
    "teamleader_reopen_task",
    "Reopen a task that had been marked as complete.",
    { id: z.string().describe("The task ID to reopen") },
    async (params) => {
      await client.request({ endpoint: "tasks.reopen", body: { id: params.id } });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Task ${params.id} reopened` }),
          },
        ],
      };
    }
  );

  server.tool(
    "teamleader_delete_task",
    "Delete a task. This is irreversible.",
    { id: z.string().describe("The task ID to delete") },
    async (params) => {
      await client.request({ endpoint: "tasks.delete", body: { id: params.id } });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ success: true, message: `Task ${params.id} deleted` }),
          },
        ],
      };
    }
  );

  // ── Schedule Task ────────────────────────────────────────────────────────
  server.tool(
    "teamleader_schedule_task",
    "Schedule a task in the calendar by giving it a start and end time. Returns the created calendar event.",
    {
      id: z.string().describe("The task ID to schedule"),
      starts_at: z.string().describe("Start datetime (ISO 8601, e.g. 2016-02-04T16:00:00+00:00)"),
      ends_at: z.string().describe("End datetime (ISO 8601)"),
    },
    async (params) => {
      const result = await client.request<{ data: { id: string; type: string } }>({
        endpoint: "tasks.schedule",
        body: { id: params.id, starts_at: params.starts_at, ends_at: params.ends_at },
      });
      return {
        content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
