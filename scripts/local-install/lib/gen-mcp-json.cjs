'use strict';
/**
 * scripts/local-install/lib/gen-mcp-json.cjs
 *
 * Generate a PER-MACHINE, PORTABLE .mcp.json (capability local-install-platform).
 *
 * WHY: the committed .mcp.json hardcoded `/bin/sh` + absolute macOS paths, so the
 * MCP servers would not boot on any other machine (Windows especially). This
 * generator writes a .mcp.json with THIS machine's absolute repo root and a
 * cross-platform launch:
 *   - supabase-ops: `npx tsx <abs>/mcp-server/src/server.ts` — no shell; the server
 *     self-loads runtime/secrets/.env.local (mcp-server/src/lib/env-file.ts), so no
 *     secrets live in .mcp.json and it works on macOS/Windows/Linux (guide-confirmed:
 *     `command: npx` resolves via PATH/PATHEXT on Windows).
 *   - owner profile additionally wires gbrain + supabase-analytics via the POSIX
 *     `/bin/sh` wrapper (they need env-sourcing + the gbrain bun binary + a budget
 *     shell script) — emitted ONLY on non-Windows (the owner runs on macOS/Linux).
 *   - per-human (co-founder) profile emits ONLY supabase-ops (works with just the
 *     per-human refresh token + anon key; gbrain/analytics need extra owner-only
 *     credentials and are impractical on Windows).
 *
 * Paths are normalized to forward slashes (Node accepts them on Windows too),
 * avoiding backslash-escaping ambiguity in JSON.
 */
const nodePath = require('node:path');

const MCP_SCHEMA = 'https://raw.githubusercontent.com/anthropics/claude-code/main/mcp-config.schema.json';

/** Absolute path under repoRoot, forward-slashed. */
function abs(repoRoot, rel) {
  return nodePath.join(repoRoot, rel).replace(/\\/g, '/');
}

/**
 * @param {{ repoRoot: string, profile?: 'owner'|'per-human', platformOs?: string }} opts
 *   platformOs: 'windows' | 'macos' | 'linux' (defaults to the current process.platform)
 * @returns {object} the .mcp.json object
 */
function generateMcpJson(opts) {
  const { repoRoot } = opts;
  if (!repoRoot) throw new Error('generateMcpJson: repoRoot is required');
  const profile = opts.profile === 'per-human' ? 'per-human' : 'owner';
  const isWindows =
    opts.platformOs === 'windows' || (opts.platformOs == null && process.platform === 'win32');

  // supabase-ops — portable, shell-free, secret-free (server self-loads .env.local).
  const servers = {
    'supabase-ops': {
      command: 'npx',
      args: ['-y', 'tsx', abs(repoRoot, 'mcp-server/src/server.ts')],
      env: {
        RITSU_REPO_ROOT: repoRoot.replace(/\\/g, '/'),
        MCP_CALLER_ROLE: '${MCP_CALLER_ROLE:-gps}',
        MCP_CALLER_SESSION_ID: '${MCP_CALLER_SESSION_ID:-}',
      },
    },
  };

  // gbrain + analytics: OWNER-only, and only on a POSIX shell (they source .env.local
  // via /bin/sh + gbrain needs the bun binary + a shell budget-gate). Skipped for
  // per-human and on Windows.
  if (profile === 'owner' && !isWindows) {
    // Paths are double-quoted in the shell command so a repo root containing a space
    // (e.g. /Users/a b/ritsu-works) still sources + cds correctly.
    const envFile = abs(repoRoot, 'runtime/secrets/.env.local');
    const sourcePrefix = `set -a; [ -f "${envFile}" ] && . "${envFile}"; set +a;`;
    servers['gbrain'] = {
      command: '/bin/sh',
      args: [
        '-c',
        `${sourcePrefix} "${abs(repoRoot, 'scripts/pre-budget-check.sh')}" && cd "${abs(repoRoot, 'runtime/brain')}" && exec gbrain serve`,
      ],
      env: {
        MCP_CALLER_ROLE: '${MCP_CALLER_ROLE:-gps}',
        GBRAIN_COST_BUCKET: 'gbrain.${MCP_CALLER_ROLE:-gps}',
        GBRAIN_BUDGET_CAP: '${GBRAIN_BUDGET_CAP:-100}',
        GBRAIN_BUDGET_ALERT_THRESHOLD: '${GBRAIN_BUDGET_ALERT_THRESHOLD:-80}',
        GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD: '${GBRAIN_BUDGET_HARD_BLOCK_THRESHOLD:-150}',
      },
    };
    servers['supabase-analytics'] = {
      command: '/bin/sh',
      args: ['-c', `${sourcePrefix} exec npx -y tsx "${abs(repoRoot, 'mcp-server-analytics/src/server.ts')}"`],
      env: {
        MCP_CALLER_ROLE: '${MCP_CALLER_ROLE:-gps}',
        MCP_CALLER_SESSION_ID: '${MCP_CALLER_SESSION_ID:-}',
      },
    };
  }

  return { $schema: MCP_SCHEMA, mcpServers: servers };
}

/** Serialize with a trailing newline (git-friendly). */
function renderMcpJson(opts) {
  return JSON.stringify(generateMcpJson(opts), null, 2) + '\n';
}

module.exports = { generateMcpJson, renderMcpJson, MCP_SCHEMA };
