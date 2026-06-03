/**
 * The real AnalyticsQuerier — a `pg` Pool connected as the least-priv
 * `analytics_reader` role to ritsu-analytics.
 *
 * Imports `pg` (runtime), so this module is loaded only at actual server boot
 * (server.ts) or the smoke CLI — NEVER by the unit tests, which inject a fake
 * AnalyticsQuerier. That keeps `pg` out of the repo-root test resolution path.
 *
 * Hardening (defense in depth; the role's SELECT-only grant is the real line):
 *   - `options=-c statement_timeout=… -c default_transaction_read_only=on`
 *     set at connection start → bounds runaway queries + blocks writes.
 *   - Small pool, short timeouts.
 *   - SSL on (rejectUnauthorized configurable; default false for the Supabase pooler).
 */

import pg from "pg";
import type { AnalyticsServerEnv } from "./env.ts";
import type { AnalyticsQuerier } from "../types.ts";

const { Pool } = pg;

const STATEMENT_TIMEOUT_MS = Number(
  process.env.ANALYTICS_READER_STATEMENT_TIMEOUT_MS || 15_000,
);

export interface AnalyticsPool extends AnalyticsQuerier {
  end(): Promise<void>;
}

/**
 * Strip any `sslmode`/`ssl` query param from the connection string so SSL is
 * governed SOLELY by the explicit `ssl` object below — deterministic across
 * pg / pg-connection-string versions (newer versions escalate `sslmode=require`
 * to `verify-full`, which rejects the Supabase pooler's cert chain).
 */
function stripSslParams(connStr: string): string {
  try {
    const u = new URL(connStr);
    u.searchParams.delete("sslmode");
    u.searchParams.delete("ssl");
    return u.toString();
  } catch {
    return connStr;
  }
}

export function createQuerier(env: AnalyticsServerEnv): AnalyticsPool {
  const pool = new Pool({
    connectionString: stripSslParams(env.dbUrl),
    max: 4,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: { rejectUnauthorized: env.sslStrict },
    application_name: "supabase-analytics-mcp/0.1.0",
    // Set read-only + statement timeout at connection start (guaranteed before
    // the first query, unlike a pool 'connect' handler which can race).
    options: `-c statement_timeout=${STATEMENT_TIMEOUT_MS} -c default_transaction_read_only=on`,
  });

  // Never let a background pool error crash the MCP process; surface to stderr.
  pool.on("error", (err) => {
    process.stderr.write(`[supabase-analytics] pool error: ${err.message}\n`);
  });

  return {
    async query(sql: string, params: unknown[]) {
      const res = await pool.query(sql, params as unknown[]);
      return { rows: res.rows, rowCount: res.rowCount ?? res.rows.length };
    },
    async end() {
      await pool.end();
    },
  };
}
