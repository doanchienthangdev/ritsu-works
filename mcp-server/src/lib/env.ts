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

export interface ServerEnv {
  url: string;
  projectRef: string;
  serviceKey: string | null;
  anonKey: string | null;
  callerRole: KnownRole;
  callerSessionId: string;
  /** Repo root absolute path — needed by hitl-tier-check to load knowledge/mcp-tools.yaml */
  repoRoot: string;
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

  const repoRoot =
    env.RITSU_REPO_ROOT?.trim() ||
    // Default: assume we're invoked with CWD at repo root (which is how .mcp.json
    // resolution works — Claude Code spawns relative to where .mcp.json was found).
    process.cwd();

  return {
    url,
    projectRef,
    serviceKey,
    anonKey,
    callerRole,
    callerSessionId,
    repoRoot,
  };
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
    `session=${e.callerSessionId}`,
    `repo_root=${e.repoRoot}`,
  ].join(" | ");
}
