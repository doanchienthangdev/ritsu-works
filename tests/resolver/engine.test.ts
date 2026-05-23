// Resolver engine unit tests (Sprint 1 PR-3).
// Covers: errors, load-index, query (normalize/match/rank/filter/decide), audit.
//
// Vitest TS; engine modules are CJS. Uses createRequire for interop.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

const cjsRequire = createRequire(import.meta.url);

const REPO = resolve(__dirname, "..", "..");
const errors = cjsRequire(join(REPO, "scripts/resolver/errors.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver/load-index.cjs"));
const queryMod = cjsRequire(join(REPO, "scripts/resolver/query.cjs"));
const auditMod = cjsRequire(join(REPO, "scripts/resolver/audit.cjs"));

describe("scripts/resolver/errors.cjs", () => {
  it("exports 41+ named exception classes", () => {
    const keys = Object.keys(errors);
    expect(keys.length).toBeGreaterThanOrEqual(40);
    expect(errors.ResolverError).toBeDefined();
    expect(errors.InvalidTrigger).toBeDefined();
    expect(errors.RecipientNotFound).toBeDefined();
    expect(errors.OpsAuditWriteFailed).toBeDefined();
  });

  it("each error has name, code, context", () => {
    const e = new errors.InvalidTrigger("test reason");
    expect(e.name).toBe("InvalidTrigger");
    expect(e.code).toBe("InvalidTrigger");
    expect(e.message).toContain("test reason");
    expect(e.context).toEqual({ reason: "test reason" });
  });

  it("ResolverError is base class", () => {
    const e = new errors.InvalidTrigger("x");
    expect(e).toBeInstanceOf(errors.ResolverError);
    expect(e).toBeInstanceOf(Error);
  });
});

describe("scripts/resolver/load-index.cjs", () => {
  beforeEach(() => loader.invalidateCache());

  it("normalizeKeyword: NFC + lowercase + whitespace collapse", () => {
    expect(loader.normalizeKeyword("  HELLO   WORLD  ")).toBe("hello world");
    expect(loader.normalizeKeyword("Khách Hàng")).toBe("khách hàng");
  });

  it("normalizeKeyword: handles non-string", () => {
    expect(loader.normalizeKeyword(null)).toBe("");
    expect(loader.normalizeKeyword(undefined)).toBe("");
    expect(loader.normalizeKeyword(123)).toBe("");
  });

  it("loadIndex: throws ResolverDown when resolvers dir missing", () => {
    expect(() => loader.loadIndex({ resolversDir: "/nonexistent-path-xyz" })).toThrow(
      errors.ResolverDown
    );
  });

  it("loadIndex: loads real registry (smoke)", () => {
    const idx = loader.loadIndex();
    expect(idx.schema_version).toBe("1.0.0");
    expect(idx.config).toBeDefined();
    expect(idx.routes).toBeInstanceOf(Array);
  });

  it("loadIndex: caches by mtime (second call hits cache)", () => {
    const a = loader.loadIndex();
    const b = loader.loadIndex();
    expect(a).toBe(b); // same object reference (cache hit)
  });
});

describe("scripts/resolver/query.cjs — normalize", () => {
  it("rejects nil trigger", () => {
    expect(() => queryMod.normalizeTrigger(null)).toThrow(errors.InvalidTrigger);
    expect(() => queryMod.normalizeTrigger(undefined)).toThrow(errors.InvalidTrigger);
  });

  it("rejects empty / whitespace", () => {
    expect(() => queryMod.normalizeTrigger("")).toThrow(errors.InvalidTrigger);
    expect(() => queryMod.normalizeTrigger("   \t\n  ")).toThrow(errors.InvalidTrigger);
  });

  it("rejects non-string", () => {
    expect(() => queryMod.normalizeTrigger(123 as any)).toThrow(errors.InvalidTrigger);
  });

  it("normalizes to NFC lowercase collapsed-whitespace", () => {
    expect(queryMod.normalizeTrigger("  Brainstorm  THIS Idea  ")).toBe("brainstorm this idea");
  });

  it("truncates at MAX_TRIGGER_LEN", () => {
    const long = "a ".repeat(800);
    const n = queryMod.normalizeTrigger(long);
    expect(n.length).toBeLessThanOrEqual(1000);
  });

  it("Vietnamese NFC", () => {
    expect(queryMod.normalizeTrigger("Khách Hàng")).toBe("khách hàng");
  });

  it("strips control characters", () => {
    expect(queryMod.normalizeTrigger("hello\x00world")).toBe("helloworld");
  });
});

