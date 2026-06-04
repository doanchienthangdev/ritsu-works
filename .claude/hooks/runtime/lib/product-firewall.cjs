#!/usr/bin/env node
'use strict';
/**
 * .claude/hooks/runtime/lib/product-firewall.cjs
 *
 * L0 firewall — the decision engine for the Product-Supabase boundary.
 *
 * Single source of truth for "may this tool call reach the Product Supabase
 * project (`ritsu`)?". Implements `.claude/hooks/pre-tool-supabase-product.md`
 * (spec v1.0.0) and the chosen 3-door architecture
 * (.archives/brainstorming/product-db-readonly-access-2026-06-02/{04,05,10}).
 *
 * Two laws (05 §"two laws"):
 *   1. No PII reaches ops — identity is stripped at the Product boundary.
 *   2. No ops query hits the Product primary; no ops write hits Product —
 *      reads go through a bounded gateway / sanctioned door, never raw SQL.
 *
 * This module is PURE and host-agnostic. It is consumed by:
 *   - the session PreToolUse hook  → ../pre-tool-supabase-product.cjs
 *   - any out-of-band Node caller   → assertProductAccessAllowed() (05 §9.3)
 *
 * fail_mode: closed — a DB-shaped call whose target cannot be PROVEN safe is
 * blocked. (A non-DB call the firewall is not responsible for is allowed; the
 * firewall fails closed for the thing it guards — Product DB access — not for
 * every tool in the session.)
 *
 * NO network. NO file reads. O(1) classification. Latency budget < 5ms.
 */

const fs = require('fs');

// v1.3.0 (capability product-code-readonly-access v1.1): + product CODE repo
// write-block. git/gh WRITES to doanchienthangdev/ritsu are blocked — the product
// code is a READ-ONLY source; reads pass. The slug is WORD-BOUNDARIED so our own
// doanchienthangdev/ritsu-works repo is unaffected (ritsu is a prefix of ritsu-works).
const PRODUCT_FIREWALL_VERSION = '1.3.0';

// ─────────────────────────────────────────────────────────────────────────
// Known project refs (the only DB targets we can PROVE are not Product).
// Product ref is deliberately ABSENT from this repo (charter firewall); it is
// injected via env PRODUCT_PROJECT_REF at D-MAX provisioning time. Until then,
// fail-closed (unknown supabase DB target → block) covers Product anyway.
// ─────────────────────────────────────────────────────────────────────────
const REF_RITSU_OPS = 'mntobbmieuoaxipnjaau'; // ritsu-ops (manifest.yaml)
const REF_RITSU_BRAIN = 'qqlggvkcynhjiwgomgma'; // ritsu-brain (gbrain)

