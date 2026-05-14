// Tests for makeDriftFixProposerHandler (v1.1).
//
// Phase 1 — Code Analysis:
//   1 param (DriftFixProposerDeps). Branches:
//     (a) deps.github === null → returns deferred_no_github_token (no retry)
//     (b) sb read errors → retryable failure
//     (c) 0 failed rows → returns ok with zeros
//     (d) row.target_path in blocked prefix → mark wont_fix, skipped_blocked++
//     (e) row.proposed_fix_strategy != regen_bundle → skipped_no_handler++
//     (f) generator returns null → skipped_no_handler++
//     (g) generator throws → mark wont_fix, errors++
//     (h) openPr throws → mark wont_fix, errors++
//     (i) happy path → open PR, mark fix_proposed, proposed++
//     (j) maxProposalsPerTick cap respected
//
// Classification: I/O-heavy + governance-critical. Mock everything.

import { describe, it, expect } from "vitest";

import {
  makeDriftFixProposerHandler,
  type DriftFixProposerDeps,
  type ScheduledRun,
  type SbClient,
} from "../supabase/functions/_shared/worker.ts";
import type {
  GitHubClientDeps,
  OpenPrResult,
} from "../supabase/functions/_shared/github.ts";

const SAMPLE_RUN: ScheduledRun = {
  id: "fix-tick",
  schedule_id: "drift-fix-poll",
  triggered_skill: "drift-fix-proposer",
  fired_at: "2026-05-14T09:30:00Z",
};

const GH: GitHubClientDeps = {
  owner: "test-owner",
  repo: "test-repo",
  token: "fake-token",
};

interface MockRow {
  id: string;
  invariant_id: string;
  proposed_fix_strategy?: string | null;
  target_path?: string | null;
}

interface SbCall {
  table: string;
  op: string;
  args?: unknown;
}

function makeMockSb(
  rows: MockRow[],
  opts: { readError?: { message: string } | null; updateError?: { message: string } | null } = {},
): { sb: SbClient; calls: SbCall[] } {
  const calls: SbCall[] = [];
  const sb: SbClient = {
    from(table: string) {
      // Chainable builder.
      const chain = {
        _filters: {} as Record<string, unknown>,
        select(_cols: string) {
          calls.push({ table, op: "select", args: _cols });
          return chain;
        },
        eq(_col: string, val: unknown) {
          chain._filters[_col] = val;
          return chain;
        },
        is(_col: string, _val: unknown) {
          return chain;
        },
        order(_col: string, _opts: unknown) {
          return chain;
        },
        limit(_n: number) {
          // This is where we finalize the read.
          return Promise.resolve({
            data: opts.readError ? null : rows,
            error: opts.readError ?? null,
          });
        },
        update(args: unknown) {
          calls.push({ table, op: "update", args });
          return {
            eq(_c: string, _v: unknown) {
              return Promise.resolve({ error: opts.updateError ?? null });
            },
          };
        },
      };
      return chain;
    },
  };
  return { sb, calls };
}

function makeSuccessfulPrOpener(): {
  openPr: NonNullable<DriftFixProposerDeps["openPr"]>;
  calls: Parameters<NonNullable<DriftFixProposerDeps["openPr"]>>[];
} {
  const calls: Parameters<NonNullable<DriftFixProposerDeps["openPr"]>>[] = [];
  const openPr = async (gh: GitHubClientDeps, input: Parameters<NonNullable<DriftFixProposerDeps["openPr"]>>[1]) => {
    calls.push([gh, input]);
    const result: OpenPrResult = {
      pr_url: `https://github.com/${gh.owner}/${gh.repo}/pull/${calls.length}`,
      pr_number: calls.length,
      head_sha: `sha-${calls.length}`,
      branch: input.branchName,
    };
    return result;
  };
  return { openPr, calls };
}

