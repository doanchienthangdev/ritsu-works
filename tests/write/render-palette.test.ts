// tests/write/render-palette.test.ts
// Regression guard for the `muted` palette slot in scripts/write/render.py.
//
// THE BUG (fixed): load_palette() filled the `muted` slot from design.load_tokens()
// with cmap["muted"] = ["muted", "secondary"]. But in a design.py token set `muted`
// is the near-WHITE SURFACE tint (claude: #F1ECE2) while `mutedForeground` (#6B665C)
// is the readable body gray. page_css() uses p['muted'] as the TEXT color for h3,
// blockquote, and .byline — so every `--style` PDF/HTML rendered subheadings + quotes
// in near-invisible beige-on-white. It only looked fine when design.py import threw
// and the Ritsu FALLBACK dict (readable #5B6B76) was used.
//
// THE INVARIANT this file pins: on EVERY resolution path (bundled style, repo design
// system, missing-style fallback, design.py-import failure) the resolved `muted` slot
// is a readable FOREGROUND (dark on the near-white page), never a surface tint — and
// page_css() never emits the surface tint as a text color.
//
// load_palette/page_css are pure (no weasyprint/markdown needed), so we shell a resolved
// python3 to exercise the REAL design.load_tokens() (a contract test — actual upstream
// output, not a mock). Guarded: skip-if-no-python so non-python envs stay green, mirroring
// tests/dataviz/flow-render.test.ts. Locally (`npx vitest run tests/write`) it runs as a gate.
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("node:path");

// cwd-independent repo root: anchor off the real render.cjs path, not process.cwd().
const RENDER_CJS = require.resolve("../../scripts/write/render.cjs");
const REPO_ROOT = path.resolve(path.dirname(RENDER_CJS), "..", "..");

// Single python program used for BOTH interpreter resolution and per-style probes.
// argv: [-c, <import_root>, <style>, <load_root>]  → prints one line of JSON.
//   import_root — where render.py lives (always the real REPO_ROOT, so render imports)
//   load_root   — the repo_root passed INTO load_palette (a bogus path exercises the
//                 design.py-import-failure → FALLBACK branch without breaking the import)
const PY_PROBE = `
import sys, os, json
import_root, style, load_root = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, os.path.join(import_root, "scripts", "write"))
import render
pal, warns = render.load_palette(style, load_root)
print(json.dumps({
    "muted": pal["muted"], "ink": pal["ink"], "accent": pal["accent"],
    "css": render.page_css(pal), "warns": warns,
    "fallback_muted": render.FALLBACK["muted"],
}))
`;

interface Probe {
  muted: string; ink: string; accent: string;
  css: string; warns: string[]; fallback_muted: string;
}

function runProbe(py: string, style: string, loadRoot: string = REPO_ROOT): Probe | null {
  // No shell → multiline -c program + args pass literally (no escaping needed).
  // render always imports from the real REPO_ROOT; loadRoot is what load_palette receives.
  const r = spawnSync(py, ["-c", PY_PROBE, REPO_ROOT, style, loadRoot], { encoding: "utf8", timeout: 30000 });
  if (r.status !== 0 || !r.stdout) return null;
  const line = r.stdout.trim().split("\n").pop() || "";
  try { return JSON.parse(line) as Probe; } catch { return null; }
}

// Resolve the first interpreter that can import render + design and produce the JSON.
function resolvePy(): string | null {
  const cands = [
    process.env.WRITE_PY, process.env.TRANSLATE_PY,
    "/opt/anaconda3/bin/python3", "/opt/homebrew/bin/python3", "python3", "python",
  ].filter(Boolean) as string[];
  for (const py of cands) {
    const probe = runProbe(py, "claude");
    if (probe && typeof probe.muted === "string") return py;
  }
  return null;
}
const PY = resolvePy();

// WCAG relative luminance (0 = black … 1 = white). A readable foreground on a near-white
// page is dark (low luminance); a surface tint like #F1ECE2 is light (~0.84).
function relLuminance(hex: string): number {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return NaN;
  const n = parseInt(m[1], 16);
  const chan = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * chan[0] + 0.7152 * chan[1] + 0.0722 * chan[2];
}
// Midpoint that cleanly separates readable foregrounds (claude #6B665C ≈ 0.13,
// ritsu slate ≈ 0.18, fallback #5B6B76 ≈ 0.15) from the surface tint #F1ECE2 ≈ 0.84.
const FOREGROUND_MAX_LUM = 0.5;
const SURFACE_TINT = "#F1ECE2"; // claude `muted` — the wrong value the bug used as text.

