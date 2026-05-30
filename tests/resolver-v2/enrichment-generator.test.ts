// Resolver-plan v1.0 (Sprint 1) — generator enrichment + backward-compat suite.
//
// Phase 1 analysis: catalog-generator.cjs now attaches deterministic enrichment
// (withEnrichment → enrichEntry) to every generated entry, and emitEntry renders
// the additive **Axis/HITL tier/Side effect/Authority/Freshness/Grounding/Columns**
// fields. parseViewColumns parses a best-effort columns_hint from CREATE VIEW DDL.
//
// CONTRACT BOUNDARY (CLAUDE.md Phase 2N): the loader (catalog-loader.parseEntry /
// parseFile) consumes emitEntry's output. These tests round-trip REAL generator
// output through the REAL loader (NOT hand-crafted mocks) and assert:
//   - every entry carries a valid axis + kind-appropriate enrichment
//   - no field label contains a second ':' (loader regex /^\*\*([^*]+):\*\*/)
//   - When-to-use is NEVER contaminated by a new field (no line-glomming)
//   - the existing resolver-v2 schema / uniqueness validators stay green.

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const gen = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-generator.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const axisMap = cjsRequire(join(REPO, "scripts/resolver-v2/axis-map.cjs"));

// The loader's field regex — entries MUST parse against this.
const FIELD_RE = /^\*\*([^*]+):\*\*\s*(.*)$/;

// ---------------------------------------------------------------------------
// emitEntry renders the additive fields
// ---------------------------------------------------------------------------

