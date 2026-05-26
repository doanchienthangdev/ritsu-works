/**
 * `resolver_find` tool — Mode A2 JIT resolver for ritsu-works workforce catalog.
 *
 * Per spec `wiki/capabilities/resolver-v3-jit-loading/spec.md` (iter4, 2026-05-25):
 *   - NO LLM call in MCP subprocess (per external-source/anthropic-api policy)
 *   - Returns top-20 keyword-pre-filtered enriched candidates
 *   - Session model does the final ranking by reading the candidates
 *   - Per-role filter at tool level (cherry-pick #12)
 *   - Per-session circuit breaker (20 finds/session/4h, cherry-pick #11 cost-loop fix)
 *   - Batched recency join (single SQL IN(...), Finding 1 — Sprint 3 baseline)
 *   - Composition graph for primary match (cherry-pick baseline)
 *   - Degraded fallback if catalog corrupt (Finding 5)
 *   - Audit row to ops.resolver_decisions mode='A2' (writeAudit handles mcp_calls separately)
 *
 * Node interop: uses require() to call existing .cjs engines (per Q3.4 decision).
 * Single source of truth — same keyword-fallback logic powers /resolver Mode C and MCP.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CallerContext, ToolResult } from "../types.ts";
import { MCPToolError } from "../types.ts";
import { createRequire } from "node:module";

// Node interop bridge — load .cjs catalog engines from this .ts module.
// tsconfig has esModuleInterop + allowJs; this pattern works at runtime via Node's require.
const cjsRequire = createRequire(import.meta.url);
const catalogLoader = cjsRequire("../../../scripts/resolver-v2/catalog-loader.cjs");
const keywordFallback = cjsRequire("../../../scripts/resolver-v2/keyword-fallback.cjs");

// v3.0.1 PRE-WARM: eager catalog load at module init (= MCP subprocess boot).
// Eliminates 1.5s cold-start latency on first find() call per session.
// Failure is non-fatal — first find() call will retry via lazy path with degraded fallback.
try {
  catalogLoader.loadCatalog({});
  // Note: cannot use logStderr here (no SERVER_NAME context); silent success.
} catch {
  // Silent fail at boot. resolver-find handler will surface CATALOG_CORRUPT via degraded mode.
}

const MAX_INTENT_LEN = 500;
const DEFAULT_LIMIT = 20;
const HARD_CAP_LIMIT = 20;
const SESSION_HARD_CAP = 20;
const SESSION_WARN_THRESHOLD = 15;
const SESSION_RESET_MS = 4 * 60 * 60 * 1000; // 4h

const VALID_KINDS = [
  "skill", "command", "agent", "persona", "mcp",
  "wiki", "sop", "capability", "workflow", "schedule", "hook",
  "page", "view", "metric", "runbook", "external-source",
];

// In-MCP-process per-session circuit breaker state.
// Per spec §4.3: SESSION_CAP_EXCEEDED at call 21 within 4h window.
interface SessionState {
  count: number;
  windowStart: number;
}
const SESSION_LIMITS = new Map<string, SessionState>();

function checkSessionCap(sessionId: string): { allow: boolean; count: number } {
  const now = Date.now();
  let state = SESSION_LIMITS.get(sessionId);
  if (!state || now - state.windowStart > SESSION_RESET_MS) {
    state = { count: 0, windowStart: now };
    SESSION_LIMITS.set(sessionId, state);
  }
  state.count++;
  return { allow: state.count <= SESSION_HARD_CAP, count: state.count };
}

// For tests: clear all session state (so test runs don't leak)
export function _resetSessionLimits(): void {
  SESSION_LIMITS.clear();
}

export const resolverFindDescription =
  `JIT resolver — find top-N workforce recipients matching natural-language intent. ` +
  `Inputs: { intent: string (1-500 chars), kind?: one-of-16-kinds, role?: caller-role-override, ` +
  `limit?: 1-20 (default 20), include_composition?: bool (default true), include_recency?: bool (default true) }. ` +
  `Returns top-N keyword-pre-filtered candidates with FULL when_to_use + composes_with + recency + role_scope. ` +
  `Session model does final ranking by reading the candidates (no API key needed; session billing only).`;

export const resolverFindInputSchema = {
  type: "object",
  required: ["intent"],
  properties: {
    intent: {
      type: "string",
      minLength: 1,
      maxLength: MAX_INTENT_LEN,
      description: "Natural-language query describing what recipient is needed.",
    },
    kind: {
      type: "string",
      enum: VALID_KINDS,
      description: "Filter to one recipient kind (skill|command|agent|persona|mcp|wiki|sop|capability|workflow|schedule|hook|page|view|metric|runbook|external-source).",
    },
    role: {
      type: "string",
      description: "Override caller role for role_scope filter (default: MCP_CALLER_ROLE env).",
    },
    limit: {
      type: "integer",
      minimum: 1,
      maximum: HARD_CAP_LIMIT,
      default: DEFAULT_LIMIT,
      description: "Max recipients returned (1-20).",
    },
    include_composition: {
      type: "boolean",
      default: true,
      description: "If true, return composes_with graph for each match.",
    },
    include_recency: {
      type: "boolean",
      default: true,
      description: "If true, join ops.agent_runs for recent invocation signal.",
    },
  },
} as const;

interface ResolverFindInput {
  intent: string;
  kind?: string;
  role?: string;
  limit: number;
  include_composition: boolean;
  include_recency: boolean;
}

function parseInput(raw: unknown): ResolverFindInput {
  if (!raw || typeof raw !== "object") {
    throw new MCPToolError("invalid_input", "resolver_find: input must be an object");
  }
  const obj = raw as Record<string, unknown>;
  const intent = obj.intent;
  if (typeof intent !== "string") {
    throw new MCPToolError("invalid_input", "resolver_find: `intent` (string) is required");
  }
  if (intent.length === 0 || intent.length > MAX_INTENT_LEN) {
    throw new MCPToolError(
      "invalid_input",
      `resolver_find: intent length must be 1..${MAX_INTENT_LEN}, got ${intent.length}`,
    );
  }
  const kind = obj.kind;
  if (kind !== undefined) {
    if (typeof kind !== "string" || !VALID_KINDS.includes(kind)) {
      throw new MCPToolError(
        "unknown_kind",
        `resolver_find: kind must be one of ${VALID_KINDS.join("|")}, got "${kind}"`,
      );
    }
  }
  const role = typeof obj.role === "string" ? obj.role : undefined;
  let limit = typeof obj.limit === "number" ? obj.limit : DEFAULT_LIMIT;
  if (limit < 1 || limit > HARD_CAP_LIMIT) {
    throw new MCPToolError(
      "invalid_input",
      `resolver_find: limit must be 1..${HARD_CAP_LIMIT}, got ${limit}`,
    );
  }
  const include_composition = obj.include_composition !== false; // default true
  const include_recency = obj.include_recency !== false; // default true
  return {
    intent,
    kind: kind as string | undefined,
    role,
    limit,
    include_composition,
    include_recency,
  };
}

interface CandidateRanked {
  recipient: {
    id: string;
    kind: string;
    when_to_use: string;
    invoke: string;
    composes_with: string[];
    aliases: string[];
    role_scope: string[];
    status: string;
    pillar?: string | null;
    disambiguator?: string | null;
  };
  confidence: number;
  matchedToken: string;
}

interface MatchOutput {
  id: string;
  kind: string;
  keyword_score: number;
  when_to_use: string;
  invoke: string;
  composes_with?: string[];
  role_scope: string[];
  status: string;
  pillar?: string;
  aliases?: string[];
  disambiguator?: string;
  recency?: {
    invocations_last_7d_by_role: number;
    last_success_ts: string | null;
    last_failure_ts: string | null;
  };
}

/**
 * Internal: scan catalog → ranked candidates (use shared keyword-fallback helpers).
 * Returns up to `limit` candidates, sorted by confidence desc.
 */
