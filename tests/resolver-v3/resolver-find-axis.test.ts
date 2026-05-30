// resolver-plan v1.0 (Sprint 2) — mcp__resolver__find axis + enrichment + filter.
//
// Phase 1 analysis (subject: handleResolverFind, NEW Sprint-2 behavior):
//   - Surfaces on each match: axis (always, when entry enriched) + enrichment
//     (capability: hitl_tier, side_effect; content: authority, freshness,
//     grounding_ref, columns_hint) — renamed from the catalog's Grounding/Columns.
//   - NEW input `axis?: "content"|"capability"` — validated like `kind`; invalid →
//     errorCode "unknown_axis". Filters candidates by entry.axis.
//   - HARD INVARIANT: deterministic — NO LLM, NO network call in the subprocess.
//   - Branches: axis present|absent on entry; axis filter set|unset|invalid;
//     content vs capability vs meta match; enrichment field present|absent.
//   - Dep: catalog (real, via catalog-loader) + a stub Supabase client (no DB).
//
// Phase 2 mapped: invalid axis value, axis combined with kind, a meta-kind match
//   surfaces axis but no hitl/authority, an entry missing an enrichment field omits
//   that key, the no-LLM/no-network invariant under a fetch tripwire.
//
// Phase 2N contract: matches are built from REAL loadCatalog() output (the upstream
//   parser), not hand-mocked recipients — so the axis/enrichment passthrough is
//   tested against the real catalog shape.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { handleResolverFind, _resetSessionLimits } from "../../mcp-server/src/tools/resolver-find.ts";
import type { CallerContext } from "../../mcp-server/src/types.ts";

// Stub Supabase client — same surface the existing resolver-find suite uses.
// No real DB; insert returns a fake run_id, recency select returns empty.
function makeStubClient(): any {
  const inserted: any[] = [];
  return {
    _inserted: inserted,
    schema: (s: string) => ({
      from: (table: string) => ({
        insert: (payload: any) => ({
          select: (cols: string) => ({
            single: async () => {
              inserted.push({ table, schema: s, payload, cols });
              return { data: { run_id: "test-audit-id-" + inserted.length }, error: null };
            },
          }),
        }),
        select: (_cols: string) => ({
          in: (_col: string, _vals: string[]) => ({
            gte: (_c: string, _v: string) => ({
              order: (_c2: string, _opts: any) => ({
                limit: async (_n: number) => ({ data: [], error: null }),
              }),
            }),
          }),
          eq: () => ({ count: 0, data: [], error: null }),
          is: () => ({ data: [], error: null }),
        }),
      }),
    }),
  };
}

const FOUNDER_CTX: CallerContext = {
  role: "founder",
  sessionId: "test-axis-founder",
  hitlMaxTier: "D-MAX",
} as any;

type Match = Record<string, unknown>;
function matchesOf(r: any): Match[] {
  return (r.output as any).matches as Match[];
}

