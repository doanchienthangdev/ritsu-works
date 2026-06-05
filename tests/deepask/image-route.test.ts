import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const IR = require("../../scripts/deepask/image-route.cjs");

// ============================================================================
// All-Edge-Cases-Test. Units: scripts/deepask/image-route.cjs PURE functions —
// sizeToAr / shouldIllustrate / buildImagePlatformInvocation / parseImageResult /
// gcd. (The spawn of /image + the file move are side-effecting edges, documented in
// deepask/format §2.8 and smoke-tested via /image --dry-run out of band.)
//
// Phase 1B branches: size→ar reduce + bad input; illustrate mode×format gate;
// invocation composed-vs-not (style/art-style omission); JSON result parse + failure.
// ============================================================================

describe("deepask image-route — sizeToAr()", () => {
  it("reduces common gpt-image sizes to aspect ratios", () => {
    expect(IR.sizeToAr("2048x1152")).toBe("16:9");
    expect(IR.sizeToAr("1536x1024")).toBe("3:2");
    expect(IR.sizeToAr("1024x1536")).toBe("2:3");
    expect(IR.sizeToAr("1024x1024")).toBe("1:1");
  });
  it("accepts the unicode × separator", () => {
    expect(IR.sizeToAr("2048×1152")).toBe("16:9");
  });
  it("defaults to 16:9 on missing/empty/garbage/zero (never throws, never NaN)", () => {
    expect(IR.sizeToAr("")).toBe("16:9");
    expect(IR.sizeToAr(null)).toBe("16:9");
    expect(IR.sizeToAr("banana")).toBe("16:9");
    expect(IR.sizeToAr("0x0")).toBe("16:9");
  });
});

describe("deepask image-route — gcd()", () => {
  it("computes the greatest common divisor; never returns 0", () => {
    expect(IR.gcd(2048, 1152)).toBe(128);
    expect(IR.gcd(0, 0)).toBe(1);
    expect(IR.gcd(7, 0)).toBe(7);
  });
});

describe("deepask image-route — shouldIllustrate()", () => {
  it("off (default) → never illustrate (no spend)", () => {
    expect(IR.shouldIllustrate("html")).toBe(false);
    expect(IR.shouldIllustrate("html", { illustrate: "off" })).toBe(false);
  });
  it("on/hero/auto → illustrate only for illustrable rich formats", () => {
    for (const m of ["on", "hero", "auto"]) {
      expect(IR.shouldIllustrate("html", { illustrate: m })).toBe(true);
      expect(IR.shouldIllustrate("pdf", { illustrate: m })).toBe(true);
      expect(IR.shouldIllustrate("dashboard", { illustrate: m })).toBe(true);
    }
  });
  it("never illustrates non-illustrable formats even when on (charts/text/sheets)", () => {
    for (const f of ["xlsx", "inline", "text", "mermaid", "img-slide", "infographics", "chart"]) {
      expect(IR.shouldIllustrate(f, { illustrate: "on" })).toBe(false);
    }
  });
  it("handles null/garbage mode + format without throwing", () => {
    expect(IR.shouldIllustrate(null, { illustrate: "on" })).toBe(false);
    expect(IR.shouldIllustrate("html", { illustrate: null as any })).toBe(false);
    expect(IR.shouldIllustrate("html", {})).toBe(false);
  });
});

describe("deepask image-route — buildImagePlatformInvocation()", () => {
  it("targets the /image platform gen.cjs with --use + --count=1 + a cost breaker", () => {
    const a = IR.buildImagePlatformInvocation({ promptFile: "/tmp/p.txt", size: "2048x1152", quality: "medium", outDir: "/tmp/out" });
    expect(a[0]).toBe(IR.IMAGE_GEN);
    expect(IR.IMAGE_GEN).toContain("scripts/image/gen.cjs");
    expect(a).toContain("--prompt-file=/tmp/p.txt");
    expect(a).toContain("--use=gpt-image-2");
    expect(a).toContain("--ar=16:9");        // derived from size
    expect(a).toContain("--quality=medium");
    expect(a).toContain("--count=1");
    expect(a.some((s: string) => s.startsWith("--max-cost-usd="))).toBe(true);
    expect(a.some((s: string) => s.startsWith("--out=/tmp/out"))).toBe(true);
  });

  it("composed:true (image-compose authored) → does NOT pass --style/--art-style (no double-compose)", () => {
    const a = IR.buildImagePlatformInvocation({ prompt: "x", composed: true, style: "ritsu", artStyle: "swiss-international", outDir: "/tmp/o" });
    expect(a.some((s: string) => s.startsWith("--style="))).toBe(false);
    expect(a.some((s: string) => s.startsWith("--art-style="))).toBe(false);
  });

  it("composed:false (illustration path) → passes --style/--art-style for /image to compose", () => {
    const a = IR.buildImagePlatformInvocation({ prompt: "a hero", composed: false, style: "ritsu", artStyle: "swiss-international", outDir: "/tmp/o" });
    expect(a).toContain("--style=ritsu");
    expect(a).toContain("--art-style=swiss-international");
  });

  it("omits --style when 'plain'/absent (no spurious flag)", () => {
    expect(IR.buildImagePlatformInvocation({ prompt: "x", style: "plain", outDir: "/tmp/o" }).some((s: string) => s.startsWith("--style="))).toBe(false);
    expect(IR.buildImagePlatformInvocation({ prompt: "x", outDir: "/tmp/o" }).some((s: string) => s.startsWith("--style="))).toBe(false);
  });

  it("passes --ref/--mask (reference-guided gen — NEW for deepask via /image) + --dry-run", () => {
    const a = IR.buildImagePlatformInvocation({ prompt: "x", ref: "/tmp/brand.png", mask: "/tmp/m.png", dryRun: true, outDir: "/tmp/o" });
    expect(a).toContain("--ref=/tmp/brand.png");
    expect(a).toContain("--mask=/tmp/m.png");
    expect(a).toContain("--dry-run");
  });

  it("ensures --out ends with a trailing slash (so /image treats it as a directory)", () => {
    const a = IR.buildImagePlatformInvocation({ prompt: "x", outDir: "/tmp/nodir" });
    expect(a.some((s: string) => s === "--out=/tmp/nodir/")).toBe(true);
  });
});

describe("deepask image-route — parseImageResult()", () => {
  it("parses a success line → files + cost", () => {
    const r = IR.parseImageResult('{"ok":true,"outcome":"success","files":["/o/01.png"],"cost_usd":0.04,"warnings":[]}');
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe("success");
    expect(r.files).toEqual(["/o/01.png"]);
    expect(r.cost_usd).toBe(0.04);
  });
  it("parses a breaker_refusal / error line without throwing", () => {
    const r = IR.parseImageResult('{"ok":false,"outcome":"breaker_refusal","error":"over budget","cost_usd":0,"files":[]}');
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("breaker_refusal");
    expect(r.error).toBe("over budget");
  });
  it("takes the LAST JSON line (ignores leading log noise)", () => {
    const r = IR.parseImageResult('some log\nmore noise\n{"ok":true,"files":["/o/01.png"]}');
    expect(r.ok).toBe(true);
    expect(r.files).toEqual(["/o/01.png"]);
  });
  it("returns a clean parse_error on garbage (never throws, never NaN cost)", () => {
    const r = IR.parseImageResult("not json at all");
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("parse_error");
    expect(r.files).toEqual([]);
    expect(r.cost_usd).toBe(0);
    const r2 = IR.parseImageResult("");
    expect(r2.ok).toBe(false);
  });
});