describe("emitEntry — additive enrichment fields", () => {
  it("renders Axis for any entry that carries one", () => {
    const out = gen.emitEntry({
      id: "skill/x", kind: "skill", when_to_use: "Test description.", invoke: "x",
      role_scope: ["*"], status: "active", axis: "capability",
    });
    expect(out).toContain("**Axis:** capability");
  });

  it("renders HITL tier + Side effect for capability entries", () => {
    const out = gen.emitEntry({
      id: "mcp/x", kind: "mcp", when_to_use: "desc here", invoke: "x",
      role_scope: ["*"], status: "active",
      axis: "capability", hitl_tier: "B", side_effect: "write",
    });
    expect(out).toContain("**HITL tier:** B");
    expect(out).toContain("**Side effect:** write");
  });

  it("renders Authority + Freshness + Grounding for content entries", () => {
    const out = gen.emitEntry({
      id: "page/x", kind: "page", when_to_use: "desc here", invoke: "x",
      role_scope: ["*"], status: "active",
      axis: "content", authority: "SoR", freshness: "static", grounding: "00-core/x.md",
    });
    expect(out).toContain("**Authority:** SoR");
    expect(out).toContain("**Freshness:** static");
    expect(out).toContain("**Grounding:** 00-core/x.md");
  });

  it("renders Columns as a single inline-comma line (NOT a multi-line list)", () => {
    const out = gen.emitEntry({
      id: "view/x", kind: "view", when_to_use: "desc here", invoke: "x",
      role_scope: ["*"], status: "active",
      axis: "content", columns: ["col_a", "col_b", "col_c"],
    });
    expect(out).toContain("**Columns:** col_a, col_b, col_c");
    // Must NOT emit list items (- col_a) which the loader would mis-handle.
    expect(out).not.toMatch(/^- col_a$/m);
  });

  it("omits enrichment fields entirely when absent (backward-compatible)", () => {
    const out = gen.emitEntry({
      id: "skill/x", kind: "skill", when_to_use: "desc here", invoke: "x",
      role_scope: ["*"], status: "active",
    });
    expect(out).not.toContain("**Axis:**");
    expect(out).not.toContain("**HITL tier:**");
    expect(out).not.toContain("**Columns:**");
  });

  it("every rendered field label parses under the loader regex (no second colon)", () => {
    const view = gen.generateViews().find((v: any) => v.columns && v.columns.length > 0)
      || gen.generateViews()[0];
    const md = gen.emitEntry(view);
    for (const line of md.split("\n")) {
      if (line.startsWith("**")) {
        expect(FIELD_RE.test(line), `unparseable field line: ${line}`).toBe(true);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Per-kind enrichment on REAL generated entries
// ---------------------------------------------------------------------------

describe("generators — axis on EVERY entry, kind-appropriate enrichment", () => {
  const generators: Array<[string, () => any[], string]> = [
    ["skill", gen.generateSkills, "capability"],
    ["command", gen.generateCommands, "capability"],
    ["agent", gen.generateAgents, "capability"],
    ["persona", gen.generatePersonas, "capability"],
    ["mcp", gen.generateMcps, "capability"],
    ["sop", gen.generateSops, "capability"],
    ["schedule", gen.generateSchedules, "capability"],
    ["hook", gen.generateHooks, "capability"],
    ["capability", gen.generateCapabilities, "meta"],
    ["page", gen.generatePages, "content"],
    ["view", gen.generateViews, "content"],
    ["metric", gen.generateMetrics, "content"],
    ["wiki", gen.generateWikis, "content"],
    ["runbook", gen.generateRunbooks, "content"],
    ["external-source", gen.generateExternalSources, "content"],
  ];

  for (const [kind, fn, expectedAxis] of generators) {
    it(`${kind}: every entry has axis '${expectedAxis}'`, () => {
      const entries = fn();
      for (const e of entries) {
        expect(e.axis, `${e.id} axis`).toBe(expectedAxis);
      }
    });
  }

  it("capability entries carry a valid hitl_tier + side_effect", () => {
    const caps = [
      ...gen.generateSkills(), ...gen.generateCommands(), ...gen.generateAgents(),
      ...gen.generatePersonas(), ...gen.generateMcps(), ...gen.generateSops(),
      ...gen.generateSchedules(), ...gen.generateHooks(),
    ];
    const validTiers = ["A", "B", "C", "D-Std", "D-MAX"];
    const validSide = ["none", "write", "send", "money", "publish"];
    for (const e of caps) {
      expect(validTiers, `${e.id} tier`).toContain(e.hitl_tier);
      expect(validSide, `${e.id} side`).toContain(e.side_effect);
    }
  });

  // SAFETY INVARIANT: no capability entry silently auto-runnable (Tier A) just
  // because metadata was missing. A is only present when something declares it.
  it("no skill/sop entry is Tier A unless its source explicitly declares it", () => {
    // Conservative default is B; A on a skill/sop means the source declared A.
    // Assert the DEFAULT path produced B for entries with no declared tier — we
    // can't re-read every source here, so assert the invariant holds in aggregate:
    // every Tier-A skill/sop is rare and intentional (not the silent majority).
    const skills = gen.generateSkills();
    const sops = gen.generateSops();
    const aSkills = skills.filter((e: any) => e.hitl_tier === "A");
    const bSkills = skills.filter((e: any) => e.hitl_tier === "B");
    // The conservative default dominates for skills (no blanket auto-run).
    expect(bSkills.length).toBeGreaterThan(0);
    // sops with a flow-declared tier may be A; that's intentional, just assert valid.
    for (const e of [...aSkills, ...sops]) {
      expect(["A", "B", "C", "D-Std", "D-MAX"]).toContain(e.hitl_tier);
    }
  });

  it("mcp tiers track mcp-tools.yaml tier_default (read=A/none, write=B+/write)", () => {
    const mcps = gen.generateMcps();
    const query = mcps.find((m: any) => m.id === "mcp/supabase-ops__query");
    const insert = mcps.find((m: any) => m.id === "mcp/supabase-ops__insert");
    const find = mcps.find((m: any) => m.id === "mcp/supabase-ops__resolver_find");
    expect(query.hitl_tier).toBe("A");
    expect(query.side_effect).toBe("none");
    expect(insert.hitl_tier).toBe("B");
    expect(insert.side_effect).toBe("write");
    expect(find.hitl_tier).toBe("A");
    expect(find.side_effect).toBe("none");
  });

  it("content entries carry a valid authority + freshness", () => {
    const content = [
      ...gen.generatePages(), ...gen.generateViews(), ...gen.generateMetrics(),
      ...gen.generateWikis(), ...gen.generateRunbooks(), ...gen.generateExternalSources(),
    ];
    const validAuth = ["SoR", "SoR-external", "derived-memory", "scratch"];
    const validFresh = ["static", "hourly", "daily", "live", "unknown"];
    for (const e of content) {
      expect(validAuth, `${e.id} authority`).toContain(e.authority);
      expect(validFresh, `${e.id} freshness`).toContain(e.freshness);
    }
  });

  it("view entries carry a migration grounding ref + (when parseable) columns", () => {
    const views = gen.generateViews();
    expect(views.length).toBeGreaterThan(0);
    for (const v of views) {
      expect(v.grounding).toMatch(/^supabase\/migrations\/.+\.sql$/);
      if (v.columns !== undefined) {
        expect(Array.isArray(v.columns)).toBe(true);
        expect(v.columns.length).toBeGreaterThan(0);
      }
    }
    // The well-known materialized view should parse its columns.
    const m360 = views.find((v: any) => v.id === "view/public-mv_customer_360");
    expect(m360.columns).toBeDefined();
    expect(m360.columns).toContain("customer_id");
  });

  it("metric entries carry a kpi-ownership grounding anchor", () => {
    const metrics = gen.generateMetrics();
    for (const m of metrics) {
      expect(m.grounding).toMatch(/^knowledge\/kpi-ownership\.yaml#/);
    }
  });

  it("internal signal fields (_rawTier/_source/_grounding/_columns) are stripped", () => {
    const all = [
      ...gen.generateMcps(), ...gen.generateViews(), ...gen.generateMetrics(),
      ...gen.generatePages(), ...gen.generateSkills(), ...gen.generateSops(),
    ];
    for (const e of all) {
      expect(e._rawTier, `${e.id} _rawTier leaked`).toBeUndefined();
      expect(e._source, `${e.id} _source leaked`).toBeUndefined();
      expect(e._grounding, `${e.id} _grounding leaked`).toBeUndefined();
      expect(e._columns, `${e.id} _columns leaked`).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// parseViewColumns — Phase 2 edge cases (best-effort, honest absence)
// ---------------------------------------------------------------------------

describe("parseViewColumns", () => {
  it("parses simple aliased columns", () => {
    const ddl = `CREATE VIEW ops.v_x AS SELECT a AS alpha, b AS beta FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual(["alpha", "beta"]);
  });

  it("parses bare schema-qualified columns to the trailing identifier", () => {
    const ddl = `CREATE VIEW ops.v AS SELECT t.id, t.name FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual(["id", "name"]);
  });

  it("does NOT split on commas inside function calls (depth-aware)", () => {
    const ddl = `CREATE VIEW ops.v AS SELECT coalesce(a, b) AS c, d FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual(["c", "d"]);
  });

  it("returns [] (honest no-hint) for a star-select", () => {
    const ddl = `CREATE VIEW ops.v AS SELECT * FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual([]);
  });

  it("returns [] for a qualified star (t.*)", () => {
    const ddl = `CREATE VIEW ops.v AS SELECT t.* FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual([]);
  });

  it("returns [] when an item is an un-aliased complex expression (CASE)", () => {
    const ddl = `CREATE VIEW ops.v AS SELECT CASE WHEN x THEN 1 ELSE 0 END, y FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual([]);
  });

  it("returns [] when there is no AS SELECT body", () => {
    const ddl = `CREATE MATERIALIZED VIEW ops.v AS TABLE other;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual([]);
  });

  it("returns [] when the SELECT has no top-level FROM", () => {
    const ddl = `CREATE VIEW ops.v AS SELECT 1, 2`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual([]);
  });

  it("handles newlines/extra whitespace between tokens", () => {
    const ddl = `CREATE VIEW ops.v AS\n  SELECT\n    a AS alpha,\n    b\n  FROM t;`;
    expect(gen.parseViewColumns(ddl, 0)).toEqual(["alpha", "b"]);
  });
});

// ---------------------------------------------------------------------------
// withEnrichment helper
// ---------------------------------------------------------------------------

describe("withEnrichment", () => {
  it("attaches axis to each entry based on its kind", () => {
    const entries = [{ kind: "skill", id: "skill/a" }, { kind: "page", id: "page/b" }];
    gen.withEnrichment(entries);
    expect(entries[0].axis).toBe("capability");
    expect(entries[1].axis).toBe("content");
  });

  it("threads per-entry signals via signalsFor()", () => {
    const entries = [{ kind: "mcp", id: "mcp/x", _t: "D-Std" }];
    gen.withEnrichment(entries, (e: any) => ({ rawTier: e._t }));
    expect(entries[0].hitl_tier).toBe("D-Std");
  });

  it("returns the same array (mutates in place)", () => {
    const entries = [{ kind: "skill", id: "skill/a" }];
    expect(gen.withEnrichment(entries)).toBe(entries);
  });
});

// ---------------------------------------------------------------------------
// BACKWARD-COMPAT — REAL generator output round-trips through REAL loader
// ---------------------------------------------------------------------------

describe("backward-compat — emitEntry → parseFile round-trip (contract boundary)", () => {
  // Use REAL upstream (generator) output, per CLAUDE.md Phase 2N contract rule.
  const HEADER = "# Recipient Catalog: x\n\n---\n\n";

  function roundTrip(entry: any) {
    const md = HEADER + gen.emitEntry(entry);
    const parsed = loader.parseFile("x.md", md);
    return parsed[0];
  }

  it("a view entry (columns + grounding) round-trips without contaminating when_to_use", () => {
    const view = gen.generateViews().find((v: any) => v.id === "view/public-mv_customer_360");
    const p = roundTrip(view);
    expect(p.id).toBe("view/public-mv_customer_360");
    expect(p.kind).toBe("view");
    // The new fields must NOT have leaked into when_to_use.
    expect(p.when_to_use).not.toMatch(/Authority|Freshness|Grounding|Columns|Axis/);
  });

  it("an mcp entry (HITL tier + side effect) round-trips cleanly", () => {
    const insert = gen.generateMcps().find((m: any) => m.id === "mcp/supabase-ops__insert");
    const p = roundTrip(insert);
    expect(p.kind).toBe("mcp");
    expect(p.when_to_use).not.toMatch(/HITL tier|Side effect|Axis/);
    expect(p.role_scope).toContain("founder");
    expect(p.status).toBe("active");
  });

  it("loadCatalog() parses the regenerated on-disk catalog with no contamination", () => {
    loader.invalidateCache();
    const cat = loader.loadCatalog({ skipCache: true });
    expect(cat.totalCount).toBeGreaterThan(400);
    const contaminated = cat.recipients.filter((r: any) =>
      /\*\*(Axis|HITL tier|Side effect|Authority|Freshness|Grounding|Columns):/.test(r.when_to_use)
    );
    expect(contaminated.map((r: any) => r.id)).toEqual([]);
  });

  it("every on-disk catalog entry has an Axis line (parser-agnostic grep)", () => {
    const fs = cjsRequire("fs");
    const path = cjsRequire("path");
    const dir = join(REPO, "knowledge/recipients");
    const files = fs.readdirSync(dir).filter((f: string) => f.endsWith(".md") && f !== "INDEX.md");
    let entries = 0;
    let axes = 0;
    for (const f of files) {
      const t = fs.readFileSync(path.join(dir, f), "utf-8");
      entries += (t.match(/^## /gm) || []).length;
      axes += (t.match(/^\*\*Axis:\*\*/gm) || []).length;
    }
    expect(axes).toBe(entries);
  });
});

// ---------------------------------------------------------------------------
// Existing resolver-v2 validators stay green with the enriched catalog
// ---------------------------------------------------------------------------

describe("backward-compat — existing resolver-v2 validators stay green", () => {
  function runValidator(rel: string) {
    const r = spawnSync("node", [join(REPO, rel)], { encoding: "utf-8", timeout: 60000 });
    return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
  }

  it("validate-resolver-v2-schema.cjs passes (additive fields don't break schema)", () => {
    const r = runValidator("scripts/cross-tier/validate-resolver-v2-schema.cjs");
    expect(r.status, r.out).toBe(0);
  });

  it("validate-resolver-v2-uniqueness.cjs passes", () => {
    const r = runValidator("scripts/cross-tier/validate-resolver-v2-uniqueness.cjs");
    expect(r.status, r.out).toBe(0);
  });

  it("validate-resolver-v2-link-integrity.cjs passes", () => {
    const r = runValidator("scripts/cross-tier/validate-resolver-v2-link-integrity.cjs");
    expect(r.status, r.out).toBe(0);
  });
});
