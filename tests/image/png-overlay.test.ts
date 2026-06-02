import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  overlayLogo,
  decodePng,
  encodePng,
  resizeRGBA,
  compositeOver,
  crc32,
  PngOverlayError,
  POSITIONS,
} = require("../../scripts/image/lib/png-overlay.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). image-platform v0.3 dependency-free PNG
// logo compositor (scripts/image/lib/png-overlay.cjs). PURE module (zlib only).
//
// Phase 1 — analysis: crc32 (pure), decodePng (8 guard branches + 4 colorType paths +
//   filter reconstruction), encodePng (2 guards + happy), resizeRGBA (down/up/bad +
//   alpha-weighting), compositeOver (over/clip/skip), overlayLogo (4 positions + clamp +
//   geometry). Contract test (2N): decode the REAL ritsu-logo.png (exercises adaptive PNG
//   filters 0-4 end-to-end) + overlay onto a synthetic base.
// Skipped: security (no user-string surface — binary in/out); state (stateless pure fns).

const REAL_LOGO = path.join(__dirname, "../../00-core/design-system/ritsu/assets/ritsu-logo.png");

// Build a synthetic straight-RGBA image; encodePng round-trips it to a real PNG buffer.
function solid(w: number, h: number, r: number, g: number, b: number, a = 255) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = a; }
  return { width: w, height: h, data };
}
function px(img: any, x: number, y: number) {
  const i = (y * img.width + x) * 4;
  return [img.data[i], img.data[i + 1], img.data[i + 2], img.data[i + 3]];
}

describe("crc32", () => {
  it("matches the canonical PNG IEND chunk CRC (type 'IEND', empty data) = 0xAE426082", () => {
    expect(crc32(Buffer.from("IEND", "ascii"))).toBe(0xae426082);
  });
  it("empty buffer → 0", () => {
    expect(crc32(Buffer.alloc(0))).toBe(0);
  });
  it("is deterministic for the same input", () => {
    const b = Buffer.from([1, 2, 3, 255, 0, 128]);
    expect(crc32(b)).toBe(crc32(b));
  });
});

describe("encodePng + decodePng round-trip", () => {
  it("round-trips a solid RGBA image byte-exactly (pixels preserved)", () => {
    const src = solid(7, 5, 10, 188, 208, 255); // odd dims, #0ABCD0
    const buf = encodePng(src);
    expect(Buffer.isBuffer(buf)).toBe(true);
    const back = decodePng(buf);
    expect(back.width).toBe(7);
    expect(back.height).toBe(5);
    expect(px(back, 0, 0)).toEqual([10, 188, 208, 255]);
    expect(px(back, 6, 4)).toEqual([10, 188, 208, 255]);
  });
  it("round-trips per-pixel-varying data (a gradient) exactly", () => {
    const w = 4, h = 4; const data = new Uint8Array(w * h * 4);
    for (let i = 0; i < w * h; i++) { data[i * 4] = i * 10; data[i * 4 + 1] = 255 - i * 10; data[i * 4 + 2] = i; data[i * 4 + 3] = i % 2 ? 128 : 255; }
    const back = decodePng(encodePng({ width: w, height: h, data }));
    for (let i = 0; i < w * h; i++) {
      expect(back.data[i * 4]).toBe(i * 10);
      expect(back.data[i * 4 + 3]).toBe(i % 2 ? 128 : 255);
    }
  });
  it("1x1 image round-trips", () => {
    const back = decodePng(encodePng(solid(1, 1, 1, 2, 3, 4)));
    expect([back.width, back.height]).toEqual([1, 1]);
    expect(px(back, 0, 0)).toEqual([1, 2, 3, 4]);
  });
  it("preserves a fully-transparent pixel's alpha (0)", () => {
    const data = new Uint8Array(1 * 1 * 4); // all zero → transparent black
    const back = decodePng(encodePng({ width: 1, height: 1, data }));
    expect(px(back, 0, 0)).toEqual([0, 0, 0, 0]);
  });
});

describe("encodePng — guards", () => {
  it("throws on non-positive dimensions", () => {
    expect(() => encodePng({ width: 0, height: 4, data: new Uint8Array(0) })).toThrow(PngOverlayError);
    expect(() => encodePng({ width: 4, height: -1, data: new Uint8Array(0) })).toThrow(PngOverlayError);
  });
  it("throws when data length != width*height*4", () => {
    expect(() => encodePng({ width: 2, height: 2, data: new Uint8Array(3) })).toThrow(/width\*height\*4/);
  });
});

describe("decodePng — guards", () => {
  it("throws on a non-PNG buffer (bad signature)", () => {
    expect(() => decodePng(Buffer.from("not a png at all"))).toThrow(/bad signature/);
  });
  it("throws on a non-Buffer / too-short input", () => {
    expect(() => decodePng(Buffer.alloc(4))).toThrow(PngOverlayError);
    // @ts-ignore deliberate bad type
    expect(() => decodePng("xyz")).toThrow(PngOverlayError);
  });
  it("throws on a truncated chunk (declared length runs past EOF)", () => {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const badLen = Buffer.alloc(4); badLen.writeUInt32BE(9999, 0);
    const buf = Buffer.concat([sig, badLen, Buffer.from("IHDR")]);
    expect(() => decodePng(buf)).toThrow(/truncated/);
  });
});