// Pull the colors page_css() actually emits for the muted-consuming rules.
function h3Color(css: string): string | null {
  // the SPECIFIC h3 rule (the cascade winner) carries `font-size: 12.5pt; … color: <muted>;`
  const m = /h3 \{ font-size: 12\.5pt;[^}]*color:\s*([^;]+);/.exec(css);
  return m ? m[1].trim() : null;
}
function blockquoteColor(css: string): string | null {
  const m = /blockquote \{[^}]*color:\s*([^;}]+)/.exec(css);
  return m ? m[1].trim() : null;
}

(PY ? describe : describe.skip)("render.py load_palette — muted slot is a readable foreground (regression: beige-on-white h3/blockquote)", () => {
  describe("specification conformance — claude (the canonical example from the bug report)", () => {
    const p = runProbe(PY as string, "claude")!;

    it("resolves the muted slot to mutedForeground #6B665C, not the surface tint #F1ECE2", () => {
      expect(p.muted.toUpperCase()).toBe("#6B665C");
      expect(p.muted.toUpperCase()).not.toBe(SURFACE_TINT);
    });

    it("page_css emits the readable foreground for the h3 subheading color", () => {
      expect(h3Color(p.css)?.toUpperCase()).toBe("#6B665C");
    });

    it("page_css emits the readable foreground for the blockquote color", () => {
      expect(blockquoteColor(p.css)?.toUpperCase()).toBe("#6B665C");
    });

    it("the surface tint #F1ECE2 never appears as a color anywhere in page_css", () => {
      // catches h3 + blockquote + .byline in one shot — no muted-as-surface leak.
      expect(p.css.toUpperCase()).not.toContain(SURFACE_TINT);
    });
  });

  describe("contract — a repo design system (ritsu) resolves through the REAL design.load_tokens", () => {
    const p = runProbe(PY as string, "ritsu")!;

    it("muted is a readable foreground (low luminance), not a surface tint", () => {
      expect(relLuminance(p.muted)).toBeLessThan(FOREGROUND_MAX_LUM);
      expect(p.muted.toUpperCase()).not.toBe(SURFACE_TINT);
    });

    it("h3 and blockquote share that readable foreground", () => {
      expect(blockquoteColor(p.css)).toBe(p.muted);
      expect(h3Color(p.css)).toBe(p.muted);
    });
  });

  describe("dependency degradation — every resolution path keeps muted readable", () => {
    it("a missing style falls back to bundled claude → still readable, never the surface tint", () => {
      const p = runProbe(PY as string, "nonexistent-style-xyz")!;
      expect(relLuminance(p.muted)).toBeLessThan(FOREGROUND_MAX_LUM);
      expect(p.muted.toUpperCase()).not.toBe(SURFACE_TINT);
    });

    it("when design.py import fails (bogus repo root) the Ritsu FALLBACK muted is used and is readable", () => {
      const p = runProbe(PY as string, "claude", "/nonexistent/repo/root/xyz")!;
      // except-branch wiring: warns must record the fallback, and muted is the readable FALLBACK gray.
      expect(p.warns.join(" ")).toMatch(/fallback/i);
      expect(p.muted.toUpperCase()).toBe("#5B6B76");
      expect(relLuminance(p.muted)).toBeLessThan(FOREGROUND_MAX_LUM);
    });

    it("the FALLBACK dict's own muted is a readable foreground (the only path that looked fine pre-fix)", () => {
      const p = runProbe(PY as string, "claude")!;
      expect(relLuminance(p.fallback_muted)).toBeLessThan(FOREGROUND_MAX_LUM);
      expect(p.fallback_muted.toUpperCase()).not.toBe(SURFACE_TINT);
    });
  });

  describe("luminance helper sanity (so the invariant above is meaningful)", () => {
    it("classifies the readable gray as foreground and the surface tint as not-foreground", () => {
      expect(relLuminance("#6B665C")).toBeLessThan(FOREGROUND_MAX_LUM); // ~0.13
      expect(relLuminance(SURFACE_TINT)).toBeGreaterThan(FOREGROUND_MAX_LUM); // ~0.84
    });
  });
});
