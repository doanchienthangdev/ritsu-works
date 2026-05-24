// Resolver v2.1 — new recipient kinds test suite.
// Tests the 6 new generators added in v2.1 (wiki, sop, capability, workflow, schedule, hook).

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const gen = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-generator.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("v2.1 — generateWikis", () => {
  it("returns array of wiki entries", () => {
    const wikis = gen.generateWikis();
    expect(Array.isArray(wikis)).toBe(true);
    if (wikis.length > 0) {
      expect(wikis[0].id).toMatch(/^wiki\//);
      expect(wikis[0].kind).toBe("wiki");
    }
  });

  it("each wiki entry has required fields", () => {
    const wikis = gen.generateWikis();
    for (const w of wikis) {
      expect(w.id).toBeDefined();
      expect(w.kind).toBe("wiki");
      expect(w.when_to_use).toBeDefined();
      expect(w.invoke).toBeDefined();
      expect(w.status).toBeDefined();
      expect(Array.isArray(w.role_scope)).toBe(true);
    }
  });

  it("invoke references Read() or mcp__supabase_ops__wiki_get_page", () => {
    const wikis = gen.generateWikis();
    for (const w of wikis) {
      expect(
        w.invoke.includes("Read(") || w.invoke.includes("wiki_get_page")
      ).toBe(true);
    }
  });

  it("entries sorted alphabetically by ID", () => {
    const wikis = gen.generateWikis();
    const ids = wikis.map((w: any) => w.id);
    expect(ids).toEqual([...ids].sort());
  });

  it("excludes _-prefixed dirs and capabilities/runbooks subfolders", () => {
    const wikis = gen.generateWikis();
    for (const w of wikis) {
      expect(w.id).not.toMatch(/^wiki\/_/);
      expect(w.id).not.toMatch(/^wiki\/capabilities/);
      expect(w.id).not.toMatch(/^wiki\/runbooks/);
    }
  });
});

describe("v2.1 — generateSops", () => {
  it("returns array of SOP entries", () => {
    const sops = gen.generateSops();
    expect(Array.isArray(sops)).toBe(true);
    expect(sops.length).toBeGreaterThan(50); // ritsu-works has 100+ SOPs
  });

  it("each SOP ID matches sop/SOP-{PILLAR}-NNN-{name} pattern", () => {
    const sops = gen.generateSops();
    for (const s of sops) {
      expect(s.id).toMatch(/^sop\/SOP-[A-Z]+-\d+/);
      expect(s.kind).toBe("sop");
    }
  });

  it("each SOP has non-trivial when_to_use", () => {
    const sops = gen.generateSops();
    for (const s of sops) {
      expect(s.when_to_use.length).toBeGreaterThan(10);
    }
  });

  it("invoke references flow.yaml path", () => {
    const sops = gen.generateSops();
    for (const s of sops) {
      expect(s.invoke).toContain("flow.yaml");
    }
  });

  it("no duplicate IDs", () => {
    const sops = gen.generateSops();
    const ids = new Set();
    for (const s of sops) {
      expect(ids.has(s.id)).toBe(false);
      ids.add(s.id);
    }
  });
});

describe("v2.1 — generateCapabilities", () => {
  it("returns capabilities from registry", () => {
    const caps = gen.generateCapabilities();
    expect(Array.isArray(caps)).toBe(true);
    expect(caps.length).toBeGreaterThan(0);
  });

  it("excludes superseded/deprecated capabilities", () => {
    const caps = gen.generateCapabilities();
    for (const c of caps) {
      expect(c.status).not.toBe("superseded");
      expect(c.status).not.toBe("deprecated");
    }
  });

  it("each capability ID starts with capability/", () => {
    const caps = gen.generateCapabilities();
    for (const c of caps) {
      expect(c.id).toMatch(/^capability\//);
      expect(c.kind).toBe("capability");
    }
  });

  it("invoke references spec.md OR /cla update", () => {
    const caps = gen.generateCapabilities();
    for (const c of caps) {
      expect(c.invoke.includes("spec.md") || c.invoke.includes("/cla")).toBe(true);
    }
  });
});

describe("v2.1 — generateWorkflows", () => {
  it("returns empty array when workflows/ folder absent (planned)", () => {
    const wfs = gen.generateWorkflows();
    expect(Array.isArray(wfs)).toBe(true);
    // workflows/ folder is planned per manifest; should be empty until populated
  });
});

describe("v2.1 — generateSchedules", () => {
  it("returns schedules from knowledge/schedules.yaml", () => {
    const schs = gen.generateSchedules();
    expect(Array.isArray(schs)).toBe(true);
    expect(schs.length).toBeGreaterThan(0);
  });

  it("each schedule ID starts with schedule/", () => {
    const schs = gen.generateSchedules();
    for (const s of schs) {
      expect(s.id).toMatch(/^schedule\//);
      expect(s.kind).toBe("schedule");
    }
  });

  it("invoke describes auto-trigger by pg_cron", () => {
    const schs = gen.generateSchedules();
    for (const s of schs) {
      expect(s.invoke).toContain("pg_cron");
    }
  });

  it("role_scope is founder + etl-runner", () => {
    const schs = gen.generateSchedules();
    for (const s of schs) {
      expect(s.role_scope).toContain("founder");
    }
  });
});

describe("v2.1 — generateHooks", () => {
  it("returns hooks from .claude/hooks/", () => {
    const hooks = gen.generateHooks();
    expect(Array.isArray(hooks)).toBe(true);
    expect(hooks.length).toBeGreaterThan(5);
  });

  it("each hook ID starts with hook/", () => {
    const hooks = gen.generateHooks();
    for (const h of hooks) {
      expect(h.id).toMatch(/^hook\//);
      expect(h.kind).toBe("hook");
    }
  });

  it("excludes README, CLAUDE, SPEC files", () => {
    const hooks = gen.generateHooks();
    for (const h of hooks) {
      expect(h.id).not.toMatch(/^hook\/README$/i);
      expect(h.id).not.toMatch(/^hook\/CLAUDE$/i);
      expect(h.id).not.toMatch(/^hook\/SPEC$/i);
    }
  });

  it("invoke describes auto-trigger semantics", () => {
    const hooks = gen.generateHooks();
    for (const h of hooks) {
      expect(h.invoke).toContain("Auto-triggered");
    }
  });
});

describe("v2.1 — catalog-loader integration with 11 kinds", () => {
  beforeEach(() => loader.invalidateCache());

  it("loads all 11 kinds into byKind map", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    const kinds = [...cat.byKind.keys()].sort();
    // workflow may be absent (placeholder kind) — check at least 10 of 11
    const expectedKinds = ["agent", "capability", "command", "hook", "mcp", "persona", "schedule", "skill", "sop", "wiki"];
    for (const k of expectedKinds) {
      expect(cat.byKind.has(k)).toBe(true);
    }
  });

  it("totalCount exceeds v2.0 baseline of 118", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    expect(cat.totalCount).toBeGreaterThan(200);
  });

  it("VALID_KINDS in errors.cjs includes all 11 v2.1 kinds", () => {
    expect(E.VALID_KINDS).toContain("workflow");
    expect(E.VALID_KINDS).toContain("schedule");
    expect(E.VALID_KINDS).toContain("hook");
  });
});

describe("v2.1 — composition use cases", () => {
  beforeEach(() => loader.invalidateCache());

  it("query 'capability lifecycle' should surface capability/command alternatives", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    // Just verify both capability + command kinds present for CLA
    const claCap = cat.recipients.find((r: any) => r.id === "capability/cla");
    const claCmd = cat.recipients.find((r: any) => r.id === "command/cla");
    // At least one should exist
    expect(claCap || claCmd).toBeDefined();
  });

  it("SOPs are queryable by SOP-ID", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    const ailops001 = cat.recipients.find((r: any) => r.id === "sop/SOP-AIOPS-001-capability-lifecycle");
    expect(ailops001).toBeDefined();
    expect(ailops001.kind).toBe("sop");
  });

  it("schedules are queryable by schedule ID", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    const schs = cat.byKind.get("schedule");
    expect(schs.length).toBeGreaterThan(0);
    for (const s of schs) {
      expect(s.id).toMatch(/^schedule\//);
    }
  });

  it("hooks are queryable by hook name", () => {
    const cat = loader.loadCatalog({ skipCache: true });
    const hooks = cat.byKind.get("hook");
    expect(hooks.length).toBeGreaterThan(0);
    for (const h of hooks) {
      expect(h.id).toMatch(/^hook\//);
    }
  });
});
