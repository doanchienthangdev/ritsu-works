/**
 * Tests for the wiki_ask RPC-first ranking path (migration 00048):
 *   - coerceSimilarity  — PostgREST numeric (number | string) → finite number
 *   - matchViaRpc       — RPC call + map/coerce/filter; null on error (→ fallback)
 *   - assembleResults   — pure: matches + page metadata → cited RetrievalResults
 *
 * Companion to wiki-ask-batching.test.ts (the client-cosine fallback's batched
 * fetch). Focus: edge cases + broken inputs (the RPC errors, similarity arrives
 * as a string / null / garbage, matches reference unknown pages, etc).
 */
import { describe, it, expect } from "vitest";
import {
  coerceSimilarity,
  matchViaRpc,
  assembleResults,
  type EmbeddingMatch,
} from "../../mcp-server/src/tools/wiki-ask.ts";

// ---------------------------------------------------------------------------
// coerceSimilarity
// ---------------------------------------------------------------------------
describe("coerceSimilarity", () => {
  it("passes through a JS number", () => {
    expect(coerceSimilarity(0.7)).toBe(0.7);
    expect(coerceSimilarity(0)).toBe(0);
    expect(coerceSimilarity(-0.2)).toBe(-0.2);
  });

  it("parses a PostgREST numeric string", () => {
    expect(coerceSimilarity("0.6662")).toBeCloseTo(0.6662, 6);
    expect(coerceSimilarity("-0.2")).toBeCloseTo(-0.2, 6);
    expect(coerceSimilarity("1e-3")).toBeCloseTo(0.001, 6);
  });

  it("returns NaN for non-numeric strings", () => {
    expect(Number.isNaN(coerceSimilarity("abc"))).toBe(true);
    expect(Number.isNaN(coerceSimilarity(""))).toBe(true);
  });

  it("returns NaN for null / undefined / non-primitives", () => {
    expect(Number.isNaN(coerceSimilarity(null))).toBe(true);
    expect(Number.isNaN(coerceSimilarity(undefined))).toBe(true);
    expect(Number.isNaN(coerceSimilarity({}))).toBe(true);
    expect(Number.isNaN(coerceSimilarity(true))).toBe(true);
  });

  it("preserves a NaN number", () => {
    expect(Number.isNaN(coerceSimilarity(NaN))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// matchViaRpc
// ---------------------------------------------------------------------------
function fakeRpcClient(result: { data: any; error: any }, capture?: { name?: string; params?: any }) {
  return {
    schema() {
      return {
        rpc(name: string, params: any) {
          if (capture) {
            capture.name = name;
            capture.params = params;
          }
          return Promise.resolve(result);
        },
      };
    },
  } as any;
}

describe("matchViaRpc", () => {
  it("returns null when the RPC errors (signals fallback)", async () => {
    const client = fakeRpcClient({ data: null, error: { message: "function ops.match_wiki_embeddings does not exist" } });
    const out = await matchViaRpc(client, ["p1"], [0.1, 0.2], 5);
    expect(out).toBeNull();
  });

  it("maps rows and coerces string similarities to numbers", async () => {
    const client = fakeRpcClient({
      data: [
        { page_id: "p1", chunk_index: 0, chunk_text: "a", similarity: "0.9" },
        { page_id: "p2", chunk_index: 2, chunk_text: "b", similarity: 0.6 },
      ],
      error: null,
    });
    const out = await matchViaRpc(client, ["p1", "p2"], [0.1], 5);
    expect(out).toEqual([
      { page_id: "p1", chunk_index: 0, chunk_text: "a", similarity: 0.9 },
      { page_id: "p2", chunk_index: 2, chunk_text: "b", similarity: 0.6 },
    ]);
  });

  it("drops rows whose similarity coerces to non-finite", async () => {
    const client = fakeRpcClient({
      data: [
        { page_id: "p1", chunk_index: 0, chunk_text: "a", similarity: "0.8" },
        { page_id: "p2", chunk_index: 0, chunk_text: "b", similarity: "garbage" },
      ],
      error: null,
    });
    const out = await matchViaRpc(client, ["p1", "p2"], [0.1], 5);
    expect(out).toHaveLength(1);
    expect(out![0].page_id).toBe("p1");
  });

  it("returns [] for null or empty data", async () => {
    expect(await matchViaRpc(fakeRpcClient({ data: null, error: null }), ["p1"], [0.1], 5)).toEqual([]);
    expect(await matchViaRpc(fakeRpcClient({ data: [], error: null }), ["p1"], [0.1], 5)).toEqual([]);
  });

  it("passes page_ids array + embedding-as-pgvector-literal string + limits in the body", async () => {
    const capture: { name?: string; params?: any } = {};
    const client = fakeRpcClient({ data: [], error: null }, capture);
    await matchViaRpc(client, ["p1", "p2"], [0.1, 0.2, 0.3], 7);
    expect(capture.name).toBe("match_wiki_embeddings");
    expect(capture.params.page_ids).toEqual(["p1", "p2"]); // array in body, not URL
    expect(capture.params.query_embedding).toBe("[0.1,0.2,0.3]"); // text literal
    expect(capture.params.match_limit).toBe(7);
    expect(capture.params.min_similarity).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// assembleResults
// ---------------------------------------------------------------------------
function page(id: string, extra: Record<string, any> = {}) {
  return {
    id,
    slug: `slug-${id}`,
    page_type: "concept",
    title: `Title ${id}`,
    file_path: `wiki/concept/slug-${id}.md`,
    extracted_from_source_id: null,
    ...extra,
  };
}
function pageMap(...pages: any[]): Map<string, any> {
  return new Map(pages.map((p) => [p.id, p]));
}
function match(page_id: string, similarity: number, chunk_index: number | null = 0): EmbeddingMatch {
  return { page_id, chunk_index, chunk_text: `chunk-${page_id}`, similarity };
}

describe("assembleResults", () => {
  it("builds one result per match, sorted by similarity desc", () => {
    const out = assembleResults(
      [match("a", 0.6), match("b", 0.9)],
      pageMap(page("a"), page("b")),
      new Map(),
      false,
      10,
    );
    expect(out.map((r) => r.page_id)).toEqual(["b", "a"]);
    expect(out[0].similarity).toBe(0.9);
    expect(out[0].citation_format).toContain("Title b");
  });

  it("returns [] for no matches", () => {
    expect(assembleResults([], pageMap(page("a")), new Map(), false, 10)).toEqual([]);
  });

  it("skips a match whose page is not in the candidate set", () => {
    const out = assembleResults([match("ghost", 0.9), match("a", 0.7)], pageMap(page("a")), new Map(), false, 10);
    expect(out.map((r) => r.page_id)).toEqual(["a"]);
  });

  it("skips a match with non-finite similarity", () => {
    const out = assembleResults([match("a", NaN), match("b", 0.8)], pageMap(page("a"), page("b")), new Map(), false, 10);
    expect(out.map((r) => r.page_id)).toEqual(["b"]);
  });

  it("slices to topK (highest similarities)", () => {
    const out = assembleResults(
      [match("a", 0.6), match("b", 0.9), match("c", 0.7)],
      pageMap(page("a"), page("b"), page("c")),
      new Map(),
      false,
      2,
    );
    expect(out.map((r) => r.page_id)).toEqual(["b", "c"]);
  });

  it("re-sorts even when the input order is wrong", () => {
    const out = assembleResults(
      [match("a", 0.5), match("b", 0.95), match("c", 0.7)],
      pageMap(page("a"), page("b"), page("c")),
      new Map(),
      false,
      10,
    );
    expect(out.map((r) => r.similarity)).toEqual([0.95, 0.7, 0.5]);
  });

  describe("derived-entity citations", () => {
    it("populates source fields + 'extracted from' citation when source meta is present", () => {
      const out = assembleResults(
        [match("e", 0.8)],
        pageMap(page("e", { extracted_from_source_id: "src1" })),
        new Map([["src1", { slug: "the-book__chapter-03", title: "Chapter 3" }]]),
        true,
        10,
      );
      expect(out[0].source_slug).toBe("the-book__chapter-03");
      expect(out[0].source_title).toBe("Chapter 3");
      expect(out[0].citation_format).toContain("extracted from");
      expect(out[0].is_derived_entity).toBe(true);
    });

    it("falls back to plain citation + null source fields when source meta is missing", () => {
      const out = assembleResults(
        [match("e", 0.8)],
        pageMap(page("e", { extracted_from_source_id: "src-missing" })),
        new Map(), // no meta for src-missing
        true,
        10,
      );
      expect(out[0].source_slug).toBeNull();
      expect(out[0].source_title).toBeNull();
      expect(out[0].citation_format).toContain("Title e");
      expect(out[0].citation_format).not.toContain("extracted from");
    });
  });

  it("leaves source fields null when isDerived is false", () => {
    const out = assembleResults(
      [match("a", 0.8)],
      pageMap(page("a", { extracted_from_source_id: "src1" })),
      new Map([["src1", { slug: "s", title: "t" }]]),
      false,
      10,
    );
    expect(out[0].source_slug).toBeNull();
    expect(out[0].is_derived_entity).toBe(false);
  });

  it("handles a null chunk_index", () => {
    const out = assembleResults([match("a", 0.8, null)], pageMap(page("a")), new Map(), false, 10);
    expect(out[0].chunk_index).toBeNull();
    expect(out[0].citation_format).not.toContain("#chunk-");
  });

  it("keeps only valid rows in a mixed batch (valid + unknown-page + non-finite)", () => {
    const out = assembleResults(
      [match("a", 0.9), match("ghost", 0.95), match("b", NaN), match("c", 0.6)],
      pageMap(page("a"), page("c")), // note: b absent too
      new Map(),
      false,
      10,
    );
    expect(out.map((r) => r.page_id)).toEqual(["a", "c"]);
  });
});
