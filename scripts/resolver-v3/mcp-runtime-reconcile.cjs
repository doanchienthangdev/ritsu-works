#!/usr/bin/env node
'use strict';
/**
 * scripts/resolver-v3/mcp-runtime-reconcile.cjs
 *
 * L3 KEYSTONE drift check — the ONLY resolver check that compares the catalog
 * against the LIVE MCP runtime instead of git-artifact-vs-git-artifact.
 *
 * Motivation: every other resolver/MCP validator is internal (catalog ↔
 * generator ↔ INDEX ↔ schema ↔ `.mcp.json` server-level). None reads the
 * actual tool surface a running MCP server exposes, so a server going live
 * (gbrain, 2026-05-25→), a tool being renamed upstream, or 32 new tools
 * appearing are ALL invisible until a human hand-edits mcp-tools.yaml. This
 * script closes that gap.
 *
 * What it does, per server in `.mcp.json.mcpServers`:
 *   1. Spawn the server exactly as `.mcp.json` specifies (command+args+env).
 *   2. Speak MCP stdio JSON-RPC: initialize → notifications/initialized →
 *      tools/list (following pagination). Collect the server's REAL tool names.
 *   3. Diff the live name set against `knowledge/mcp-tools.yaml` entries for
 *      that server. Report:
 *        - missing_from_catalog  : live tool with no yaml entry (silent gap)
 *        - extra_in_catalog      : yaml entry whose server is live but tool not
 *                                  exposed (phantom / removed / renamed)
 *        - misnamed              : yaml id that equals `<server>__<liveName>`
 *                                  (double-prefix bug) — actionable rename hint
 *
 * Layer placement: L3. Runs locally on-demand (`pnpm reconcile:mcp`) or via a
 * local scheduled job (launchd/cron on the operator machine) where the servers
 * + secrets actually exist — NOT pg_cron/Edge, since it spawns local MCP server
 * processes. In CI (no secrets, no `gbrain` binary) a server that cannot be
 * spawned is reported as `unreachable` and, with --allow-spawn-fail, does NOT
 * fail the run — exactly like other L3 sweeps degrade gracefully.
 *
 * Usage:
 *   node scripts/resolver-v3/mcp-runtime-reconcile.cjs                 # check all, exit 1 on drift
 *   node scripts/resolver-v3/mcp-runtime-reconcile.cjs --json          # machine-readable inventory
 *   node scripts/resolver-v3/mcp-runtime-reconcile.cjs --server=gbrain # one server only
 *   node scripts/resolver-v3/mcp-runtime-reconcile.cjs --allow-spawn-fail  # CI: unreachable ≠ failure
 *   node scripts/resolver-v3/mcp-runtime-reconcile.cjs --timeout=120000    # per-server boot budget (ms)
 *
 * Exit codes:
 *   0 — no drift (every live server reconciles; unreachable tolerated only with --allow-spawn-fail)
 *   1 — drift detected (missing/extra/misnamed) OR a server unreachable without --allow-spawn-fail
 *   2 — fatal (cannot read .mcp.json / mcp-tools.yaml)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const MCP_JSON_PATH = path.join(REPO_ROOT, '.mcp.json');
const MCP_TOOLS_PATH = path.join(REPO_ROOT, 'knowledge', 'mcp-tools.yaml');

const DEFAULT_TIMEOUT_MS = 90000;

// ---------------------------------------------------------------------------
// .mcp.json — server spawn specs
// ---------------------------------------------------------------------------

/**
 * Expand a `.mcp.json` env value supporting `${VAR}` and `${VAR:-default}`.
 * Anything else is returned verbatim. Mirrors the Claude Code MCP env contract
 * (see memory: .mcp.json env interpolation limits — no nested defaults).
 */
function expandEnvValue(val, baseEnv) {
  if (typeof val !== 'string') return val;
  return val.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-([^}]*))?\}/g, (_m, name, def) => {
    const v = baseEnv[name];
    if (v !== undefined && v !== '') return v;
    return def !== undefined ? def : '';
  });
}

function loadServers() {
  const raw = JSON.parse(fs.readFileSync(MCP_JSON_PATH, 'utf-8'));
  const servers = raw.mcpServers || {};
  return Object.entries(servers).map(([name, spec]) => ({
    name,
    command: spec.command,
    args: spec.args || [],
    envSpec: spec.env || {},
  }));
}

// ---------------------------------------------------------------------------
// MCP stdio JSON-RPC client (newline-delimited)
// ---------------------------------------------------------------------------

