/**
 * supabase-ops MCP shim — stdio entry point.
 *
 * Boot sequence:
 *   1. loadEnv() — fail-fast on missing/invalid config
 *   2. loadRegistry() — parse knowledge/mcp-tools.yaml, fail-fast on parse error
 *   3. resolveRole() — caller's permissions snapshot
 *   4. getClient() — Supabase JS singleton (re-asserts project_ref)
 *   5. register MCP handlers (ListTools, CallTool)
 *   6. StdioServerTransport.connect() — block forever, serving requests
 *
 * Per-call sequence (CallTool):
 *   1. findToolDef(name) — registered tool?
 *   2. enforceTier(registry, name, ctx) — tier/role-scope check
 *   3. assertProjectRefAllowed(env.url) — defense-in-depth project ref check
 *   4. tool.handler(input, ctx, client) — actual work
 *   5. writeAudit(...) — fire-and-forget INSERT into ops.mcp_calls
 *   6. return ToolResult.output as MCP response
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadEnv, summarizeEnv } from "./lib/env.ts";
import { autoloadEnvLocal, repoRootFromHere } from "./lib/env-file.ts";
import { getClient, refreshPerHumanClient } from "./lib/supabase-client.ts";
import { resolveOperator, resolveRole } from "./governance/role-resolver.ts";
import { decodeJwtClaims } from "./governance/operator-identity.ts";
import {
  enforceTier,
  loadRegistry,
  TierExceededError,
  ToolNotInRoleScopeError,
  UnknownToolError,
} from "./governance/hitl-tier-check.ts";
import { ProjectRefViolationError, assertProjectRefAllowed } from "./governance/project-ref-guard.ts";
import { findToolDef, TOOLS } from "./tools/index.ts";
import { writeAudit, writeProjectRefAlert } from "./governance/audit.ts";
import { MCPToolError, type CallerContext, type ToolResult } from "./types.ts";

const SERVER_NAME = "supabase-ops";
const SERVER_VERSION = "0.1.0";

function logStderr(...parts: unknown[]): void {
  // MCP stdio uses stdout for JSON-RPC. Everything else MUST go to stderr.
  process.stderr.write(`[${SERVER_NAME}] ${parts.map(String).join(" ")}\n`);
}

async function main(): Promise<void> {
  // --- Boot ----------------------------------------------------------------
  // Self-load runtime/secrets/.env.local (portable, no shell) so .mcp.json can use
  // a plain `npx tsx <server>` command on any OS. No-op if the env is already set
  // (legacy shell-sourcing wrapper) or the file is absent.
  const sourced = autoloadEnvLocal(repoRootFromHere());
  if (sourced) logStderr(`env self-loaded from ${sourced}`);
  const env = loadEnv();
  logStderr("starting |", summarizeEnv(env));

  const registry = loadRegistry(env.repoRoot);
  logStderr(`registry loaded | tools=${TOOLS.map((t) => t.name).join(",")} | source=${registry.version}`);

  // Authority resolution + client construction.
  //   service-key (default): self-asserted MCP_CALLER_ROLE + service_role client.
  //   per-human: the verified JWT tier (app_metadata.tier), fail-closed if the
  //     token carries no tier. Prefer the refresh token (exchanged for a fresh
  //     access token + auto-refresh, Sprint 2); fall back to a static access
  //     token. RLS (migration 00049) is the authoritative backstop either way.
  let client: SupabaseClient;
  let ctx: CallerContext;
  if (env.authMode === "per-human") {
    let accessToken: string | null;
    if (env.perHumanRefreshToken || env.perHumanRefreshTokenFile) {
      const refreshed = await refreshPerHumanClient(env); // throws (fail-closed) on a bad token
      client = refreshed.client;
      accessToken = refreshed.accessToken;
      logStderr(
        `per-human session established via refresh token (auto-refresh on${env.perHumanRefreshTokenFile ? "; persisted to file" : ""})`,
      );
    } else {
      client = getClient(env); // static access-token path
      accessToken = env.perHumanAccessToken;
    }
    ctx = resolveOperator(decodeJwtClaims(accessToken), env.callerSessionId);
  } else {
    client = getClient(env);
    ctx = resolveRole(env.callerRole, env.callerSessionId);
  }
  logStderr(
    `caller resolved | auth_mode=${ctx.authMode} role=${ctx.role} hitl_max=${ctx.hitlMaxTier}` +
      (ctx.humanEmail ? ` human=${ctx.humanEmail}` : ""),
  );

  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {} } },
  );

  // --- ListTools -----------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  // --- CallTool ------------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;
    const startedAt = Date.now();
    let result: ToolResult;
    let requiredTier: string = "A";

    try {
      const tool = findToolDef(name);
      if (!tool) throw new UnknownToolError(name);

      // Gate 1 — HITL tier check (also enforces role_scope)
      const { requiredTier: t } = enforceTier(registry, name, ctx);
      requiredTier = t;

      // Gate 2 — per-call project_ref defense in depth
      assertProjectRefAllowed(env.url);

      // Run handler
      result = await tool.handler(args, ctx, client);
    } catch (err) {
      if (err instanceof ProjectRefViolationError) {
        // P0 — also write to ops.alerts
        writeProjectRefAlert(client, ctx, name, err).catch((e) =>
          logStderr("ALERT WRITE FAILED:", (e as Error).message),
        );
        result = {
          state: "denied",
          output: { error: "project_ref_violation", detail: err.message },
          errorCode: "project_ref_violation",
          errorDetail: err.message,
        };
      } else if (
        err instanceof TierExceededError ||
        err instanceof ToolNotInRoleScopeError ||
        err instanceof UnknownToolError
      ) {
        result = {
          state: "denied",
          output: { error: snakeName(err.name), detail: err.message },
          errorCode: snakeName(err.name),
          errorDetail: err.message,
        };
      } else if (err instanceof MCPToolError) {
        result = {
          state: err.state,
          output: { error: err.code, detail: err.message },
          errorCode: err.code,
          errorDetail: err.message,
        };
      } else {
        const e = err as Error;
        logStderr(`unexpected error in ${name}:`, e.message, e.stack ?? "");
        result = {
          state: "failed",
          output: { error: "internal_error", detail: e.message },
          errorCode: "internal_error",
          errorDetail: e.message,
        };
      }
    }

    const durationMs = Date.now() - startedAt;
    logStderr(
      `tool=${name} state=${result.state} ms=${durationMs} role=${ctx.role}${
        result.errorCode ? ` err=${result.errorCode}` : ""
      }`,
    );

    // Audit — fire-and-forget. Failures logged to stderr but never block the call.
    writeAudit(client, {
      toolId: name,
      callerCtx: ctx,
      input: args,
      result,
      startedAt: new Date(startedAt),
      completedAt: new Date(),
      requiredTier,
    }).catch((e) =>
      logStderr(`AUDIT WRITE FAILED for ${name}:`, (e as Error).message),
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result.output),
        },
      ],
      isError: result.state !== "completed",
    };
  });

  // --- Connect transport ---------------------------------------------------
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logStderr("ready");
}

function snakeName(s: string): string {
  return s
    .replace(/Error$/, "")
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .toLowerCase();
}

main().catch((err) => {
  process.stderr.write(`[supabase-ops] FATAL: ${(err as Error).message}\n`);
  process.stderr.write(`${(err as Error).stack ?? ""}\n`);
  process.exit(1);
});
