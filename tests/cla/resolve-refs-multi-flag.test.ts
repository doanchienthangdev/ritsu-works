// R8 regression — `scripts/cla/resolve-refs.cjs` multi-flag --refs combine test.
//
// Acceptance criterion R8 (sprint plan §Acceptance criteria, Sprint 1):
//   "multi-flag --refs combine test (added at scripts/cla/resolve-refs.cjs test suite)"
//
// /cla propose accepts `--refs` either once with CSV, or multiple times, or
// mixed. The combined ref list must be the union of all values, in order.
// This invariant matters for /update which reuses the same script (per spec §4
// + Bài-toán #18 "Ingestion").
//
// Capability: update v1.0 Sprint 1 (R8 acceptance)
// Tested behavior:
//   - Single --refs with one value
//   - Single --refs with CSV (comma-split)
//   - Multiple --refs flags, each with single value
//   - Multiple --refs flags, each with CSV (full union)
//   - Whitespace and empty tokens are trimmed/dropped

import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const REPO = resolve(__dirname, "..", "..");
const SCRIPT = join(REPO, "scripts", "cla", "resolve-refs.cjs");

function runResolveRefs(args: string[]): { code: number; stdoutJson: any | null; stderr: string } {
  // Sandbox the runtime-refs dir so the script doesn't write into the live runtime/.
  const sandboxDir = mkdtempSync(join(tmpdir(), "resolve-refs-test-"));
  try {
    const result = spawnSync("node", [SCRIPT, ...args, "--dry-run"], {
      cwd: REPO,
      encoding: "utf8",
      env: { ...process.env, RUNTIME_REFS_TEST_DIR: sandboxDir },
    });
    let parsed: any = null;
    try {
      parsed = JSON.parse(result.stdout);
    } catch {
      // leave null; caller decides
    }
    return { code: result.status ?? -1, stdoutJson: parsed, stderr: result.stderr };
  } finally {
    rmSync(sandboxDir, { recursive: true, force: true });
  }
}

describe("scripts/cla/resolve-refs.cjs — multi-flag --refs (R8)", () => {
  it("accepts a single --refs with one file path", () => {
    const { code, stdoutJson } = runResolveRefs(["--slug=test-r8-single", "--refs=README.md"]);
    expect(code).toBe(0);
    expect(stdoutJson?.resolved).toHaveLength(1);
    expect(stdoutJson?.resolved[0]?.original).toBe("README.md");
  });

  it("comma-splits a single --refs into multiple refs", () => {
    const { code, stdoutJson } = runResolveRefs([
      "--slug=test-r8-csv",
      "--refs=README.md,knowledge/manifest.yaml",
    ]);
    expect(code).toBe(0);
    const originals = (stdoutJson?.resolved ?? []).map((r: any) => r.original);
    expect(originals).toContain("README.md");
    expect(originals).toContain("knowledge/manifest.yaml");
    expect(originals).toHaveLength(2);
  });

  it("combines multiple --refs flags into a single union list (R8)", () => {
    const { code, stdoutJson } = runResolveRefs([
      "--slug=test-r8-multi",
      "--refs=README.md",
      "--refs=knowledge/manifest.yaml",
      "--refs=governance/HITL.md",
    ]);
    expect(code).toBe(0);
    const originals = (stdoutJson?.resolved ?? []).map((r: any) => r.original);
    expect(originals).toContain("README.md");
    expect(originals).toContain("knowledge/manifest.yaml");
    expect(originals).toContain("governance/HITL.md");
    expect(originals).toHaveLength(3);
  });

  it("combines multi-flag + CSV (full union semantics)", () => {
    const { code, stdoutJson } = runResolveRefs([
      "--slug=test-r8-mixed",
      "--refs=README.md,knowledge/manifest.yaml",
      "--refs=governance/HITL.md,governance/ROLES.md",
    ]);
    expect(code).toBe(0);
    const originals = (stdoutJson?.resolved ?? []).map((r: any) => r.original);
    expect(originals.sort()).toEqual([
      "README.md",
      "governance/HITL.md",
      "governance/ROLES.md",
      "knowledge/manifest.yaml",
    ].sort());
  });

  it("trims whitespace around CSV tokens", () => {
    const { code, stdoutJson } = runResolveRefs([
      "--slug=test-r8-whitespace",
      "--refs=  README.md  ,  knowledge/manifest.yaml  ",
    ]);
    expect(code).toBe(0);
    const originals = (stdoutJson?.resolved ?? []).map((r: any) => r.original);
    expect(originals).toContain("README.md");
    expect(originals).toContain("knowledge/manifest.yaml");
    // No empty/whitespace-only entries should pass.
    expect(originals.every((o: string) => o.trim().length > 0)).toBe(true);
  });

  it("drops empty tokens from CSV (no phantom refs from trailing commas)", () => {
    const { code, stdoutJson } = runResolveRefs([
      "--slug=test-r8-empty-tokens",
      "--refs=README.md,,knowledge/manifest.yaml,",
    ]);
    expect(code).toBe(0);
    const originals = (stdoutJson?.resolved ?? []).map((r: any) => r.original);
    expect(originals).toHaveLength(2);
  });

  it("preserves order of refs across multi-flag combination", () => {
    const { code, stdoutJson } = runResolveRefs([
      "--slug=test-r8-order",
      "--refs=README.md",
      "--refs=knowledge/manifest.yaml",
      "--refs=governance/HITL.md",
    ]);
    expect(code).toBe(0);
    const originals = (stdoutJson?.resolved ?? []).map((r: any) => r.original);
    expect(originals).toEqual([
      "README.md",
      "knowledge/manifest.yaml",
      "governance/HITL.md",
    ]);
  });
});