/** Build the runtime config from env (so tests can inject; prod reads process.env). */
function buildConfig(env) {
  const e = env || {};
  const safeRefs = new Set([REF_RITSU_OPS, REF_RITSU_BRAIN]);
  // ritsu-analytics holds NO raw PII (pseudonymized, isolated) → treated as
  // NOT Product (05 §7). Its ref is added at provisioning (07 Phase 3 / 15 K3).
  if (e.ANALYTICS_PROJECT_REF) safeRefs.add(e.ANALYTICS_PROJECT_REF.trim());
  // Extra safe refs (comma-separated) — escape hatch the founder controls.
  if (e.PRODUCT_FIREWALL_EXTRA_SAFE_REFS) {
    for (const r of e.PRODUCT_FIREWALL_EXTRA_SAFE_REFS.split(',')) {
      const t = r.trim();
      if (t) safeRefs.add(t);
    }
  }
  return {
    safeRefs,
    productRef: e.PRODUCT_PROJECT_REF ? e.PRODUCT_PROJECT_REF.trim() : null,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Sanctioned doors (future MCP servers). The firewall ALLOWS the door tools
// for allowed roles; the door's OWN internals strip PII (Door 1) / validate +
// HITL (Door 3). Raw access never uses these prefixes.
// ─────────────────────────────────────────────────────────────────────────
const GATEWAY_TOOL_PREFIX = 'mcp__supabase-product-readonly__'; // Door 1 (04 §3)
const ACTION_TOOL_PREFIX = 'mcp__supabase-product-action__'; // Door 3 (04 §5)
const SAFE_MCP_PREFIXES = [
  'mcp__supabase-ops__', // ritsu-ops (our DB)
  'mcp__gbrain__', // ritsu-brain (semantic memory)
  'mcp__supabase-analytics__', // ritsu-analytics dynamic-query MCP (Door 2; pseudonymized, no raw PII — 15 §4)
];

// Roles allowed through each door (least privilege; ROLES.md). etl-runner is
// the sole standing Product-read holder; founder/cofounder may use the doors.
const GATEWAY_ALLOWED_ROLES = new Set(['etl-runner', 'founder', 'cofounder']);
const ACTION_ALLOWED_ROLES = new Set(['founder', 'cofounder']);

// ─────────────────────────────────────────────────────────────────────────
// Pre-approved read targets (Finding 2 fix — this set is the SINGLE SOURCE OF
// TRUTH and MUST equal the contract views the ETL / gateway actually reads).
// The 4 `etl_*` names in the v0.2 spec were never read by the ETL (the handler
// reads v_ops_dau_export) → removed. Expanding this set is Tier D-Std.
// ─────────────────────────────────────────────────────────────────────────
const PRE_APPROVED_VIEWS = new Set([
  'public.v_ops_dau_export', // the real ETL contract view (worker.ts / manifest)
]);

// Categorically off-limits identity/system schemas — never readable on Product,
// not even by accident, not even for etl-runner. (hook spec; 02 §4.4)
const FORBIDDEN_SCHEMAS = ['auth', 'storage', 'vault'];

// Postgres metadata schemas — a read of these is schema introspection, not user
// data; allowed on the sanctioned read path for an allowed role (spec case 11).
const SYSTEM_SCHEMAS = new Set(['pg_catalog', 'information_schema']);

// Product-side-only artifacts: if a session/raw call names any of these, it is
// reaching INTO Product (these objects live behind the Product boundary).
const PRODUCT_ONLY_ARTIFACTS = [
  'analytics_export.', // the stripped views live product-side (12 §1/§3)
  'analytics_export_ro', // the FDW read role (12 §5) — product-side
  'app.analytics_salt', // the pseudonym salt — NEVER reaches ops (05 §9.6)
  'auth.users',
  'service_role', // a product service key must never be used from a session
];

// Tokens that indicate a write / mutating operation. Word-boundary matched so
// that column names like `created_at` / `updated_at` are NOT mistaken for
// CREATE / UPDATE (would wrongly flag a SELECT as a write).
const WRITE_KEYWORD_RE =
  /\b(?:insert|update|delete|drop|alter|truncate|create|grant|revoke|replace|merge|upsert|copy)\b/;

// A Supabase project ref is a 20-char lowercase alphanumeric string. Capture it
// from the shapes it actually appears in (host, pooler user, CLI flag, API path).
const REF_PATTERNS = [
  /\bdb\.([a-z0-9]{20})\.supabase\.co\b/gi, // direct host
  /\b([a-z0-9]{20})\.supabase\.(?:co|com)\b/gi, // project host
  /\bpostgres\.([a-z0-9]{20})\b/gi, // pooler user `postgres.<ref>`
  /--project-ref[=\s]+([a-z0-9]{20})\b/gi, // supabase CLI
  /\bproject[_-]?ref["'\s:=]+([a-z0-9]{20})\b/gi, // json/payload field
  /\/projects\/([a-z0-9]{20})\b/gi, // Management API path /v1/projects/<ref>/...
];

// Connection indicators — only treat a Bash/raw string as a DB call if one of
// these is present (avoids false-positives on a bare "select" in an echo).
const CONNECTION_INDICATORS = [
  /\bpsql\b/i,
  /postgres(?:ql)?:\/\//i,
  /\bsupabase\b/i,
  /\.supabase\.(?:co|com)\b/i,
  /pooler\.supabase\.com/i,
  /--project-ref/i,
  /\bpg_dump\b/i,
  /\bpg_restore\b/i,
  /\bapi\.supabase\.(?:com|co)\b/i, // Management API (can run SQL via /database/query)
];

// ─────────────────────────────────────────────────────────────────────────
// Product CODE repo (capability product-code-readonly-access). The product
// source repo is a READ-ONLY source → git/gh WRITES targeting it are blocked.
// WORD-BOUNDARIED so it does NOT match our own `doanchienthangdev/ritsu-works`
// repo (ritsu is a prefix of ritsu-works). The negative lookahead `(?![\w-])`
// rejects a following word-char or hyphen → matches `ritsu`, `ritsu.git`,
// `ritsu/`, `ritsu ` but NOT `ritsu-works` / `ritsux`.
// ─────────────────────────────────────────────────────────────────────────
const PRODUCT_REPO_RE = /doanchienthangdev\/ritsu(?![\w-])/i;

// ─────────────────────────────────────────────────────────────────────────
// Small pure helpers
// ─────────────────────────────────────────────────────────────────────────

/**
 * Lowercased haystack assembled from EVERYWHERE a target can hide. We scan the
 * whole payload (not a hardcoded field list) so the allow-list cannot be
 * bypassed by choosing an unexpected field name (e.g. {view:'public.users'}):
 *   - the tool name
 *   - the full JSON of toolInput (preserves `"field":"value"` so the
 *     view/table/relation regex can fire on structured args)
 *   - every top-level string value raw (preserves unescaped SQL/URLs)
 */
function gatherText(toolName, toolInput) {
  const ti = toolInput && typeof toolInput === 'object' ? toolInput : {};
  const parts = [String(toolName || '')];
  try {
    parts.push(JSON.stringify(ti));
  } catch {
    /* ignore unserializable */
  }
  for (const v of Object.values(ti)) {
    if (typeof v === 'string') parts.push(v);
  }
  return parts.join('\n').toLowerCase();
}

function extractRefs(text) {
  const refs = new Set();
  for (const re of REF_PATTERNS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      if (m[1]) refs.add(m[1].toLowerCase());
    }
  }
  return refs;
}

function looksLikeDbConnection(text) {
  return CONNECTION_INDICATORS.some((re) => re.test(text));
}

function isWriteOperation(text) {
  return WRITE_KEYWORD_RE.test(text);
}

function mentionsForbiddenSchema(text) {
  return FORBIDDEN_SCHEMAS.some(
    (s) => text.includes(`${s}.`) || text.includes(`from ${s}`) || text.includes(`schema ${s}`),
  );
}

function mentionsProductOnlyArtifact(text) {
  // 'auth.users' double-counted with FORBIDDEN_SCHEMAS — harmless.
  return PRODUCT_ONLY_ARTIFACTS.some((a) => text.includes(a.toLowerCase()));
}

/**
 * Extract concrete `schema.table` targets referenced in a bounded-read request
 * (e.g. a gateway `query`/`view`/`from X`). Used to enforce the pre-approved
 * allow-list. Bare named intents (no table reference) return an empty set →
 * the gateway's own intent registry governs them.
 */
function extractTargetViews(text) {
  const views = new Set();
  // explicit field forms: view: public.foo  /  table=foo  /  "view":"public.foo"
  const field = /\b(?:view|table|relation)["'\s:=]+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi;
  // SQL FROM / JOIN targets
  const fromJoin = /\b(?:from|join)\s+([a-z_][a-z0-9_]*(?:\.[a-z_][a-z0-9_]*)?)/gi;
  for (const re of [field, fromJoin]) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      let v = m[1].toLowerCase();
      if (!v.includes('.')) v = `public.${v}`; // default schema
      views.add(v);
    }
  }
  return views;
}

function schemaOf(qualified) {
  return qualified.includes('.') ? qualified.split('.')[0] : 'public';
}

function classifyTool(toolName) {
  const t = (toolName || '').toString();
  if (!t) return 'other';
  if (t === 'Bash') return 'raw-bash';
  if (t.startsWith(GATEWAY_TOOL_PREFIX)) return 'gateway';
  if (t.startsWith(ACTION_TOOL_PREFIX)) return 'action';
  if (SAFE_MCP_PREFIXES.some((p) => t.startsWith(p))) return 'safe-mcp';
  // A raw/generic postgres or unknown supabase MCP that could target any DB.
  if (/^mcp__(?:postgres|supabase)/i.test(t)) return 'raw-mcp';
  return 'other';
}

/**
 * Classify the DB target of a raw (Bash / generic-MCP) call.
 * @returns {'none'|'safe'|'product'|'unknown-db'}
 */
function classifyRawTarget(text, cfg) {
  // Product-only artifacts or forbidden identity schema → reaching into Product.
  if (mentionsProductOnlyArtifact(text)) return 'product';
  if (text.includes('supabase_product') || text.includes('product_supabase')) return 'product';

  // Supabase Management API (api.supabase.com): the /v1/projects/<ref>/database/query
  // endpoint can run arbitrary SQL on a project — gate it by the project ref.
  // (Closes the out-of-band path used to verify ritsu-analytics; 05 §9.3.)
  if (/\bapi\.supabase\.(?:com|co)\b/.test(text)) {
    const mref = text.match(/\/projects\/([a-z0-9]{20})\b/);
    if (mref) {
      const r = mref[1].toLowerCase();
      if (cfg.productRef && r === cfg.productRef.toLowerCase()) return 'product';
      if (cfg.safeRefs.has(r)) return 'safe';
      return 'unknown-db'; // a project DB we cannot prove safe → fail-closed
    }
    return 'none'; // account-level metadata (list orgs/projects) — no project DB target
  }

  const refs = extractRefs(text);

  // A known Product ref (once injected at provisioning) → Product.
  if (cfg.productRef && refs.has(cfg.productRef.toLowerCase())) return 'product';

  const isConn = looksLikeDbConnection(text);

  if (refs.size > 0) {
    const allSafe = [...refs].every((r) => cfg.safeRefs.has(r));
    if (allSafe) return 'safe';
    // A ref we cannot prove is safe (and Product ref may be unset) → fail-closed.
    return 'unknown-db';
  }

  // No ref token, but it IS a DB connection to somewhere → can't prove safe.
  if (isConn) return 'unknown-db';

  return 'none';
}

/**
 * Detect a git/gh WRITE targeting the Product CODE repo (doanchienthangdev/ritsu).
 * READS (gh api GET, gh search code, git clone, git grep, gh pr list/view) carry
 * NONE of these write verbs → allowed. Our own ritsu-works repo is excluded by the
 * word-boundaried PRODUCT_REPO_RE. `text` is already lowercased by gatherText.
 *
 * Residual (documented in the capability spec): a bare `git push` run from INSIDE a
 * product-repo clone cwd carries no slug in the command text → not catchable from
 * command text alone. The realistic vectors (explicit --repo / a product git URL /
 * a write gh api path) all name the slug and ARE caught.
 * @returns {boolean} true → block (a product-repo write)
 */
function classifyProductRepoWrite(text) {
  if (!PRODUCT_REPO_RE.test(text)) return false;
  if (/\bgit\s+push\b/.test(text)) return true;
  if (/\bgit\s+remote\s+(?:add|set-url)\b/.test(text)) return true;
  if (/\bgh\s+pr\s+(?:create|merge|edit|close|reopen|ready)\b/.test(text)) return true;
  if (/\bgh\s+(?:release|repo|secret|workflow|cache)\s+(?:create|edit|delete|set|rename|archive|develop|run|enable|disable)\b/.test(text)) return true;
  // gh api with an explicit write method.
  if (/\bgh\s+api\b/.test(text) && /(?:-x\s*|--method[=\s]*)(?:post|patch|put|delete)\b/.test(text)) return true;
  // gh api AUTO-switches to POST when a field/input flag (-f/-F/--field/--raw-field/
  // --input) is present and no read method is forced → an IMPLICIT WRITE (e.g.
  // `gh api repos/.../issues -f title=x` creates an issue). Exclude `gh api graphql`
  // (a READ that also uses -f) and a forced `-X GET`. (text is already lowercased,
  // so -F folds to -f.)
  if (/\bgh\s+api\b/.test(text)
      && !/\bgh\s+api\s+graphql\b/.test(text)
      && !/(?:-x\s*|--method[=\s]*)get\b/.test(text)
      && /(?:\s|^)(?:-f|--field|--raw-field|--input)(?:[=\s]|$)/.test(text)) return true;
  return false;
}

// ─────────────────────────────────────────────────────────────────────────
// Decision result factory
// ─────────────────────────────────────────────────────────────────────────
function allow(matchRule, reason) {
  return { decision: 'allow', reason: reason || 'not a Product-Supabase access', matchRule, alert: false, severity: 'none' };
}
function block(matchRule, reason) {
  return { decision: 'block', reason, matchRule, alert: true, severity: 'high' };
}

// ─────────────────────────────────────────────────────────────────────────
// Door deciders
// ─────────────────────────────────────────────────────────────────────────
function decideGateway(text, callerRole) {
  if (!GATEWAY_ALLOWED_ROLES.has(callerRole)) {
    return block('gateway-role-denied', `role '${callerRole || 'unknown'}' may not use the Product read-gateway (Door 1); see governance/ROLES.md`);
  }
  if (mentionsForbiddenSchema(text)) {
    return block('gateway-forbidden-schema', 'identity/system schema (auth/storage/vault) is never readable on Product, even via the gateway');
  }
  if (isWriteOperation(text)) {
    return block('gateway-write-attempt', 'Door 1 read-gateway is SELECT-only; writes go through Door 3 action-MCP per governance/HITL.md');
  }
  // If a concrete relation is named, it MUST be pre-approved (Finding 2: the
  // PRE_APPROVED_VIEWS set is the single source of truth). System-metadata
  // reads are allowed. Bare named intents (no relation) are governed by the
  // gateway's own intent registry → allow.
  const targets = extractTargetViews(text);
  for (const t of targets) {
    if (SYSTEM_SCHEMAS.has(schemaOf(t))) continue; // schema introspection ok
    if (!PRE_APPROVED_VIEWS.has(t)) {
      return block('gateway-view-not-pre-approved', `read target '${t}' is not in the pre-approved view list (single source of truth in lib/product-firewall.cjs PRE_APPROVED_VIEWS); expanding it is Tier D-Std`);
    }
  }
  return allow('gateway-read', 'sanctioned Door 1 read-gateway read of a pre-approved target (strips identity + k-anon internally)');
}

function decideAction(callerRole) {
  if (!ACTION_ALLOWED_ROLES.has(callerRole)) {
    return block('action-role-denied', `role '${callerRole || 'unknown'}' may not invoke Product actions (Door 3); see governance/ROLES.md`);
  }
  // The action-MCP exposes only specific validated actions; consequential ones
  // carry per-action HITL tiers (governance/HITL.md). The firewall lets the
  // named action through; HITL is enforced by the action layer, not here.
  return allow('action-allowed', 'sanctioned Door 3 action (per-action HITL enforced by the action layer)');
}

// ─────────────────────────────────────────────────────────────────────────
// Main decision
// ─────────────────────────────────────────────────────────────────────────
/**
 * @param {{toolName:string, toolInput?:object, callerRole?:string, env?:object}} input
 * @returns {{decision:'allow'|'block', reason:string, matchRule:string, alert:boolean, severity:string}}
 */
function decide(input) {
  const { toolName, toolInput } = input || {};
  const callerRole = (input && input.callerRole) || null;
  const cfg = buildConfig((input && input.env) || {});

  const cls = classifyTool(toolName);

  // Our own DBs (ritsu-ops, gbrain, analytics) via their dedicated MCP → allowed.
  if (cls === 'safe-mcp') return allow('safe-mcp-server');

  const text = gatherText(toolName, toolInput);

  if (cls === 'gateway') return decideGateway(text, callerRole);
  if (cls === 'action') return decideAction(callerRole);

  // Product CODE repo write-block (v1.3.0; capability product-code-readonly-access).
  // The product source repo is a READ-ONLY source — a git/gh WRITE to it is forbidden.
  // Checked BEFORE the DB classification (a `git push` carries no DB target). Reads
  // pass; only writes block; our own ritsu-works repo is unaffected (slug boundary).
  // Gated to `raw-bash`: only Bash can execute a git/gh command, and this keeps the
  // matcher structurally INERT for content-bearing tools (Edit/Write/WebFetch) whose
  // payload may merely DOCUMENT a product git command (e.g. this capability's own
  // spec/SOP examples) — preventing a false-block if the hook is ever widened.
  if (cls === 'raw-bash' && classifyProductRepoWrite(text)) {
    return block(
      'product-repo-write',
      'WRITE to the Product code repo (doanchienthangdev/ritsu) is forbidden — it is a READ-ONLY source (capability product-code-readonly-access). Operating AI must never push/PR/commit to Product (D-MAX). Reads (gh api GET, gh search code, git grep/clone) are allowed. See knowledge/product-code-source-contract.yaml.',
    );
  }

  // 'raw-bash' | 'raw-mcp' | 'other' — scan the payload for a DB / Management-API
  // target and fail closed. 'other' tools are scanned too (not blanket-allowed)
  // so an out-of-band guard, a WebFetch/curl-shaped tool, or any non-DB-named
  // caller carrying a Product target is still caught; the scan self-limits to
  // 'none' (allow) when there is no connection/API indicator.
  const target = classifyRawTarget(text, cfg);
  switch (target) {
    case 'none':
      return allow('raw-no-db-target');
    case 'safe':
      return allow('raw-safe-target', 'raw access targets a known-safe project (ritsu-ops / ritsu-brain / ritsu-analytics)');
    case 'product':
      return block(
        'raw-product-access',
        'direct/raw access to Product Supabase (`ritsu`) is forbidden — Operating AI must never touch Product directly; use the sanctioned read-gateway (Door 1) or action-MCP (Door 3). See governance/HITL.md (D-MAX) + CLAUDE.md "Refuse without question".',
      );
    case 'unknown-db':
    default:
      return block(
        'fail-closed-unknown-db',
        'a database/connection target could not be PROVEN safe (not ritsu-ops / ritsu-brain / ritsu-analytics). Firewall fails closed. If this is a new safe project, add its ref via PRODUCT_FIREWALL_EXTRA_SAFE_REFS or ANALYTICS_PROJECT_REF (Tier C).',
      );
  }
}

/**
 * Self-configure the firewall from a `.env.local` (the hook calls this; decide()
 * stays pure and file-free). Extracts ONLY the firewall-relevant keys — never
 * loads the rest of the secrets file. Derives ANALYTICS_PROJECT_REF from
 * RITSU_ANALYTICS_DB_URL if not set explicitly, so the firewall recognizes the
 * analytics project as safe with zero extra config.
 * @returns {{PRODUCT_PROJECT_REF?:string, ANALYTICS_PROJECT_REF?:string, PRODUCT_FIREWALL_EXTRA_SAFE_REFS?:string}}
 */
function loadEnvFileRefs(filePath) {
  const out = {};
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return out; // absent (e.g. worktree, CI) → caller stays fail-closed
  }
  const get = (key) => {
    const m = raw.match(new RegExp('^\\s*' + key + "\\s*=\\s*[\"']?([^\"'\\n#]+)", 'm'));
    return m ? m[1].trim() : null;
  };
  const prod = get('PRODUCT_PROJECT_REF');
  if (prod) out.PRODUCT_PROJECT_REF = prod;
  let analytics = get('ANALYTICS_PROJECT_REF');
  if (!analytics) {
    const url = get('RITSU_ANALYTICS_DB_URL');
    if (url) {
      const um =
        url.match(/postgres(?:ql)?:\/\/[^.@/]+\.([a-z0-9]{20})/i) ||
        url.match(/db\.([a-z0-9]{20})\.supabase/i);
      if (um) analytics = um[1];
    }
  }
  if (analytics) out.ANALYTICS_PROJECT_REF = analytics;
  const extra = get('PRODUCT_FIREWALL_EXTRA_SAFE_REFS');
  if (extra) out.PRODUCT_FIREWALL_EXTRA_SAFE_REFS = extra;
  return out;
}

/**
 * Out-of-band guard (05 §9.3): CRON / Edge Function / MCP-subprocess Node
 * callers import this and call it before any Product-reaching operation.
 * Throws on block so the caller aborts. (The PRIMARY out-of-band enforcement
 * is read-key scoping at provisioning; this is defense-in-depth in code.)
 */
function assertProductAccessAllowed(input) {
  const d = decide(input);
  if (d.decision === 'block') {
    const err = new Error(`[product-firewall] BLOCKED (${d.matchRule}): ${d.reason}`);
    err.firewallDecision = d;
    throw err;
  }
  return d;
}

module.exports = {
  PRODUCT_FIREWALL_VERSION,
  decide,
  assertProductAccessAllowed,
  loadEnvFileRefs,
  // exported for unit tests + reuse
  classifyTool,
  classifyRawTarget,
  classifyProductRepoWrite,
  PRODUCT_REPO_RE,
  extractRefs,
  extractTargetViews,
  isWriteOperation,
  buildConfig,
  PRE_APPROVED_VIEWS,
  SYSTEM_SCHEMAS,
  GATEWAY_ALLOWED_ROLES,
  ACTION_ALLOWED_ROLES,
  REF_RITSU_OPS,
  REF_RITSU_BRAIN,
};
