/**
 * SQL guard — defense in depth on top of the analytics_reader Postgres role.
 *
 * The REAL security boundary here is the DB role: `analytics_reader` has only
 * `USAGE` on schema `live` + `SELECT` on `live.*` — no write grants, no access
 * to `ext`/`staging`/the FDW, no PII (the data is pseudonymized product-side).
 * So even a guard bypass cannot mutate, escape `live`, or reach Product.
 *
 * This guard exists to make innocent mistakes LOUD and EARLY (a clear
 * "must start with SELECT" beats an opaque pg permission error), not to defeat
 * an adversary — the role does that. It is a self-contained copy of the
 * supabase-ops guard (deliberately NOT shared across packages: each MCP's guard
 * may diverge, and a security primitive is safer duplicated-and-tested than
 * cross-package-coupled).
 *
 * NOT a SQL parser. Heuristics only.
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
  "explain",
  "do",
  "set", // SET / SET ROLE — config mutation, not a read
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

/** Strip line comments (-- ...) and block comments, then trim. Heuristic. */
function normalize(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .trim();
}

/** Strip a single trailing `;` (and following whitespace) — for safe wrapping. */
export function stripTrailingSemicolon(sql: string): string {
  return sql.replace(/;\s*$/, "");
}

/**
 * Validate a SQL string is read-only and well-formed for the `query` tool.
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

  // Multi-statement check: any `;` other than a final trailing one is rejected.
  const trimmedNoTrailingSemi = normalized.replace(/;\s*$/, "");
  if (trimmedNoTrailingSemi.includes(";")) {
    throw new SqlGuardError(
      "sql_multi_statement",
      "SqlGuard: multiple statements are not allowed (found ';' mid-statement)",
    );
  }

  const firstWord =
    trimmedNoTrailingSemi.match(/^\s*([a-zA-Z]+)/)?.[1]?.toLowerCase() ?? "";

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
  if (/\binto\b/i.test(trimmedNoTrailingSemi)) {
    throw new SqlGuardError(
      "sql_select_into",
      "SqlGuard: SELECT INTO is not permitted (creates a new table)",
    );
  }

  // For WITH (CTE), confirm the main statement after the CTE list is SELECT.
  if (firstWord === "with") {
    const mainStatement = stripCteHead(trimmedNoTrailingSemi);
    const mainFirst =
      mainStatement.match(/^\s*([a-zA-Z]+)/)?.[1]?.toLowerCase() ?? "";
    if (mainFirst !== "select") {
      throw new SqlGuardError(
        "sql_not_select",
        `SqlGuard: WITH must lead to a SELECT; got "${mainFirst.toUpperCase()}"`,
      );
    }
  }
}

/**
 * Strip the `WITH name AS (...)[, name AS (...)]*` head, returning the main
 * statement. Heuristic — walks balanced parens, no real SQL parser.
 */
function stripCteHead(sql: string): string {
  let i = sql.search(/\s/);
  if (i < 0) return sql;
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
        const rest = sql.slice(i + 1).trimStart();
        if (rest.startsWith(",")) {
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
