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
import { getClient, ensurePerHumanClient } from "./lib/supabase-client.ts";
import { establishPerHumanSession } from "./governance/per-human-session.ts";
import { notifyFounder } from "./lib/alert.ts";
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
      // Refreshes only if we win the credential lock AND the persisted token is near
      // expiry; self-heals a revoked session on an owner machine; alerts either way.
      const session = await establishPerHumanSession(env); // fail-closed
      client = session.client;
      accessToken = session.accessToken;
      logStderr(
        `per-human session established | role=${session.role}` +
          (session.selfHealed ? " | SELF-HEALED after a revoked token" : "") +
          (env.perHumanRefreshTokenFile ? " | credential file is the source of truth" : ""),
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

  /**
   * Per-call client. A FOLLOWER never auto-refreshes, so the token it booted with expires
   * within the hour; re-resolving per call lets it pick up whatever the leader last
   * persisted (one file read + a base64 decode when the token is still fresh). In
   * service-key mode this is the same cached client, every time.
   */
  const liveClient = async (): Promise<SupabaseClient> =>
    env.authMode === "per-human" && (env.perHumanRefreshToken || env.perHumanRefreshTokenFile)
      ? (await ensurePerHumanClient(env)).client
      : client;
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
    // Falls back to the boot client so the alert path below always has one. But a per-human
    // FOLLOWER's boot client is pinned to a token that expires within the hour and is never
    // refreshed, so writing the audit row on it would be denied by RLS — silently losing the
    // audit for exactly the credential-fault calls we most want recorded. Track usability.
    let conn: SupabaseClient = client;
    let connUsable = env.authMode !== "per-human";

    try {
      const tool = findToolDef(name);
      if (!tool) throw new UnknownToolError(name);

      // Gate 1 — HITL tier check (also enforces role_scope)
      const { requiredTier: t } = enforceTier(registry, name, ctx);
      requiredTier = t;

      // Gate 2 — per-call project_ref defense in depth
      assertProjectRefAllowed(env.url);

      // Gate 3 — a follower's access token expires within the hour; pick up the leader's.
      conn = await liveClient();
      connUsable = true;

      // Run handler
      result = await tool.handler(args, ctx, conn);
    } catch (err) {
      if (err instanceof ProjectRefViolationError) {
        // P0 — also write to ops.alerts
        writeProjectRefAlert(conn, ctx, name, err).catch((e) =>
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
    // Skipped when the per-human token could not be re-resolved: `conn` is then the expired
    // boot client and the INSERT would be denied by RLS, so we say so rather than pretend.
    if (!connUsable) {
      logStderr(`AUDIT SKIPPED for ${name}: no usable client (per-human credential fault)`);
    } else
    writeAudit(conn, {
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

main().catch(async (err) => {
  const msg = (err as Error).message;
  process.stderr.write(`[supabase-ops] FATAL: ${msg}\n`);
  process.stderr.write(`${(err as Error).stack ?? ""}\n`);

  // A guard that dies quietly is worse than no guard. On 2026-07-03 this exact path wrote
  // FATAL to a stderr nobody reads, and every per-human gate went dark for seven days.
  // establishPerHumanSession already alerts on a revoked credential; this catches every
  // OTHER fatal (bad env, unreachable DB, project-ref violation at boot). Best-effort:
  // notifyFounder never throws, so an alerting failure cannot mask the real error.
  //
  // A CredentialBusyError survived its retries: a live leader simply never published. That
  // is transient and self-correcting on the next launch — paging the founder for it is the
  // alert fatigue that makes real alarms invisible.
  const transient = (err as Error).name === "CredentialBusyError";
  if (transient) {
    process.stderr.write(`[supabase-ops] transient: another instance holds the credential lock. Retry.\n`);
  }
  if (!transient && !/session revoked/i.test(msg)) {
    const r = await notifyFounder(
      `🔴 Ritsu · supabase-ops KHÔNG BOOT ĐƯỢC\n⚠️ ${msg}\n📉 analytics + gbrain sẽ từ chối sau ~1h.`,
    );
    if (!r.delivered) process.stderr.write(`[supabase-ops] alert not delivered: ${r.reason}\n`);
  }
  process.exit(1);
});
