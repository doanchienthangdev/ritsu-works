import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS per Sprint 2 spec
const gen = require("../../scripts/resolver-v3/index-generator.cjs");

describe("resolver-v3 index-generator", () => {
  describe("firstSentence()", () => {
    it("returns text unchanged when short + single sentence", () => {
      expect(gen.firstSentence("Onboard customer")).toBe("Onboard customer");
    });

    it("extracts first sentence at period boundary when long enough", () => {
      // v3.0.1: First sentence must be >= 60 chars to NOT append 2nd
      const longFirst = "This is the first sentence which is definitely longer than sixty chars total.";
      expect(gen.firstSentence(`${longFirst} Second sentence.`)).toBe(longFirst);
    });

    it("v3.0.1 — appends 2nd sentence if first is short (< 60 chars)", () => {
      // Both sentences combined must still fit under 100-char cap
      expect(gen.firstSentence("Short first. Second sentence here.")).toBe(
        "Short first. Second sentence here."
      );
    });

    it("v3.0.1 — keeps only first when combined would exceed 100 chars", () => {
      const shortFirst = "Short start.";
      const longSecond = "But the second sentence is itself really long and would push us over the hundred character cap easily.";
      const result = gen.firstSentence(`${shortFirst} ${longSecond}`);
      expect(result).toBe(shortFirst);
    });

    it("v3.0.1 — short first with no 2nd sentence stays unchanged", () => {
      expect(gen.firstSentence("Short standalone.")).toBe("Short standalone.");
    });

    it("extracts first paragraph if double newline before period", () => {
      expect(gen.firstSentence("First paragraph\n\nSecond paragraph.")).toBe(
        "First paragraph"
      );
    });

    it("collapses whitespace + appends 2nd sentence if first short", () => {
      // After collapse: "Multi line text. More." First sent "Multi line text." is 16 chars < 60
      // → 2nd sentence "More." appended → "Multi line text. More."
      expect(gen.firstSentence("Multi\n  line\n  text. More.")).toBe("Multi line text. More.");
    });

    it("truncates at word boundary when over MAX_SUMMARY_CHARS with ellipsis", () => {
      const long = "a".repeat(50) + " " + "b".repeat(50) + " " + "c".repeat(50);
      const result = gen.firstSentence(long);
      expect(result.length).toBeLessThanOrEqual(101); // 100 + ellipsis
      expect(result.endsWith("…")).toBe(true);
    });

    it("handles empty/null/undefined gracefully", () => {
      expect(gen.firstSentence("")).toBe("(no description)");
      expect(gen.firstSentence(null)).toBe("(no description)");
      expect(gen.firstSentence(undefined)).toBe("(no description)");
    });

    it("handles non-string input gracefully", () => {
      expect(gen.firstSentence(123 as any)).toBe("(no description)");
      expect(gen.firstSentence({} as any)).toBe("(no description)");
    });

    it("handles text with only whitespace", () => {
      expect(gen.firstSentence("   \n  \n  ")).toBe("(no description)");
    });

    it("handles single character", () => {
      expect(gen.firstSentence("a")).toBe("a");
    });

    it("handles unicode/emoji within truncation budget", () => {
      const text = "Việc onboarding khách hàng đầu tiên";
      expect(gen.firstSentence(text)).toBe(text);
    });
  });

  describe("stripKindPrefix()", () => {
    it("strips 'skill/' prefix from skill id", () => {
      expect(gen.stripKindPrefix("skill/customer-onboarding", "skill")).toBe(
        "customer-onboarding"
      );
    });

    it("strips 'mcp/' prefix correctly (preserves __ in tool name)", () => {
      expect(gen.stripKindPrefix("mcp/supabase-ops__query", "mcp")).toBe(
        "supabase-ops__query"
      );
    });

    it("returns id unchanged if no prefix match", () => {
      expect(gen.stripKindPrefix("foo/bar", "skill")).toBe("foo/bar");
    });

    it("handles all 16 kinds", () => {
      const kinds = gen.KIND_ORDER;
      expect(kinds).toHaveLength(16);
      for (const k of kinds) {
        expect(gen.stripKindPrefix(`${k}/test-id`, k)).toBe("test-id");
      }
    });
  });

  describe("estimateTokens()", () => {
    it("returns 0 for empty string", () => {
      expect(gen.estimateTokens("")).toBe(0);
    });

    it("returns ceil(chars/4)", () => {
      expect(gen.estimateTokens("a")).toBe(1);
      expect(gen.estimateTokens("abcd")).toBe(1);
      expect(gen.estimateTokens("abcde")).toBe(2);
      expect(gen.estimateTokens("a".repeat(40))).toBe(10);
    });
  });

  describe("isActive()", () => {
    it("treats status='active' as active", () => {
      expect(gen.isActive({ status: "active" })).toBe(true);
    });

    it("treats missing/null/undefined status as active (legacy)", () => {
      expect(gen.isActive({})).toBe(true);
      expect(gen.isActive({ status: null })).toBe(true);
      expect(gen.isActive({ status: undefined })).toBe(true);
    });

    it("rejects stub, planned, deprecated", () => {
      expect(gen.isActive({ status: "stub" })).toBe(false);
      expect(gen.isActive({ status: "planned" })).toBe(false);
      expect(gen.isActive({ status: "deprecated" })).toBe(false);
    });
  });

  describe("generate()", () => {
    it("returns content + stats", () => {
      const result = gen.generate();
      expect(result).toHaveProperty("content");
      expect(result).toHaveProperty("totalActive");
      expect(result).toHaveProperty("kindsWithEntries");
      expect(result).toHaveProperty("sizeChars");
      expect(result).toHaveProperty("estimatedTokens");
      expect(result).toHaveProperty("overTarget");
      expect(result).toHaveProperty("overHardCap");
    });

    it("totalActive > 0 (catalog is populated)", () => {
      const r = gen.generate();
      expect(r.totalActive).toBeGreaterThan(0);
    });

    it("INDEX content includes invoke conventions header", () => {
      const r = gen.generate();
      expect(r.content).toContain("# Resolver Index v3.0");
      // v3.0.5: the real drill-down tool is mcp__supabase-ops__resolver_find
      // (lives under the supabase-ops server); `mcp__resolver__find` was a phantom.
      expect(r.content).toContain("mcp__supabase-ops__resolver_find");
      expect(r.content).toContain("## Invoke conventions");
    });

    it("INDEX has ## <kind> sections for kinds with entries", () => {
      const r = gen.generate();
      // skill kind should have entries (we have 68+ active skills)
      expect(r.content).toMatch(/^## skill \(\d+\)/m);
    });

    it("INDEX is under hard cap", () => {
      const r = gen.generate();
      expect(r.overHardCap).toBe(false);
      expect(r.estimatedTokens).toBeLessThanOrEqual(15000);
    });

    it("INDEX entries follow format `- <id> :: <summary>`", () => {
      const r = gen.generate();
      // v3.0.1: header now has bullet lists too (Path B explanation).
      // Only check bullets that appear AFTER the first `## <kind> (N)` heading.
      const lines = r.content.split("\n");
      const firstKindHeadingIdx = lines.findIndex((l) => /^## \w[\w-]+ \(\d+\)$/.test(l));
      expect(firstKindHeadingIdx).toBeGreaterThan(0);
      const entryLines = lines
        .slice(firstKindHeadingIdx)
        .filter((l) => l.startsWith("- "));
      expect(entryLines.length).toBeGreaterThan(0);
      // Each kind-section bullet should have `::` separator
      const malformed = entryLines.filter((l) => !l.includes(" :: "));
      expect(malformed).toHaveLength(0);
    });

    it("INDEX excludes stub/deprecated/planned entries (heuristic check)", () => {
      const r = gen.generate();
      // ~493 active after gbrain's 74 live MCP tools joined the catalog (v3.0.5);
      // stubs/planned/deprecated still filtered. Loose sanity band, not an exact count.
      expect(r.totalActive).toBeGreaterThanOrEqual(100);
      expect(r.totalActive).toBeLessThanOrEqual(600);
    });

    it("deterministic — same input → same output (modulo timestamp)", () => {
      const r1 = gen.generate();
      const r2 = gen.generate();
      const stripTs = (s: string) => s.replace(/<!-- Generated at: [^>]+ -->/g, "TS");
      expect(stripTs(r1.content)).toBe(stripTs(r2.content));
    });

    it("entries within each kind sorted alphabetically", () => {
      const r = gen.generate();
      // Extract entries under '## skill' section
      const skillSection = r.content.match(/## skill \(\d+\)\s+([\s\S]*?)(?=\n## |\n$)/);
      if (skillSection) {
        const ids = skillSection[1]
          .split("\n")
          .filter((l: string) => l.startsWith("- "))
          .map((l: string) => l.match(/^- ([^ ]+)/)?.[1] || "");
        const sorted = [...ids].sort();
        expect(ids).toEqual(sorted);
      }
    });
  });

  describe("constants", () => {
    it("KIND_ORDER has exactly 16 kinds matching v2.2 catalog", () => {
      expect(gen.KIND_ORDER).toHaveLength(16);
      expect(gen.KIND_ORDER).toContain("skill");
      expect(gen.KIND_ORDER).toContain("external-source");
    });

    it("MAX_SUMMARY_CHARS = 94", () => {
      expect(gen.MAX_SUMMARY_CHARS).toBe(94); // tightened 100→94 for the INDEX token cap (realigned to source)
    });

    it("TOKEN_HARD_CAP = 15000, TOKEN_TARGET = 12000", () => {
      expect(gen.TOKEN_HARD_CAP).toBe(15000);
      expect(gen.TOKEN_TARGET).toBe(12000);
    });
  });
});
