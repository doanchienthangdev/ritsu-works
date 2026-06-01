import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention; see deepask tests)
const { classifyRoute, VALID_ROUTES, DEFAULT_THRESHOLD, DEFAULT_AMBIGUITY_MARGIN } = require("../../scripts/forge/route-classify.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Function under test: classifyRoute — the /forge
// extend-vs-net-new classifier (the highest-risk surface: a mis-route = silent 5x cost).
// Phase 1: 1 param (obj: candidates[], threshold=0.6, ambiguityMargin=0.1).
//   Branches: non-obj→throw | candidates-not-array→throw | bad threshold/margin→throw |
//   bad candidate→throw | empty|top<threshold → net-new | lone|clear-winner → extend |
//   near-tie → surface. Output {route, entity?, candidates?, reason}.
// Phase 2 edges: score/threshold/margin at 0,1,exact-threshold,just-below; margin exact vs
//   just-below; empty/lone/many/duplicate/all-same/unsorted candidates; threshold=1, margin=0/1.
// Metamorphic: order-independence (sorted internally); irrelevant low candidate doesn't flip.
// Skipped: contract (consumer = route-classifier skill, markdown — shape is the {entity,score}
//   tuple, asserted here); state (stateless pure fn); security (entity is a label, no exec
//   surface); regression (new code, no prior bugs).

const mk = (...pairs: Array<[string, number]>) => pairs.map(([entity, score]) => ({ entity, score }));

describe("classifyRoute", () => {
  describe("happy path", () => {
    it("no candidates → net-new", () => {
      expect(classifyRoute({ candidates: [] })).toStrictEqual({
        route: "net-new",
        reason: "no existing skill candidates → net-new",
      });
    });
    it("clear single strong candidate → extend", () => {
      const r = classifyRoute({ candidates: mk(["gtm-audit", 0.82]) });
      expect(r.route).toBe("extend");
      expect(r.entity).toBe("gtm-audit");
    });
    it("two near-tied strong candidates → surface (never auto-pick)", () => {
      const r = classifyRoute({ candidates: mk(["a", 0.81], ["b", 0.80]) });
      expect(r.route).toBe("surface");
      expect(r.candidates).toHaveLength(2);
    });
  });

  describe("specification conformance (JSDoc scenarios)", () => {
    it("best below threshold → net-new with the weak-top reason", () => {
      const r = classifyRoute({ candidates: mk(["weak", 0.4]) });
      expect(r.route).toBe("net-new");
      expect(r.reason).toMatch(/0\.4 < threshold 0\.6/);
    });
    it("clear winner over #2 → extend names the winner", () => {
      const r = classifyRoute({ candidates: mk(["win", 0.9], ["lose", 0.5]) });
      expect(r).toStrictEqual({
        route: "extend",
        entity: "win",
        reason: '"win" (0.9) beats "lose" (0.5) by ≥ 0.1',
      });
    });
  });

  describe("score boundaries (threshold = 0.6)", () => {
    it("top exactly AT threshold (0.6) → extend (>=)", () => {
      expect(classifyRoute({ candidates: mk(["x", 0.6]) }).route).toBe("extend");
    });
    it("top just BELOW threshold (0.59) → net-new", () => {
      expect(classifyRoute({ candidates: mk(["x", 0.59]) }).route).toBe("net-new");
    });
    it("score 0 → net-new", () => {
      expect(classifyRoute({ candidates: mk(["x", 0]) }).route).toBe("net-new");
    });
    it("score 1 (lone) → extend", () => {
      expect(classifyRoute({ candidates: mk(["x", 1]) }).route).toBe("extend");
    });
  });

  describe("ambiguity margin boundaries (margin = 0.1)", () => {
    it("top - second EXACTLY margin (0.10) → extend (>=, not surface)", () => {
      const r = classifyRoute({ candidates: mk(["a", 0.8], ["b", 0.7]) });
      expect(r.route).toBe("extend");
      expect(r.entity).toBe("a");
    });
    it("top - second JUST below margin (0.09) → surface", () => {
      const r = classifyRoute({ candidates: mk(["a", 0.79], ["b", 0.7]) });
      expect(r.route).toBe("surface");
    });
    it("exact score tie (top === second) → surface with both", () => {
      const r = classifyRoute({ candidates: mk(["a", 0.7], ["b", 0.7]) });
      expect(r.route).toBe("surface");
      expect(r.candidates.map((c: any) => c.entity).sort()).toStrictEqual(["a", "b"]);
    });
    it("3 candidates within margin → surface lists all 3", () => {
      const r = classifyRoute({ candidates: mk(["a", 0.82], ["b", 0.8], ["c", 0.79]) });
      expect(r.route).toBe("surface");
      expect(r.candidates).toHaveLength(3);
    });
    it("near-tie at top but a 3rd far below → surface lists only the tied pair", () => {
      const r = classifyRoute({ candidates: mk(["a", 0.81], ["b", 0.8], ["c", 0.2]) });
      expect(r.route).toBe("surface");
      expect(r.candidates).toHaveLength(2);
    });
  });

  describe("cross-parameter (threshold × margin tuning)", () => {
    it("threshold = 1 → only a perfect score extends", () => {
      expect(classifyRoute({ candidates: mk(["x", 0.99]), threshold: 1 }).route).toBe("net-new");
      expect(classifyRoute({ candidates: mk(["x", 1]), threshold: 1 }).route).toBe("extend");
    });
    it("margin = 0 → any positive gap auto-picks (only exact tie surfaces)", () => {
      expect(classifyRoute({ candidates: mk(["a", 0.8], ["b", 0.79]), ambiguityMargin: 0 }).route).toBe("extend");
      expect(classifyRoute({ candidates: mk(["a", 0.8], ["b", 0.8]), ambiguityMargin: 0 }).route).toBe("surface");
    });
    it("margin = 1 → any 2+ strong candidates surface (only a lone candidate extends)", () => {
      expect(classifyRoute({ candidates: mk(["a", 0.9], ["b", 0.61]), ambiguityMargin: 1 }).route).toBe("surface");
      expect(classifyRoute({ candidates: mk(["a", 0.9]), ambiguityMargin: 1 }).route).toBe("extend");
    });
  });

  describe("behavioral relationships (metamorphic / determinism)", () => {
    it("order-independent: shuffled input yields the same decision", () => {
      const asc = classifyRoute({ candidates: mk(["lose", 0.5], ["win", 0.9]) });
      const desc = classifyRoute({ candidates: mk(["win", 0.9], ["lose", 0.5]) });
      expect(asc).toStrictEqual(desc);
      expect(asc.entity).toBe("win");
    });
    it("adding an irrelevant low-score candidate does NOT flip a clear extend", () => {
      const base = classifyRoute({ candidates: mk(["win", 0.9], ["lose", 0.5]) });
      const plus = classifyRoute({ candidates: mk(["win", 0.9], ["lose", 0.5], ["noise", 0.05]) });
      expect(plus.route).toBe("extend");
      expect(plus.entity).toBe(base.entity);
    });
    it("equal-score tie-break is stable (lexicographic by entity)", () => {
      const r = classifyRoute({ candidates: mk(["zeta", 0.7], ["alpha", 0.7]) });
      // both surface; the reported reason anchors on the lexicographically-first as top
      expect(r.route).toBe("surface");
      expect(r.candidates[0].entity).toBe("alpha");
    });
  });

  describe("does not mutate caller input", () => {
    it("input candidates array + objects are untouched", () => {
      const input = mk(["b", 0.5], ["a", 0.9]);
      const snapshot = JSON.parse(JSON.stringify(input));
      classifyRoute({ candidates: input });
      expect(input).toStrictEqual(snapshot);
    });
  });

  describe("input validation (throws TypeError)", () => {
    it("non-object input throws", () => {
      expect(() => classifyRoute(null)).toThrow(/must be an object/);
      expect(() => classifyRoute([])).toThrow(/array/);
      expect(() => classifyRoute("x")).toThrow(/must be an object/);
      expect(() => classifyRoute(undefined)).toThrow(/must be an object/);
    });
    it("candidates not an array throws", () => {
      expect(() => classifyRoute({ candidates: "x" })).toThrow(/candidates must be an array/);
      expect(() => classifyRoute({})).toThrow(/candidates must be an array/);
    });
    it("out-of-range threshold/margin throw", () => {
      expect(() => classifyRoute({ candidates: [], threshold: -0.1 })).toThrow(/threshold must be a number in \[0, 1\]/);
      expect(() => classifyRoute({ candidates: [], threshold: 1.1 })).toThrow(/threshold/);
      expect(() => classifyRoute({ candidates: [], threshold: NaN })).toThrow(/threshold/);
      expect(() => classifyRoute({ candidates: [], threshold: "0.5" as any })).toThrow(/threshold/);
      expect(() => classifyRoute({ candidates: [], ambiguityMargin: 2 })).toThrow(/ambiguityMargin/);
    });
    it("malformed candidate throws", () => {
      expect(() => classifyRoute({ candidates: [null] })).toThrow(/candidates\[0\] must be an object/);
      expect(() => classifyRoute({ candidates: [{ entity: "", score: 0.5 }] })).toThrow(/non-empty string/);
      expect(() => classifyRoute({ candidates: [{ entity: "x", score: 1.5 }] })).toThrow(/score must be a number in \[0, 1\]/);
      expect(() => classifyRoute({ candidates: [{ entity: "x", score: NaN }] })).toThrow(/score/);
      expect(() => classifyRoute({ candidates: [{ entity: "x" }] })).toThrow(/score/);
      expect(() => classifyRoute({ candidates: [{ score: 0.5 }] })).toThrow(/entity/);
    });
  });

  describe("exported constants", () => {
    it("expose the route vocab + defaults", () => {
      expect(VALID_ROUTES).toStrictEqual(["extend", "net-new", "surface"]);
      expect(DEFAULT_THRESHOLD).toBe(0.6);
      expect(DEFAULT_AMBIGUITY_MARGIN).toBe(0.1);
    });
  });
});
