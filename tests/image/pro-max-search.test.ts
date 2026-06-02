import { describe, it, expect, vi, afterEach } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  search, listFacet, attribution, uniqueTokens, tokenize, parseArgs, ProMaxSearchError, PROMPTS_API, FACETS, SHAPES,
} = require("../../scripts/image/pro-max/search.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). image-platform v0.4 pro-max corpus client
// (scripts/image/pro-max/search.cjs) — a Node thin client over the hosted BM25 backend
// (vendored from gpt-image-2-pro-max search.py, MIT). The fetch is the impure edge → mocked.
// Phase 1: tokenize (pure), uniqueTokens (≥3/≥2-char guard), attribution (null + record),
//   parseArgs (flags), search (too-short throw + mocked success/429/unreachable/bad-json),
//   listFacet (facets list + valid + invalid). Phase 2J: every backend failure → typed
//   ProMaxSearchError with the right `kind` so the caller falls back to generic enhance.
// Skipped: security (sends only query keywords, no injection sink locally); state (stateless).

afterEach(() => { vi.unstubAllGlobals(); });

function mockFetch(impl: any) { vi.stubGlobal("fetch", vi.fn(impl)); }
function okJson(obj: any) { return { ok: true, status: 200, text: async () => JSON.stringify(obj) }; }

describe("tokenize", () => {
  it("lowercases alphanumeric runs, drops punctuation", () => {
    expect(tokenize("Cozy Study-Room, 35mm!")).toEqual(["cozy", "study", "room", "35mm"]);
  });
  it("empty / null / undefined → []", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize(null)).toEqual([]);
    expect(tokenize(undefined)).toEqual([]);
  });
});

describe("uniqueTokens (the ≥3 ≥2-char guard mirror)", () => {
  it("dedupes + drops 1-char tokens", () => {
    expect(uniqueTokens("a ad ad portrait portrait cinematic").sort()).toEqual(["ad", "cinematic", "portrait"]);
  });
  it("a 1-word query yields < 3", () => {
    expect(uniqueTokens("portrait").length).toBe(1);
  });
});

describe("attribution", () => {
  it("null record → null", () => { expect(attribution(null)).toBeNull(); });
  it("maps id/title/author(@)/tweet/shape", () => {
    expect(attribution({ id: "x1", title: "T", author: "Jane", twitter_link: "https://x.com/j/1", shape: "ad" }))
      .toEqual({ id: "x1", title: "T", author: "@Jane", tweet: "https://x.com/j/1", shape: "ad" });
  });
  it("missing fields → null sub-values, never throws", () => {
    expect(attribution({})).toEqual({ id: null, title: null, author: null, tweet: null, shape: null });
  });
});

describe("parseArgs", () => {
  it("collects positional tokens into query + parses flags", () => {
    const o = parseArgs(["person", "portrait", "cinematic", "--shape", "portrait", "-n", "3", "--json", "--has-image"]);
    expect(o.query).toBe("person portrait cinematic");
    expect(o.shape).toBe("portrait");
    expect(o.limit).toBe(3);
    expect(o.json).toBe(true);
    expect(o.hasImage).toBe(true);
  });
  it("--list captures the facet target", () => {
    expect(parseArgs(["--list", "moods"]).list).toBe("moods");
  });
});

describe("search — guards + mocked backend", () => {
  it("query with < 3 unique tokens → throws too_short (no fetch)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await expect(search("ad")).rejects.toMatchObject({ name: "ProMaxSearchError", kind: "too_short" });
    expect(f).not.toHaveBeenCalled();
  });
  it("happy path → { count, results } (results carry attribution fields)", async () => {
    mockFetch(async () => okJson({ count: 2, results: [{ id: "a", author: "Jane", twitter_link: "t", prompt_text: "p" }] }));
    const r = await search("person portrait cinematic", { shape: "portrait", limit: 5 });
    expect(r.count).toBe(2);
    expect(r.results[0].author).toBe("Jane");
  });
  it("passes shape + has_image into the query string", async () => {
    const f = vi.fn(async () => okJson({ count: 0, results: [] }));
    vi.stubGlobal("fetch", f);
    await search("person portrait cinematic", { shape: "ad", hasImage: true });
    const url = f.mock.calls[0][0] as string;
    expect(url).toContain("/search?");
    expect(url).toContain("shape=ad");
    expect(url).toContain("has_image=1");
  });
  it("HTTP 429 → ProMaxSearchError kind=rate_limited", async () => {
    mockFetch(async () => ({ ok: false, status: 429, text: async () => JSON.stringify({ error: "slow down" }) }));
    await expect(search("person portrait cinematic")).rejects.toMatchObject({ kind: "rate_limited" });
  });
  it("network reject → kind=unreachable (caller falls back to generic enhance)", async () => {
    mockFetch(async () => { throw new Error("ENOTFOUND"); });
    await expect(search("person portrait cinematic")).rejects.toMatchObject({ kind: "unreachable" });
  });
  it("non-JSON 200 body → kind=bad_response", async () => {
    mockFetch(async () => ({ ok: true, status: 200, text: async () => "<html>oops</html>" }));
    await expect(search("person portrait cinematic")).rejects.toMatchObject({ kind: "bad_response" });
  });
});

describe("listFacet", () => {
  it("'facets' → the 10 facet names (no fetch)", async () => {
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    const items = await listFacet("facets");
    expect(items.map((i: any) => i.slug)).toEqual(FACETS);
    expect(f).not.toHaveBeenCalled();
  });
  it("a valid facet fetches /vocab/<facet>", async () => {
    const f = vi.fn(async () => okJson({ items: [{ slug: "moody", name: "Moody" }] }));
    vi.stubGlobal("fetch", f);
    const items = await listFacet("moods");
    expect(items[0].slug).toBe("moody");
    expect((f.mock.calls[0][0] as string)).toContain("/vocab/moods");
  });
  it("an unknown facet → ProMaxSearchError kind=bad_facet (no fetch)", async () => {
    await expect(listFacet("not-a-facet")).rejects.toMatchObject({ kind: "bad_facet" });
  });
});

describe("constants (contract)", () => {
  it("PROMPTS_API defaults to the goclaw host (no trailing slash)", () => {
    expect(PROMPTS_API).toMatch(/^https?:\/\/[^/]+$/);
  });
  it("SHAPES includes the documented output shapes", () => {
    expect(SHAPES).toEqual(expect.arrayContaining(["portrait", "ad", "ui", "poster", "infographic"]));
  });
});
