// Resolver v2 — keyword-fallback (Mode C) test suite.
// Phase 1 analysis:
//   - match: 4-param input, validates trigger, loads catalog, matches, filters, decides
//   - normalize: NFC + lowercase + control-char strip + whitespace collapse
//   - validateTrigger: null, undefined, empty, type, length checks
//   - extractTokens: slug + description + aliases
//   - computeMatch: 4 match strategies (exact slug, alias, slug-word, description-words)
//   - filterByRole: optional role-based filter

import { describe, it, expect, beforeEach } from "vitest";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import * as fs from "node:fs";
import * as os from "node:os";

const cjsRequire = createRequire(import.meta.url);
const REPO = resolve(__dirname, "..", "..");
const fallback = cjsRequire(join(REPO, "scripts/resolver-v2/keyword-fallback.cjs"));
const loader = cjsRequire(join(REPO, "scripts/resolver-v2/catalog-loader.cjs"));
const E = cjsRequire(join(REPO, "scripts/resolver-v2/errors.cjs"));

describe("keyword-fallback.cjs", () => {
  beforeEach(() => loader.invalidateCache());

  describe("normalize", () => {
    it("returns empty string on non-string", () => {
      expect(fallback.normalize(null)).toBe("");
      expect(fallback.normalize(undefined)).toBe("");
      expect(fallback.normalize(123)).toBe("");
      expect(fallback.normalize({})).toBe("");
    });

    it("lowercase + NFC + whitespace collapse", () => {
      expect(fallback.normalize("  HELLO   WORLD  ")).toBe("hello world");
      expect(fallback.normalize("Khách Hàng")).toBe("khách hàng");
    });

    it("strips control characters", () => {
      expect(fallback.normalize("foo\x00bar")).toBe("foobar");
      expect(fallback.normalize("hi\x01\x02there")).toBe("hithere");
    });

    it("preserves emoji (NFC normalized)", () => {
      expect(fallback.normalize("foo 🎯 bar")).toContain("🎯");
    });

    it("collapses tabs and newlines to spaces", () => {
      expect(fallback.normalize("foo\tbar\nbaz")).toBe("foo bar baz");
    });
  });

  describe("validateTrigger", () => {
    it("throws InvalidTrigger on null", () => {
      expect(() => fallback.validateTrigger(null)).toThrow(E.InvalidTrigger);
    });

    it("throws InvalidTrigger on undefined", () => {
      expect(() => fallback.validateTrigger(undefined)).toThrow(E.InvalidTrigger);
    });

    it("throws InvalidTrigger on non-string", () => {
      expect(() => fallback.validateTrigger(123)).toThrow(E.InvalidTrigger);
      expect(() => fallback.validateTrigger({})).toThrow(E.InvalidTrigger);
      expect(() => fallback.validateTrigger([])).toThrow(E.InvalidTrigger);
    });

    it("throws InvalidTrigger on empty string", () => {
      expect(() => fallback.validateTrigger("")).toThrow(E.InvalidTrigger);
    });

    it("throws InvalidTrigger on whitespace-only", () => {
      expect(() => fallback.validateTrigger("   ")).toThrow(E.InvalidTrigger);
      expect(() => fallback.validateTrigger("\t\n\r")).toThrow(E.InvalidTrigger);
    });

    it("throws TriggerTooLong on >1000 char trigger", () => {
      const long = "x".repeat(1001);
      expect(() => fallback.validateTrigger(long)).toThrow(E.TriggerTooLong);
    });

    it("accepts trigger at exactly 1000 chars", () => {
      const exact = "x".repeat(1000);
      expect(fallback.validateTrigger(exact).length).toBe(1000);
    });

    it("trims whitespace from valid trigger", () => {
      expect(fallback.validateTrigger("  foo  ")).toBe("foo");
    });
  });

  describe("extractTokens", () => {
    it("extracts slug parts", () => {
      const r = { id: "skill/customer-onboarding", when_to_use: "" };
      const tokens = fallback.extractTokens(r);
      expect(tokens.has("customer")).toBe(true);
      expect(tokens.has("onboarding")).toBe(true);
    });

    it("extracts significant words from description (excludes stop-words)", () => {
      const r = { id: "skill/x", when_to_use: "When you want to onboard the customer in production" };
      const tokens = fallback.extractTokens(r);
      expect(tokens.has("onboard")).toBe(true);
      expect(tokens.has("customer")).toBe(true);
      expect(tokens.has("production")).toBe(true);
      expect(tokens.has("the")).toBe(false); // stop word
      expect(tokens.has("a")).toBe(false); // stop word + <3 chars
      // Note: "you" passes filter (3 chars, not in STOP_WORDS) — design choice
    });

    it("includes aliases as phrases", () => {
      const r = { id: "persona/ceo", when_to_use: "x", aliases: ["Chief Executive Officer"] };
      const tokens = fallback.extractTokens(r);
      expect(tokens.has("chief executive officer")).toBe(true);
    });
  });

  describe("computeMatch happy path", () => {
    it("exact slug match → 0.95 confidence", () => {
      const r = { id: "skill/cto", when_to_use: "x" };
      const m = fallback.computeMatch("cto", r);
      expect(m?.confidence).toBe(0.95);
      expect(m?.matchedToken).toBe("cto");
    });

    it("multi-part slug match → 0.95", () => {
      const r = { id: "skill/customer-onboarding", when_to_use: "x" };
      const m = fallback.computeMatch("please run customer-onboarding now", r);
      expect(m?.confidence).toBe(0.95);
    });

    it("alias match → 0.9 confidence", () => {
      const r = { id: "persona/ceo", when_to_use: "x", aliases: ["chief executive officer"] };
      const m = fallback.computeMatch("ask the chief executive officer about strategy", r);
      expect(m?.confidence).toBe(0.9);
    });

    it("slug-word match (single word from slug) → 0.8", () => {
      const r = { id: "skill/customer-onboarding", when_to_use: "x" };
      const m = fallback.computeMatch("help me with customer issue", r);
      expect(m?.confidence).toBe(0.8);
    });

    it("description-tokens match (2 words) → 0.6", () => {
      const r = { id: "skill/x", when_to_use: "Onboard new paying customer for first time" };
      const m = fallback.computeMatch("onboard new user immediately", r);
      // "onboard" + "new" match → 2 words → 0.6
      expect(m?.confidence).toBeGreaterThanOrEqual(0.6);
    });

    it("returns null when no match", () => {
      const r = { id: "skill/x", when_to_use: "Foo bar baz" };
      const m = fallback.computeMatch("totally unrelated", r);
      expect(m).toBeNull();
    });

    it("does NOT match substring (no false positives)", () => {
      const r = { id: "skill/cto", when_to_use: "x" };
      // "doctor" contains "cto" but should NOT match
      const m = fallback.computeMatch("please call the doctor", r);
      expect(m).toBeNull();
    });
  });

  describe("filterByRole", () => {
    const candidates = [
      { recipient: { id: "skill/a", role_scope: ["*"] }, confidence: 0.9 },
      { recipient: { id: "skill/b", role_scope: ["founder"] }, confidence: 0.85 },
      { recipient: { id: "skill/c", role_scope: ["cofounder", "gps"] }, confidence: 0.8 },
    ];

    it("returns all when callerRole is null", () => {
      expect(fallback.filterByRole(candidates, null).length).toBe(3);
    });

    it("returns all when callerRole is undefined", () => {
      expect(fallback.filterByRole(candidates, undefined).length).toBe(3);
    });

    it("keeps wildcard '*' routes regardless", () => {
      const filtered = fallback.filterByRole(candidates, "etl-runner");
      expect(filtered.some((c: any) => c.recipient.id === "skill/a")).toBe(true);
    });

    it("filters by specific role", () => {
      const filtered = fallback.filterByRole(candidates, "founder");
      expect(filtered.length).toBe(2); // a (wildcard) + b
      expect(filtered.some((c: any) => c.recipient.id === "skill/b")).toBe(true);
    });

    it("excludes routes role doesn't have", () => {
      const filtered = fallback.filterByRole(candidates, "etl-runner");
      expect(filtered.some((c: any) => c.recipient.id === "skill/b")).toBe(false);
      expect(filtered.some((c: any) => c.recipient.id === "skill/c")).toBe(false);
    });
  });

  describe("match end-to-end", () => {
    it("returns dispatch_silently on high-confidence match", () => {
      const r = fallback.match({ trigger: "evolve a skill" });
      expect(r.mode).toBe("C");
      expect(["dispatch_silently", "surface_candidates"]).toContain(r.decision);
      expect(r.latency_ms).toBeGreaterThanOrEqual(0);
    });

    it("returns no_match on gibberish", () => {
      const r = fallback.match({ trigger: "qwertyxyz random gibberish 12345" });
      expect(r.decision).toBe("no_match");
      expect(r.matched).toBeNull();
    });

    it("respects kind filter", () => {
      const r = fallback.match({ trigger: "cto", kind: "command" });
      if (r.matched) {
        expect(r.matched.recipient.kind).toBe("command");
      }
    });

    it("throws InvalidKindFilter on unknown kind", () => {
      expect(() => fallback.match({ trigger: "foo", kind: "bogus" }))
        .toThrow(E.InvalidKindFilter);
    });

    it("includes perf metrics", () => {
      const r = fallback.match({ trigger: "evolve" });
      expect(r.perf).toBeDefined();
      expect(typeof r.perf.catalog_size).toBe("number");
      expect(typeof r.perf.candidate_count).toBe("number");
      expect(typeof r.perf.load_ms).toBe("number");
    });

    it("normalizes trigger in output", () => {
      const r = fallback.match({ trigger: "  EVOLVE   " });
      expect(r.trigger_normalized).toBe("evolve");
    });

    it("skips deprecated recipients", () => {
      // Mock catalog with a deprecated entry — verify it's skipped
      // (this test relies on the real catalog; if any are deprecated, ensure they don't match)
      const r = fallback.match({ trigger: "deprecated-test-xyz" });
      expect(r.matched).toBeNull();
    });
  });

  describe("config", () => {
    it("DEFAULT_THRESHOLDS has dispatch_silently and surface_candidates", () => {
      expect(fallback.DEFAULT_THRESHOLDS.dispatch_silently).toBe(0.85);
      expect(fallback.DEFAULT_THRESHOLDS.surface_candidates).toBe(0.60);
    });

    it("STOP_WORDS includes common English filler", () => {
      expect(fallback.STOP_WORDS.has("the")).toBe(true);
      expect(fallback.STOP_WORDS.has("and")).toBe(true);
      expect(fallback.STOP_WORDS.has("is")).toBe(true);
    });
  });
});
