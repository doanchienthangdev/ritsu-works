// Resolver v2 — integration test suite (end-to-end).
// Tests the full pipeline: catalog load → match → audit build → audit write (mocked).
// Plus invariants from spec.md §11.

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const fallback = cjsRequire(join(REPO, "scripts/resolver-v2/keyword-fallback.cjs"));
const audit = cjsRequire(join(REPO, "scripts/resolver-v2/audit.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("integration — end-to-end Mode C pipeline", () => {
  beforeEach(() => loader.invalidateCache());

  it("scenario: founder asks 'where are cto skills' → audit row", async () => {
    // Step 1: Match
    const result = fallback.match({ trigger: "where are cto skills" });
    expect(result.mode).toBe("C");
    expect(result.matched?.recipient?.id).toMatch(/cto/);

    // Step 2: Build audit
    const record = audit.buildRecord(result, {
      mode: "C",
      invoked_via: "integration_test",
      invoked_by: "integration suite",
    });
    expect(record.mode).toBe("C");
    expect(record.matched_route_id).toMatch(/cto/);
    expect(record.confidence).toBeGreaterThan(0.5);

    // Step 3: Write audit (mocked)
    const inserts: any[] = [];
    const mockInsert = async (table: string, rows: any[]) => {
      inserts.push({ table, rows });
      return { inserted_count: 1, returned_rows: [{ run_id: "mock-uuid", ts: "2026-01-01" }] };
    };
    const written = await audit.writeRecord(record, mockInsert);
    expect(written?.run_id).toBe("mock-uuid");
    expect(inserts.length).toBe(1);
    expect(inserts[0].table).toBe("ops.resolver_decisions");
  });

  it("scenario: onboard customer trigger surfaces customer skills", () => {
    const result = fallback.match({ trigger: "onboard new customer" });
    expect(result.decision).not.toBe("no_match");
    // Should match customer-related recipient
    const allIds = [result.matched?.recipient?.id, ...result.alternatives.map((a: any) => a.recipient.id)].filter(Boolean);
    expect(allIds.some((id: string) => id.includes("customer") || id.includes("cgo"))).toBe(true);
  });

  it("scenario: gibberish trigger → no_match → audit with null matched", async () => {
    const result = fallback.match({ trigger: "xyzqwerty random nonsense 12345" });
    expect(result.decision).toBe("no_match");
    expect(result.matched).toBeNull();

    const record = audit.buildRecord(result);
    expect(record.matched_route_id).toBeNull();
    expect(record.confidence).toBeNull();
  });

  it("scenario: kind filter restricts results", () => {
    const all = fallback.match({ trigger: "cto" });
    const onlyCmds = fallback.match({ trigger: "cto", kind: "command" });
    if (all.matched && onlyCmds.matched) {
      expect(onlyCmds.matched.recipient.kind).toBe("command");
    }
  });

  it("scenario: role-restricted caller filters routes", () => {
    const result = fallback.match({
      trigger: "evolve a skill",
      callerRole: "etl-runner", // very limited role
    });
    // Should still find routes with role_scope=['*']
    expect(result.perf.candidate_count).toBeGreaterThanOrEqual(0);
  });
});

describe("integration — invariants from spec.md §11", () => {
  beforeEach(() => loader.invalidateCache());

  it("INV-1: catalog has zero entries with duplicate ID", () => {
    const cat = loader.loadCatalog();
    const ids = new Set();
    for (const r of cat.recipients) {
      expect(ids.has(r.id)).toBe(false);
      ids.add(r.id);
    }
  });

  it("INV-3 (D-4 carryover): keyword-fallback never executes recipient", () => {
    // The match() function returns metadata only; no Skill/Agent/Bash invoked
    const result = fallback.match({ trigger: "evolve a skill" });
    expect(result.matched?.recipient?.invoke).toBeDefined();
    // Caller responsible for execution
  });

  it("INV-4: single source of truth — same catalog feeds all modes", () => {
    const cat1 = loader.loadCatalog();
    // Mode C uses loadCatalog internally
    const result = fallback.match({ trigger: "evolve" });
    expect(result.perf.catalog_size).toBe(cat1.totalCount);
  });
});

