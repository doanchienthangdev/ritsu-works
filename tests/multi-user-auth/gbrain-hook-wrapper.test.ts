// All-Edge tests for the gbrain hook WRAPPER's I/O helpers (capability
// multi-user-auth, Sprint 2 — ITEM B). The wrapper reads .env.local + the
// credential file itself (it cannot assume the shell env in Claude Desktop), so
// these helpers are the I/O boundary; the pure decision is in gbrain-tier-gate.cjs.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readEnvLocal, readAccessToken } from "../../.claude/hooks/runtime/pre-tool-gbrain-tier.cjs";

describe("readEnvLocal — tolerant .env.local parser", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gb-env-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  const write = (body: string) => {
    const f = join(dir, ".env.local");
    writeFileSync(f, body);
    return f;
  };

  it("extracts the three keys it cares about (and ignores others)", () => {
    const f = write(
      [
        "# a comment",
        "RITSU_AUTH_MODE=per-human",
        "RITSU_OPERATOR_REFRESH_TOKEN_FILE=/path/to/cred.json",
        "RITSU_OPERATOR_ACCESS_TOKEN=tok-123",
        "SUPABASE_SERVICE_KEY=should-be-ignored",
      ].join("\n"),
    );
    expect(readEnvLocal(f)).toStrictEqual({
      RITSU_AUTH_MODE: "per-human",
      RITSU_OPERATOR_REFRESH_TOKEN_FILE: "/path/to/cred.json",
      RITSU_OPERATOR_ACCESS_TOKEN: "tok-123",
    });
  });
  it("strips surrounding double/single quotes and an inline comment + trailing whitespace", () => {
    const f = write(
      [
        'RITSU_AUTH_MODE="per-human"',
        "RITSU_OPERATOR_ACCESS_TOKEN='tok-quoted'   # inline note",
        "RITSU_OPERATOR_REFRESH_TOKEN_FILE=/x/y.json   ",
      ].join("\n"),
    );
    const out = readEnvLocal(f);
    expect(out.RITSU_AUTH_MODE).toBe("per-human");
    expect(out.RITSU_OPERATOR_ACCESS_TOKEN).toBe("tok-quoted");
    expect(out.RITSU_OPERATOR_REFRESH_TOKEN_FILE).toBe("/x/y.json");
  });
  it("absent file (worktree/CI) → {} (caller then defaults to service-key no-op)", () => {
    expect(readEnvLocal(join(dir, "does-not-exist"))).toStrictEqual({});
  });
  it("file present but none of the keys → {}", () => {
    const f = write("FOO=bar\nBAZ=qux\n");
    expect(readEnvLocal(f)).toStrictEqual({});
  });
  it("a key with an empty value is omitted (regex requires ≥1 non-quote char)", () => {
    const f = write("RITSU_AUTH_MODE=\nRITSU_OPERATOR_ACCESS_TOKEN=tok");
    const out = readEnvLocal(f);
    expect(out.RITSU_AUTH_MODE).toBeUndefined();
    expect(out.RITSU_OPERATOR_ACCESS_TOKEN).toBe("tok");
  });
  it("a commented-out key is not picked up", () => {
    const f = write("# RITSU_AUTH_MODE=per-human\nRITSU_OPERATOR_ACCESS_TOKEN=tok");
    expect(readEnvLocal(f).RITSU_AUTH_MODE).toBeUndefined();
  });
  it("tolerates spaces around the '=' and the key", () => {
    const f = write("  RITSU_AUTH_MODE = per-human \n");
    expect(readEnvLocal(f).RITSU_AUTH_MODE).toBe("per-human");
  });
  // audit 2026-06-30 (C2-keystone-3): the .mcp.json wrappers source .env.local
  // via `set -a; . .env.local`, which exports `export KEY=v` the same as `KEY=v`.
  // The hook must read both, else `export RITSU_AUTH_MODE=per-human` would parse
  // as null → silent service-key no-op (fail-open) while ops/analytics enforced.
  it("honors an `export `-prefixed line (parity with `set -a; . .env.local`)", () => {
    const f = write(
      [
        "export RITSU_AUTH_MODE=per-human",
        "export RITSU_OPERATOR_REFRESH_TOKEN_FILE=/c/r.json",
        "export RITSU_OPERATOR_ACCESS_TOKEN=tok-x",
      ].join("\n"),
    );
    expect(readEnvLocal(f)).toStrictEqual({
      RITSU_AUTH_MODE: "per-human",
      RITSU_OPERATOR_REFRESH_TOKEN_FILE: "/c/r.json",
      RITSU_OPERATOR_ACCESS_TOKEN: "tok-x",
    });
  });
  it("honors an indented `  export KEY=v` line", () => {
    const f = write("  export RITSU_AUTH_MODE=per-human\n");
    expect(readEnvLocal(f).RITSU_AUTH_MODE).toBe("per-human");
  });
  it("does not let `export` bleed into a non-matching key (exportRITSU... is not a match)", () => {
    // `export` must be followed by whitespace; a glued token is NOT the key.
    const f = write("exportRITSU_AUTH_MODE=nope\nRITSU_AUTH_MODE=per-human\n");
    expect(readEnvLocal(f).RITSU_AUTH_MODE).toBe("per-human");
  });
});

describe("readAccessToken — inline-then-file precedence, fail-closed", () => {
  let dir: string;
  beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "gb-tok-")); });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("inline RITSU_OPERATOR_ACCESS_TOKEN wins over the file", () => {
    const f = join(dir, "c.json");
    writeFileSync(f, JSON.stringify({ access_token: "from-file" }));
    expect(readAccessToken({ RITSU_OPERATOR_ACCESS_TOKEN: "from-inline", RITSU_OPERATOR_REFRESH_TOKEN_FILE: f })).toBe("from-inline");
  });
  it("no inline → reads the file's access_token", () => {
    const f = join(dir, "c.json");
    writeFileSync(f, JSON.stringify({ refresh_token: "r", access_token: "from-file" }));
    expect(readAccessToken({ RITSU_OPERATOR_REFRESH_TOKEN_FILE: f })).toBe("from-file");
  });
  it("file without access_token (cold-start) → null", () => {
    const f = join(dir, "c.json");
    writeFileSync(f, JSON.stringify({ refresh_token: "r" }));
    expect(readAccessToken({ RITSU_OPERATOR_REFRESH_TOKEN_FILE: f })).toBeNull();
  });
  it("corrupt file → null; missing file → null; no file + no inline → null", () => {
    const fc = join(dir, "corrupt.json");
    writeFileSync(fc, "{ not json");
    expect(readAccessToken({ RITSU_OPERATOR_REFRESH_TOKEN_FILE: fc })).toBeNull();
    expect(readAccessToken({ RITSU_OPERATOR_REFRESH_TOKEN_FILE: join(dir, "nope.json") })).toBeNull();
    expect(readAccessToken({})).toBeNull();
  });
  it("non-string access_token field → null (fail-closed)", () => {
    const f = join(dir, "c.json");
    writeFileSync(f, JSON.stringify({ access_token: 12345 }));
    expect(readAccessToken({ RITSU_OPERATOR_REFRESH_TOKEN_FILE: f })).toBeNull();
  });
});
