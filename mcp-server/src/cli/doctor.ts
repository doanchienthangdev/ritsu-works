#!/usr/bin/env tsx
/**
 * supabase-ops MCP doctor — diagnostic CLI.
 *
 * Run via `npm --prefix mcp-server run doctor` from repo root, or via the
 * /mcp-doctor slash command in Claude Code.
 *
 * Output is colorized stderr-style summary. Exit code 0 if HEALTHY, 1 otherwise.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Auto-source `runtime/secrets/.env.local` if SUPABASE_URL not already in env.
 * This makes `/mcp-doctor` work from any worktree without bash sourcing.
 *
 * Tries (in order):
 *   1. <repoRoot>/runtime/secrets/.env.local
 *   2. /Users/doanchienthang/ritsu-works/runtime/secrets/.env.local (canonical root,
 *      because runtime/secrets/ is gitignored and only exists at the canonical repo)
 */
function autoSourceEnvLocal(repoRoot: string): { sourcedFrom: string | null } {
  if (process.env.SUPABASE_URL || process.env.SUPABASE_OPS_URL) {
    return { sourcedFrom: null }; // already set, don't overwrite
  }
  const candidates = [
    join(repoRoot, "runtime", "secrets", ".env.local"),
    "/Users/doanchienthang/ritsu-works/runtime/secrets/.env.local",
  ];
  for (const p of candidates) {
    if (!existsSync(p)) continue;
    try {
      const content = readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        // Strip surrounding quotes
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
      return { sourcedFrom: p };
    } catch {
      // skip on read error
    }
  }
  return { sourcedFrom: null };
}
import {
  ALLOWED_PROJECT_REFS,
  extractProjectRef,
  findRepoRoot,
  loadEnv,
  MissingEnvError,
  ProjectRefMismatchError,
  summarizeEnv,
} from "../lib/env.ts";
import { getClient, resetClient } from "../lib/supabase-client.ts";
import { loadRegistry } from "../governance/hitl-tier-check.ts";
import { resolveRole } from "../governance/role-resolver.ts";
import { TOOLS } from "../tools/index.ts";

type CheckStatus = "PASS" | "FAIL" | "WARN" | "SKIP";

interface Check {
  name: string;
  status: CheckStatus;
  detail?: string;
}