function rankCandidates(
  intent: string,
  kindFilter: string | undefined,
  callerRole: string,
  limit: number,
): { candidates: CandidateRanked[]; totalConsidered: number; loadMs: number; degraded: boolean; degradedReason?: string } {
  let catalog: { recipients: CandidateRanked["recipient"][] };
  const loadStart = Date.now();
  try {
    catalog = catalogLoader.loadCatalog({}) as { recipients: CandidateRanked["recipient"][] };
  } catch (e) {
    // Catalog corrupt — fall back to INDEX.md (Finding 5 degraded mode)
    return {
      candidates: [],
      totalConsidered: 0,
      loadMs: Date.now() - loadStart,
      degraded: true,
      degradedReason: `catalog load failed: ${(e as Error).message}`,
    };
  }
  const loadMs = Date.now() - loadStart;

  const triggerNorm = keywordFallback.normalize(intent);
  const candidates: CandidateRanked[] = [];

  for (const recipient of catalog.recipients) {
    if (kindFilter && recipient.kind !== kindFilter) continue;
    if (recipient.status === "deprecated") continue;
    // Per-role filter at the source (cherry-pick #12) — recipient must include caller role or '*'
    if (callerRole && recipient.role_scope && Array.isArray(recipient.role_scope)) {
      const inScope = recipient.role_scope.includes("*") || recipient.role_scope.includes(callerRole);
      if (!inScope) continue;
    }
    const m = keywordFallback.computeMatch(triggerNorm, recipient);
    if (m) {
      candidates.push({ recipient, confidence: m.confidence, matchedToken: m.matchedToken });
    }
  }
  candidates.sort((a, b) => b.confidence - a.confidence);
  return {
    candidates: candidates.slice(0, limit),
    totalConsidered: candidates.length,
    loadMs,
    degraded: false,
  };
}