describe("resolver_find — axis filter input validation", () => {
  beforeEach(() => _resetSessionLimits());

  it("rejects an invalid axis value with errorCode unknown_axis", async () => {
    const r = await handleResolverFind(
      { intent: "cost report", axis: "bogus" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("unknown_axis");
  });

  it("rejects axis='meta' (only content|capability are filterable)", async () => {
    const r = await handleResolverFind(
      { intent: "capability lifecycle", axis: "meta" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("failed");
    expect(r.errorCode).toBe("unknown_axis");
  });

  it("accepts axis='content'", async () => {
    const r = await handleResolverFind(
      { intent: "pricing", axis: "content" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
  });

  it("accepts axis='capability'", async () => {
    const r = await handleResolverFind(
      { intent: "onboarding", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
  });
});

describe("resolver_find — axis filter behavior", () => {
  beforeEach(() => _resetSessionLimits());

  it("returns ONLY content-axis matches when axis='content'", async () => {
    const r = await handleResolverFind(
      { intent: "pricing kpi metric", axis: "content" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0); // there ARE content recipients for this
    for (const m of matches) {
      expect(m.axis).toBe("content");
    }
  });

  it("returns ONLY capability-axis matches when axis='capability'", async () => {
    const r = await handleResolverFind(
      { intent: "cost report review", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(m.axis).toBe("capability");
    }
  });

  it("combines axis + kind filters (both must hold)", async () => {
    const r = await handleResolverFind(
      { intent: "report", axis: "capability", kind: "skill" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    for (const m of matchesOf(r)) {
      expect(m.axis).toBe("capability");
      expect(m.kind).toBe("skill");
    }
  });

  it("records axis_filter in the audit metadata", async () => {
    const stub = makeStubClient();
    await handleResolverFind({ intent: "pricing", axis: "content" }, FOUNDER_CTX, stub);
    const auditRow = stub._inserted[stub._inserted.length - 1];
    expect(auditRow.payload.metadata.axis_filter).toBe("content");
  });

  it("mentions the axis filter in no_match_reason when nothing matches", async () => {
    const r = await handleResolverFind(
      { intent: "zzz-no-such-keyword-qwerty-98765", axis: "content" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect(matchesOf(r)).toEqual([]);
    expect((r.output as any).no_match_reason).toContain('axis="content"');
  });
});

describe("resolver_find — axis + enrichment surfaced on matches", () => {
  beforeEach(() => _resetSessionLimits());

  it("every match carries an axis (all real entries are enriched)", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding cost report pricing" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(typeof m.axis).toBe("string");
      expect(["content", "capability", "meta"]).toContain(m.axis);
    }
  });

  it("capability matches carry hitl_tier + side_effect (and NOT content fields)", async () => {
    const r = await handleResolverFind(
      { intent: "cost report", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(typeof m.hitl_tier).toBe("string");
      expect(typeof m.side_effect).toBe("string");
      expect(m.authority).toBeUndefined();
      expect(m.freshness).toBeUndefined();
    }
  });

  it("content matches carry authority + freshness (and NOT capability fields)", async () => {
    const r = await handleResolverFind(
      { intent: "pricing kpi metric", axis: "content" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    const matches = matchesOf(r);
    expect(matches.length).toBeGreaterThan(0);
    for (const m of matches) {
      expect(typeof m.authority).toBe("string");
      expect(typeof m.freshness).toBe("string");
      expect(m.hitl_tier).toBeUndefined();
      expect(m.side_effect).toBeUndefined();
    }
  });

  it("surfaces grounding_ref / columns_hint for a view match (renamed from Grounding/Columns)", async () => {
    // Find a view by kind; at least one real view carries Grounding + Columns.
    const r = await handleResolverFind(
      { intent: "cost daily view gbrain capability lineage customer", kind: "view" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    const matches = matchesOf(r);
    const withCols = matches.find((m) => Array.isArray((m as any).columns_hint));
    expect(withCols).toBeDefined();
    expect(typeof (withCols as any).grounding_ref).toBe("string");
    expect((withCols as any).columns_hint.length).toBeGreaterThan(0);
    // The match must NOT leak the raw catalog keys.
    expect("grounding" in (withCols as any)).toBe(false);
    expect("columns" in (withCols as any)).toBe(false);
  });

  it("backward-compatible: base v2 fields are still present alongside enrichment", async () => {
    const r = await handleResolverFind(
      { intent: "customer onboarding" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    const matches = matchesOf(r);
    if (matches.length > 0) {
      const m = matches[0];
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("kind");
      expect(m).toHaveProperty("keyword_score");
      expect(m).toHaveProperty("when_to_use");
      expect(m).toHaveProperty("invoke");
      expect(m).toHaveProperty("role_scope");
    }
  });
});

describe("resolver_find — HARD INVARIANT: deterministic, no LLM / no network", () => {
  let fetchSpy: any;
  beforeEach(() => {
    _resetSessionLimits();
    // Tripwire: any network call via global fetch throws + fails the test.
    fetchSpy = vi.fn(() => {
      throw new Error("NETWORK CALL ATTEMPTED — resolver_find must be deterministic (no LLM/API)");
    });
    vi.stubGlobal("fetch", fetchSpy);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does NOT call global fetch during a find (axis path included)", async () => {
    const r = await handleResolverFind(
      { intent: "cost report pricing onboarding", axis: "capability" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does NOT call fetch even on the no-match path", async () => {
    const r = await handleResolverFind(
      { intent: "zzz-no-match-keyword-abc-13579" },
      FOUNDER_CTX,
      makeStubClient(),
    );
    expect(r.state).toBe("completed");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("source contains no LLM SDK import and no network primitive", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "mcp-server/src/tools/resolver-find.ts"),
      "utf-8",
    );
    // No LLM SDKs / API keys (re-asserts the iter4 invariant after Sprint 2 edits).
    expect(src).not.toContain("@anthropic-ai/sdk");
    expect(src).not.toContain("ANTHROPIC_API_KEY");
    expect(src).not.toContain("OPENAI_API_KEY");
    expect(src).not.toContain("import OpenAI");
    // No direct outbound HTTP from the tool module.
    expect(src).not.toMatch(/\bfetch\s*\(/);
    expect(src).not.toContain("node:https");
    expect(src).not.toContain("require(\"https\")");
  });
});
