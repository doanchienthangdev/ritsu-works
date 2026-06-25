/**
 * Typed env loader for supabase-ops MCP shim.
 *
 * Fails fast at server boot on:
 *   - Missing SUPABASE_OPS_URL
 *   - Missing both service + anon keys
 *   - URL whose project_ref is NOT in ALLOWED_PROJECT_REFS (defense vs. ever pointing
 *     at Product Supabase)
 *   - Unknown MCP_CALLER_ROLE (must be a role defined in governance/ROLES.md)
 *
 * Why a hardcoded allowlist of project_refs:
 * The whole point of the shim is to be the chokepoint that guarantees Operating AI
 * never writes to Product Supabase. An env-only check is not enough — env can drift.
 * A code-level allowlist requires a deliberate code change (PR) to add a project ref,
 * which is exactly the friction we want around something this dangerous.
 */

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export class MissingEnvError extends Error {
  constructor(varName: string) {
    super(`MissingEnv: ${varName} is required to start supabase-ops MCP server`);
    this.name = "MissingEnvError";
  }
}

export class ProjectRefMismatchError extends Error {
  constructor(observed: string, allowed: readonly string[]) {
    super(
      `ProjectRefMismatch: Supabase URL project_ref="${observed}" is NOT in allowlist [${allowed.join(", ")}]. ` +
        `This is the chokepoint that prevents Operating AI from ever pointing at Product Supabase. ` +
        `If you need to add a project, edit ALLOWED_PROJECT_REFS in src/lib/env.ts and open a Tier C PR.`,
    );
    this.name = "ProjectRefMismatchError";
  }
}

export class InvalidRoleError extends Error {
  constructor(role: string, allowed: readonly string[]) {
    super(
      `InvalidRole: MCP_CALLER_ROLE="${role}" is not a recognized role. ` +
        `Allowed: ${allowed.slice(0, 5).join(", ")}, ...(${allowed.length} total). ` +
        `See governance/ROLES.md.`,
    );
    this.name = "InvalidRoleError";
  }
}

/**
 * The ONE allowlist of Supabase project refs this shim is permitted to talk to.
 *
 * - `mntobbmieuoaxipnjaau` → ritsu-ops (the Operating AI Supabase project, ap-south-1)
 *
 * Product Supabase project (`ixfvqxnohlmayzuesrrq` / `ritsu`) MUST NEVER appear here.
 * Per governance/HITL.md, even a PR adding Product is D-MAX.
 */
export const ALLOWED_PROJECT_REFS = ["mntobbmieuoaxipnjaau"] as const;

/**
 * Roles defined in governance/ROLES.md.
 * Source of truth is that file; this list is checked at boot.
 * Keep in sync — `scripts/cross-tier/validate-mcp-tools-skill-refs.cjs` (TODO-MCP-2)
 * will verify drift in CI eventually.
 */
export const KNOWN_ROLES = [
  "founder",
  "cofounder",
  "gps",
  "growth-orchestrator",
  "support-agent",
  "content-drafter",
  "code-reviewer",
  "etl-runner",
  "trust-safety",
  "backoffice-clerk",
  "gtm-orchestrator",
  "product-orchestrator",
  "customer-lead",
  "cs-coach",
  "retention-watcher",
  "escalation-router",
  "feedback-aggregator",
  "founder-coach",
  "hitl-router",
  "health-tracker",
  "metrics-curator",
  "alert-router",
  "experiment-analyst",
] as const;

export type KnownRole = (typeof KNOWN_ROLES)[number];

/**
 * Authority model (capability multi-user-auth).
 *   - 'service-key' (default): the current behavior. Connect as service_role,
 *     authority = the self-asserted MCP_CALLER_ROLE, reads via the SECURITY
 *     DEFINER RPC (RLS bypassed).
 *   - 'per-human': connect as `authenticated` carrying a per-human Supabase Auth
 *     JWT; authority = the verified app_metadata.tier claim; reads via the
 *     SECURITY INVOKER RPC so per-tier RLS enforces. MCP_CALLER_ROLE is NOT an
 *     authority source in this mode.
 */
export type AuthMode = "service-key" | "per-human";