describe("makeDriftFixProposerHandler", () => {
  describe("gates", () => {
    it("returns deferred_no_github_token when deps.github is null", async () => {
      const { sb } = makeMockSb([]);
      const handler = makeDriftFixProposerHandler({ sb, github: null });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toBe("deferred_no_github_token");
      expect(fail.retryable).toBe(false);
    });

    it("returns retryable failure on sb read error", async () => {
      const { sb } = makeMockSb([], { readError: { message: "RLS denied" } });
      const handler = makeDriftFixProposerHandler({ sb, github: GH });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(false);
      const fail = result as { ok: false; error: string; retryable?: boolean };
      expect(fail.error).toMatch(/consistency_checks read: RLS denied/);
      expect(fail.retryable).toBe(true);
    });

    it("returns ok with zeros when no failed rows", async () => {
      const { sb } = makeMockSb([]);
      const handler = makeDriftFixProposerHandler({ sb, github: GH });
      const result = await handler(SAMPLE_RUN);
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.output).toMatchObject({
        kind: "drift_fix_proposer",
        proposed: 0,
        skipped_blocked: 0,
        skipped_no_handler: 0,
        errors: 0,
      });
    });
  });

  describe("governance path exclusion", () => {
    it("blocks fixes targeting governance/ paths and marks wont_fix", async () => {
      const rows: MockRow[] = [
        { id: "r1", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "governance/HITL.md" },
        { id: "r2", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "00-charter/product.md" },
        { id: "r3", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "knowledge/manifest.yaml" },
        { id: "r4", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: ".claude/hooks/pre-bash.md" },
      ];
      const { sb, calls } = makeMockSb(rows);
      const { openPr, calls: prCalls } = makeSuccessfulPrOpener();
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async () => ({ files: [{ path: "x", content: "y" }], description: "test" }),
        openPr,
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { skipped_blocked: number; proposed: number };
      expect(out.skipped_blocked).toBe(4);
      expect(out.proposed).toBe(0);
      expect(prCalls).toHaveLength(0);
      // Verify wont_fix updates happened.
      const wontFixUpdates = calls.filter((c) =>
        c.op === "update" && (c.args as { state?: string }).state === "wont_fix"
      );
      expect(wontFixUpdates).toHaveLength(4);
    });
  });

  describe("strategy routing", () => {
    it("skips rows whose strategy is not regen_bundle (v1.1 limit)", async () => {
      const rows: MockRow[] = [
        { id: "r1", invariant_id: "any", proposed_fix_strategy: "patch_yaml", target_path: "" },
        { id: "r2", invariant_id: "any", proposed_fix_strategy: "patch_md", target_path: "" },
        { id: "r3", invariant_id: "any", proposed_fix_strategy: null, target_path: "" },
      ];
      const { sb } = makeMockSb(rows);
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async () => ({ files: [{ path: "x", content: "y" }], description: "test" }),
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { skipped_no_handler: number; proposed: number };
      expect(out.skipped_no_handler).toBe(3);
      expect(out.proposed).toBe(0);
    });

    it("skips when generator missing OR returns null/empty files", async () => {
      const rows: MockRow[] = [
        { id: "r1", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "" },
        { id: "r2", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "" },
      ];
      const { sb } = makeMockSb(rows);
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async (id) => (id === "any" ? null : { files: [], description: "" }),
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { skipped_no_handler: number; proposed: number };
      expect(out.skipped_no_handler).toBe(2);
      expect(out.proposed).toBe(0);
    });
  });

  describe("error handling", () => {
    it("treats generator throw as wont_fix + errors++", async () => {
      const rows: MockRow[] = [
        { id: "r1", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "" },
      ];
      const { sb, calls } = makeMockSb(rows);
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async () => { throw new Error("regen failed"); },
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { errors: number; proposed: number };
      expect(out.errors).toBe(1);
      expect(out.proposed).toBe(0);
      const update = calls.find((c) => c.op === "update");
      const args = update?.args as { state: string; founder_note: string };
      expect(args.state).toBe("wont_fix");
      expect(args.founder_note).toMatch(/^generator_threw: regen failed/);
    });

    it("treats openPr throw as wont_fix + errors++", async () => {
      const rows: MockRow[] = [
        { id: "r1", invariant_id: "any", proposed_fix_strategy: "regen_bundle", target_path: "" },
      ];
      const { sb, calls } = makeMockSb(rows);
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async () => ({
          files: [{ path: "a.ts", content: "x" }],
          description: "regen a.ts",
        }),
        openPr: async () => { throw new Error("github 422 unprocessable"); },
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { errors: number };
      expect(out.errors).toBe(1);
      const update = calls.find((c) => c.op === "update");
      const args = update?.args as { state: string; founder_note: string };
      expect(args.state).toBe("wont_fix");
      expect(args.founder_note).toMatch(/^pr_open_failed:/);
    });
  });

  describe("happy path", () => {
    it("opens PR, updates row to fix_proposed with pr_url", async () => {
      const rows: MockRow[] = [
        { id: "r1", invariant_id: "schedules-bundle-matches-yaml", proposed_fix_strategy: "regen_bundle", target_path: "supabase/functions/_shared/schedules.generated.ts" },
      ];
      const { sb, calls } = makeMockSb(rows);
      const { openPr, calls: prCalls } = makeSuccessfulPrOpener();
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async (id) => ({
          files: [{ path: "supabase/functions/_shared/schedules.generated.ts", content: "// regen" }],
          description: `regen for ${id}`,
        }),
        openPr,
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { proposed: number; pr_urls: string[] };
      expect(out.proposed).toBe(1);
      expect(out.pr_urls).toHaveLength(1);
      expect(prCalls).toHaveLength(1);
      const [, prInput] = prCalls[0];
      expect(prInput.draft).toBe(true);
      expect(prInput.branchName).toMatch(/^drift-fix\/schedules-bundle-matches-yaml-/);
      // Verify state transition
      const update = calls.find((c) =>
        c.op === "update" && (c.args as { state?: string }).state === "fix_proposed"
      );
      const args = update?.args as { proposed_fix_pr_url: string };
      expect(args.proposed_fix_pr_url).toMatch(/^https:\/\/github\.com\//);
    });
  });

  describe("backpressure (maxProposalsPerTick)", () => {
    it("respects the cap (default 5)", async () => {
      const rows: MockRow[] = Array.from({ length: 8 }, (_, i) => ({
        id: `r${i}`,
        invariant_id: "test",
        proposed_fix_strategy: "regen_bundle" as const,
        target_path: "" as string,
      }));
      const { sb } = makeMockSb(rows);
      const { openPr } = makeSuccessfulPrOpener();
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        generateRegenBundleFix: async () => ({
          files: [{ path: "x.ts", content: "y" }],
          description: "t",
        }),
        openPr,
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { proposed: number };
      expect(out.proposed).toBe(5);
    });

    it("respects custom maxProposalsPerTick override", async () => {
      const rows: MockRow[] = Array.from({ length: 5 }, (_, i) => ({
        id: `r${i}`,
        invariant_id: "test",
        proposed_fix_strategy: "regen_bundle" as const,
        target_path: "" as string,
      }));
      const { sb } = makeMockSb(rows);
      const { openPr } = makeSuccessfulPrOpener();
      const handler = makeDriftFixProposerHandler({
        sb,
        github: GH,
        maxProposalsPerTick: 2,
        generateRegenBundleFix: async () => ({ files: [{ path: "x", content: "y" }], description: "t" }),
        openPr,
      });
      const result = await handler(SAMPLE_RUN);
      if (!result.ok) throw new Error("expected ok");
      const out = result.output as { proposed: number };
      expect(out.proposed).toBe(2);
    });
  });
});
