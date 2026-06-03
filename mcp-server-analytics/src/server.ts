/**
 * supabase-analytics MCP — stdio entry point.
 *
 * Read-only consumer MCP over the pseudonymized ritsu-analytics Door-2 dataset
 * (`live.*`), connecting as the least-priv `analytics_reader` Postgres role.
 * Capability: product-db-readonly-access (Sprint 1).
 *
 * Boot:
 *   1. loadEnv()  — fail-fast: must be analytics_reader on the analytics project,
 *                   NEVER Product (lib/env.ts).
 *   2. resolve caller role + analytics allowlist (governance/role-allowlist.ts).
 *   3. createQuerier(env) — pg Pool as analytics_reader.
 *   4. register MCP handlers (ListTools, CallTool).
 *   5. StdioServerTransport.connect().
 *
 * Audit: Sprint 1 logs each call to stderr (captured in MCP server logs). A
 * centralized ops.mcp_calls / ops.alerts audit is the Sprint-4 (monitoring)
 * deliverable — kept out of this process to hold the dependency surface to
 * `pg` + the MCP SDK only (no ops-plane service key in the analytics reader).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { loadEnv, summarizeEnv } from "./lib/env.ts";
import { createQuerier } from "./lib/pg-client.ts";
import { isRoleAllowedAnalytics } from "./governance/role-allowlist.ts";
import { findToolDef, TOOLS } from "./tools/index.ts";
import type { AnalyticsCallerContext, ToolResult } from "./types.ts";

const SERVER_NAME = "supabase-analytics";
const SERVER_VERSION = "0.1.0";

function logStderr(...parts: unknown[]): void {
  // MCP stdio uses stdout for JSON-RPC. Everything else MUST go to stderr.
  process.stderr.write(`[${SERVER_NAME}] ${parts.map(String).join(" ")}\n`);
}

async function main(): Promise<void> {
  const env = loadEnv();
  logStderr("starting |", summarizeEnv(env));

  const ctx: AnalyticsCallerContext = {
    role: env.callerRole,
    sessionId: env.callerSessionId,
    allowedAnalytics: isRoleAllowedAnalytics(env.callerRole),
  };
  logStderr(
    `caller resolved | role=${ctx.role} allowed_analytics=${ctx.allowedAnalytics}` +
      (ctx.allowedAnalytics ? "" : " (every call will be DENIED — role not on analytics allowlist)"),
  );

  const querier = createQuerier(env);

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const startedAt = Date.now();
    let result: ToolResult;

    try {
      const tool = findToolDef(name);
      if (!tool) {
        result = {
          state: "denied",
          output: { error: "unknown_tool", detail: `No such tool: ${name}` },
          errorCode: "unknown_tool",
        };
      } else {
        result = await tool.handler(args, ctx, querier);
      }
    } catch (err) {
      const e = err as Error;
      logStderr(`unexpected error in ${name}:`, e.message, e.stack ?? "");
      result = {
        state: "failed",
        output: { error: "internal_error", detail: e.message },
        errorCode: "internal_error",
        errorDetail: e.message,
      };
    }

    const durationMs = Date.now() - startedAt;
    logStderr(
      `tool=${name} state=${result.state} ms=${durationMs} role=${ctx.role}` +
        (result.errorCode ? ` err=${result.errorCode}` : ""),
    );

    return {
      content: [{ type: "text", text: JSON.stringify(result.output) }],
      isError: result.state !== "completed",
    };
  });

  // Graceful shutdown — drain the pool.
  const shutdown = async () => {
    try {
      await querier.end();
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  logStderr("ready");
}

main().catch((err) => {
  process.stderr.write(`[${SERVER_NAME}] FATAL: ${(err as Error).message}\n`);
  process.stderr.write(`${(err as Error).stack ?? ""}\n`);
  process.exit(1);
});
