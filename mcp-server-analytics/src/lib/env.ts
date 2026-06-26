/**
 * Typed env loader for the supabase-analytics MCP.
 *
 * Fails fast at boot on:
 *   - Missing ANALYTICS_READER_DB_URL
 *   - A connection string whose DB user is NOT `analytics_reader`
 *     (defense: never connect to analytics as postgres/service_role)
 *   - A connection string that resolves to the PRODUCT project ref
 *     (the hard firewall line — this server must NEVER reach Product)
 *   - Unknown MCP_CALLER_ROLE
 *
 * Why parse + assert the ref/role here rather than trust .mcp.json:
 * .mcp.json is the founder-controlled wiring, but env can drift. A code-level
 * assertion that the connection is the least-priv analytics_reader role on the
 * analytics project (never product) is the chokepoint we want around a
 * credential that reads product-derived data.
 */

export class MissingEnvError extends Error {
  constructor(varName: string) {
    super(`MissingEnv: ${varName} is required to start supabase-analytics MCP`);
    this.name = "MissingEnvError";
  }
}

export class ProductRefInUrlError extends Error {
  constructor(detail: string) {
    super(
      `ProductRefInUrl: ANALYTICS_READER_DB_URL resolves to the Product project ` +
        `(${detail}). This server must NEVER reach Product Supabase. Refusing to start. ` +
        `Point it at the ritsu-analytics project as the analytics_reader role.`,
    );
    this.name = "ProductRefInUrlError";
  }
}

export class WrongDbRoleError extends Error {
  constructor(observed: string) {
    super(
      `WrongDbRole: ANALYTICS_READER_DB_URL connects as DB user "${observed}", ` +
        `but only the least-priv "analytics_reader" role is permitted. ` +
        `Never give this MCP a postgres/service_role connection.`,
    );
    this.name = "WrongDbRoleError";
  }
}

export class InvalidRoleError extends Error {
  constructor(role: string) {
    super(
      `InvalidRole: MCP_CALLER_ROLE="${role}" is not a recognized role. See governance/ROLES.md.`,
    );
    this.name = "InvalidRoleError";
  }
}

export class MissingPerHumanCredentialError extends Error {
  constructor() {
    super(
      "MissingPerHumanCredential: RITSU_AUTH_MODE=per-human requires " +
        "RITSU_OPERATOR_REFRESH_TOKEN_FILE (the credential file supabase-ops persists, preferred) " +
        "or RITSU_OPERATOR_ACCESS_TOKEN (inline). Without either, every analytics call is denied.",
    );
    this.name = "MissingPerHumanCredentialError";
  }
}

/**
 * Authority model (capability multi-user-auth, Sprint 2). Mirrors mcp-server.
 *   - 'service-key' (default): unchanged. The MCP_CALLER_ROLE allowlist gates.
 *   - 'per-human': gate by the operator's VERIFIED tier (read from the access
 *     token supabase-ops persists to the credential file). owner/admin allowed;
 *     user/unknown denied. The analytics_reader DB role stays the real boundary.
 */
export type AuthMode = "service-key" | "per-human";

/** The DB user (role) the connection MUST authenticate as. */
export const REQUIRED_DB_ROLE = "analytics_reader";

/** Roles defined in governance/ROLES.md (mirror; checked at boot for a clean error). */
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

export interface AnalyticsServerEnv {
  /** The full connection string (contains the password — NEVER log it raw). */
  dbUrl: string;
  /** Project ref derived from the URL, or null if undetectable from host/user. */
  projectRef: string | null;
  /** The DB role from the URL username (asserted === analytics_reader). */
  dbRole: string;
  /** Pooler/host for display + ssl heuristic. */
  host: string;
  callerRole: string;
  callerSessionId: string;
  /** When true, verify the server TLS cert chain. Default false (Supabase pooler). */
  sslStrict: boolean;
  /** Authority model — defaults to 'service-key' (current behavior). */
  authMode: AuthMode;
  /** Per-human Supabase Auth ACCESS token (inline; live-validation / direct path). */
  perHumanAccessToken: string | null;
  /**
   * Path to the credential file supabase-ops persists ({refresh_token, access_token}).
   * Per-human reads the access_token from it to decode the operator tier (read-only;
   * never refreshes — supabase-ops is the sole refresher).
   */
  perHumanRefreshTokenFile: string | null;
}

interface ParsedConn {
  dbRole: string;
  ref: string | null;
  host: string;
}

/**
 * Extract { dbRole, ref, host } from a Postgres connection string.
 *
 * Supports both Supabase shapes:
 *   - Session/Transaction pooler: user = "analytics_reader.<ref>",
 *     host = "aws-N-region.pooler.supabase.com"  → ref from the user suffix.
 *   - Direct: user = "analytics_reader",
 *     host = "db.<ref>.supabase.co"              → ref from the host.
 *
 * `ref` is null when neither shape matches (e.g. a non-Supabase host); callers
 * then fall back to the substring guard against PRODUCT_PROJECT_REF.
 */
