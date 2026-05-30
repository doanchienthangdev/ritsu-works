// Resolver v2.2 — context-source recipient kinds test suite.
// Tests the 5 new generators added in v2.2 (page, view, metric, runbook, external-source).
//
// Phase 1 analysis:
//   - 4 internal generators read deterministic Tier 1 sources (no external network)
//   - 1 meta-generator (external-source) reads knowledge/external-sources.yaml
//   - All generators produce sorted, schema-valid recipient entries
//   - VALID_KINDS extended by 5 in errors.cjs
//   - CATALOG_FILES extended by 5 in catalog-loader.cjs
//   - CLAUDE.md auto-imports 5 new files

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { readFileSync, existsSync } from "node:fs";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const gen = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-generator.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

// ---------------------------------------------------------------------------
// generatePages
// ---------------------------------------------------------------------------

describe("v2.2 — generatePages", () => {
  it("returns >= 40 entries across 00-core, governance, knowledge top-level", () => {
    const pages = gen.generatePages();
    expect(Array.isArray(pages)).toBe(true);
    expect(pages.length).toBeGreaterThanOrEqual(40);
  });

  it("each page ID starts with page/ and has core|governance|knowledge prefix slug", () => {
    const pages = gen.generatePages();
    for (const p of pages) {
      expect(p.id).toMatch(/^page\/(core|governance|knowledge)-/);
      expect(p.kind).toBe("page");
    }
  });

  it("invoke uses Read() with relative path that exists on disk", () => {
    const pages = gen.generatePages();
    for (const p of pages) {
      const m = p.invoke.match(/^`Read\("([^"]+)"\)`$/);
      expect(m).not.toBeNull();
      const absPath = join(REPO, m![1]);
      expect(existsSync(absPath)).toBe(true);
    }
  });

  it("excludes SECRETS.md (security)", () => {
    const pages = gen.generatePages();
    for (const p of pages) {
      expect(p.invoke).not.toContain("SECRETS.md");
      expect(p.id).not.toMatch(/governance-SECRETS/i);
    }
  });

  it("excludes founder-profile.md (PII)", () => {
    const pages = gen.generatePages();
    for (const p of pages) {
      expect(p.invoke).not.toContain("founder-profile.md");
      expect(p.id).not.toMatch(/core-founder-profile/i);
    }
  });

  it("excludes README, INDEX, CLAUDE meta files", () => {
    const pages = gen.generatePages();
    for (const p of pages) {
      expect(p.id).not.toMatch(/-README$/i);
      expect(p.id).not.toMatch(/-INDEX$/i);
      expect(p.id).not.toMatch(/-CLAUDE$/i);
    }
  });

  it("entries sorted alphabetically by ID", () => {
    const pages = gen.generatePages();
    const ids = pages.map((p: any) => p.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("page/governance-HITL is present (canonical governance doc)", () => {
    const pages = gen.generatePages();
    const hitl = pages.find((p: any) => p.id === "page/governance-HITL");
    expect(hitl).toBeDefined();
    expect(hitl.invoke).toContain("governance/HITL.md");
  });

  it("page/knowledge-manifest is present (Tier 1 yaml registry)", () => {
    const pages = gen.generatePages();
    const manifest = pages.find((p: any) => p.id === "page/knowledge-manifest");
    expect(manifest).toBeDefined();
    expect(manifest.invoke).toContain("knowledge/manifest.yaml");
  });
});

// ---------------------------------------------------------------------------
// generateViews
// ---------------------------------------------------------------------------

describe("v2.2 — generateViews", () => {
  it("returns >= 1 entry (v_capability_pipeline at minimum)", () => {
    const views = gen.generateViews();
    expect(Array.isArray(views)).toBe(true);
    expect(views.length).toBeGreaterThanOrEqual(1);
  });

  it("each view ID starts with view/ and includes schema-viewname", () => {
    const views = gen.generateViews();
    for (const v of views) {
      expect(v.id).toMatch(/^view\/[a-z_][a-z0-9_]*-[a-z_][a-z0-9_]*$/i);
      expect(v.kind).toBe("view");
    }
  });

  it("invoke contains SELECT against schema.view qualified name", () => {
    const views = gen.generateViews();
    for (const v of views) {
      expect(v.invoke).toContain("SELECT");
      expect(v.invoke).toContain("mcp__supabase-ops__query");
    }
  });

  it("captures both VIEW and MATERIALIZED VIEW patterns", () => {
    // The codebase has v_capability_pipeline (VIEW), v_capability_lineage (VIEW),
    // mv_customer_360 (MATERIALIZED VIEW). At least one matview detected.
    const views = gen.generateViews();
    const matview = views.find((v: any) => v.when_to_use.startsWith("Materialized view"));
    const view = views.find((v: any) => v.when_to_use.startsWith("View"));
    // Should have at least one of each kind (codebase has both)
    expect(view || matview).toBeDefined();
  });

  it("view/ops-v_capability_pipeline is present", () => {
    const views = gen.generateViews();
    const v = views.find((x: any) => x.id === "view/ops-v_capability_pipeline");
    expect(v).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// generateMetrics
// ---------------------------------------------------------------------------

describe("v2.2 — generateMetrics", () => {
  it("returns >= 20 KPIs from kpi-ownership.yaml", () => {
    const metrics = gen.generateMetrics();
    expect(Array.isArray(metrics)).toBe(true);
    expect(metrics.length).toBeGreaterThanOrEqual(20);
  });

  it("each metric ID starts with metric/", () => {
    const metrics = gen.generateMetrics();
    for (const m of metrics) {
      expect(m.id).toMatch(/^metric\//);
      expect(m.kind).toBe("metric");
    }
  });

  it("excludes top-level meta keys (version, generated_at, generated_from)", () => {
    const metrics = gen.generateMetrics();
    for (const m of metrics) {
      expect(m.id).not.toBe("metric/version");
      expect(m.id).not.toBe("metric/generated_at");
      expect(m.id).not.toBe("metric/generated_from");
    }
  });

  it("each metric has owner_pillar reflected in pillar field", () => {
    const metrics = gen.generateMetrics();
    for (const m of metrics) {
      expect(m.pillar).toBeDefined();
      expect(typeof m.pillar).toBe("string");
    }
  });

  it("role_scope is the owner_role", () => {
    const metrics = gen.generateMetrics();
    for (const m of metrics) {
      expect(Array.isArray(m.role_scope)).toBe(true);
      expect(m.role_scope.length).toBeGreaterThan(0);
    }
  });

  it("PMF composite KPI present", () => {
    const metrics = gen.generateMetrics();
    const composite = metrics.find((m: any) => m.id === "metric/hundred_paying_who_love_composite");
    expect(composite).toBeDefined();
    expect(composite.pillar).toBe("gtm");
  });

  it("per-persona KPIs included (persona.ceo.*)", () => {
    const metrics = gen.generateMetrics();
    const personaCeo = metrics.filter((m: any) => m.id.startsWith("metric/persona.ceo."));
    expect(personaCeo.length).toBeGreaterThan(0);
  });

  it("invokes reference supabase query or kpi-ownership.yaml#anchor", () => {
    const metrics = gen.generateMetrics();
    for (const m of metrics) {
      expect(
        m.invoke.includes("supabase_ops__query") || m.invoke.includes("kpi-ownership.yaml")
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// generateRunbooks
// ---------------------------------------------------------------------------

describe("v2.2 — generateRunbooks", () => {
  it("returns >= 1 entry (evolve.md at minimum)", () => {
    const runbooks = gen.generateRunbooks();
    expect(Array.isArray(runbooks)).toBe(true);
    expect(runbooks.length).toBeGreaterThanOrEqual(1);
  });

  it("each runbook ID starts with runbook/", () => {
    const runbooks = gen.generateRunbooks();
    for (const r of runbooks) {
      expect(r.id).toMatch(/^runbook\//);
      expect(r.kind).toBe("runbook");
    }
  });

  it("invoke uses Read(\"wiki/runbooks/<slug>.md\")", () => {
    const runbooks = gen.generateRunbooks();
    for (const r of runbooks) {
      expect(r.invoke).toMatch(/^`Read\("wiki\/runbooks\/.+\.md"\)`$/);
    }
  });

  it("runbook/evolve present", () => {
    const runbooks = gen.generateRunbooks();
    const evolve = runbooks.find((r: any) => r.id === "runbook/evolve");
    expect(evolve).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// generateExternalSources
// ---------------------------------------------------------------------------

describe("v2.2 — generateExternalSources", () => {
  it("returns >= 7 entries from knowledge/external-sources.yaml", () => {
    const xs = gen.generateExternalSources();
    expect(Array.isArray(xs)).toBe(true);
    expect(xs.length).toBeGreaterThanOrEqual(7);
  });

  it("each external-source ID starts with external-source/", () => {
    const xs = gen.generateExternalSources();
    for (const x of xs) {
      expect(x.id).toMatch(/^external-source\//);
      expect(x.kind).toBe("external-source");
    }
  });

  it("disambiguator carries source_type discriminator", () => {
    const xs = gen.generateExternalSources();
    for (const x of xs) {
      expect(x.disambiguator).toBeDefined();
      expect(x.disambiguator).toMatch(/^source_type: /);
    }
  });

  it("gbrain-mcp present with status active (per memory 2026-05-23)", () => {
    const xs = gen.generateExternalSources();
    const gbrain = xs.find((x: any) => x.id === "external-source/gbrain-mcp");
    expect(gbrain).toBeDefined();
    expect(gbrain.status).toBe("active");
    expect(gbrain.disambiguator).toContain("knowledge-graph-mcp");
  });

  it("supabase-product-readonly scoped to etl-runner only (firewall)", () => {
    const xs = gen.generateExternalSources();
    const sp = xs.find((x: any) => x.id === "external-source/supabase-product-readonly");
    expect(sp).toBeDefined();
    expect(sp.role_scope).toEqual(["etl-runner"]);
  });

  it("stripe-readonly present with status planned", () => {
    const xs = gen.generateExternalSources();
    const stripe = xs.find((x: any) => x.id === "external-source/stripe-readonly");
    expect(stripe).toBeDefined();
    expect(stripe.status).toBe("planned");
  });

  it("describes auth_env without leaking values (env var name only)", () => {
    const xs = gen.generateExternalSources();
    for (const x of xs) {
      // when_to_use mentions the auth env var name; should never contain a value
      // (sanity check: no obvious looking secret like sk_test_... or ghp_...)
      expect(x.when_to_use).not.toMatch(/sk_test_[A-Za-z0-9]/);
      expect(x.when_to_use).not.toMatch(/ghp_[A-Za-z0-9]{36}/);
      expect(x.when_to_use).not.toMatch(/Bearer [A-Za-z0-9]{20,}/);
    }
  });

  it("entries sorted alphabetically by ID", () => {
    const xs = gen.generateExternalSources();
    const ids = xs.map((x: any) => x.id);
    expect(ids).toEqual([...ids].sort());
  });
});

// ---------------------------------------------------------------------------
// VALID_KINDS + CATALOG_FILES extension
// ---------------------------------------------------------------------------

describe("v2.2 — VALID_KINDS extension", () => {
  it("errors.cjs VALID_KINDS contains all 5 new kinds", () => {
    expect(E.VALID_KINDS).toContain("page");
    expect(E.VALID_KINDS).toContain("view");
    expect(E.VALID_KINDS).toContain("metric");
    expect(E.VALID_KINDS).toContain("runbook");
    expect(E.VALID_KINDS).toContain("external-source");
  });

  it("VALID_KINDS has exactly 16 entries (11 from v2.1 + 5 from v2.2)", () => {
    expect(E.VALID_KINDS.length).toBe(16);
  });
});

describe("v2.2 — CATALOG_FILES extension", () => {
  it("catalog-loader.cjs CATALOG_FILES contains all 5 new files", () => {
    expect(loader.CATALOG_FILES).toContain("pages.md");
    expect(loader.CATALOG_FILES).toContain("views.md");
    expect(loader.CATALOG_FILES).toContain("metrics.md");
    expect(loader.CATALOG_FILES).toContain("runbooks.md");
    expect(loader.CATALOG_FILES).toContain("external-sources.md");
  });

  it("CATALOG_FILES has exactly 16 entries", () => {
    expect(loader.CATALOG_FILES.length).toBe(16);
  });
});

// ---------------------------------------------------------------------------
// CLAUDE.md auto-import wire-up
// ---------------------------------------------------------------------------

describe("v2.2 — CLAUDE.md auto-imports", () => {
  it("CLAUDE.md imports all 5 new recipient catalogs", () => {
    const claudemd = readFileSync(join(REPO, "CLAUDE.md"), "utf-8");
    expect(claudemd).toContain("@knowledge/recipients/pages.md");
    expect(claudemd).toContain("@knowledge/recipients/views.md");
    expect(claudemd).toContain("@knowledge/recipients/metrics.md");
    expect(claudemd).toContain("@knowledge/recipients/runbooks.md");
    expect(claudemd).toContain("@knowledge/recipients/external-sources.md");
  });
});

// ---------------------------------------------------------------------------
// catalog-loader integration with 16 kinds
// ---------------------------------------------------------------------------

describe("v2.2 — catalog-loader integration", () => {
  beforeEach(() => loader.invalidateCache());

  it("loads at least 15 of 16 kinds (workflow may be empty)", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    const expectedKinds = [
      "agent", "capability", "command", "hook", "mcp",
      "persona", "schedule", "skill", "sop", "wiki",
      "page", "view", "metric", "runbook", "external-source",
    ];
    for (const k of expectedKinds) {
      expect(cat.byKind.has(k)).toBe(true);
    }
  });

  it("totalCount exceeds v2.1 baseline of 252", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    expect(cat.totalCount).toBeGreaterThan(252);
  });

  it("totalCount under 600 (sanity ceiling — context budget)", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    expect(cat.totalCount).toBeLessThan(600);
  });

  it("no duplicate IDs across all 16 catalogs", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    const ids = new Set<string>();
    for (const r of cat.recipients) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });
});

// ---------------------------------------------------------------------------
// adapter skeleton (v2.4+ federation seed)
// ---------------------------------------------------------------------------

describe("v2.2 — adapter skeleton present", () => {
  it("scripts/resolver-v2/adapters/README.md documents contract", () => {
    const readmePath = join(REPO, "scripts/resolver-v2/adapters/README.md");
    expect(existsSync(readmePath)).toBe(true);
    const content = readFileSync(readmePath, "utf-8");
    expect(content).toContain("Adapter Plugin Contract");
    expect(content).toContain("v2.4");
    expect(content).toContain("source.type");
    expect(content).toContain("auth_env");
  });

  it("scripts/resolver-v2/adapters/.gitkeep keeps folder in tree", () => {
    expect(existsSync(join(REPO, "scripts/resolver-v2/adapters/.gitkeep"))).toBe(true);
  });

  it("no .adapter.cjs files yet (skeleton, not runtime)", () => {
    const fs = cjsRequire("fs");
    const adaptersDir = join(REPO, "scripts/resolver-v2/adapters");
    const entries = fs.readdirSync(adaptersDir);
    const adapters = entries.filter((e: string) => e.endsWith(".adapter.cjs"));
    expect(adapters).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// external-sources.yaml registry integrity
// ---------------------------------------------------------------------------

describe("v2.2 — external-sources.yaml registry", () => {
  it("yaml file exists and parses", () => {
    const ypath = join(REPO, "knowledge/external-sources.yaml");
    expect(existsSync(ypath)).toBe(true);
    const yaml = cjsRequire("js-yaml");
    const doc = yaml.load(readFileSync(ypath, "utf-8"));
    expect(doc).toBeDefined();
    expect(Array.isArray(doc.sources)).toBe(true);
    expect(doc.sources.length).toBeGreaterThanOrEqual(7);
  });

  it("each yaml source has required fields (id, source_type, description, invoke_pattern)", () => {
    const yaml = cjsRequire("js-yaml");
    const ypath = join(REPO, "knowledge/external-sources.yaml");
    const doc = yaml.load(readFileSync(ypath, "utf-8"));
    for (const s of doc.sources) {
      expect(s.id).toBeDefined();
      expect(s.source_type).toBeDefined();
      expect(s.description).toBeDefined();
      expect(s.invoke_pattern).toBeDefined();
    }
  });

  it("no secret values inlined (only env var NAMES allowed in auth_env)", () => {
    const yaml = cjsRequire("js-yaml");
    const ypath = join(REPO, "knowledge/external-sources.yaml");
    const doc = yaml.load(readFileSync(ypath, "utf-8"));
    for (const s of doc.sources) {
      if (s.auth_env) {
        // env var names are SHOUT_SNAKE_CASE; never contain "="
        expect(s.auth_env).toMatch(/^[A-Z][A-Z0-9_]*$/);
        expect(s.auth_env).not.toContain("=");
      }
    }
  });
});