/**
 * Spawn one MCP server, handshake, and return its full tool-name set.
 * Resolves { ok, tools, error }. Never throws — boot failures (missing binary,
 * budget block, bad creds) become { ok:false, error } so the caller decides
 * whether unreachable is fatal (--allow-spawn-fail toggles that).
 */
function listTools(server, timeoutMs) {
  return new Promise((resolve) => {
    const env = { ...process.env };
    for (const [k, v] of Object.entries(server.envSpec)) {
      env[k] = expandEnvValue(v, process.env);
    }

    let child;
    try {
      child = spawn(server.command, server.args, {
        cwd: REPO_ROOT,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (e) {
      return resolve({ ok: false, tools: [], error: `spawn failed: ${e.message}` });
    }

    const tools = [];
    let buf = '';
    let stderr = '';
    let settled = false;
    let nextId = 1;
    const pending = new Map(); // id -> handler

    const timer = setTimeout(() => {
      finish({ ok: false, error: `timeout after ${timeoutMs}ms (server did not complete tools/list)` });
    }, timeoutMs);

    function finish(result) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.kill('SIGKILL'); } catch (_) { /* already dead */ }
      if (!result.ok && !result.error) result.error = 'unknown';
      resolve({ ok: !!result.ok, tools, error: result.error || null });
    }

    function send(obj) {
      try {
        child.stdin.write(JSON.stringify(obj) + '\n');
      } catch (e) {
        finish({ ok: false, error: `stdin write failed: ${e.message}` });
      }
    }

    function request(method, params) {
      const id = nextId++;
      return new Promise((res) => {
        pending.set(id, res);
        send({ jsonrpc: '2.0', id, method, params: params || {} });
      });
    }

    child.on('error', (e) => finish({ ok: false, error: `process error: ${e.message}` }));
    child.stderr.on('data', (d) => { stderr += d.toString(); if (stderr.length > 8192) stderr = stderr.slice(-8192); });
    child.on('exit', (code) => {
      if (!settled) finish({ ok: false, error: `exited early (code ${code}) stderr: ${stderr.trim().slice(-400)}` });
    });

    child.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch (_) { continue; } // ignore banners/log lines
        if (msg.id !== undefined && pending.has(msg.id)) {
          const handler = pending.get(msg.id);
          pending.delete(msg.id);
          handler(msg);
        }
      }
    });

    // Handshake sequence
    (async () => {
      const initResp = await request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'ritsu-mcp-reconcile', version: '1.0.0' },
      });
      if (initResp.error) {
        return finish({ ok: false, error: `initialize error: ${JSON.stringify(initResp.error)}` });
      }
      send({ jsonrpc: '2.0', method: 'notifications/initialized' });

      // tools/list with cursor pagination
      let cursor;
      do {
        const resp = await request('tools/list', cursor ? { cursor } : {});
        if (resp.error) {
          return finish({ ok: false, error: `tools/list error: ${JSON.stringify(resp.error)}` });
        }
        const result = resp.result || {};
        for (const t of result.tools || []) {
          if (t && typeof t.name === 'string') {
            tools.push({ name: t.name, description: typeof t.description === 'string' ? t.description : '' });
          }
        }
        cursor = result.nextCursor;
      } while (cursor);

      finish({ ok: true });
    })().catch((e) => finish({ ok: false, error: `handshake threw: ${e.message}` }));
  });
}

// ---------------------------------------------------------------------------
// mcp-tools.yaml — catalogued tools per server
// ---------------------------------------------------------------------------

/**
 * Returns Map<serverName, Array<{ id, status }>>. `status` is the raw yaml
 * value (live|planned|deprecated|undefined). Tools with no `server` are bucketed
 * under '(unknown)'.
 */
function loadCatalogued() {
  const doc = yaml.load(fs.readFileSync(MCP_TOOLS_PATH, 'utf-8'));
  const byServer = new Map();
  for (const t of (doc && doc.tools) || []) {
    if (!t || !t.id) continue;
    const server = t.server || '(unknown)';
    if (!byServer.has(server)) byServer.set(server, []);
    byServer.get(server).push({ id: t.id, status: t.status });
  }
  return byServer;
}

// ---------------------------------------------------------------------------
// Reconcile
// ---------------------------------------------------------------------------

