'use strict';
/**
 * scripts/local-install/test-suite/groups.cjs
 *
 * Declarative spec for the ritsu-works full system test suite — the single
 * source of truth for what "the system works" means. Pure data, so the
 * ordering, requiredness, and self-heal remedies are testable.
 *
 * Each group:
 *   id          - stable identifier
 *   label       - human label shown in progress
 *   required    - 'hard' (must pass for success) | 'recommended' (warn) | 'feature' (opt-in)
 *   slow        - true if it should be skipped under --quick
 *   optIn       - true if it only runs under --full (e.g. cold docs build)
 *   kind        - 'shell' (run a command) | 'probe' (in-process check)
 *   command/cwd - for kind:'shell' (cwd relative to repo root)
 *   probe       - for kind:'probe' (resolved to a function in run.cjs)
 *   skipIfNoEnv - skip when runtime/secrets/.env.local is not wired
 *   remedy      - human guidance on failure
 *   autoRemedy  - { command, cwd } run once before a retry under --heal
 *
 * No command STRING here contains the database-CLI token, so even though
 * run.cjs executes them via spawnSync (firewall-invisible anyway), the suite
 * stays transparent.
 */

const TEST_GROUPS = [
  {
    id: 'env',
    label: 'Runtime present (Node ≥20, pnpm ≥9, git)',
    required: 'hard',
    slow: false,
    kind: 'probe',
    probe: 'env',
    remedy: 'Install the missing runtime — run /install-ritsu-works.',
  },
  {
    id: 'workspaces',
    label: 'Workspace deps installed (root + 2 MCP servers)',
    required: 'hard',
    slow: false,
    kind: 'probe',
    probe: 'workspaces',
    remedy: 'Install dependencies — node scripts/local-install/install.cjs --apply',
    autoRemedy: { command: 'node scripts/local-install/install.cjs --apply', cwd: '.' },
  },
  {
    id: 'tier1',
    label: 'Tier-1 YAML schemas valid',
    required: 'hard',
    slow: false,
    kind: 'shell',
    command: 'pnpm validate:tier1',
    cwd: '.',
    remedy: 'A Tier-1 YAML failed its schema — fix the flagged file.',
  },
  {
    id: 'drift',
    label: 'Cross-tier consistency (pnpm check)',
    required: 'hard',
    slow: false,
    kind: 'shell',
    command: 'pnpm check',
    cwd: '.',
    remedy: 'Resolve the flagged validator. If it is the resolver-v3 INDEX mtime check, run: pnpm resolver:index',
    autoRemedy: { command: 'pnpm resolver:index', cwd: '.' },
  },
  {
    id: 'unit',
    label: 'Unit + integration tests (vitest)',
    required: 'hard',
    slow: true,
    kind: 'shell',
    command: 'pnpm test',
    cwd: '.',
    remedy: 'Inspect the failing test(s) in the output above.',
  },
  {
    id: 'mcp-build',
    label: 'supabase-ops MCP type-checks + builds',
    required: 'hard',
    slow: false,
    kind: 'shell',
    command: 'pnpm build',
    cwd: 'mcp-server',
    remedy: 'Fix the MCP server TypeScript errors.',
    autoRemedy: { command: 'pnpm install', cwd: 'mcp-server' },
  },
  {
    id: 'mcp-analytics',
    label: 'analytics MCP type-checks',
    required: 'recommended',
    slow: false,
    kind: 'shell',
    command: 'pnpm typecheck',
    cwd: 'mcp-server-analytics',
    remedy: 'Fix the analytics MCP TypeScript errors.',
    autoRemedy: { command: 'pnpm install', cwd: 'mcp-server-analytics' },
  },
  {
    id: 'mcp-smoke',
    label: 'supabase-ops MCP doctor handshake',
    required: 'recommended',
    slow: false,
    kind: 'shell',
    command: 'pnpm doctor',
    cwd: 'mcp-server',
    skipIfNoEnv: true,
    remedy: 'Fill the Supabase keys in runtime/secrets/.env.local, then re-run.',
  },
  {
    id: 'env-wiring',
    label: '.env.local wired (Supabase credentials)',
    required: 'recommended',
    slow: false,
    kind: 'probe',
    probe: 'env-wiring',
    remedy: 'Fill runtime/secrets/.env.local with your credentials.',
  },
  {
    id: 'commands',
    label: 'Install commands + skills intact',
    required: 'hard',
    slow: false,
    kind: 'probe',
    probe: 'commands',
    remedy: 'Capability files missing/corrupt — re-pull the repo (/update-ritsu-works).',
  },
  {
    id: 'docs-build',
    label: 'Docs site cold-builds (MDX gate)',
    required: 'feature',
    slow: true,
    optIn: true,
    kind: 'shell',
    command: 'pnpm install && pnpm build',
    cwd: 'docs',
    remedy: 'Fix the MDX / Next.js build errors in docs/.',
  },
];

/** Files that the `commands` probe asserts exist + parse. */
const CAPABILITY_FILES = [
  '.claude/commands/install-ritsu-works.md',
  '.claude/commands/update-ritsu-works.md',
  '.claude/commands/test-ritsu-works.md',
  '06-ai-ops/skills/local-install/SKILL.md',
  'scripts/local-install/dependencies.cjs',
  'scripts/local-install/doctor.cjs',
  'scripts/local-install/install.cjs',
  'scripts/local-install/update.cjs',
  'scripts/local-install/test-suite/run.cjs',
];

/** Select groups to run given options. */
function selectGroups(opts = {}) {
  let groups = TEST_GROUPS.slice();
  if (opts.only && opts.only.length) {
    const set = new Set(opts.only);
    return groups.filter((g) => set.has(g.id));
  }
  if (!opts.full) groups = groups.filter((g) => !g.optIn);
  if (opts.quick) groups = groups.filter((g) => !g.slow);
  return groups;
}

module.exports = { TEST_GROUPS, CAPABILITY_FILES, selectGroups };
