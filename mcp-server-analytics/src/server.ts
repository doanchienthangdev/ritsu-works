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
import { isRoleAllowedAnalytics, isTierAllowedAnalytics } from "./governance/role-allowlist.ts";
import {
  describeCredential,
  resolveOperatorCredential,
} from "./governance/operator-credential.ts";
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

  const perHuman = env.authMode === "per-human";

  // Resolve the per-call caller context.
  //   service-key (default): the MCP_CALLER_ROLE allowlist, resolved once at boot.
  //   per-human: the operator's VERIFIED tier, resolved FRESH per call — the access
  //     token supabase-ops persists may appear a moment after boot (cold-start), and
  //     re-reading each call also picks up a re-enrolled/rotated token. Fail-closed:
  //     a null/unknown tier denies. The analytics_reader DB role stays the real
  //     confidentiality boundary; this is least-privilege defense-in-depth.
  function resolveCtx(): AnalyticsCallerContext {
    if (!perHuman) {
      return {
        role: env.callerRole,
        sessionId: env.callerSessionId,
        allowedAnalytics: isRoleAllowedAnalytics(env.callerRole),
        authMode: "service-key",
        tier: null,
      };
    }
    const credential = resolveOperatorCredential(env);
    return {
      role: `operator:${credential.tier ?? "unknown"}`,
      sessionId: env.callerSessionId,
      allowedAnalytics: isTierAllowedAnalytics(credential.tier),
      authMode: "per-human",
      tier: credential.tier,
      credential,
    };
  }

  const bootCtx = resolveCtx();
  logStderr(
    `caller resolved | auth_mode=${bootCtx.authMode} role=${bootCtx.role} allowed_analytics=${bootCtx.allowedAnalytics}` +
      (bootCtx.allowedAnalytics
        ? ""
        : perHuman
          ? ` (calls DENIED until the operator tier is owner/admin — resolved per call)`
          : " (every call will be DENIED — role not on analytics allowlist)"),
  );
  // Surface WHY at boot, so a broken credential is visible in the MCP log before
  // the first denied tool call. This is the diagnosis that used to be missing:
  // an expired token, a missing file and a tier-less account all looked alike.
  if (bootCtx.credential) {
    logStderr(
      `operator credential | reason=${bootCtx.credential.reason} source=${bootCtx.credential.source} — ` +
        describeCredential(bootCtx.credential),
    );
  }

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

    // Re-resolve per call: in per-human mode the verified tier is read fresh from
    // the credential file each call (service-key returns the boot decision).
    const ctx = perHuman ? resolveCtx() : bootCtx;

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
        (result.errorCode ? ` err=${result.errorCode}` : "") +
        (ctx.credential && ctx.credential.reason !== "ok"
          ? ` credential=${ctx.credential.reason}`
          : ""),
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