describe("resizeRGBA", () => {
  it("downscales a solid opaque image keeping its color (alpha-weighted average)", () => {
    const src = solid(10, 10, 10, 188, 208, 255);
    const out = resizeRGBA(src, 2, 2);
    expect([out.width, out.height]).toEqual([2, 2]);
    expect(px(out, 0, 0)).toEqual([10, 188, 208, 255]);
  });
  it("does NOT bleed a dark transparent background into an opaque region (no halo)", () => {
    // left half opaque cyan, right half fully-transparent BLACK (rgb 0). A naive average
    // would darken the boundary; alpha-weighting must keep the opaque color clean.
    const w = 8, h = 2; const data = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (x < 4) { data[i] = 10; data[i + 1] = 188; data[i + 2] = 208; data[i + 3] = 255; }
      else { data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0; }
    }
    const out = resizeRGBA({ width: w, height: h, data }, 4, 1);
    // leftmost output pixel draws only from opaque cyan source → stays cyan, not darkened
    expect(px(out, 0, 0).slice(0, 3)).toEqual([10, 188, 208]);
  });
  it("a box that is entirely transparent yields a transparent pixel", () => {
    const src = solid(4, 4, 99, 99, 99, 0); // transparent
    const out = resizeRGBA(src, 1, 1);
    expect(px(out, 0, 0)).toEqual([0, 0, 0, 0]);
  });
  it("upscales (nearest-ish) without throwing and preserves a solid color", () => {
    const out = resizeRGBA(solid(2, 2, 5, 6, 7, 255), 6, 6);
    expect([out.width, out.height]).toEqual([6, 6]);
    expect(px(out, 3, 3)).toEqual([5, 6, 7, 255]);
  });
  it("throws on a non-positive target", () => {
    expect(() => resizeRGBA(solid(2, 2, 0, 0, 0), 0, 2)).toThrow(PngOverlayError);
  });
});

describe("compositeOver", () => {
  it("opaque overlay fully replaces the base pixel", () => {
    const base = solid(3, 3, 0, 0, 0, 255);
    compositeOver(base, solid(1, 1, 255, 255, 255, 255), 1, 1);
    expect(px(base, 1, 1)).toEqual([255, 255, 255, 255]);
    expect(px(base, 0, 0)).toEqual([0, 0, 0, 255]); // untouched
  });
  it("a fully-transparent overlay pixel leaves the base unchanged (sa=0 skip)", () => {
    const base = solid(2, 2, 10, 20, 30, 255);
    compositeOver(base, solid(2, 2, 99, 99, 99, 0), 0, 0);
    expect(px(base, 0, 0)).toEqual([10, 20, 30, 255]);
  });
  it("50% alpha overlay blends halfway over an opaque base", () => {
    const base = solid(1, 1, 0, 0, 0, 255);
    compositeOver(base, solid(1, 1, 255, 255, 255, 128), 0, 0);
    const [r, , , a] = px(base, 0, 0);
    expect(a).toBe(255);
    expect(r).toBeGreaterThanOrEqual(127); // ~128
    expect(r).toBeLessThanOrEqual(129);
  });
  it("clips an overlay placed partly out of bounds (no throw, no wrap)", () => {
    const base = solid(3, 3, 0, 0, 0, 255);
    compositeOver(base, solid(2, 2, 255, 0, 0, 255), 2, 2); // only (2,2) lands in-bounds
    expect(px(base, 2, 2)).toEqual([255, 0, 0, 255]);
    expect(px(base, 0, 0)).toEqual([0, 0, 0, 255]);
  });
  it("a fully out-of-bounds placement changes nothing", () => {
    const base = solid(2, 2, 7, 7, 7, 255);
    compositeOver(base, solid(2, 2, 1, 1, 1, 255), 50, 50);
    expect(px(base, 0, 0)).toEqual([7, 7, 7, 255]);
  });
});