/**
 * Batched recency join — single SQL IN(...) for top-N (per Finding 1).
 */
async function fetchRecency(
  client: SupabaseClient,
  recipientIds: string[],
  callerRole: string,
): Promise<Map<string, MatchOutput["recency"]>> {
  const recency = new Map<string, MatchOutput["recency"]>();
  if (recipientIds.length === 0) return recency;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  // Use raw RPC via ops_run_select if available; fall back to .from() for simple cases.
  // For Sprint 2: simplest path is multiple .from() queries; switch to batched RPC when ops_run_select lands.
  // Actually use .from() with .in() filter — single round-trip.
  const { data, error } = await client
    .schema("ops")
    .from("agent_runs")
    .select("agent_slug, started_at, state")
    .in("agent_slug", recipientIds)
    .gte("started_at", sevenDaysAgo)
    .order("started_at", { ascending: false })
    .limit(500); // bound to avoid runaway response

  if (error || !data) {
    // Recency query failed — return empty map; caller marks `degraded` if needed.
    return recency;
  }

  // Group rows by agent_slug
  const grouped = new Map<string, Array<{ started_at: string; state: string }>>();
  for (const row of data as Array<{ agent_slug: string; started_at: string; state: string }>) {
    if (!grouped.has(row.agent_slug)) grouped.set(row.agent_slug, []);
    grouped.get(row.agent_slug)!.push({ started_at: row.started_at, state: row.state });
  }

  for (const id of recipientIds) {
    const runs = grouped.get(id) ?? [];
    const lastSuccess = runs.find((r) => r.state === "completed")?.started_at ?? null;
    const lastFailure = runs.find((r) => r.state === "failed")?.started_at ?? null;
    recency.set(id, {
      invocations_last_7d_by_role: runs.length,
      last_success_ts: lastSuccess,
      last_failure_ts: lastFailure,
    });
  }
  return recency;
}

/**
 * Write audit row to ops.resolver_decisions (mode='A2').
 * Fire-and-forget — failure does not affect tool result.
 */
async function writeResolverAudit(
  client: SupabaseClient,
  payload: Record<string, unknown>,
): Promise<string | null> {
  try {
    const { data, error } = await client
      .schema("ops")
      .from("resolver_decisions")
      .insert(payload)
      .select("run_id")
      .single();
    if (error) return null;
    return (data as { run_id?: string })?.run_id ?? null;
  } catch {
    return null;
  }
}

