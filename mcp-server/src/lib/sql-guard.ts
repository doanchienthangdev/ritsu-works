/**
 * SQL guard — defense in depth on top of pg roles + RLS.
 *
 * The shim's `query` tool calls supabase-js, which uses pg under the hood.
 * pg permissions + RLS are the actual security layer; the agent's service-key
 * connection technically has UPDATE/DELETE grants. This guard rejects any SQL
 * that LOOKS like it could mutate, BEFORE we even hand it to pg.
 *
 * Why both layers:
 *   - pg permissions can be tightened later (Phase 2 — per-tool roles with no UPDATE/DELETE grant)
 *   - SQL guard catches obvious agent mistakes early with a clear error
 *   - Audit log captures the rejection — visible signal of an agent trying to mutate via query
 *
 * NOT a SQL parser. Heuristics only. Adversarial input can probably bypass
 * with creative comments + whitespace + CTEs. Mitigated by:
 *   - The service-key path itself can be tightened in Phase 2
 *   - Audit log surfaces patterns (we'll catch the abuse after the first row)
 *   - Per migration 00010, RLS is enabled on every ops.* table
 *
 * The point of the guard is to make innocent mistakes loud, not to defeat attackers.
 */

const FORBIDDEN_LEADING_KEYWORDS = [
  "update",
  "delete",
  "insert",
  "drop",
  "alter",
  "create",
  "truncate",
  "grant",
  "revoke",
  "comment",
  "vacuum",
  "analyze",
  "reindex",
  "cluster",
  "lock",
  "execute",
  "call",
  "copy",
  "explain", // explain itself is fine but can have side effects with options
  "do",
];

export class SqlGuardError extends Error {
  constructor(
    public readonly code:
      | "sql_not_select"
      | "sql_multi_statement"
      | "sql_select_into"
      | "sql_empty"
      | "sql_too_long",
    message: string,
  ) {
    super(message);
    this.name = "SqlGuardError";
  }
}

const MAX_SQL_LENGTH = 8_000; // 8KB — anything bigger is almost certainly a mistake

/**
 * Strip line comments (-- ...) and block comments (/* ... *\/), then trim.
 *
 * NOTE: this is a heuristic, not a real SQL tokenizer. Comments inside string
 * literals will be stripped too, but for guard-purposes that's safe (we only
 * use the result to check the leading keyword and look for ';').
 */
function normalize(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();
}

/**
 * Validate a SQL string is read-only and well-formed for the `query` tool.
 *
 * Throws SqlGuardError if invalid. Returns void on pass.
 */
export function assertReadOnlySql(rawSql: string): void {
  if (typeof rawSql !== "string" || rawSql.length === 0) {
    throw new SqlGuardError("sql_empty", "SqlGuard: sql is empty");
  }
  if (rawSql.length > MAX_SQL_LENGTH) {
    throw new SqlGuardError(
      "sql_too_long",
      `SqlGuard: sql length ${rawSql.length} exceeds limit ${MAX_SQL_LENGTH}`,
    );
  }

  const normalized = normalize(rawSql);
  if (!normalized) {
    throw new SqlGuardError("sql_empty", "SqlGuard: sql is comment-only");
  }

  // Multi-statement check: any `;` other than the final trailing one is rejected.
  // `;` at the very end is allowed (some clients always append one).
  const trimmedNoTrailingSemi = normalized.replace(/;\s*$/, "");
  if (trimmedNoTrailingSemi.includes(";")) {
    throw new SqlGuardError(
      "sql_multi_statement",
      "SqlGuard: multiple statements are not allowed (found ';' mid-statement)",
    );
  }

  // First keyword check — must be SELECT or WITH (CTE leading to SELECT)
  const firstWord = trimmedNoTrailingSemi.match(/^\s*([a-zA-Z]+)/)?.[1]?.toLowerCase() ?? "";

  if (FORBIDDEN_LEADING_KEYWORDS.includes(firstWord)) {
    throw new SqlGuardError(
      "sql_not_select",
      `SqlGuard: sql must start with SELECT or WITH; got "${firstWord.toUpperCase()}"`,
    );
  }

  if (firstWord !== "select" && firstWord !== "with") {
    throw new SqlGuardError(
      "sql_not_select",
      `SqlGuard: sql must start with SELECT or WITH; got "${firstWord || "(empty)"}"`,
    );
  }

  // SELECT INTO is write-disguised-as-read — reject.
  // (We check the normalized form, case-insensitive, with word boundaries.)
  if (/\binto\b/i.test(trimmedNoTrailingSemi)) {
    throw new SqlGuardError(
      "sql_select_into",
      "SqlGuard: SELECT INTO is not permitted (creates a new table)",
    );
  }

  // For WITH (CTE), confirm the main statement after the CTE list is SELECT.
  // Heuristic: walk past balanced parens after `WITH`, then check next keyword.
  if (firstWord === "with") {
    const mainStatement = stripCteHead(trimmedNoTrailingSemi);
    const mainFirst = mainStatement.match(/^\s*([a-zA-Z]+)/)?.[1]?.toLowerCase() ?? "";
    if (mainFirst !== "select") {
      throw new SqlGuardError(
        "sql_not_select",
        `SqlGuard: WITH must lead to a SELECT; got "${mainFirst.toUpperCase()}"`,
      );
    }
  }
}

/**
 * Strip the `WITH name AS (...)[, name AS (...)]*` head, returning the main statement.
 *
 * Heuristic — walks balanced parens, no real SQL parser. Returns the input
 * unchanged if it can't make sense of the structure.
 */
function stripCteHead(sql: string): string {
  // Skip past `with` keyword + whitespace
  let i = sql.search(/\s/);
  if (i < 0) return sql;
  // Now walk: name AS (...)
  // Repeat while next non-whitespace is a `,` (another CTE) or until we exit the CTE list.
  let depth = 0;
  let sawOpenParen = false;
  for (; i < sql.length; i++) {
    const ch = sql[i]!;
    if (ch === "(") {
      depth++;
      sawOpenParen = true;
    } else if (ch === ")") {
      depth--;
      if (depth === 0 && sawOpenParen) {
        // CTE body just closed; check what follows
        const rest = sql.slice(i + 1).trimStart();
        if (rest.startsWith(",")) {
          // Another CTE follows; keep walking
          i = sql.indexOf(",", i);
          sawOpenParen = false;
          continue;
        }
        return rest;
      }
    }
  }
  return sql;
}
