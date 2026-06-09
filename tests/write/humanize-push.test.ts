import { describe, it, expect } from "vitest";
// @ts-ignore
const { scan, runDetector, DEFAULT_THRESHOLD } = require("../../scripts/write/humanize/scan.cjs");
// @ts-ignore
const { parsePush, push, BACKENDS } = require("../../scripts/write/push.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). The humanizer GATE (vendored detector wrapper) +
// the push destination parser. Python scanners are skipped (skipPython) for deterministic,
// CI-portable assertions; the JS 44-type detector is the primary gate.

const SLOP = "In today's fast-paced digital landscape, it's important to note that leveraging synergies stands as a testament to innovation. Moreover, this groundbreaking solution showcases a rich tapestry of cutting-edge capabilities. Let's dive in. Not only does it streamline workflows, but it also fosters collaboration, ensuring seamless experiences. The future looks bright.";
const HUMAN = "I rewired the lamp on Tuesday. Took twenty minutes and a YouTube video I half-trusted. The switch works now. My landlord still hasn't fixed the radiator, which is the actual problem, but at least I can read at night without that overhead light buzzing at me.";

describe("scan (AI-smell gate)", () => {
  it("FAILS obvious AI slop with a high score", () => {
    const r = scan(SLOP, { skipPython: true });
    expect(r.pass).toBe(false);
    expect(r.ai_smell_score).toBeGreaterThan(DEFAULT_THRESHOLD);
    expect(r.issue_count).toBeGreaterThan(0);
  });
  it("PASSES clean human prose with a low score", () => {
    const r = scan(HUMAN, { skipPython: true });
    expect(r.pass).toBe(true);
    expect(r.ai_smell_score).toBeLessThanOrEqual(DEFAULT_THRESHOLD);
  });
  it("treats empty / whitespace text as too_short (not a pass)", () => {
    const r = scan("   ", { skipPython: true });
    expect(r.too_short).toBe(true);
    expect(r.pass).toBe(false);
  });
  it("honors a custom threshold", () => {
    const strict = scan(HUMAN, { skipPython: true, threshold: -1 });
    expect(strict.threshold).toBe(-1);
    expect(strict.pass).toBe(false); // nothing scores <= -1
  });
  it("classification is never AI_ONLY for a passing draft", () => {
    const r = scan(HUMAN, { skipPython: true });
    expect(r.classification).not.toBe("AI_ONLY");
  });
  it("returns the documented shape", () => {
    const r = scan(SLOP, { skipPython: true });
    for (const k of ["ai_smell_score", "classification", "threshold", "pass", "issues_by_severity", "issue_count", "top_issues", "context_mode", "sources"]) {
      expect(r).toHaveProperty(k);
    }
    expect(Array.isArray(r.top_issues)).toBe(true);
    expect(r.banned_phrases).toBeNull(); // skipPython
  });
  it("context mode is passed through to the detector", () => {
    expect(scan(HUMAN, { skipPython: true, contextMode: "marketing" }).context_mode).toBe("marketing");
  });
  it("runDetector returns a 0-100 score object", () => {
    const d = runDetector(SLOP, "general");
    expect(typeof d.score).toBe("number");
    expect(d.score).toBeGreaterThanOrEqual(0);
    expect(d.score).toBeLessThanOrEqual(100);
  });
});

describe("push (distribution parser)", () => {
  describe("parsePush", () => {
    it("parses backend + path segments", () => {
      const r = parsePush("googledrive/12042026/post/facebook");
      expect(r.ok).toBe(true);
      expect(r.backend).toBe("googledrive");
      expect(r.segments).toEqual(["12042026", "post", "facebook"]);
      expect(r.target).toBe("12042026/post/facebook");
    });
    it("resolves an alias to the canonical backend", () => {
      expect(parsePush("gdrive/x").backend).toBe("googledrive");
      expect(parsePush("twitter").backend).toBe("x");
    });
    it("a bare backend has '(root)' target", () => {
      expect(parsePush("notion").target).toBe("(root)");
    });
    it("public social backends are HITL Tier C", () => {
      expect(parsePush("x").hitl_tier).toBe("C");
      expect(parsePush("facebook").hitl_tier).toBe("C");
    });
    it("storage backends are HITL Tier B", () => {
      expect(parsePush("googledrive/a").hitl_tier).toBe("B");
    });
    it.each([undefined, null, "", "   "])("rejects empty spec %s", (s) => {
      expect(parsePush(s as any).ok).toBe(false);
    });
    it("rejects an unknown backend", () => {
      const r = parsePush("myspace/foo");
      expect(r.ok).toBe(false);
      expect(r.error).toMatch(/unknown push backend/);
    });
  });

  describe("push (plan only — never delivers)", () => {
    it("v0.1 backends report not_built with the artifact-saved-locally note", () => {
      const r = push("googledrive/2026/post", { file: "/tmp/out.pdf" });
      expect(r.ok).toBe(true);
      expect(r.outcome).toBe("not_built");
      expect(r.file).toBe("/tmp/out.pdf");
      expect(r.note).toMatch(/registered-not-built|saved locally/);
    });
    it("bad spec → outcome bad_spec", () => {
      expect(push("???bad").outcome).toBe("bad_spec");
    });
    it("carries the hitl tier through", () => {
      expect(push("x").hitl_tier).toBe("C");
    });
  });

  it("every BACKENDS entry has surface + hitl + mcp", () => {
    for (const [id, b] of Object.entries<any>(BACKENDS)) {
      expect(typeof b.surface).toBe("string");
      expect(["A", "B", "C"]).toContain(b.hitl);
      expect(typeof b.mcp).toBe("string");
    }
  });
});