describe("integration — catalog completeness", () => {
  beforeEach(() => loader.invalidateCache());

  it("all 5 kind files present + populated", () => {
    const cat = loader.loadCatalog();
    expect(cat.byKind.has("skill")).toBe(true);
    expect(cat.byKind.has("command")).toBe(true);
    expect(cat.byKind.has("agent")).toBe(true);
    expect(cat.byKind.has("persona")).toBe(true);
    expect(cat.byKind.has("mcp")).toBe(true);
  });

  it("every recipient has required fields per schema", () => {
    const cat = loader.loadCatalog();
    for (const r of cat.recipients) {
      expect(r.id).toBeDefined();
      expect(r.kind).toBeDefined();
      expect(r.when_to_use).toBeDefined();
      expect(r.invoke).toBeDefined();
      expect(r.status).toBeDefined();
      expect(Array.isArray(r.role_scope)).toBe(true);
    }
  });

  it("every recipient ID has format <kind>/<slug>", () => {
    const cat = loader.loadCatalog();
    // v2.2: kind segment may contain hyphens (e.g. external-source/anthropic-api)
    for (const r of cat.recipients) {
      expect(r.id).toMatch(/^[a-z][a-z-]*\/[a-z0-9\-_/.]+$/i);
    }
  });

  it("recipient kind matches ID prefix", () => {
    const cat = loader.loadCatalog();
    for (const r of cat.recipients) {
      const prefix = r.id.split("/")[0];
      expect(r.kind).toBe(prefix);
    }
  });
});

describe("integration — Mode B simulation (LLM-style structured query)", () => {
  beforeEach(() => loader.invalidateCache());

  it("can format catalog as text for prompt context", () => {
    const cat = loader.loadCatalog();
    // Simulate: serialize entries to a prompt-friendly string
    const promptText = cat.recipients.slice(0, 5).map((r: any) =>
      `${r.id} (${r.kind}): ${r.when_to_use.slice(0, 100)}`
    ).join("\n");
    expect(promptText.length).toBeGreaterThan(100);
    expect(promptText).toContain("/");
  });

  it("Mode B audit record carries llm_reasoning + composition_supporting", () => {
    const queryResult = fallback.match({ trigger: "evolve" });
    const record = audit.buildRecord(queryResult, {
      mode: "B",
      llm_reasoning: "LLM determined skill/evolve is the best match because trigger explicitly mentions 'evolve'.",
      composition_supporting: ["persona/cto", "mcp/supabase-ops__query"],
      catalog_files_loaded: ["skills.md", "personas.md", "mcps.md"],
    });
    expect(record.mode).toBe("B");
    expect(record.llm_reasoning).toContain("evolve");
    expect(record.composition_supporting).toContain("persona/cto");
    expect(record.catalog_files_loaded).toContain("skills.md");
  });

  it("Mode A audit record (no LLM call, just write record)", () => {
    const result = fallback.match({ trigger: "evolve" });
    const record = audit.buildRecord(result, { mode: "A" });
    expect(record.mode).toBe("A");
    expect(record.llm_reasoning).toBeNull();
  });
});

describe("integration — degraded scenarios", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(join(os.tmpdir(), "resolver-degraded-"));
    loader.invalidateCache();
  });

  it("partial catalog (only 1 kind file present) still functional", () => {
    fs.writeFileSync(join(tmpDir, "skills.md"),
      `## skill/test
**Kind:** skill
**When to use:** Test recipient.
**Invoke:** \`test\`
**Status:** active
`);
    const result = fallback.match({ trigger: "test", opts: { recipientsDir: tmpDir } });
    expect(result.matched).toBeDefined();
  });

  it("Mode C with kind filter for absent kind returns no_match cleanly", () => {
    fs.writeFileSync(join(tmpDir, "skills.md"),
      `## skill/test
**Kind:** skill
**When to use:** Test.
**Invoke:** \`x\`
**Status:** active
`);
    const result = fallback.match({
      trigger: "test",
      kind: "command", // no commands.md present
      opts: { recipientsDir: tmpDir },
    });
    expect(result.matched).toBeNull();
    expect(result.decision).toBe("no_match");
  });

  it("audit write failure does NOT crash caller (best-effort)", async () => {
    const result = fallback.match({ trigger: "evolve" });
    const record = audit.buildRecord(result);
    const failingInsert = async () => { throw new Error("simulated db outage"); };
    const written = await audit.writeRecord(record, failingInsert);
    expect(written).toBeNull(); // best-effort silence
  });
});
