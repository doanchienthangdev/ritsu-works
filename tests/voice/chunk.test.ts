import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { chunkText, splitSentences, hardSplit, DEFAULT_MAX_CHARS } = require("../../scripts/voice/lib/chunk.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). voice-platform v0.1 content-preserving text
// splitter (pure). Behavioral relationships (2M): every chunk <= cap; content (words) is
// preserved; greedy at paragraph → sentence → word granularity. Boundaries: empty, single
// char, exactly-at-cap, over-cap atom, single word longer than cap.

describe("chunkText — boundaries", () => {
  it("empty / whitespace → []", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   \n\t ")).toEqual([]);
    expect(chunkText(null as any)).toEqual([]);
  });
  it("text <= cap → single chunk (trimmed)", () => {
    expect(chunkText("short text", 100)).toEqual(["short text"]);
    expect(chunkText("  padded  ", 100)).toEqual(["padded"]);
  });
  it("text exactly at cap → single chunk", () => {
    const s = "a".repeat(50);
    expect(chunkText(s, 50)).toEqual([s]);
  });
  it("invalid cap falls back to DEFAULT_MAX_CHARS", () => {
    const long = "word ".repeat(1000).trim();
    const chunks = chunkText(long, -5);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(DEFAULT_MAX_CHARS);
  });
});

describe("chunkText — invariants (2M)", () => {
  it("every chunk is <= cap", () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} with some words.`).join(" ");
    for (const c of chunkText(text, 80)) expect(c.length).toBeLessThanOrEqual(80);
  });
  it("content is preserved (word sequence round-trips)", () => {
    const text = "Para one sentence one. Para one sentence two.\n\nPara two has words here too.";
    const words = (s: string) => s.split(/\s+/).filter(Boolean);
    const original = words(text);
    const rebuilt = chunkText(text, 30).flatMap(words);
    expect(rebuilt).toEqual(original);
  });
  it("splits on paragraph boundaries when they fit", () => {
    const text = "AAAA.\n\nBBBB.\n\nCCCC.";
    // cap large enough for one paragraph but not two together
    const chunks = chunkText(text, 6);
    expect(chunks).toEqual(["AAAA.", "BBBB.", "CCCC."]);
  });
  it("a paragraph over the cap falls back to sentence granularity", () => {
    const text = "First sentence here. Second sentence here. Third one.";
    const chunks = chunkText(text, 25);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(25);
  });
  it("a single word longer than the cap is hard-sliced", () => {
    const chunks = chunkText("x".repeat(120), 50);
    expect(chunks.length).toBe(3);
    expect(chunks.every((c: string) => c.length <= 50)).toBe(true);
    expect(chunks.join("")).toBe("x".repeat(120));
  });
});

describe("splitSentences", () => {
  it("keeps terminators attached", () => {
    expect(splitSentences("Hi there. How are you?")).toEqual(["Hi there.", "How are you?"]);
  });
  it("handles no terminator", () => {
    expect(splitSentences("no terminator here")).toEqual(["no terminator here"]);
  });
  it("empty → []", () => {
    expect(splitSentences("   ")).toEqual([]);
  });
});

describe("hardSplit", () => {
  it("splits words to fit the cap", () => {
    const out = hardSplit("alpha beta gamma delta", 11);
    for (const o of out) expect(o.length).toBeLessThanOrEqual(11);
    expect(out.join(" ")).toBe("alpha beta gamma delta");
  });
  it("a single over-cap word is sliced", () => {
    expect(hardSplit("y".repeat(10), 4)).toEqual(["yyyy", "yyyy", "yy"]);
  });
});