export interface ServerEnv {
  url: string;
  projectRef: string;
  serviceKey: string | null;
  anonKey: string | null;
  callerRole: KnownRole;
  callerSessionId: string;
  /** Repo root absolute path — needed by hitl-tier-check to load knowledge/mcp-tools.yaml */
  repoRoot: string;
  /** Authority model — defaults to 'service-key' (current behavior). */
  authMode: AuthMode;
  /**
   * Per-human Supabase Auth ACCESS token (JWT). Short-lived (~1h). Usable
   * standalone for a brief window; prefer the refresh token for daily use.
   */
  perHumanAccessToken: string | null;
  /**
   * Per-human Supabase Auth REFRESH token (inline). Seed for the first boot; the
   * MCP exchanges it for a fresh ~1h access token + auto-refreshes. Sprint 2.
   */
  perHumanRefreshToken: string | null;
  /**
   * Path to a local credential file ({refresh_token}) — the PRODUCTION per-human
   * path. Supabase rotates refresh tokens on use, so a static inline token goes
   * stale after one session. With a file, the MCP reads the current token from it
   * AND persists each rotated token back, so per-human survives restarts. The
   * inline token (if also set) seeds the file on first boot. Sprint 2 part 1.5.
   */
  perHumanRefreshTokenFile: string | null;
}

/**
 * Extract project_ref from a Supabase URL like
 *   https://mntobbmieuoaxipnjaau.supabase.co
 *   ─►  "mntobbmieuoaxipnjaau"
 *
 * Returns null if the URL doesn't match the expected pattern.
 */