describe("overlayLogo — geometry + policy", () => {
  const logoBuf = encodePng(solid(100, 100, 255, 0, 0, 255)); // a red square 'logo'

  it("places the logo in the top-left by default at margin (short-edge based)", () => {
    const base = encodePng(solid(400, 800, 2, 8, 23, 255)); // 9:16-ish; short edge = 400
    const out = decodePng(overlayLogo(base, logoBuf, { scale: 0.1, margin: 0.05 }));
    const m = Math.round(400 * 0.05); // 20
    expect(px(out, m + 2, m + 2)).toEqual([255, 0, 0, 255]); // inside logo
    expect(px(out, 1, 1)).toEqual([2, 8, 23, 255]);          // margin gap untouched
    expect(px(out, 200, 400)).toEqual([2, 8, 23, 255]);      // center untouched
  });
  it("top-right places the logo flush to the right margin", () => {
    const base = encodePng(solid(400, 400, 0, 0, 0, 255));
    const out = decodePng(overlayLogo(base, logoBuf, { position: "top-right", scale: 0.1, margin: 0.05 }));
    const w = Math.round(400 * 0.1); // 40
    const m = 20;
    expect(px(out, 400 - m - 2, m + 2)).toEqual([255, 0, 0, 255]);
    expect(px(out, m + 2, m + 2)).toEqual([0, 0, 0, 255]); // top-LEFT now empty
  });
  it("bottom-left places the logo near the bottom", () => {
    const base = encodePng(solid(400, 400, 0, 0, 0, 255));
    const out = decodePng(overlayLogo(base, logoBuf, { position: "bottom-left", scale: 0.1, margin: 0.05 }));
    expect(px(out, 22, 400 - 22)).toEqual([255, 0, 0, 255]);
    expect(px(out, 22, 22)).toEqual([0, 0, 0, 255]); // top empty
  });
  it("an out-of-range scale falls back to the 0.12 default (never huge)", () => {
    const base = encodePng(solid(500, 500, 0, 0, 0, 255));
    const out = decodePng(overlayLogo(base, logoBuf, { scale: 9 })); // absurd → default 0.12
    // logo width ≈ 60px; the image center must remain background, proving it wasn't scaled huge
    expect(px(out, 250, 250)).toEqual([0, 0, 0, 255]);
  });
  it("an invalid position falls back to top-left", () => {
    const base = encodePng(solid(300, 300, 0, 0, 0, 255));
    const out = decodePng(overlayLogo(base, logoBuf, { position: "middle", scale: 0.1, margin: 0.05 }));
    expect(px(out, 17, 17)).toEqual([255, 0, 0, 255]); // top-left
  });
  it("throws (caller degrades) when the base is not a PNG", () => {
    expect(() => overlayLogo(Buffer.from("nope"), logoBuf, {})).toThrow(PngOverlayError);
  });
  it("POSITIONS exposes exactly the four corners", () => {
    expect([...POSITIONS].sort()).toEqual(["bottom-left", "bottom-right", "top-left", "top-right"]);
  });
  it("a WIDE lockup-shaped asset (3:1) keeps aspect → height is 1/3 of width, sits in the corner", () => {
    const wide = encodePng(solid(300, 100, 0, 200, 220, 255)); // 3:1, cyan-ish
    const base = encodePng(solid(800, 1400, 2, 8, 23, 255));   // 9:16-ish, short edge 800
    const out = decodePng(overlayLogo(base, wide, { position: "top-left", scale: 0.2, margin: 0.05 }));
    const m = Math.round(800 * 0.05);   // 40
    const w = Math.round(800 * 0.2);    // 160 wide
    const h = Math.round(100 * (w / 300)); // ~53 tall (aspect preserved, short)
    expect(px(out, m + 4, m + 4).slice(0, 3)).toEqual([0, 200, 220]); // top-left of the lockup painted
    expect(px(out, m + 4, m + h + 30)).toEqual([2, 8, 23, 255]);      // below the (short) lockup = clear
    expect(px(out, 400, 700)).toEqual([2, 8, 23, 255]);              // center clear
  });
});

// Contract test (2N) — the REAL ritsu logo asset (exercises adaptive PNG filters 0-4
// in decodePng end-to-end, which encodePng's filter-0 round-trip alone can't cover).
describe("contract: real ritsu-logo.png", () => {
  it("decodes the real asset to 1000x1000 RGBA with a transparent background", () => {
    const logo = decodePng(fs.readFileSync(REAL_LOGO));
    expect([logo.width, logo.height]).toEqual([1000, 1000]);
    let transparent = 0;
    for (let i = 3; i < logo.data.length; i += 4) if (logo.data[i] === 0) transparent++;
    expect(transparent).toBeGreaterThan(100000); // the mark sits on a large transparent field
  });
  it("overlays the real logo small in the top-left of a dark base without altering the center", () => {
    const base = encodePng(solid(768, 1376, 2, 8, 23, 255));
    const out = decodePng(overlayLogo(base, fs.readFileSync(REAL_LOGO), { position: "top-left", scale: 0.12, margin: 0.05 }));
    // the deep-slate center is untouched (logo is small + cornered)
    expect(px(out, 384, 688)).toEqual([2, 8, 23, 255]);
    // SOMETHING non-slate now exists in the top-left logo box (a teal/cyan blade pixel)
    const m = Math.round(768 * 0.05);
    const tw = Math.round(768 * 0.12);
    let painted = false;
    for (let y = m; y < m + tw && !painted; y++) {
      for (let x = m; x < m + tw; x++) {
        const [r, g, b] = px(out, x, y);
        if (!(r === 2 && g === 8 && b === 23)) { painted = true; break; }
      }
    }
    expect(painted).toBe(true);
  });
});
