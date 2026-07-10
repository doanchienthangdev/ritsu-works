// Regression tests for the gbrain tier gate's WORKTREE .env.local resolution
// (capability multi-user-auth — 2026-07-10).
//
// The bug: `runtime/` is local-only and absent from git worktrees, so resolving
// .env.local relative to the hook file put it at <worktree>/runtime/secrets/.env.local,
// which never exists. readEnvLocal() returned {} → authMode defaulted to
// 'service-key' → the gate SILENTLY NO-OPPED for every gbrain call made from a
// worktree session. That is a fail-OPEN on the one per-human surface with no
// server-side backstop.
//
// The fix walks out of `.claude/worktrees/<name>/` to the main root, mirroring
// scripts/cross-tier/check-analytics-sync-health.cjs. A machine with no per-human
// install (fresh clone / CI) must still no-op exactly as before.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import {
  resolveMainRoot,
  resolveEnvFile,
  readEnvLocal,
} from "../../.claude/hooks/runtime/pre-tool-gbrain-tier.cjs";

describe("resolveMainRoot — the /.claude/worktrees/ marker", () => {
  it("a plain repo root is its own main root", () => {
    expect(resolveMainRoot("/Users/me/ritsu-works")).toBe("/Users/me/ritsu-works");
  });
  it("a worktree path resolves to the main root above the marker", () => {
    expect(resolveMainRoot("/Users/me/ritsu-works/.claude/worktrees/happy-tesla-123")).toBe(
      "/Users/me/ritsu-works",
    );
  });
  it("a nested path INSIDE a worktree still resolves to the main root", () => {
    expect(
      resolveMainRoot("/Users/me/ritsu-works/.claude/worktrees/wt/.claude/hooks/runtime"),
    ).toBe("/Users/me/ritsu-works");
  });
  it("a path containing '.claude' but not the worktrees marker is returned verbatim", () => {
    // resolveMainRoot only strips at the worktrees marker. It is always handed the
    // already-resolved REPO_ROOT, never a hook subdirectory, so there is nothing to
    // walk up here — returning it unchanged is the contract.
    const p = "/Users/me/ritsu-works/.claude/hooks/runtime";
    expect(resolveMainRoot(p)).toBe(p);
  });
  it("a directory merely NAMED worktrees (no .claude parent) is unchanged", () => {
    expect(resolveMainRoot("/Users/me/worktrees/foo")).toBe("/Users/me/worktrees/foo");
  });
  it("the marker must be a full path segment — 'worktreesX' does not match", () => {
    const p = `/Users/me/repo/.claude/worktreesX/wt`;
    expect(resolveMainRoot(p)).toBe(p);
  });
  it("only the FIRST marker occurrence is used (a worktree cannot escape upward twice)", () => {
    expect(
      resolveMainRoot("/r/.claude/worktrees/a/.claude/worktrees/b"),
    ).toBe("/r");
  });
  it("empty string → empty string (total; never throws)", () => {
    expect(resolveMainRoot("")).toBe("");
  });
});

describe("resolveEnvFile — worktree falls back to the main root's .env.local", () => {
  let root: string;
  let worktree: string;

  const envPath = (base: string) => join(base, "runtime", "secrets", ".env.local");
  const writeEnv = (base: string, body: string) => {
    mkdirSync(join(base, "runtime", "secrets"), { recursive: true });
    writeFileSync(envPath(base), body);
    return envPath(base);
  };

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "gb-wt-"));
    worktree = join(root, ".claude", "worktrees", "some-branch");
    mkdirSync(worktree, { recursive: true });
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("REGRESSION: from a worktree with no runtime/, finds the MAIN root's .env.local", () => {
    const main = writeEnv(root, "RITSU_AUTH_MODE=per-human\n");
    expect(resolveEnvFile(worktree)).toBe(main);
  });

  it("REGRESSION: the gate therefore sees per-human from a worktree (previously it saw nothing)", () => {
    writeEnv(root, "RITSU_AUTH_MODE=per-human\nRITSU_OPERATOR_REFRESH_TOKEN_FILE=/c/r.json\n");
    const env = readEnvLocal(resolveEnvFile(worktree));
    expect(env.RITSU_AUTH_MODE).toBe("per-human");
    expect(env.RITSU_OPERATOR_REFRESH_TOKEN_FILE).toBe("/c/r.json");
  });

  it("from the main root itself, uses its own .env.local (unchanged behavior)", () => {
    const main = writeEnv(root, "RITSU_AUTH_MODE=per-human\n");
    expect(resolveEnvFile(root)).toBe(main);
  });

  it("a worktree that DOES have its own .env.local prefers it over the main root's", () => {
    writeEnv(root, "RITSU_AUTH_MODE=per-human\n");
    const local = writeEnv(worktree, "RITSU_AUTH_MODE=service-key\n");
    expect(resolveEnvFile(worktree)).toBe(local);
    expect(readEnvLocal(resolveEnvFile(worktree)).RITSU_AUTH_MODE).toBe("service-key");
  });

  it("no .env.local anywhere (fresh clone / CI) → null → caller no-ops, as before", () => {
    expect(resolveEnvFile(worktree)).toBeNull();
    expect(resolveEnvFile(root)).toBeNull();
    // and the reader tolerates the null path
    expect(readEnvLocal(null)).toStrictEqual({});
  });

  it("a non-worktree tree with no .env.local → null (no accidental escape to '/')", () => {
    const lone = mkdtempSync(join(tmpdir(), "gb-lone-"));
    try {
      expect(resolveEnvFile(lone)).toBeNull();
    } finally {
      rmSync(lone, { recursive: true, force: true });
    }
  });

  it("uses the platform path separator for the marker", () => {
    // Sanity: the marker is built from path.sep, so this test is meaningful on posix
    // and would be on win32 too. Documents the assumption rather than hard-coding '/'.
    expect(resolveMainRoot(`/r${sep}.claude${sep}worktrees${sep}w`)).toBe("/r");
  });
});