export function extractProjectRef(url: string): string | null {
  try {
    const u = new URL(url);
    const match = u.hostname.match(/^([a-z0-9]{20})\.supabase\.co$/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Load + validate env. Throws on any boot-time invariant violation.
 *
 * Pass a custom `env` object for testing; defaults to `process.env`.
 * Pass a custom `repoRoot` for testing; defaults to env.RITSU_REPO_ROOT.
 */
export function loadEnv(env: NodeJS.ProcessEnv = process.env): ServerEnv {
  // Accept explicit SUPABASE_OPS_* names first (preferred — disambiguates from
  // any future Product Supabase env). Fall back to generic SUPABASE_* names
  // which is the existing convention in runtime/secrets/.env.local.
  //
  // The project_ref allowlist below is the load-bearing safety check:
  // if SUPABASE_URL ever points at Product Supabase, the URL guard will
  // reject it BEFORE the shim opens any connection.
  const url = env.SUPABASE_OPS_URL ?? env.SUPABASE_URL;
  if (!url) throw new MissingEnvError("SUPABASE_OPS_URL or SUPABASE_URL");

  const projectRef = extractProjectRef(url);
  if (!projectRef) {
    throw new MissingEnvError(
      `SUPABASE_OPS_URL/SUPABASE_URL is set but does not match https://<20-char-ref>.supabase.co — got: ${url}`,
    );
  }

  if (!(ALLOWED_PROJECT_REFS as readonly string[]).includes(projectRef)) {
    throw new ProjectRefMismatchError(projectRef, ALLOWED_PROJECT_REFS);
  }

  const serviceKey =
    env.SUPABASE_OPS_SERVICE_KEY?.trim() || env.SUPABASE_SERVICE_KEY?.trim() || null;
  const anonKey =
    env.SUPABASE_OPS_ANON_KEY?.trim() || env.SUPABASE_ANON_KEY?.trim() || null;
  if (!serviceKey && !anonKey) {
    throw new MissingEnvError(
      "SUPABASE_OPS_SERVICE_KEY/SUPABASE_SERVICE_KEY or SUPABASE_OPS_ANON_KEY/SUPABASE_ANON_KEY (at least one required)",
    );
  }

  const callerRoleRaw = (env.MCP_CALLER_ROLE || "gps").trim();
  if (!(KNOWN_ROLES as readonly string[]).includes(callerRoleRaw)) {
    throw new InvalidRoleError(callerRoleRaw, KNOWN_ROLES);
  }
  const callerRole = callerRoleRaw as KnownRole;

  const callerSessionId =
    env.MCP_CALLER_SESSION_ID?.trim() ||
    `cc-${process.pid}-${Date.now().toString(36)}`;

  // --- Authority model (capability multi-user-auth) ----------------------
  // Default 'service-key' = current behavior, byte-for-byte. 'per-human'
  // requires a per-human JWT + anon key (connects as `authenticated`).
  const authMode = (env.RITSU_AUTH_MODE?.trim() || "service-key") as AuthMode;
  if (authMode !== "service-key" && authMode !== "per-human") {
    throw new MissingEnvError(
      `RITSU_AUTH_MODE must be 'service-key' or 'per-human' (got "${authMode}")`,
    );
  }
  const perHumanAccessToken = env.RITSU_OPERATOR_ACCESS_TOKEN?.trim() || null;
  const perHumanRefreshToken = env.RITSU_OPERATOR_REFRESH_TOKEN?.trim() || null;
  const perHumanRefreshTokenFile = env.RITSU_OPERATOR_REFRESH_TOKEN_FILE?.trim() || null;
  if (authMode === "per-human") {
    if (!perHumanAccessToken && !perHumanRefreshToken && !perHumanRefreshTokenFile) {
      throw new MissingEnvError(
        "RITSU_OPERATOR_REFRESH_TOKEN_FILE (preferred — survives restarts) or RITSU_OPERATOR_REFRESH_TOKEN or RITSU_OPERATOR_ACCESS_TOKEN is required when RITSU_AUTH_MODE=per-human",
      );
    }
    if (!anonKey) {
      throw new MissingEnvError(
        "SUPABASE_OPS_ANON_KEY/SUPABASE_ANON_KEY (per-human mode connects as 'authenticated' via the anon key + operator JWT; service_role is not used)",
      );
    }
  }

  const repoRoot =
    env.RITSU_REPO_ROOT?.trim() ||
    // When invoked via `npm --prefix mcp-server run doctor`, npm sets the
    // process CWD to `mcp-server/`. Walk up looking for a marker file
    // (knowledge/manifest.yaml or .mcp.json) to find the actual repo root.
    findRepoRoot(process.cwd()) ||
    process.cwd();

  return {
    url,
    projectRef,
    serviceKey,
    anonKey,
    callerRole,
    callerSessionId,
    repoRoot,
    authMode,
    perHumanAccessToken,
    perHumanRefreshToken,
    perHumanRefreshTokenFile,
  };
}

/**
 * Walk up from `start` looking for a repo-root marker file.
 * Exported so doctor.ts (and any other tool) can use the same logic.
 *
 * Markers (in priority order):
 *   1. `knowledge/manifest.yaml` — canonical Tier 1 file
 *   2. `.mcp.json`               — present at repo root per Phase 1
 *
 * Returns the absolute path of the first ancestor containing a marker, or
 * `null` if walked all the way to the filesystem root with no hit.
 *
 * This solves: `npm --prefix mcp-server run doctor` sets CWD to mcp-server/
 * before script runs, so `process.cwd()` returns the WRONG directory for
 * repo-relative file lookups. Walking up to a marker gives the right answer.
 */
export function findRepoRoot(start: string): string | null {
  let current = resolve(start);
  while (true) {
    if (
      existsSync(join(current, "knowledge", "manifest.yaml")) ||
      existsSync(join(current, ".mcp.json"))
    ) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) return null; // hit filesystem root
    current = parent;
  }
}

/**
 * Render env for stderr boot log. NEVER logs the actual keys.
 */
export function summarizeEnv(e: ServerEnv): string {
  return [
    `url=${e.url}`,
    `project_ref=${e.projectRef}`,
    `service_key=${e.serviceKey ? "set(******)" : "unset"}`,
    `anon_key=${e.anonKey ? "set(******)" : "unset"}`,
    `role=${e.callerRole}`,
    `auth_mode=${e.authMode}`,
    `operator_access_token=${e.perHumanAccessToken ? "set(******)" : "unset"}`,
    `operator_refresh_token=${e.perHumanRefreshToken ? "set(******)" : "unset"}`,
    `operator_refresh_file=${e.perHumanRefreshTokenFile ?? "unset"}`,
    `session=${e.callerSessionId}`,
    `repo_root=${e.repoRoot}`,
  ].join(" | ");
}