describe("scripts/resolver/query.cjs — computeConfidence", () => {
  it("returns 0.9 for whole-word single-keyword match", () => {
    expect(queryMod.computeConfidence("i want to evolve a skill", "evolve")).toBe(0.9);
  });

  it("returns 0.9 for full-phrase match", () => {
    expect(queryMod.computeConfidence("check my signatures now", "check my signatures")).toBe(0.9);
  });

  it("returns 0.7 for all-words-present non-contiguous", () => {
    expect(queryMod.computeConfidence("check now my signatures please", "check signatures")).toBe(0.7);
  });

  it("returns 0 for no match", () => {
    expect(queryMod.computeConfidence("hello world", "foobar")).toBe(0);
  });

  it("substring within word DOES NOT match (whole-word only)", () => {
    expect(queryMod.computeConfidence("pricing tier philosophy", "pric")).toBe(0);
  });

  it("Vietnamese keyword matches Vietnamese trigger", () => {
    expect(queryMod.computeConfidence("hôm nay tôi cần khách hàng mới", "khách hàng")).toBe(0.9);
  });
});

describe("scripts/resolver/query.cjs — matchRoute", () => {
  const sampleRoute = {
    id: "skill/test",
    triggers: { keywords: ["evolve", "improve this skill"] },
    recipient: { kind: "skill", slug: "test" },
    invocation: { mechanism: "skill_tool" },
  };

  it("returns null for no match", () => {
    expect(queryMod.matchRoute("hello world", sampleRoute)).toBeNull();
  });

  it("returns match with best keyword confidence", () => {
    const m = queryMod.matchRoute("i want to evolve a thing", sampleRoute);
    expect(m).not.toBeNull();
    expect(m.confidence).toBe(0.9);
    expect(m.matchedKeyword).toBe("evolve");
  });

  it("returns null when route has no triggers", () => {
    expect(queryMod.matchRoute("evolve", { id: "x", recipient: {}, invocation: {} } as any)).toBeNull();
  });

  it("disambiguator bumps confidence by 0.05", () => {
    const route = { ...sampleRoute, metadata: { disambiguator: "test" } };
    const m = queryMod.matchRoute("i want to evolve", route);
    expect(m.confidence).toBeCloseTo(0.95, 2);
  });
});

describe("scripts/resolver/query.cjs — filterByRole", () => {
  const r1 = { id: "a", route: { role_scope: ["*"] }, confidence: 0.9 };
  const r2 = { id: "b", route: { role_scope: ["founder"] }, confidence: 0.8 };
  const r3 = { id: "c", route: { role_scope: ["gtm-orchestrator"] }, confidence: 0.7 };

  it("returns all when callerRole absent", () => {
    expect(queryMod.filterByRole([r1, r2, r3], null)).toHaveLength(3);
  });

  it("filters by role match", () => {
    const out = queryMod.filterByRole([r1, r2, r3], "founder");
    expect(out).toHaveLength(2);
    expect(out.map((x: any) => x.id)).toEqual(["a", "b"]);
  });

  it("role_scope ['*'] matches any", () => {
    expect(queryMod.filterByRole([r1], "random-role")).toHaveLength(1);
  });
});