function reconcileServer(serverName, liveTools, cataloguedList) {
  const live = new Set(liveTools);
  const catalogued = new Set(cataloguedList.map((c) => c.id));

  const missing = [...live].filter((name) => !catalogued.has(name)).sort();
  const misnamed = []; // catalog id == `${server}__${liveName}`
  const extra = [];    // catalog id with no live counterpart at all

  for (const c of cataloguedList) {
    if (live.has(c.id)) continue;
    const doublePrefix = `${serverName}__`;
    if (c.id.startsWith(doublePrefix) && live.has(c.id.slice(doublePrefix.length))) {
      misnamed.push({ have: c.id, shouldBe: c.id.slice(doublePrefix.length) });
    } else {
      extra.push(c.id);
    }
  }
  extra.sort();
  misnamed.sort((a, b) => a.have.localeCompare(b.have));

  return {
    server: serverName,
    live_count: live.size,
    catalog_count: catalogued.size,
    missing_from_catalog: missing,
    misnamed,
    extra_in_catalog: extra,
    clean: missing.length === 0 && misnamed.length === 0 && extra.length === 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const asJson = args.includes('--json');
  const dump = args.includes('--dump'); // print full live tool defs (name+description) and exit
  const allowSpawnFail = args.includes('--allow-spawn-fail');
  const serverFilter = (args.find((a) => a.startsWith('--server=')) || '').split('=')[1] || null;
  const timeoutMs = Number((args.find((a) => a.startsWith('--timeout=')) || '').split('=')[1]) || DEFAULT_TIMEOUT_MS;

  if (!fs.existsSync(MCP_JSON_PATH)) { console.error('[FATAL] .mcp.json missing'); process.exit(2); }
  if (!fs.existsSync(MCP_TOOLS_PATH)) { console.error('[FATAL] knowledge/mcp-tools.yaml missing'); process.exit(2); }

  let servers = loadServers();
  if (serverFilter) servers = servers.filter((s) => s.name === serverFilter);
  const catalogued = loadCatalogued();

  const reports = [];
  const unreachable = [];
  const liveDefs = {}; // server -> [{name, description}] (for --dump / --apply)

  for (const server of servers) {
    const res = await listTools(server, timeoutMs);
    if (!res.ok) {
      unreachable.push({ server: server.name, error: res.error });
      continue;
    }
    liveDefs[server.name] = res.tools;
    reports.push(reconcileServer(server.name, res.tools.map((t) => t.name), catalogued.get(server.name) || []));
  }

  if (dump) {
    console.log(JSON.stringify({ liveDefs, unreachable }, null, 2));
    process.exit(unreachable.length && !allowSpawnFail ? 1 : 0);
  }

  if (asJson) {
    console.log(JSON.stringify({ reports, unreachable }, null, 2));
  } else {
    for (const r of reports) {
      const flag = r.clean ? '✓' : '✗';
      console.log(`\n${flag} ${r.server} — live=${r.live_count} catalog=${r.catalog_count}`);
      if (r.misnamed.length) {
        console.log(`  ✗ ${r.misnamed.length} misnamed (double-prefix — rename yaml id):`);
        for (const m of r.misnamed) console.log(`      ${m.have}  →  ${m.shouldBe}`);
      }
      if (r.missing_from_catalog.length) {
        console.log(`  ✗ ${r.missing_from_catalog.length} live tools missing from catalog:`);
        for (const m of r.missing_from_catalog) console.log(`      + ${m}`);
      }
      if (r.extra_in_catalog.length) {
        console.log(`  ✗ ${r.extra_in_catalog.length} catalog entries not live (phantom/removed):`);
        for (const e of r.extra_in_catalog) console.log(`      - ${e}`);
      }
      if (r.clean) console.log('  ✓ reconciles exactly');
    }
    for (const u of unreachable) {
      console.log(`\n⚠ ${u.server} — UNREACHABLE: ${u.error}`);
    }
  }

  const hasDrift = reports.some((r) => !r.clean);
  const hardUnreachable = unreachable.length > 0 && !allowSpawnFail;

  if (hasDrift || hardUnreachable) {
    if (!asJson) {
      console.log('');
      if (hasDrift) console.log('Drift detected. Fix mcp-tools.yaml (or run --apply when implemented), then regen catalog + INDEX.');
      if (hardUnreachable) console.log('Server(s) unreachable. In CI pass --allow-spawn-fail; locally ensure secrets + binaries are present.');
    }
    process.exit(1);
  }
  if (!asJson) console.log('\n[PASS] all live MCP servers reconcile with mcp-tools.yaml');
  process.exit(0);
}

module.exports = { expandEnvValue, loadServers, loadCatalogued, reconcileServer, listTools };

if (require.main === module) {
  main().catch((e) => { console.error(`[FATAL] ${e.stack || e.message}`); process.exit(2); });
}
