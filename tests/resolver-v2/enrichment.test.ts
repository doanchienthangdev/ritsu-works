// Resolver-plan v1.0 (Sprint 1) — enrichment derivation test suite.
//
// Phase 1 analysis: enrichEntry(signals) branches on axis (capability/content/
// meta) via axis-map.cjs (throws on unknown kind). Helpers:
//   normalizeHitlTier(raw) — null|case-insensitive|exact|unknown→null
//   deriveHitlTier(kind, raw) — declared › advisory-default(A) › conservative(B)
//   deriveSideEffect(tier, hint) — hint › A→none › B+→write
//   deriveAuthority(kind) — static map | null (non-content)
//   deriveFreshness(kind, source) — switch + freshnessFromSqlSource
//   freshnessFromSqlSource(s) — metrics.→hourly | ops./public.→live | none→null
//
// SAFETY INVARIANT under test (spec §6 + Muse adversarial review):
//   unknown / missing hitl_tier → 'B' (conservative), NEVER 'A'.
//
// Specification-driven: derivation rules are written in refs/03-design-decisions.md
// "Field provenance" — these tests assert the SPEC, not just the code.

import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const enrich = cjsRequire(join(REPO, "scripts/resolver-v2/enrichment.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

// ---------------------------------------------------------------------------
// normalizeHitlTier
// ---------------------------------------------------------------------------

describe("enrichment — normalizeHitlTier", () => {
  it("returns the exact tier for canonical spellings", () => {
    for (const t of ["A", "B", "C", "D-Std", "D-MAX"]) {
      expect(enrich.normalizeHitlTier(t)).toBe(t);
    }
  });

  it("normalizes case-insensitive D tiers to canonical spelling", () => {
    expect(enrich.normalizeHitlTier("d-std")).toBe("D-Std");
    expect(enrich.normalizeHitlTier("D-STD")).toBe("D-Std");
    expect(enrich.normalizeHitlTier("d-max")).toBe("D-MAX");
  });

  it("trims surrounding whitespace", () => {
    expect(enrich.normalizeHitlTier("  C  ")).toBe("C");
  });

  it("returns null for unrecognized tier strings", () => {
    expect(enrich.normalizeHitlTier("X")).toBeNull();
    expect(enrich.normalizeHitlTier("Tier B")).toBeNull();
    expect(enrich.normalizeHitlTier("E")).toBeNull();
  });

  it("returns null for non-string / empty / nullish input", () => {
    expect(enrich.normalizeHitlTier(null)).toBeNull();
    expect(enrich.normalizeHitlTier(undefined)).toBeNull();
    expect(enrich.normalizeHitlTier("")).toBeNull();
    expect(enrich.normalizeHitlTier("   ")).toBeNull();
    expect(enrich.normalizeHitlTier(42)).toBeNull();
    expect(enrich.normalizeHitlTier({})).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deriveHitlTier — THE safety-critical derivation
// ---------------------------------------------------------------------------

describe("enrichment — deriveHitlTier", () => {
  it("uses a declared tier when present (mcp/skill/sop case)", () => {
    expect(enrich.deriveHitlTier("mcp", "A")).toBe("A");
    expect(enrich.deriveHitlTier("mcp", "D-Std")).toBe("D-Std");
    expect(enrich.deriveHitlTier("sop", "C")).toBe("C");
    expect(enrich.deriveHitlTier("skill", "B")).toBe("B");
  });

  it("defaults advisory kinds (command/agent/persona) to A when no tier declared", () => {
    expect(enrich.deriveHitlTier("command", null)).toBe("A");
    expect(enrich.deriveHitlTier("agent", null)).toBe("A");
    expect(enrich.deriveHitlTier("persona", undefined)).toBe("A");
  });

  // ── SAFETY INVARIANT ──────────────────────────────────────────────
  it("defaults UNKNOWN/undeclared non-advisory kinds to B — NEVER A", () => {
    // skill/sop/workflow/schedule/hook/mcp with no declared tier → conservative B.
    for (const kind of ["skill", "sop", "workflow", "schedule", "hook", "mcp"]) {
      const tier = enrich.deriveHitlTier(kind, null);
      expect(tier, `${kind} with no tier`).toBe("B");
      expect(tier).not.toBe("A");
    }
  });

  it("falls back to B (not A) when the declared tier is unrecognized garbage", () => {
    expect(enrich.deriveHitlTier("skill", "NONSENSE")).toBe("B");
    expect(enrich.deriveHitlTier("sop", "Tier 9")).toBe("B");
  });

  it("an advisory kind with an explicit higher tier respects the declaration", () => {
    // e.g. a command that declares it does something Tier-C.
    expect(enrich.deriveHitlTier("command", "C")).toBe("C");
    expect(enrich.deriveHitlTier("agent", "D-MAX")).toBe("D-MAX");
  });

  it("CONSERVATIVE_HITL_TIER constant is 'B'", () => {
    expect(enrich.CONSERVATIVE_HITL_TIER).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// deriveSideEffect
// ---------------------------------------------------------------------------

describe("enrichment — deriveSideEffect", () => {
  it("tier A → none (read/compute, no side effect)", () => {
    expect(enrich.deriveSideEffect("A", null)).toBe("none");
  });

  it("tier B+ with no hint → write (default)", () => {
    expect(enrich.deriveSideEffect("B", null)).toBe("write");
    expect(enrich.deriveSideEffect("C", null)).toBe("write");
    expect(enrich.deriveSideEffect("D-Std", null)).toBe("write");
    expect(enrich.deriveSideEffect("D-MAX", undefined)).toBe("write");
  });

  it("an explicit valid hint overrides the tier-derived default", () => {
    expect(enrich.deriveSideEffect("B", "send")).toBe("send");
    expect(enrich.deriveSideEffect("C", "money")).toBe("money");
    expect(enrich.deriveSideEffect("B", "publish")).toBe("publish");
    expect(enrich.deriveSideEffect("A", "none")).toBe("none");
  });

  it("an invalid hint is ignored (falls back to tier-derived value)", () => {
    expect(enrich.deriveSideEffect("B", "explode")).toBe("write");
    expect(enrich.deriveSideEffect("A", "explode")).toBe("none");
  });

  it("a non-string hint is ignored", () => {
    expect(enrich.deriveSideEffect("B", 123)).toBe("write");
    expect(enrich.deriveSideEffect("B", null)).toBe("write");
  });
});

// ---------------------------------------------------------------------------
// deriveAuthority
// ---------------------------------------------------------------------------

describe("enrichment — deriveAuthority", () => {
  it("page/view/metric → SoR (Tier-1 / live system of record)", () => {
    expect(enrich.deriveAuthority("page")).toBe("SoR");
    expect(enrich.deriveAuthority("view")).toBe("SoR");
    expect(enrich.deriveAuthority("metric")).toBe("SoR");
  });

  it("external-source → SoR-external", () => {
    expect(enrich.deriveAuthority("external-source")).toBe("SoR-external");
  });

  it("wiki/runbook → derived-memory", () => {
    expect(enrich.deriveAuthority("wiki")).toBe("derived-memory");
    expect(enrich.deriveAuthority("runbook")).toBe("derived-memory");
  });

  it("non-content kind → null (no authority concept)", () => {
    expect(enrich.deriveAuthority("skill")).toBeNull();
    expect(enrich.deriveAuthority("capability")).toBeNull();
    expect(enrich.deriveAuthority("mcp")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// freshnessFromSqlSource + deriveFreshness
// ---------------------------------------------------------------------------

describe("enrichment — freshnessFromSqlSource", () => {
  it("metrics.* → hourly (ETL'd snapshot)", () => {
    expect(enrich.freshnessFromSqlSource("metrics.product_dau_snapshot")).toBe("hourly");
    expect(enrich.freshnessFromSqlSource("SELECT ... FROM metrics.gbrain_cost_daily")).toBe("hourly");
  });

  it("ops.* / public.* → live", () => {
    expect(enrich.freshnessFromSqlSource("ops.events")).toBe("live");
    expect(enrich.freshnessFromSqlSource("public.mv_customer_360")).toBe("live");
    expect(enrich.freshnessFromSqlSource("ops.agent_runs + ops.tasks")).toBe("live");
  });

  it("metrics.* takes precedence when both schemas appear", () => {
    // A source mentioning both → hourly (the metrics snapshot is the slower bound).
    expect(enrich.freshnessFromSqlSource("metrics.product_dau_snapshot joined with ops.events")).toBe("hourly");
  });

  it("no recognizable schema → null", () => {
    expect(enrich.freshnessFromSqlSource("Stripe API")).toBeNull();
    expect(enrich.freshnessFromSqlSource("manual audit")).toBeNull();
    expect(enrich.freshnessFromSqlSource("filesystem")).toBeNull();
  });

  it("empty / non-string → null", () => {
    expect(enrich.freshnessFromSqlSource("")).toBeNull();
    expect(enrich.freshnessFromSqlSource(null)).toBeNull();
    expect(enrich.freshnessFromSqlSource(undefined)).toBeNull();
    expect(enrich.freshnessFromSqlSource(99)).toBeNull();
  });
});

describe("enrichment — deriveFreshness", () => {
  it("page → static", () => {
    expect(enrich.deriveFreshness("page", null)).toBe("static");
  });
  it("runbook → static", () => {
    expect(enrich.deriveFreshness("runbook", null)).toBe("static");
  });
  it("wiki → unknown (last-distilled)", () => {
    expect(enrich.deriveFreshness("wiki", null)).toBe("unknown");
  });
  it("external-source → live", () => {
    expect(enrich.deriveFreshness("external-source", null)).toBe("live");
  });
  it("view/metric on metrics.* → hourly", () => {
    expect(enrich.deriveFreshness("view", "metrics.gbrain_cost_daily")).toBe("hourly");
    expect(enrich.deriveFreshness("metric", "metrics.product_dau_snapshot")).toBe("hourly");
  });
  it("view/metric on ops.* → live", () => {
    expect(enrich.deriveFreshness("view", "ops.v_capability_pipeline")).toBe("live");
    expect(enrich.deriveFreshness("metric", "ops.events (signup)")).toBe("live");
  });
  it("view/metric with no recognizable source → unknown (honest)", () => {
    expect(enrich.deriveFreshness("metric", null)).toBe("unknown");
    expect(enrich.deriveFreshness("metric", "Stripe (READ-ONLY)")).toBe("unknown"); // no schema token → honest unknown
    expect(enrich.deriveFreshness("metric", "manual audit")).toBe("unknown");
    expect(enrich.deriveFreshness("view", "")).toBe("unknown");
  });

  it("a metric whose source MENTIONS ops.kpi_snapshots → live (recognizable schema)", () => {
    // e.g. "Stripe (READ-ONLY) → ops.kpi_snapshots" — the ops. token wins.
    expect(enrich.deriveFreshness("metric", "Stripe (READ-ONLY) → ops.kpi_snapshots")).toBe("live");
  });
  it("non-content kind → null", () => {
    expect(enrich.deriveFreshness("skill", null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// enrichEntry — the top-level composer
// ---------------------------------------------------------------------------

describe("enrichment — enrichEntry", () => {
  it("ALWAYS sets axis (every kind)", () => {
    for (const kind of E.VALID_KINDS) {
      const out = enrich.enrichEntry({ kind });
      expect(out.axis, kind).toBeDefined();
      expect(["content", "capability", "meta"]).toContain(out.axis);
    }
  });

  it("throws UnknownAxisKind for an unknown kind (fail fast)", () => {
    expect(() => enrich.enrichEntry({ kind: "bogus" })).toThrow(E.UnknownAxisKind);
  });

  describe("capability axis", () => {
    it("sets hitl_tier + side_effect, no content fields", () => {
      const out = enrich.enrichEntry({ kind: "mcp", rawTier: "B" });
      expect(out.axis).toBe("capability");
      expect(out.hitl_tier).toBe("B");
      expect(out.side_effect).toBe("write");
      expect(out.authority).toBeUndefined();
      expect(out.freshness).toBeUndefined();
      expect(out.grounding).toBeUndefined();
      expect(out.columns).toBeUndefined();
    });

    it("Tier A capability → side_effect none", () => {
      const out = enrich.enrichEntry({ kind: "command" });
      expect(out.hitl_tier).toBe("A");
      expect(out.side_effect).toBe("none");
    });

    it("unknown-tier capability defaults hitl_tier B + side_effect write", () => {
      const out = enrich.enrichEntry({ kind: "skill" }); // no rawTier
      expect(out.hitl_tier).toBe("B");
      expect(out.side_effect).toBe("write");
    });

    it("honors an explicit side_effect hint", () => {
      const out = enrich.enrichEntry({ kind: "skill", rawTier: "C", sideEffectHint: "publish" });
      expect(out.side_effect).toBe("publish");
    });
  });

  describe("content axis", () => {
    it("sets authority + freshness, no capability fields", () => {
      const out = enrich.enrichEntry({ kind: "page", grounding: "00-core/product.md" });
      expect(out.axis).toBe("content");
      expect(out.authority).toBe("SoR");
      expect(out.freshness).toBe("static");
      expect(out.grounding).toBe("00-core/product.md");
      expect(out.hitl_tier).toBeUndefined();
      expect(out.side_effect).toBeUndefined();
    });

    it("emits columns only when supplied + non-empty", () => {
      const withCols = enrich.enrichEntry({ kind: "view", source: "ops.v_x", columns: ["a", "b"] });
      expect(withCols.columns).toEqual(["a", "b"]);
      const noCols = enrich.enrichEntry({ kind: "view", source: "ops.v_x", columns: [] });
      expect(noCols.columns).toBeUndefined();
      const undefCols = enrich.enrichEntry({ kind: "view", source: "ops.v_x" });
      expect(undefCols.columns).toBeUndefined();
    });

    it("metric on metrics.* → hourly; on ops.* → live", () => {
      expect(enrich.enrichEntry({ kind: "metric", source: "metrics.product_dau_snapshot" }).freshness).toBe("hourly");
      expect(enrich.enrichEntry({ kind: "metric", source: "ops.agent_runs" }).freshness).toBe("live");
    });

    it("omits grounding when blank/whitespace (no empty field)", () => {
      expect(enrich.enrichEntry({ kind: "wiki", grounding: "" }).grounding).toBeUndefined();
      expect(enrich.enrichEntry({ kind: "wiki", grounding: "   " }).grounding).toBeUndefined();
    });
  });

  describe("meta axis", () => {
    it("capability kind → axis meta only, no enrichment fields", () => {
      const out = enrich.enrichEntry({ kind: "capability" });
      expect(out).toEqual({ axis: "meta" });
    });
  });
});
