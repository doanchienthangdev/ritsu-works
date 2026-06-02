/**
 * Tests for fetchEmbeddingsBatched — the URL-overflow guard in wiki_ask.
 *
 * Regression context: a single supabase-js `.in("page_id", pageIds)` over the
 * full auto-accepted entity set (~755 uuids) builds a ~28 KB PostgREST request
 * URL, which the Supabase/Kong gateway rejects with HTTP 400 "Bad Request"
 * (surfaced as `embeddings query: Bad Request`). The fix batches the `.in()`.
 * These tests lock in the batching behaviour, boundaries, the size guard, and
 * the error/null-data paths — without needing a live Supabase client.
 */
import { describe, it, expect } from "vitest";
import {
  fetchEmbeddingsBatched,
  EMBEDDINGS_IN_BATCH_SIZE,
} from "../../mcp-server/src/tools/wiki-ask.ts";
import { MCPToolError } from "../../mcp-server/src/types.ts";

/** N deterministic fake page ids. */
function ids(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `id-${i}`);
}

/** A fetcher that echoes one row per id and records the slices it received. */
function makeFetcher(calls: string[][]) {
  return (slice: string[]) => {
    calls.push(slice);
    return Promise.resolve({
      data: slice.map((id) => ({
        page_id: id,
        chunk_index: 0,
        chunk_text: `t-${id}`,
        embedding: "[0.1]",
      })),
      error: null,
    });
  };
}

describe("fetchEmbeddingsBatched", () => {
  describe("happy path", () => {
    it("returns all rows in a single batch when count <= batchSize", async () => {
      const calls: string[][] = [];
      const out = await fetchEmbeddingsBatched(ids(5), makeFetcher(calls), 100);
      expect(calls.length).toBe(1);
      expect(calls[0]).toHaveLength(5);
      expect(out.map((r) => r.page_id)).toEqual(ids(5));
    });
  });

  describe("batching boundaries", () => {
    it("makes zero calls and returns [] for empty pageIds", async () => {
      const calls: string[][] = [];
      const out = await fetchEmbeddingsBatched([], makeFetcher(calls), 100);
      expect(calls).toEqual([]);
      expect(out).toEqual([]);
    });

    it("uses exactly one batch when count === batchSize", async () => {
      const calls: string[][] = [];
      await fetchEmbeddingsBatched(ids(100), makeFetcher(calls), 100);
      expect(calls.length).toBe(1);
      expect(calls[0]).toHaveLength(100);
    });

    it("splits into two batches when count === batchSize + 1", async () => {
      const calls: string[][] = [];
      const out = await fetchEmbeddingsBatched(ids(101), makeFetcher(calls), 100);
      expect(calls.length).toBe(2);
      expect(calls[0]).toHaveLength(100);
      expect(calls[1]).toHaveLength(1);
      expect(out).toHaveLength(101);
    });

    it("regression: 755 ids split into 8 batches, order preserved", async () => {
      const calls: string[][] = [];
      const out = await fetchEmbeddingsBatched(ids(755), makeFetcher(calls), 100);
      expect(calls.length).toBe(8);
      expect(calls.slice(0, 7).every((c) => c.length === 100)).toBe(true);
      expect(calls[7]).toHaveLength(55);
      expect(out).toHaveLength(755);
      // concatenation must preserve global order across batches
      expect(out.map((r) => r.page_id)).toEqual(ids(755));
    });
  });

  describe("batchSize guard", () => {
    it("clamps batchSize 0 to 1 (no infinite loop)", async () => {
      const calls: string[][] = [];
      const out = await fetchEmbeddingsBatched(ids(3), makeFetcher(calls), 0);
      expect(calls.length).toBe(3);
      expect(out).toHaveLength(3);
    });

    it("clamps a negative batchSize to 1", async () => {
      const calls: string[][] = [];
      await fetchEmbeddingsBatched(ids(2), makeFetcher(calls), -5);
      expect(calls.length).toBe(2);
    });

    it("floors a fractional batchSize", async () => {
      const calls: string[][] = [];
      await fetchEmbeddingsBatched(ids(5), makeFetcher(calls), 2.9);
      expect(calls.map((c) => c.length)).toEqual([2, 2, 1]);
    });

    it("defaults to EMBEDDINGS_IN_BATCH_SIZE when batchSize is omitted", async () => {
      const calls: string[][] = [];
      await fetchEmbeddingsBatched(ids(EMBEDDINGS_IN_BATCH_SIZE + 1), makeFetcher(calls));
      expect(calls.length).toBe(2);
      expect(calls[0]).toHaveLength(EMBEDDINGS_IN_BATCH_SIZE);
    });
  });

  describe("error handling", () => {
    it("throws MCPToolError preserving the original message", async () => {
      const fetcher = () => Promise.resolve({ data: null, error: { message: "Bad Request" } });
      await expect(fetchEmbeddingsBatched(ids(3), fetcher, 100)).rejects.toThrowError(MCPToolError);
      await expect(fetchEmbeddingsBatched(ids(3), fetcher, 100)).rejects.toThrowError(
        "embeddings query: Bad Request",
      );
    });

    it("stops issuing batches after the first error", async () => {
      let count = 0;
      const fetcher = (_slice: string[]) => {
        count += 1;
        return Promise.resolve({ data: null, error: { message: "boom" } });
      };
      await expect(fetchEmbeddingsBatched(ids(250), fetcher, 100)).rejects.toThrow();
      expect(count).toBe(1); // failed on the first batch; did not continue
    });
  });

  describe("null-data tolerance", () => {
    it("contributes nothing for a null-data batch without throwing", async () => {
      let n = 0;
      const fetcher = (slice: string[]) => {
        n += 1;
        if (n === 1) return Promise.resolve({ data: null, error: null });
        return Promise.resolve({
          data: slice.map((id) => ({ page_id: id, chunk_index: 0, chunk_text: "", embedding: "[0]" })),
          error: null,
        });
      };
      const out = await fetchEmbeddingsBatched(ids(150), fetcher, 100);
      expect(out).toHaveLength(50); // only the second batch's 50 rows
    });
  });

  describe("exposed constant", () => {
    it("EMBEDDINGS_IN_BATCH_SIZE is a positive integer safely under the URL limit", () => {
      expect(Number.isInteger(EMBEDDINGS_IN_BATCH_SIZE)).toBe(true);
      expect(EMBEDDINGS_IN_BATCH_SIZE).toBeGreaterThan(0);
      // ~150 uuids * ~37 chars ≈ 5.5 KB, comfortably under the ~8-16 KB gateway limit
      expect(EMBEDDINGS_IN_BATCH_SIZE).toBeLessThanOrEqual(150);
    });
  });
});