describe("scripts/resolver/query.cjs — decide", () => {
  const config = { default_confidence_threshold: { dispatch_silently: 0.85, surface_candidates: 0.6 } };

  it("dispatches silently when top ≥ 0.85", () => {
    const r = queryMod.decide([{ confidence: 0.9 }, { confidence: 0.7 }], config);
    expect(r.decision).toBe("dispatch_silently");
    expect(r.matched).toBeDefined();
  });

  it("surfaces candidates when 0.60 ≤ top < 0.85", () => {
    const r = queryMod.decide([{ confidence: 0.7 }, { confidence: 0.65 }], config);
    expect(r.decision).toBe("surface_candidates");
    expect(r.candidates).toHaveLength(2);
  });

  it("no_match when top < 0.60", () => {
    const r = queryMod.decide([{ confidence: 0.5 }], config);
    expect(r.decision).toBe("no_match");
  });

  it("no_match when empty", () => {
    const r = queryMod.decide([], config);
    expect(r.decision).toBe("no_match");
  });
});

describe("scripts/resolver/query.cjs — query (integration with bootstrap-mode index)", () => {
  it("returns no_match when index is empty (bootstrap mode)", () => {
    loader.invalidateCache();
    const r = queryMod.query({ trigger: "test trigger no match" });
    expect(r.decision).toBe("no_match");
    expect(r.latency_ms).toBeGreaterThanOrEqual(0);
    expect(r.trigger_normalized).toBe("test trigger no match");
  });

  it("throws InvalidTrigger for empty input", () => {
    expect(() => queryMod.query({ trigger: "" })).toThrow(errors.InvalidTrigger);
  });

  it("perf info present", () => {
    loader.invalidateCache();
    const r = queryMod.query({ trigger: "anything" });
    expect(r.perf).toHaveProperty("load_ms");
    expect(r.perf).toHaveProperty("match_count");
    expect(r.perf).toHaveProperty("filtered_count");
  });
});

describe("scripts/resolver/audit.cjs — buildRecord", () => {
  it("builds record from query result (matched)", () => {
    const qr = {
      trigger: "evolve a skill",
      trigger_normalized: "evolve a skill",
      caller_role: "founder",
      decision: "dispatch_silently",
      matched: { route: { id: "skill/evolve" }, confidence: 0.9, matchedKeyword: "evolve" },
      alternatives: [],
      semantic_used: false,
      latency_ms: 3,
      perf: { load_ms: 1, match_count: 1, filtered_count: 1 },
      flags: {},
    };
    const r = auditMod.buildRecord(qr);
    expect(r.trigger).toBe("evolve a skill");
    expect(r.matched_route_id).toBe("skill/evolve");
    expect(r.confidence).toBe(0.9);
    expect(r.decision).toBe("dispatch_silently");
    expect(r.caller_role).toBe("founder");
  });

  it("builds record for no-match (matched_route_id null)", () => {
    const qr = {
      trigger: "x",
      trigger_normalized: "x",
      caller_role: null,
      decision: "no_match",
      matched: null,
      alternatives: [],
      semantic_used: false,
      latency_ms: 1,
      perf: { load_ms: 0, match_count: 0, filtered_count: 0 },
      flags: {},
    };
    const r = auditMod.buildRecord(qr);
    expect(r.matched_route_id).toBeNull();
    expect(r.confidence).toBeNull();
  });
});

describe("scripts/resolver/audit.cjs — writeRecord", () => {
  it("uses injected insertFn (success path)", async () => {
    let captured: any = null;
    const r = await auditMod.writeRecord(
      { trigger: "x", decision: "no_match" },
      { insertFn: async (rec: any) => { captured = rec; } }
    );
    expect(r.written).toBe(true);
    expect(captured.trigger).toBe("x");
  });

  it("defers to local fallback when insertFn fails", async () => {
    const tmpdir = fs.mkdtempSync(join(os.tmpdir(), "resolver-audit-"));
    const r = await auditMod.writeRecord(
      { trigger: "x", decision: "no_match" },
      { insertFn: async () => { throw new Error("simulated"); } }
    );
    expect(r.written).toBe(false);
    expect(r.deferred).toBeTruthy();
    // Clean up
    if (r.deferred && fs.existsSync(r.deferred)) fs.unlinkSync(r.deferred);
  });
});
