/**
 * Portable, cross-platform self-loader for runtime/secrets/.env.local.
 *
 * WHY: the committed .mcp.json historically wrapped the server in a POSIX shell
 * (`/bin/sh -c "set -a; . .env.local; set +a; exec …"`) to inject the env. That
 * breaks on Windows (no /bin/sh) and hardcodes an absolute macOS path, so the MCP
 * would not boot on any other machine. Instead, the server self-loads .env.local
 * from its own repo root at boot — no shell, no hardcoded path, works on
 * macOS/Windows/Linux. This is what lets .mcp.json use a plain `npx tsx <server>`
 * command that is portable.
 *
 * ADDITIVE + SAFE: it only fills keys NOT already present in `env`, and it no-ops
 * entirely if a core var (SUPABASE_URL/SUPABASE_OPS_URL) is already set — so the
 * legacy shell-sourcing wrapper (which pre-populates process.env) is unaffected.
 * A missing/unreadable file is a silent no-op (loadEnv then fails-fast as before).
 *
 * Parser: `KEY=value` and `export KEY=value`; strips surrounding quotes and an
 * inline `# comment` on unquoted values; horizontal-whitespace only after `=` so
 * an empty-valued key cannot swallow the next line.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** Repo root derived from THIS module's location (mcp-server/src/lib → repo root). */
export function repoRootFromHere(): string {
  const here = dirname(fileURLToPath(import.meta.url)); // <repo>/mcp-server/src/lib
  return join(here, "..", "..", ".."); // → <repo>
}

/**
 * Populate `env` from <repoRoot>/runtime/secrets/.env.local for keys not already
 * set. Returns the path it sourced, or null if it did nothing.
 */
export function autoloadEnvLocal(
  repoRoot: string,
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  // Already configured (shell-sourced wrapper or an explicit env block) → no-op.
  if (env.SUPABASE_URL || env.SUPABASE_OPS_URL) return null;
  const path = join(repoRoot, "runtime", "secrets", ".env.local");
  if (!existsSync(path)) return null;
  let raw: string;
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return null;
  }
  for (const line of raw.split("\n")) {
    const m = line.match(/^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if (val[0] === '"' || val[0] === "'") {
      // quoted value: take up to the matching closing quote (ignore any trailing comment)
      const q = val[0];
      const end = val.indexOf(q, 1);
      val = end === -1 ? val.slice(1) : val.slice(1, end);
    } else {
      // unquoted value: drop an inline comment, then trim
      const c = val.search(/\s#/);
      if (c !== -1) val = val.slice(0, c);
      val = val.trim();
    }
    if (!(m[1] in env)) env[m[1]] = val;
  }
  return path;
}