export function parseConnString(url: string): ParsedConn {
  const u = new URL(url);
  const rawUser = decodeURIComponent(u.username);
  const host = u.hostname;

  // Pooler: "<role>.<ref>"
  const poolerUser = rawUser.match(/^([a-z0-9_]+)\.([a-z0-9]{20})$/);
  if (poolerUser) {
    return { dbRole: poolerUser[1]!, ref: poolerUser[2]!, host };
  }
  // Direct host: db.<ref>.supabase.co
  const directHost = host.match(/^db\.([a-z0-9]{20})\.supabase\.co$/);
  if (directHost) {
    return { dbRole: rawUser, ref: directHost[1]!, host };
  }
  return { dbRole: rawUser, ref: null, host };
}

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AnalyticsServerEnv {
  const dbUrl = env.ANALYTICS_READER_DB_URL?.trim();
  if (!dbUrl) throw new MissingEnvError("ANALYTICS_READER_DB_URL");

  let parsed: ParsedConn;
  try {
    parsed = parseConnString(dbUrl);
  } catch {
    throw new MissingEnvError(
      "ANALYTICS_READER_DB_URL is set but is not a valid postgres connection URL",
    );
  }

  // Gate 1 — must connect as the least-priv analytics_reader role.
  if (parsed.dbRole !== REQUIRED_DB_ROLE) {
    throw new WrongDbRoleError(parsed.dbRole);
  }

  // Gate 2 — must NOT be the Product project.
  const productRef = env.PRODUCT_PROJECT_REF?.trim();
  if (productRef) {
    if (parsed.ref === productRef || dbUrl.includes(productRef)) {
      throw new ProductRefInUrlError(`matches PRODUCT_PROJECT_REF=${productRef}`);
    }
  }
  // Gate 3 — if we know the analytics ref, the URL must resolve to it.
  const analyticsRef = env.ANALYTICS_PROJECT_REF?.trim();
  if (analyticsRef && parsed.ref && parsed.ref !== analyticsRef) {
    throw new ProductRefInUrlError(
      `ref="${parsed.ref}" is neither the analytics project (${analyticsRef}) — refusing`,
    );
  }

  const callerRole = (env.MCP_CALLER_ROLE || "gps").trim();
  if (!(KNOWN_ROLES as readonly string[]).includes(callerRole)) {
    throw new InvalidRoleError(callerRole);
  }

  const callerSessionId =
    env.MCP_CALLER_SESSION_ID?.trim() ||
    `cc-${process.pid}-${Date.now().toString(36)}`;

  const sslStrict =
    env.ANALYTICS_READER_SSL_STRICT === "1" ||
    env.ANALYTICS_READER_SSL_STRICT === "true";

  // --- Authority model (capability multi-user-auth, Sprint 2) ----------------
  // Default 'service-key' = current behavior, byte-for-byte (the role allowlist
  // gates). 'per-human' gates by the operator's verified tier instead.
  const authMode = (env.RITSU_AUTH_MODE?.trim() || "service-key") as AuthMode;
  if (authMode !== "service-key" && authMode !== "per-human") {
    throw new MissingEnvError(
      `RITSU_AUTH_MODE must be 'service-key' or 'per-human' (got "${authMode}")`,
    );
  }
  const perHumanAccessToken = env.RITSU_OPERATOR_ACCESS_TOKEN?.trim() || null;
  const perHumanRefreshTokenFile = env.RITSU_OPERATOR_REFRESH_TOKEN_FILE?.trim() || null;
  if (authMode === "per-human" && !perHumanAccessToken && !perHumanRefreshTokenFile) {
    // The credential SOURCE must be configured. The token need not be present yet
    // (supabase-ops persists it a moment after boot); per-call resolution is lazy
    // + fail-closed. But neither source set at all is a misconfiguration → fail fast.
    throw new MissingPerHumanCredentialError();
  }

  return {
    dbUrl,
    projectRef: parsed.ref,
    dbRole: parsed.dbRole,
    host: parsed.host,
    callerRole,
    callerSessionId,
    sslStrict,
    authMode,
    perHumanAccessToken,
    perHumanRefreshTokenFile,
  };
}

/** Render env for stderr boot log. NEVER logs the password / raw URL / token. */
export function summarizeEnv(e: AnalyticsServerEnv): string {
  return [
    `host=${e.host}`,
    `db_role=${e.dbRole}`,
    `project_ref=${e.projectRef ?? "(unresolved)"}`,
    `caller_role=${e.callerRole}`,
    `auth_mode=${e.authMode}`,
    `operator_access_token=${e.perHumanAccessToken ? "set(******)" : "unset"}`,
    `operator_refresh_file=${e.perHumanRefreshTokenFile ?? "unset"}`,
    `session=${e.callerSessionId}`,
    `ssl_strict=${e.sslStrict}`,
  ].join(" | ");
}
