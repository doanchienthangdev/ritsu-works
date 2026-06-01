import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS
const { resolveStyle } = require("../../scripts/design-system/resolve-style.cjs");
// @ts-ignore
const { findSystem } = require("../../scripts/design-system/registry-io.cjs");
// @ts-ignore
const { parseDesignMd } = require("../../scripts/design-system/parse-design-md.cjs");

// All-Edge-Cases-Test (global CLAUDE.md) — INTEGRATION test for the installed `ritsu` seed (Sprint 2).
// Unlike the unit suites (fixtures + mocks), this exercises the REAL committed files end-to-end:
//   knowledge/design-systems.yaml + 00-core/design-system/ritsu/DESIGN.md + assets + previews.
// Phase 1: the seed-install acceptance — resolveStyle('ritsu') must return styled w/ real tokens, NO mocks.
// Phase 2N contract: the resolver consumes the real registry-io + parse-design-md against committed Tier-1 files.
// This is the falsifiable guard that Sprint 2 actually installed the owned `ritsu` system correctly.

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const RITSU_DIR = path.join(REPO_ROOT, "00-core", "design-system", "ritsu");

describe("ritsu seed (installed, Sprint 2) — integration", () => {
  it("registry lists ritsu as origin:owned, status:installed", () => {
    const e = findSystem("ritsu");
    expect(e).not.toBeNull();
    expect(e.origin).toBe("owned");
    expect(e.status).toBe("installed");
    expect(e.path).toBe("00-core/design-system/ritsu/DESIGN.md");
  });

  it("the owned DESIGN.md + assets + previews are physically installed", () => {
    expect(fs.existsSync(path.join(RITSU_DIR, "DESIGN.md"))).toBe(true);
    expect(fs.existsSync(path.join(RITSU_DIR, "preview.html"))).toBe(true);
    expect(fs.existsSync(path.join(RITSU_DIR, "preview-dark.html"))).toBe(true);
    for (const a of ["ritsu-logo.png", "ritsu-mark.png", "favicon.ico"]) {
      expect(fs.existsSync(path.join(RITSU_DIR, "assets", a))).toBe(true);
    }
  });

  it("resolveStyle('ritsu') resolves to styled with real Electric-Cyan tokens (no mocks)", () => {
    const r = resolveStyle("ritsu", { interactive: false });
    expect(r.mode).toBe("styled");
    expect(r.origin).toBe("owned");
    expect(r.tokens.name).toBe("Ritsu");
    expect(r.tokens.colors.primary).toBe("#0ABCD0");
    expect(r.tokens.colors.accent).toBe("#12A58D");
    expect(r.tokens.rounded.lg).toBe("8px");
    expect(r.previewPath).not.toBeNull();
    expect(r.previewPath.endsWith("preview.html")).toBe(true);
  });

  it("the installed DESIGN.md parses cleanly (refs resolved, sRGB valid)", () => {
    const ds = parseDesignMd(fs.readFileSync(path.join(RITSU_DIR, "DESIGN.md"), "utf-8"));
    // {colors.primary} ref inside components.button resolves to the literal hex
    expect(ds.components.button.backgroundColor).toBe("#0ABCD0");
    // no unresolved {refs} remain anywhere
    expect(JSON.stringify(ds.tokens)).not.toMatch(/\{[a-zA-Z0-9_.]+\}/);
    expect(ds.body).toContain("Design System");
  });

  it("resolveStyle('ritsu') is interactive-agnostic once installed (styled in both modes)", () => {
    expect(resolveStyle("ritsu", { interactive: true }).mode).toBe("styled");
    expect(resolveStyle("ritsu", { interactive: false }).mode).toBe("styled");
  });
});
