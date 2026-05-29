// Tests for scripts/sync/backfill-wiki-embeddings.cjs (v0.2) — /cla fix wiki-sync-from-refs.
//
// All-Edge-Cases-Test process:
//   Phase 1 — Analysis: 4 pure helpers (parseArgs, stripFrontmatter, chunkBody,
//     rowsForPage). No deps, no I/O, no upstream contract, no prior bugs, no spec.
//     Data-transform functions → behavioral-invariant tests apply (2M).
//   Phase 2 — Edge cases: empty/whitespace/boundary strings; max-pages 0/NaN;
//     frontmatter variants; H2 boundaries; bodies above MAX_CHUNK_CHARS.
//   Skipped: security (2K) — inputs are repo-local markdown, not user input;
//     contract (2N) — leaf utils, no upstream; the network/fs paths (embedBatch,
//     upsertEmbeddings, findPagesNeedingEmbeddings, main) are integration-only
//     and exercised by the verified live run (706 pages), not unit-mocked here.
//   parseArgs unknown-flag branch calls process.exit(1) — not unit-testable
//     without process mocking; covered by manual CLI verification.

import { describe, it, expect } from "vitest";
import { resolve, join } from "node:path";
import { createHash } from "node:crypto";

const REPO = resolve(__dirname, "..", "..");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bf = require(join(REPO, "scripts/sync/backfill-wiki-embeddings.cjs"));

