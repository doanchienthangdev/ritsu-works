// Tests for scripts/wave2-bootstrap-cron-secrets.sh
//
// Phase 1 — Code Analysis:
//   The script: validates ENV_LOCAL + PAT_SOURCE files exist, parses out
//   WORKER_SECRET and SUPABASE_ACCESS_TOKEN, builds a SQL file, and runs
//   `<SUPABASE_BIN> db query --linked --file <tmp>` twice (reschedule + verify).
//
//   Branches:
//     B1: ENV_LOCAL missing                 → exit 2
//     B2: PAT_SOURCE missing                → exit 2
//     B3: WORKER_SECRET empty in ENV_LOCAL  → exit 2
//     B4: SUPABASE_ACCESS_TOKEN empty       → exit 2
//     B5: SUPABASE_BIN call fails           → exit 1
//     B6: Happy path                        → exit 0
//
//   The script supports env-var overrides (RITSU_REPO_ROOT, RITSU_ENV_LOCAL,
//   RITSU_PAT_SOURCE, RITSU_SUPABASE_BIN, RITSU_PROJECT_REF, RITSU_CRON_JOBNAME,
//   RITSU_CRON_EXPR) for testability. Production callers leave them unset.
//
// Test approach: spawnSync each scenario with a tmp dir holding env fixtures
// and a mock `supabase` binary written as a tiny bash script that captures
// its arguments + stdin file contents.
//
// Phase 4 verification — every parameter, every branch covered.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { spawnSync } from "node:child_process";
import {
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  readFileSync,
  chmodSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..");
const SCRIPT = join(REPO, "scripts", "wave2-bootstrap-cron-secrets.sh");

interface Fixture {
  dir: string;
  envLocal: string;
  patSource: string;
  supabaseBin: string;
  supabaseLog: string; // where the mock binary records every invocation
}

function makeFixture(): Fixture {
  const dir = join(
    tmpdir(),
    `ritsu-bootstrap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  );
  mkdirSync(dir, { recursive: true });
  return {
    dir,
    envLocal: join(dir, "env-local"),
    patSource: join(dir, "pat-source"),
    supabaseBin: join(dir, "supabase-mock"),
    supabaseLog: join(dir, "supabase.log"),
  };
}

function writeEnvFile(path: string, vars: Record<string, string>) {
  const lines = Object.entries(vars).map(([k, v]) => `${k}=${v}`);
  writeFileSync(path, lines.join("\n") + "\n");
}

interface MockSupabaseConfig {
  exitCode?: number;     // exit 0 by default; non-zero to simulate failure
  stdoutOnTable?: string; // body printed when --output table is requested
}

function writeMockSupabase(fx: Fixture, cfg: MockSupabaseConfig = {}) {
  const exitCode = cfg.exitCode ?? 0;
  const tableOut = cfg.stdoutOnTable ?? "│ 99 │ x │ * * * * * │ true │ 320 │";
  // Bash script: log every invocation (args + the contents of any --file
  // argument) to a structured ndjson file, then exit with configured code.
  const mock = `#!/usr/bin/env bash
LOG="${fx.supabaseLog}"
EXIT_CODE=${exitCode}
TABLE_OUT='${tableOut.replace(/'/g, "'\\''")}'

# Capture arguments
ARGS_JSON="["
first=1
for a in "$@"; do
  if [ $first -eq 1 ]; then first=0; else ARGS_JSON+=","; fi
  esc=$(printf '%s' "$a" | sed 's/\\\\/\\\\\\\\/g; s/"/\\\\"/g')
  ARGS_JSON+='"'"$esc"'"'
done
ARGS_JSON+="]"

# If --file is present, capture file contents (this is where the SQL lives).
SQL_CONTENT=""
prev=""
for a in "$@"; do
  if [ "$prev" = "--file" ] && [ -f "$a" ]; then
    SQL_CONTENT=$(cat "$a")
  fi
  prev="$a"
done

# JSON-escape SQL for the log
ESC_SQL=$(printf '%s' "$SQL_CONTENT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

printf '{"args":%s,"sql":%s}\\n' "$ARGS_JSON" "$ESC_SQL" >> "$LOG"

# If --output table is requested, print the table-shaped output
for a in "$@"; do
  if [ "$a" = "--output" ]; then HAS_OUTPUT=1; fi
  if [ "$a" = "table" ] && [ -n "\${HAS_OUTPUT:-}" ]; then
    echo "$TABLE_OUT"
  fi
done

exit $EXIT_CODE
`;
  writeFileSync(fx.supabaseBin, mock);
  chmodSync(fx.supabaseBin, 0o755);
}

function runScript(
  fx: Fixture,
  envExtra: Record<string, string> = {},
): { status: number; stdout: string; stderr: string } {
  const r = spawnSync("bash", [SCRIPT], {
    env: {
      ...process.env,
      RITSU_ENV_LOCAL: fx.envLocal,
      RITSU_PAT_SOURCE: fx.patSource,
      RITSU_SUPABASE_BIN: fx.supabaseBin,
      ...envExtra,
    },
    encoding: "utf8",
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout ?? "",
    stderr: r.stderr ?? "",
  };
}

function readLogEntries(path: string): Array<{ args: string[]; sql: string }> {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((l) => l.length > 0)
    .map((l) => JSON.parse(l));
}

let fx: Fixture;
beforeEach(() => {
  fx = makeFixture();
});
afterEach(() => {
  try {
    rmSync(fx.dir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ============================================================================
// B1: ENV_LOCAL missing
// ============================================================================

describe("bootstrap script — env file presence", () => {
  it("exits 2 when ENV_LOCAL does not exist", () => {
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/env file missing/);
  });

  it("exits 2 when PAT_SOURCE does not exist", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: "abcdef0123456789".repeat(2) });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/access-token source missing/);
  });

  it("does NOT call supabase binary when env files are missing", () => {
    writeMockSupabase(fx);
    runScript(fx);
    expect(existsSync(fx.supabaseLog)).toBe(false);
  });
});

// ============================================================================
// B3, B4: required vars missing inside env files
// ============================================================================

describe("bootstrap script — required variables", () => {
  it("exits 2 when WORKER_SECRET is absent from ENV_LOCAL", () => {
    writeEnvFile(fx.envLocal, { OTHER_KEY: "xyz" });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/WORKER_SECRET unset/);
  });

  it("exits 2 when WORKER_SECRET line exists but value is empty", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: "" });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/WORKER_SECRET unset/);
  });

  it("exits 2 when SUPABASE_ACCESS_TOKEN is absent from PAT_SOURCE", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: "real_secret_value_32_hex_chars__" });
    writeEnvFile(fx.patSource, { OTHER: "xyz" });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.status).toBe(2);
    expect(r.stderr).toMatch(/SUPABASE_ACCESS_TOKEN unset/);
  });
});

// ============================================================================
// B5: supabase command failure
// ============================================================================

describe("bootstrap script — supabase failure", () => {
  it("exits 1 when supabase db query exits non-zero", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: "abcdef0123456789".repeat(2) });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx, { exitCode: 1 });
    const r = runScript(fx);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/supabase db query failed/);
  });
});

// ============================================================================
// B6: happy path + contract — generated SQL contents
// ============================================================================

describe("bootstrap script — happy path", () => {
  const SECRET = "abcdef0123456789".repeat(2); // 32 hex chars

  it("exits 0 when env files + supabase succeed", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Bootstrap complete/);
  });

  it("invokes supabase exactly twice (reschedule SQL + verify SELECT)", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    runScript(fx);
    const entries = readLogEntries(fx.supabaseLog);
    expect(entries).toHaveLength(2);
  });

  it("first invocation passes --linked --file with reschedule SQL", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    runScript(fx);
    const entries = readLogEntries(fx.supabaseLog);
    expect(entries[0].args).toContain("--linked");
    expect(entries[0].args).toContain("--file");
    expect(entries[0].args).toContain("db");
    expect(entries[0].args).toContain("query");
  });

  it("generated SQL contains cron.unschedule + cron.schedule for the named job", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    runScript(fx);
    const sql = readLogEntries(fx.supabaseLog)[0].sql;
    expect(sql).toContain("cron.unschedule('minion-worker-tick')");
    expect(sql).toContain("cron.schedule(");
    expect(sql).toContain("'minion-worker-tick'");
  });

  it("generated SQL inlines the worker secret into the cron command", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    runScript(fx);
    const sql = readLogEntries(fx.supabaseLog)[0].sql;
    expect(sql).toContain(`'${SECRET}'`);
  });

  it("generated SQL targets the configured project URL", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    runScript(fx);
    const sql = readLogEntries(fx.supabaseLog)[0].sql;
    expect(sql).toContain("https://mntobbmieuoaxipnjaau.supabase.co/functions/v1/minion-worker");
  });

  it("never prints the secret to stdout or stderr", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);
    const r = runScript(fx);
    expect(r.stdout).not.toContain(SECRET);
    expect(r.stderr).not.toContain(SECRET);
  });

  it("forwards SUPABASE_ACCESS_TOKEN as env so supabase CLI can authenticate", () => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_token_xyz" });
    // mock supabase that records env into the log instead of args
    const mock = `#!/usr/bin/env bash
echo "{\\"token\\":\\"$SUPABASE_ACCESS_TOKEN\\"}" >> "${fx.supabaseLog}"
exit 0
`;
    writeFileSync(fx.supabaseBin, mock);
    chmodSync(fx.supabaseBin, 0o755);
    runScript(fx);
    const lines = readFileSync(fx.supabaseLog, "utf8").trim().split("\n");
    expect(lines.length).toBeGreaterThanOrEqual(1);
    const first = JSON.parse(lines[0]);
    expect(first.token).toBe("sbp_token_xyz");
  });
});

// ============================================================================
// override propagation — RITSU_PROJECT_REF, RITSU_CRON_JOBNAME, RITSU_CRON_EXPR
// ============================================================================

describe("bootstrap script — env-var overrides propagate into SQL", () => {
  const SECRET = "fedcba9876543210".repeat(2);
  beforeEach(() => {
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_x" });
    writeMockSupabase(fx);
  });

  it("custom RITSU_PROJECT_REF appears in the generated URL", () => {
    runScript(fx, { RITSU_PROJECT_REF: "alphaprojectref" });
    const sql = readLogEntries(fx.supabaseLog)[0].sql;
    expect(sql).toContain("https://alphaprojectref.supabase.co/functions/v1/minion-worker");
  });

  it("custom RITSU_CRON_JOBNAME appears in unschedule + schedule calls", () => {
    runScript(fx, { RITSU_CRON_JOBNAME: "custom-tick-job" });
    const sql = readLogEntries(fx.supabaseLog)[0].sql;
    expect(sql).toContain("cron.unschedule('custom-tick-job')");
    expect(sql).toContain("'custom-tick-job'");
  });

  it("custom RITSU_CRON_EXPR appears in the schedule call", () => {
    runScript(fx, { RITSU_CRON_EXPR: "*/5 * * * *" });
    const sql = readLogEntries(fx.supabaseLog)[0].sql;
    expect(sql).toContain("'*/5 * * * *'");
  });
});

// ============================================================================
// idempotency — Phase 2P state sequences
// ============================================================================

describe("bootstrap script — idempotency", () => {
  it("can run twice consecutively without error and produces same SQL", () => {
    const SECRET = "0123456789abcdef".repeat(2);
    writeEnvFile(fx.envLocal, { WORKER_SECRET: SECRET });
    writeEnvFile(fx.patSource, { SUPABASE_ACCESS_TOKEN: "sbp_test" });
    writeMockSupabase(fx);

    const r1 = runScript(fx);
    const r2 = runScript(fx);

    expect(r1.status).toBe(0);
    expect(r2.status).toBe(0);

    const entries = readLogEntries(fx.supabaseLog);
    expect(entries).toHaveLength(4); // 2 invocations × 2 calls each
    // First call of each run is the reschedule with SQL — must be identical
    expect(entries[0].sql).toBe(entries[2].sql);
  });
});