export async function handleResolverFind(
  input: unknown,
  ctx: CallerContext,
  client: SupabaseClient,
): Promise<ToolResult> {
  const startedAt = Date.now();

  // Sprint 4: Feature flag gate. Default ENABLED post-cutover; can disable for emergency rollback.
  // Set RESOLVER_JIT_ENABLED=false in runtime/secrets/.env.local to disable without code change.
  if (process.env.RESOLVER_JIT_ENABLED === "false") {
    return {
      state: "failed",
      output: {
        error: "feature_disabled",
        detail: "resolver_find disabled via RESOLVER_JIT_ENABLED=false. Falls back to ambient catalog (if CLAUDE.md still has @imports) or /resolver Mode C keyword fallback.",
      },
      errorCode: "feature_disabled",
      errorDetail: "RESOLVER_JIT_ENABLED env flag is false",
    };
  }

  let parsed: ResolverFindInput;
  try {
    parsed = parseInput(input);
  } catch (err) {
    if (err instanceof MCPToolError) {
      return {
        state: "failed",
        output: { error: err.code, detail: err.message },
        errorCode: err.code,
        errorDetail: err.message,
      };
    }
    throw err;
  }
  const callerRole = parsed.role || ctx.role;
  const sessionId = ctx.sessionId || `${callerRole}-anonymous`;

  // Circuit breaker check
  const session = checkSessionCap(sessionId);
  if (!session.allow) {
    const auditPayload = {
      trigger: parsed.intent.slice(0, 200),
      trigger_normalized: keywordFallback.normalize(parsed.intent),
      caller_role: callerRole,
      decision: "session_capped",
      mode: "A2",
      metadata: { session_id_hash: hashSessionId(sessionId), count: session.count },
    };
    void writeResolverAudit(client, auditPayload);
    return {
      state: "denied",
      output: {
        error: "session_cap_exceeded",
        detail: `Resolver find() called ${session.count} times this session (4h window). Likely loop bug. Reduce calls or restart session.`,
        session_finds_count: session.count,
      },
      errorCode: "session_cap_exceeded",
      errorDetail: `session cap ${SESSION_HARD_CAP} exceeded`,
    };
  }

  // Rank candidates (deterministic keyword pre-filter)
  const ranked = rankCandidates(parsed.intent, parsed.kind, callerRole, parsed.limit);

  if (ranked.degraded) {
    // Degraded mode — catalog corrupt; return empty matches + alert
    const auditId = await writeResolverAudit(client, {
      trigger: parsed.intent.slice(0, 200),
      trigger_normalized: keywordFallback.normalize(parsed.intent),
      caller_role: callerRole,
      decision: "no_match",
      mode: "A2",
      metadata: { degraded: true, reason: ranked.degradedReason },
    });
    return {
      state: "completed",
      output: {
        intent: parsed.intent,
        caller_role: callerRole,
        mode: "A2",
        matches: [],
        no_match_reason: `Catalog corrupt — degraded mode. Reason: ${ranked.degradedReason}`,
        audit_run_id: auditId,
        total_candidates_considered: 0,
        ranking_method: "keyword",
        latency_ms: Date.now() - startedAt,
        degraded: true,
        degraded_reason: ranked.degradedReason,
        session_finds_count: session.count,
      },
    };
  }

  // Build output matches
  const matches: MatchOutput[] = ranked.candidates.map((c) => ({
    id: c.recipient.id,
    kind: c.recipient.kind,
    keyword_score: c.confidence,
    when_to_use: c.recipient.when_to_use,
    invoke: c.recipient.invoke,
    composes_with: parsed.include_composition ? c.recipient.composes_with : undefined,
    role_scope: c.recipient.role_scope,
    status: c.recipient.status,
    pillar: c.recipient.pillar ?? undefined,
    aliases: c.recipient.aliases?.length ? c.recipient.aliases : undefined,
    disambiguator: c.recipient.disambiguator ?? undefined,
  }));

  // Enrich with recency (batched query)
  if (parsed.include_recency && matches.length > 0) {
    try {
      const recencyMap = await fetchRecency(client, matches.map((m) => m.id), callerRole);
      for (const m of matches) {
        const r = recencyMap.get(m.id);
        if (r) m.recency = r;
      }
    } catch {
      // Recency join failure — non-fatal, omit recency fields
    }
  }

  // Audit row (fire-and-forget)
  const noMatch = matches.length === 0;
  const decision = noMatch ? "no_match" : matches[0].keyword_score >= 0.85 ? "dispatch_silently" : "surface_candidates";
  const auditId = await writeResolverAudit(client, {
    trigger: parsed.intent.slice(0, 200),
    trigger_normalized: keywordFallback.normalize(parsed.intent),
    caller_role: callerRole,
    matched_route_id: noMatch ? null : matches[0].id,
    confidence: noMatch ? 0 : matches[0].keyword_score,
    alternatives: matches.slice(1, 5).map((m) => ({ id: m.id, keyword_score: m.keyword_score })),
    semantic_used: false,
    latency_ms: Date.now() - startedAt,
    decision,
    mode: "A2",
    catalog_files_loaded: ["recipients/*.md (via catalog-loader)"],
    metadata: {
      total_candidates: ranked.totalConsidered,
      load_ms: ranked.loadMs,
      kind_filter: parsed.kind ?? null,
      include_composition: parsed.include_composition,
      include_recency: parsed.include_recency,
      session_finds_count: session.count,
    },
  });

  // Build response
  const output: Record<string, unknown> = {
    intent: parsed.intent,
    caller_role: callerRole,
    mode: "A2",
    matches,
    audit_run_id: auditId,
    total_candidates_considered: ranked.totalConsidered,
    ranking_method: "keyword",
    latency_ms: Date.now() - startedAt,
    session_finds_count: session.count,
  };
  if (noMatch) {
    output.no_match_reason = parsed.kind
      ? `No active recipients of kind="${parsed.kind}" match intent "${parsed.intent.slice(0, 60)}..." for role="${callerRole}".`
      : `No active recipients match intent "${parsed.intent.slice(0, 60)}..." for role="${callerRole}". Try broader keywords or check INDEX.md ambient.`;
  }
  if (session.count >= SESSION_WARN_THRESHOLD) {
    output.session_warning = `This session has invoked find() ${session.count}/${SESSION_HARD_CAP} times in current 4h window.`;
  }

  return {
    state: "completed",
    output,
    resultSummary: {
      matches_count: matches.length,
      total_candidates: ranked.totalConsidered,
      latency_ms: Date.now() - startedAt,
    },
  };
}

// Hash session ID for audit (avoid leaking raw session string)
function hashSessionId(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