async function runChecks(): Promise<Check[]> {
  const checks: Check[] = [];

  // 1. .mcp.json presence at repo root.
  //    Use findRepoRoot walk-up to handle `npm --prefix mcp-server run doctor`
  //    which sets CWD to `mcp-server/` before script runs.
  const repoRoot =
    process.env.RITSU_REPO_ROOT?.trim() ||
    findRepoRoot(process.cwd()) ||
    process.cwd();
  const mcpJsonPath = join(repoRoot, ".mcp.json");
  if (existsSync(mcpJsonPath)) {
    checks.push({ name: ".mcp.json found", status: "PASS", detail: mcpJsonPath });
  } else {
    checks.push({
      name: ".mcp.json found",
      status: "WARN",
      detail: `not at ${mcpJsonPath} — Claude Code will not auto-load supabase-ops`,
    });
  }

  // Auto-source env BEFORE loadEnv check — runtime/secrets/.env.local is
  // gitignored and not picked up by npm subprocess inheritance otherwise.
  const sourced = autoSourceEnvLocal(repoRoot);
  if (sourced.sourcedFrom) {
    checks.push({
      name: "env auto-sourced",
      status: "PASS",
      detail: sourced.sourcedFrom,
    });
  }

  // 2. Env vars present + valid
  let env;
  try {
    env = loadEnv();
    checks.push({
      name: "env loaded",
      status: "PASS",
      detail: summarizeEnv(env),
    });
  } catch (err) {
    checks.push({
      name: "env loaded",
      status: "FAIL",
      detail:
        err instanceof MissingEnvError || err instanceof ProjectRefMismatchError
          ? err.message
          : `unexpected: ${(err as Error).message}`,
    });
    return checks; // can't proceed without env
  }

  // 3. project_ref is in allowlist (env loader already checked, but make it visible)
  const ref = extractProjectRef(env.url);
  if (ref && (ALLOWED_PROJECT_REFS as readonly string[]).includes(ref)) {
    checks.push({
      name: "project_ref allowlisted",
      status: "PASS",
      detail: `${ref} ∈ [${ALLOWED_PROJECT_REFS.join(", ")}]`,
    });
  } else {
    checks.push({
      name: "project_ref allowlisted",
      status: "FAIL",
      detail: `ref=${ref ?? "(unknown)"} NOT in allowlist`,
    });
  }

  // 4. Registry loadable
  let registry;
  try {
    registry = loadRegistry(env.repoRoot);
    checks.push({
      name: "mcp-tools.yaml loaded",
      status: "PASS",
      detail: `version=${registry.version}, tools=${registry.tools.length}`,
    });
  } catch (err) {
    checks.push({
      name: "mcp-tools.yaml loaded",
      status: "FAIL",
      detail: (err as Error).message,
    });
  }

  // 5. Role resolvable
  try {
    const ctx = resolveRole(env.callerRole, env.callerSessionId);
    checks.push({
      name: "role resolved",
      status: "PASS",
      detail: `role=${ctx.role}, hitl_max=${ctx.hitlMaxTier}`,
    });
  } catch (err) {
    checks.push({
      name: "role resolved",
      status: "FAIL",
      detail: (err as Error).message,
    });
  }

  // 6. Registered tools
  checks.push({
    name: "tools registered",
    status: TOOLS.length > 0 ? "PASS" : "FAIL",
    detail: TOOLS.map((t) => t.name).join(", "),
  });

  // 7. Supabase connectivity — SELECT count from ops.mcp_calls
  // (skipped if no service key — anon-only path may not see ops schema)
  if (!env.serviceKey) {
    checks.push({
      name: "supabase connectivity",
      status: "SKIP",
      detail: "no service key configured; skipping live DB ping",
    });
  } else {
    try {
      resetClient(); // ensure fresh
      const client = getClient(env);
      const { error, count } = await client
        .schema("ops").from("mcp_calls" as never)
        .select("*", { count: "exact", head: true });
      if (error) {
        checks.push({
          name: "supabase connectivity",
          status: "FAIL",
          detail: error.message,
        });
      } else {
        checks.push({
          name: "supabase connectivity",
          status: "PASS",
          detail: `ops.mcp_calls row count: ${count ?? "unknown"}`,
        });
      }
    } catch (err) {
      checks.push({
        name: "supabase connectivity",
        status: "FAIL",
        detail: (err as Error).message,
      });
    }
  }

  // 8. ops.ops_run_select RPC presence (Phase 1 dep)
  if (env.serviceKey) {
    try {
      const client = getClient(env);
      const { error } = await client.schema("ops").rpc("ops_run_select", {
        sql_text: "SELECT 1 AS doctor_ping",
        bind_params: [],
        row_limit: 1,
      });
      if (error) {
        const code = (error as { code?: string }).code;
        if (code === "42883" || /function .* does not exist/i.test(error.message)) {
          checks.push({
            name: "ops.ops_run_select RPC",
            status: "FAIL",
            detail:
              "RPC not deployed. Apply migration 00026_mcp_query_rpc.sql via `supabase db push --linked --yes`.",
          });
        } else {
          checks.push({
            name: "ops.ops_run_select RPC",
            status: "WARN",
            detail: `RPC exists but ping returned: ${error.message}`,
          });
        }
      } else {
        checks.push({
          name: "ops.ops_run_select RPC",
          status: "PASS",
          detail: "ping returned 1 row",
        });
      }
    } catch (err) {
      checks.push({
        name: "ops.ops_run_select RPC",
        status: "FAIL",
        detail: (err as Error).message,
      });
    }
  }

  // 9. Today's audit row count (informational)
  if (env.serviceKey) {
    try {
      const client = getClient(env);
      const today = new Date().toISOString().slice(0, 10);
      const { count } = await client
        .schema("ops").from("mcp_calls" as never)
        .select("*", { count: "exact", head: true })
        .gte("called_at", `${today}T00:00:00Z`);
      checks.push({
        name: "today's audit rows",
        status: "PASS",
        detail: `${count ?? 0} calls audited since ${today}T00:00:00Z`,
      });
    } catch (err) {
      checks.push({
        name: "today's audit rows",
        status: "WARN",
        detail: (err as Error).message,
      });
    }
  }

  return checks;
}

function emoji(s: CheckStatus): string {
  switch (s) {
    case "PASS":
      return "[OK]";
    case "FAIL":
      return "[FAIL]";
    case "WARN":
      return "[WARN]";
    case "SKIP":
      return "[--]";
  }
}

function render(checks: Check[]): string {
  const lines: string[] = [];
  lines.push("supabase-ops MCP doctor");
  lines.push("─".repeat(50));
  for (const c of checks) {
    lines.push(`${emoji(c.status)} ${c.name}`);
    if (c.detail) {
      const wrapped = c.detail.split("\n").map((s) => `       ${s}`);
      lines.push(...wrapped);
    }
  }
  lines.push("─".repeat(50));
  const failed = checks.filter((c) => c.status === "FAIL").length;
  const warned = checks.filter((c) => c.status === "WARN").length;
  if (failed > 0) {
    lines.push(`Status: UNHEALTHY (${failed} failed, ${warned} warnings)`);
  } else if (warned > 0) {
    lines.push(`Status: DEGRADED (${warned} warnings)`);
  } else {
    lines.push("Status: HEALTHY");
  }
  return lines.join("\n");
}

async function main(): Promise<void> {
  const checks = await runChecks();
  process.stdout.write(render(checks) + "\n");
  process.exit(checks.some((c) => c.status === "FAIL") ? 1 : 0);
}

main().catch((err) => {
  process.stderr.write(`doctor crashed: ${(err as Error).message}\n${(err as Error).stack ?? ""}\n`);
  process.exit(1);
});
