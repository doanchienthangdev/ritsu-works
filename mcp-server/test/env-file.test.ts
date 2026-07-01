// Tests for src/lib/env-file.ts — the portable, cross-platform .env.local self-loader
// that lets .mcp.json launch the server without a POSIX shell (co-founder onboarding).
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { autoloadEnvLocal, repoRootFromHere } from "../src/lib/env-file.ts";

describe("autoloadEnvLocal", () => {
  let root: string;
  const seed = (body: string) => {
    mkdirSync(join(root, "runtime", "secrets"), { recursive: true });
    writeFileSync(join(root, "runtime", "secrets", ".env.local"), body);
  };
  beforeEach(() => { root = mkdtempSync(join(tmpdir(), "envfile-")); });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("loads KEY=value pairs into the target env when not already present", () => {
    seed("SUPABASE_URL=https://x.supabase.co\nSUPABASE_ANON_KEY=anon-1\n");
    const env: NodeJS.ProcessEnv = {};
    const sourced = autoloadEnvLocal(root, env);
    expect(sourced).toBe(join(root, "runtime", "secrets", ".env.local"));
    expect(env.SUPABASE_URL).toBe("https://x.supabase.co");
    expect(env.SUPABASE_ANON_KEY).toBe("anon-1");
  });

  it("is a NO-OP when SUPABASE_URL is already set (shell-sourced legacy path)", () => {
    seed("SUPABASE_ANON_KEY=should-not-load\n");
    const env: NodeJS.ProcessEnv = { SUPABASE_URL: "https://already" };
    expect(autoloadEnvLocal(root, env)).toBeNull();
    expect(env.SUPABASE_ANON_KEY).toBeUndefined();
  });

  it("does NOT override a key already present in env", () => {
    seed("SUPABASE_ANON_KEY=from-file\nEXTRA=x\n"); // no SUPABASE_URL so it runs
    const env: NodeJS.ProcessEnv = { SUPABASE_ANON_KEY: "preset" };
    autoloadEnvLocal(root, env);
    expect(env.SUPABASE_ANON_KEY).toBe("preset"); // preserved
    expect(env.EXTRA).toBe("x"); // new one loaded
  });

  it("honors `export KEY=v`, strips quotes + inline comments", () => {
    seed(
      [
        "export RITSU_AUTH_MODE=per-human",
        'SUPABASE_ANON_KEY="quoted-anon"   # inline note',
        "RITSU_OPERATOR_REFRESH_TOKEN_FILE=/c/r.json",
      ].join("\n"),
    );
    const env: NodeJS.ProcessEnv = {};
    autoloadEnvLocal(root, env);
    expect(env.RITSU_AUTH_MODE).toBe("per-human");
    expect(env.SUPABASE_ANON_KEY).toBe("quoted-anon");
    expect(env.RITSU_OPERATOR_REFRESH_TOKEN_FILE).toBe("/c/r.json");
  });

  it("returns null when the file is absent", () => {
    const env: NodeJS.ProcessEnv = {};
    expect(autoloadEnvLocal(root, env)).toBeNull();
    expect(Object.keys(env)).toStrictEqual([]);
  });

  it("an empty-valued key does not swallow the next line", () => {
    seed("RITSU_AUTH_MODE=\nSUPABASE_ANON_KEY=anon\n");
    const env: NodeJS.ProcessEnv = {};
    autoloadEnvLocal(root, env);
    expect(env.RITSU_AUTH_MODE).toBe("");
    expect(env.SUPABASE_ANON_KEY).toBe("anon");
  });

  it("repoRootFromHere() resolves to the repo root (…/mcp-server/src/lib → root)", () => {
    // env-file.ts lives at <root>/mcp-server/src/lib, so repoRootFromHere ends without those.
    const r = repoRootFromHere();
    expect(r).not.toMatch(/mcp-server[/\\]src/);
  });
});