describe("scripts/sync/backfill-wiki-embeddings.cjs", () => {
  describe("parseArgs", () => {
    it("returns documented defaults for empty argv", () => {
      const a = bf.parseArgs([]);
      expect(a).toMatchObject({ maxPages: Infinity, dryRun: false, json: false, cron: false, prefix: "wiki/" });
      expect(a.help).toBeUndefined();
    });

    it("sets dryRun on --dry-run", () => {
      expect(bf.parseArgs(["--dry-run"]).dryRun).toBe(true);
    });

    it("sets json on --json", () => {
      expect(bf.parseArgs(["--json"]).json).toBe(true);
    });

    it("sets cron on --cron", () => {
      expect(bf.parseArgs(["--cron"]).cron).toBe(true);
    });

    it("sets help on -h and --help", () => {
      expect(bf.parseArgs(["-h"]).help).toBe(true);
      expect(bf.parseArgs(["--help"]).help).toBe(true);
    });

    it("parses --max-pages=50 to 50", () => {
      expect(bf.parseArgs(["--max-pages=50"]).maxPages).toBe(50);
    });

    it("clamps --max-pages=0 up to 1 (Math.max guard)", () => {
      expect(bf.parseArgs(["--max-pages=0"]).maxPages).toBe(1);
    });

    it("treats non-numeric --max-pages=abc as 1 (NaN guard)", () => {
      expect(bf.parseArgs(["--max-pages=abc"]).maxPages).toBe(1);
    });

    it("parses a custom --prefix", () => {
      expect(bf.parseArgs(["--prefix=wiki/5-star/"]).prefix).toBe("wiki/5-star/");
    });

    it("falls back to wiki/ when --prefix= is empty", () => {
      expect(bf.parseArgs(["--prefix="]).prefix).toBe("wiki/");
    });

    it("combines multiple flags", () => {
      const a = bf.parseArgs(["--cron", "--json", "--max-pages=5", "--prefix=wiki/x/"]);
      expect(a).toMatchObject({ cron: true, json: true, maxPages: 5, prefix: "wiki/x/", dryRun: false });
    });
  });

  describe("stripFrontmatter", () => {
    it("returns trimmed input unchanged when no frontmatter", () => {
      expect(bf.stripFrontmatter("# Title\n\nBody.")).toBe("# Title\n\nBody.");
    });

    it("removes a leading YAML frontmatter block", () => {
      const raw = "---\ntitle: X\nslug: y\n---\n# Heading\n\nText.";
      expect(bf.stripFrontmatter(raw)).toBe("# Heading\n\nText.");
    });

    it("drops a leading generated-by HTML comment after frontmatter", () => {
      const raw = "---\ntitle: X\n---\n<!-- generated-by: wiki-sync v4.0 -->\n# H\n\nBody.";
      expect(bf.stripFrontmatter(raw)).toBe("# H\n\nBody.");
    });

    it("returns empty string for empty input", () => {
      expect(bf.stripFrontmatter("")).toBe("");
    });

    it("returns empty string when there is only frontmatter and no body", () => {
      expect(bf.stripFrontmatter("---\ntitle: X\n---\n")).toBe("");
    });

    it("preserves a --- horizontal rule that is NOT the leading frontmatter", () => {
      const raw = "# H\n\nbefore\n\n---\n\nafter";
      // No leading '---', so nothing is stripped.
      expect(bf.stripFrontmatter(raw)).toBe(raw);
    });

    it("trims leading/trailing whitespace", () => {
      expect(bf.stripFrontmatter("\n\n  # H\n\nB.  \n")).toBe("# H\n\nB.");
    });
  });

  describe("chunkBody", () => {
    it("returns [] for empty string", () => {
      expect(bf.chunkBody("")).toEqual([]);
    });

    it("returns [] for whitespace-only string", () => {
      expect(bf.chunkBody("   \n\t  ")).toEqual([]);
    });

    it("returns a single trimmed chunk for short text", () => {
      expect(bf.chunkBody("  hello world  ")).toEqual(["hello world"]);
    });

    it("returns one chunk when text is exactly MAX_CHUNK_CHARS", () => {
      const text = "a".repeat(bf.MAX_CHUNK_CHARS);
      const chunks = bf.chunkBody(text);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].length).toBe(bf.MAX_CHUNK_CHARS);
    });

    it("splits an over-MAX body along H2 boundaries", () => {
      const text = `## Section A\n${"a".repeat(3500)}\n## Section B\n${"b".repeat(3500)}`;
      const chunks = bf.chunkBody(text);
      expect(chunks.length).toBe(2);
      expect(chunks[0].startsWith("## Section A")).toBe(true);
      expect(chunks[1].startsWith("## Section B")).toBe(true);
      chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(bf.MAX_CHUNK_CHARS));
    });

    it("windows an over-MAX body with no H2 into multiple sub-MAX chunks", () => {
      const para = "word ".repeat(220).trim(); // ~1100 chars
      const text = Array(8).fill(para).join("\n\n"); // ~8800 chars > MAX
      const chunks = bf.chunkBody(text);
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach((c) => expect(c.length).toBeLessThanOrEqual(bf.MAX_CHUNK_CHARS));
    });

    it("documents the lone-paragraph limitation: one paragraph above MAX stays one chunk", () => {
      // A single unbroken paragraph longer than MAX has no split point. It stays
      // whole (still well under the model's 8191-token limit). Asserting the
      // current behavior so a future change is a conscious decision.
      const giant = "x".repeat(bf.MAX_CHUNK_CHARS + 2000);
      const chunks = bf.chunkBody(giant);
      expect(chunks).toHaveLength(1);
      expect(chunks[0].length).toBe(bf.MAX_CHUNK_CHARS + 2000);
    });

    it("emits no empty chunks", () => {
      const text = `## A\n\n\n## B\n${"b".repeat(7000)}`;
      const chunks = bf.chunkBody(text);
      chunks.forEach((c) => expect(c.trim().length).toBeGreaterThan(0));
    });

    it("preserves every H2 header across the chunk set (content preservation)", () => {
      const text = `## Alpha\n${"a".repeat(3000)}\n## Beta\n${"b".repeat(3000)}\n## Gamma\n${"c".repeat(3000)}`;
      const joined = bf.chunkBody(text).join("\n");
      expect(joined).toContain("## Alpha");
      expect(joined).toContain("## Beta");
      expect(joined).toContain("## Gamma");
    });
  });

  describe("rowsForPage", () => {
    const page = { id: "11111111-1111-1111-1111-111111111111" };

    it("maps a single chunk to one row with index 0", () => {
      const rows = bf.rowsForPage(page, ["hello"], [[0.1, 0.2, 0.3]]);
      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ page_id: page.id, chunk_index: 0, chunk_text: "hello", embedding_model: bf.MODEL });
    });

    it("assigns sequential chunk_index values for multiple chunks", () => {
      const rows = bf.rowsForPage(page, ["a", "b", "c"], [[1], [2], [3]]);
      expect(rows.map((r: { chunk_index: number }) => r.chunk_index)).toEqual([0, 1, 2]);
    });

    it("serializes the embedding to the pgvector text form '[...]'", () => {
      const rows = bf.rowsForPage(page, ["t"], [[0.5, -1, 2.25]]);
      expect(rows[0].embedding).toBe("[0.5,-1,2.25]");
    });

    it("computes a deterministic sha256 chunk_hash that matches node crypto", () => {
      const text = "deterministic content";
      const rows = bf.rowsForPage(page, [text], [[0]]);
      expect(rows[0].chunk_hash).toBe(createHash("sha256").update(text).digest("hex"));
    });

    it("derives token_count as ceil(length/4)", () => {
      const rows = bf.rowsForPage(page, ["abcde"], [[0]]); // len 5 → ceil(1.25)=2
      expect(rows[0].token_count).toBe(2);
    });

    it("returns [] for no chunks", () => {
      expect(bf.rowsForPage(page, [], [])).toEqual([]);
    });
  });
});
