import { describe, it, expect, beforeAll } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  loadLibrary,
  parseParamFile,
  getParam,
  listParams,
  searchValues,
  valuesOf,
  requiredTiers,
} from "../../scripts/prompt/lib/library.cjs";

import {
  VALID_OUTPUTS,
  slugify,
  fenceFor,
  validatePayload,
  metaLine,
  labelFor,
  renderDefault,
  renderMarkdown,
  renderArtifact,
  render,
} from "../../scripts/prompt/render.cjs";

import { checkDirections, REQUIRED_ANCHORS, REQUIRED_BANNED } from "../../scripts/cross-tier/validate-prompt-directions.cjs";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const yaml = require("js-yaml");

// ── library.cjs ─────────────────────────────────────────────────────────────
describe("library.cjs", () => {
  let lib: any;
  beforeAll(() => {
    lib = loadLibrary(REPO_ROOT);
  });

  describe("happy path", () => {
    it("should load every parameter file in the Tier-1 library", () => {
      expect(lib.totals.params).toBe(28);
    });

    it("should preserve every value across the library", () => {
      expect(lib.totals.values).toBe(2264);
    });

    it("should track how many values came from the source catalog", () => {
      expect(lib.totals.fromCatalog).toBeGreaterThan(600);
      expect(lib.totals.fromCatalog).toBeLessThan(lib.totals.values);
    });

    it("should order parameters by their declared order, starting at 1", () => {
      const orders = lib.params.map((p: any) => p.order);
      expect(orders[0]).toBe(1);
      expect(orders).toEqual([...orders].sort((a: number, b: number) => a - b));
    });

    it("should give every parameter a non-empty key, labels and group", () => {
      for (const p of lib.params) {
        expect(p.key.length, `${p.file} key`).toBeGreaterThan(0);
        expect(p.labelEn.length, `${p.file} labelEn`).toBeGreaterThan(0);
        expect(p.labelVi.length, `${p.file} labelVi`).toBeGreaterThan(0);
        expect("ABCDEFG").toContain(p.group);
      }
    });

    it("should give every parameter at least one value", () => {
      for (const p of lib.params) expect(p.valueCount, `${p.file}`).toBeGreaterThan(0);
    });

    it("should carry the two parameters that were EMPTY in the source catalog", () => {
      // The whole reason this library exists: Facial Expression and Gesture were
      // declared but had zero values upstream.
      expect(getParam(lib, "facial-expression").valueCount).toBeGreaterThan(50);
      expect(getParam(lib, "gesture").valueCount).toBeGreaterThan(50);
    });
  });

  describe("parseParamFile — input boundaries", () => {
    it("should return null when the header comment is missing", () => {
      expect(parseParamFile("# Just a heading\n\n| 1 | a | b | L |\n", "x.md")).toBe(null);
    });

    it("should return null for an empty file", () => {
      expect(parseParamFile("", "x.md")).toBe(null);
    });

    it("should parse a minimal well-formed file", () => {
      const txt = [
        "<!-- param: demo | order: 99 | label_en: Demo | label_vi: Thử | group: A | source: new -->",
        "",
        "## A. Section one (Nhóm một)",
        "",
        "| # | Value (EN) | Ý nghĩa (VI) | Src |",
        "|---|---|---|---|",
        "| 1 | Alpha | Nghĩa alpha | L |",
        "| 2 | Beta | Nghĩa beta | + |",
        "",
      ].join("\n");
      const rec = parseParamFile(txt, "99-demo.md");
      expect(rec.key).toBe("demo");
      expect(rec.order).toBe(99);
      expect(rec.valueCount).toBe(2);
      expect(rec.fromCatalog).toBe(1);
      expect(rec.sections[0].rows[0].value).toBe("Alpha");
    });

    it("should ignore a section that contains no table rows", () => {
      const txt = [
        "<!-- param: demo | order: 99 | label_en: Demo | label_vi: Thử | group: A | source: new -->",
        "## A. Empty section (Rỗng)",
        "some prose, no table",
      ].join("\n");
      expect(parseParamFile(txt, "99-demo.md").sections).toEqual([]);
    });
  });

  describe("loadLibrary — error handling", () => {
    it("should throw a named error when the library directory is absent", () => {
      expect(() => loadLibrary(REPO_ROOT, "no/such/library")).toThrow(/prompt library not found/);
    });
  });

  describe("getParam", () => {
    it("should find a parameter by key", () => {
      expect(getParam(lib, "lighting").order).toBe(19);
    });

    it("should find a parameter by order number", () => {
      expect(getParam(lib, 19).key).toBe("lighting");
    });

    it("should return null for an unknown key", () => {
      expect(getParam(lib, "telepathy")).toBe(null);
    });

    it("should return null for an out-of-range order", () => {
      expect(getParam(lib, 999)).toBe(null);
    });
  });

  describe("searchValues", () => {
    it("should find a value by its English text", () => {
      const hits = searchValues(lib, "golden hour");
      expect(hits.length).toBeGreaterThan(0);
      expect(hits.some((h: any) => h.param === "lighting" || h.param === "time-of-day")).toBe(true);
    });

    it("should search case-insensitively", () => {
      expect(searchValues(lib, "GOLDEN HOUR").length).toBe(searchValues(lib, "golden hour").length);
    });

    it("should also match the Vietnamese meaning column", () => {
      expect(searchValues(lib, "giờ vàng").length).toBeGreaterThan(0);
    });

    it("should return an empty array when nothing matches", () => {
      expect(searchValues(lib, "zzzzqqqq-no-such-value")).toEqual([]);
    });

    it("should respect the limit", () => {
      expect(searchValues(lib, "a", 5).length).toBe(5);
    });
  });

  describe("valuesOf", () => {
    it("should flatten every value of a parameter with its section label", () => {
      const vals = valuesOf(lib, "lighting");
      expect(vals.length).toBe(getParam(lib, "lighting").valueCount);
      expect(vals[0].section.length).toBeGreaterThan(0);
    });

    it("should return an empty array for an unknown parameter", () => {
      expect(valuesOf(lib, "telepathy")).toEqual([]);
    });
  });

  describe("requiredTiers", () => {
    it("should sort every parameter into exactly one tier", () => {
      const t = requiredTiers(lib);
      expect(t.always.length + t.recommended.length + t.optional.length).toBe(lib.totals.params);
    });

    it("should mark subject, environment, camera, lighting and mood as always-required", () => {
      const t = requiredTiers(lib);
      for (const k of ["subject", "environment", "camera", "lighting", "mood"]) {
        expect(t.always, `${k} should be always-required`).toContain(k);
      }
    });

    it("should mark style as optional — the framework says do not over-style", () => {
      expect(requiredTiers(lib).optional).toContain("style");
    });
  });
});

// ── render.cjs ──────────────────────────────────────────────────────────────
describe("render.cjs", () => {
  const payload = {
    direction: "image",
    verb: "build",
    mode: "text",
    model: "gpt-image-2",
    ar: "9:16",
    realism: "max",
    input: "nữ influencer fitness ở gym",
    rationale: "UGC cần nền không kiểm soát.",
    prompts: [{ label: "Prompt", text: "A candid mirror selfie …, photorealism", params: { mood: ["quiet", "determined"] } }],
  };

  describe("slugify", () => {
    it("should strip Vietnamese diacritics", () => {
      expect(slugify("nữ influencer ở gym")).toBe("nu-influencer-o-gym");
    });

    it("should map đ to d", () => {
      expect(slugify("Đường phố Hà Nội")).toBe("duong-pho-ha-noi");
    });

    it("should fall back to a stable slug for empty input", () => {
      expect(slugify("")).toBe("prompt");
      expect(slugify(null)).toBe("prompt");
    });

    it("should collapse punctuation runs into single hyphens without leading or trailing ones", () => {
      expect(slugify("  !!a -- b!!  ")).toBe("a-b");
    });

    it("should truncate to the requested maximum", () => {
      expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(48);
    });
  });

  describe("fenceFor", () => {
    it("should use a three-backtick fence for ordinary text", () => {
      expect(fenceFor("plain").open).toBe("```");
    });

    it("should widen the fence past any backtick run inside the text", () => {
      expect(fenceFor("a ``` b").close).toBe("````");
      expect(fenceFor("a ````` b").close).toBe("``````");
    });

    it("should attach the language tag to the opening fence only", () => {
      const f = fenceFor("x", "json");
      expect(f.open).toBe("```json");
      expect(f.close).toBe("```");
    });
  });

  describe("validatePayload", () => {
    it("should accept a well-formed payload", () => {
      expect(validatePayload(payload)).toEqual([]);
    });

    it("should reject a null payload", () => {
      expect(validatePayload(null).length).toBeGreaterThan(0);
    });

    it("should reject an array payload", () => {
      expect(validatePayload([] as any)[0]).toContain("must be an object");
    });

    it("should require a direction", () => {
      const { direction, ...rest } = payload as any;
      expect(validatePayload(rest).some((e: string) => e.includes("direction is required"))).toBe(true);
    });

    it("should reject an empty prompts array", () => {
      expect(validatePayload({ ...payload, prompts: [] }).some((e: string) => e.includes("non-empty array"))).toBe(true);
    });

    it("should reject a prompt with blank text", () => {
      expect(validatePayload({ ...payload, prompts: [{ text: "   " }] }).some((e: string) => e.includes("text is required"))).toBe(true);
    });
  });

  describe("metaLine and labelFor", () => {
    it("should include every set axis in the meta line", () => {
      const m = metaLine(payload);
      for (const bit of ["image", "build", "text", "gpt-image-2", "9:16", "max"]) expect(m).toContain(bit);
    });

    it("should label a single prompt without a number", () => {
      expect(labelFor({}, 0, 1)).toBe("Prompt");
    });

    it("should number prompts when there is more than one", () => {
      expect(labelFor({}, 2, 3)).toBe("Prompt 3");
    });

    it("should prefer an explicit label", () => {
      expect(labelFor({ label: "Variant 2 — golden hour" }, 1, 3)).toBe("Variant 2 — golden hour");
    });
  });

  describe("renderDefault", () => {
    it("should wrap the prompt in a fenced block", () => {
      const out = renderDefault(payload);
      expect(out).toContain("```text");
      expect(out).toContain("photorealism");
    });

    it("should tag json mode blocks as json so they highlight correctly", () => {
      expect(renderDefault({ ...payload, mode: "json" })).toContain("```json");
    });

    it("should print the rationale", () => {
      expect(renderDefault(payload)).toContain("UGC cần nền không kiểm soát.");
    });

    it("should print warnings when present", () => {
      expect(renderDefault({ ...payload, warnings: ["w1"] })).toContain("w1");
    });

    it("should print the change list for enhance runs", () => {
      expect(renderDefault({ ...payload, changes: ["– bỏ: hyper-detailed"] })).toContain("hyper-detailed");
    });

    it("should omit optional sections entirely when absent", () => {
      const out = renderDefault({ direction: "image", prompts: [{ text: "x" }] });
      expect(out).not.toContain("Cảnh báo");
      expect(out).not.toContain("Vì sao");
    });
  });

  describe("renderMarkdown", () => {
    it("should emit an index table when there is more than one prompt", () => {
      const out = renderMarkdown({ ...payload, prompts: [{ text: "a" }, { text: "b" }] });
      expect(out).toContain("| # | Biến thể |");
    });

    it("should omit the index table for a single prompt", () => {
      expect(renderMarkdown(payload)).not.toContain("| # | Biến thể |");
    });

    it("should render the parameter table in a collapsed details block", () => {
      const out = renderMarkdown(payload);
      expect(out).toContain("<details><summary>Tham số đã chọn</summary>");
      expect(out).toContain("quiet · determined");
    });

    it("should escape a pipe inside a parameter value so the table survives", () => {
      const out = renderMarkdown({ ...payload, prompts: [{ text: "x", params: { note: "a|b" } }] });
      expect(out).toContain("a\\|b");
    });

    it("should skip empty parameter values", () => {
      const out = renderMarkdown({ ...payload, prompts: [{ text: "x", params: { a: "", b: null, c: "keep" } }] });
      expect(out).toContain("`c`");
      expect(out).not.toContain("`a`");
    });
  });

  describe("renderArtifact", () => {
    it("should give every prompt its own Copy button", () => {
      const out = renderArtifact({ ...payload, prompts: [{ text: "a" }, { text: "b" }, { text: "c" }] });
      expect((out.match(/class="copy"/g) || []).length).toBe(3);
    });

    it("should escape HTML in the prompt so markup cannot break the page", () => {
      const out = renderArtifact({ ...payload, prompts: [{ text: '<script>alert(1)</script>' }] });
      expect(out).toContain("&lt;script&gt;");
      expect(out).not.toContain("<script>alert(1)</script>");
    });

    it("should escape HTML in the label and the rationale", () => {
      const out = renderArtifact({ ...payload, rationale: "<b>x</b>", prompts: [{ label: "<i>L</i>", text: "t" }] });
      expect(out).toContain("&lt;b&gt;x&lt;/b&gt;");
      expect(out).toContain("&lt;i&gt;L&lt;/i&gt;");
    });

    it("should carry a title tag", () => {
      expect(renderArtifact(payload)).toMatch(/^<title>/);
    });

    it("should style for both colour schemes and honour a data-theme override", () => {
      const out = renderArtifact(payload);
      expect(out).toContain("prefers-color-scheme: dark");
      expect(out).toContain('[data-theme="dark"]');
      expect(out).toContain('[data-theme="light"]');
    });

    it("should scroll long prompts inside their own container rather than the page", () => {
      expect(renderArtifact(payload)).toContain("overflow-x:auto");
    });

    it("should provide a clipboard fallback for browsers without the async API", () => {
      expect(renderArtifact(payload)).toContain("execCommand");
    });
  });

  describe("render dispatch", () => {
    it("should route each registered output to its renderer", () => {
      expect(render(payload, "markdown")).toContain("# Prompts");
      expect(render(payload, "artifact")).toContain("<title>");
      expect(render(payload, "default")).toContain("```text");
    });

    it("should fall back to the terminal renderer for an unknown output", () => {
      expect(render(payload, "smoke-signals")).toContain("```text");
    });

    it("should expose exactly the three built output surfaces", () => {
      expect(VALID_OUTPUTS).toEqual(["default", "markdown", "artifact"]);
    });
  });
});

// ── validate-prompt-directions.cjs ──────────────────────────────────────────
describe("validate-prompt-directions.cjs", () => {
  const load = () => yaml.load(fs.readFileSync(path.join(REPO_ROOT, "knowledge/prompt-directions.yaml"), "utf-8"));

  it("should pass against the real registry on disk", () => {
    expect(checkDirections(load(), REPO_ROOT)).toEqual([]);
  });

  it("should reject a non-mapping root", () => {
    expect(checkDirections([] as any, REPO_ROOT)[0]).toContain("must be a mapping");
  });

  it("should reject a registry missing a pinned realism anchor", () => {
    const doc = load();
    doc.realism_anchors = doc.realism_anchors.filter((a: any) => a.id !== "situational-lighting");
    const errs = checkDirections(doc, REPO_ROOT);
    expect(errs.some((e: string) => e.includes("situational-lighting"))).toBe(true);
  });

  it("should reject a registry missing a banned phrase the framework names", () => {
    const doc = load();
    doc.banned_phrases = doc.banned_phrases.filter((p: string) => p !== "hyper-detailed");
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("hyper-detailed"))).toBe(true);
  });

  it("should reject an installed direction whose skill is not on disk", () => {
    const doc = load();
    doc.directions[0].skill = "06-ai-ops/skills/prompt/directions/ghost/SKILL.md";
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("skill not found on disk"))).toBe(true);
  });

  it("should reject a param_count that drifted from the files on disk", () => {
    const doc = load();
    doc.directions[0].param_count = 99;
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("library drifted"))).toBe(true);
  });

  it("should reject a direction advertising an output that is not built", () => {
    const doc = load();
    doc.directions[0].supported_outputs.push("pdf");
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("registered-not-built"))).toBe(true);
  });

  it("should reject a direction advertising an unregistered mode", () => {
    const doc = load();
    doc.directions[0].supported_modes.push("telepathy");
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("not a registered mode"))).toBe(true);
  });

  it("should reject two default models on one direction", () => {
    const doc = load();
    doc.directions[0].models[1].default = true;
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("exactly one default"))).toBe(true);
  });

  it("should reject a prose-plus-params model with no param_flags", () => {
    const doc = load();
    const mj = doc.directions[0].models.find((m: any) => m.id === "midjourney");
    delete mj.param_flags;
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("requires param_flags"))).toBe(true);
  });

  it("should reject a realism_keyword with no keyword_position", () => {
    const doc = load();
    delete doc.directions[0].models[0].keyword_position;
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("keyword_position"))).toBe(true);
  });

  it("should reject a registered-not-built direction with no stated reason", () => {
    const doc = load();
    delete doc.directions[1].reason_not_built;
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("reason_not_built"))).toBe(true);
  });

  it("should reject duplicate direction ids", () => {
    const doc = load();
    doc.directions.push({ ...doc.directions[1] });
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("duplicate id"))).toBe(true);
  });

  it("should reject an axis with no default", () => {
    const doc = load();
    delete doc.modes.find((m: any) => m.default).default;
    expect(checkDirections(doc, REPO_ROOT).some((e: string) => e.includes("exactly one default"))).toBe(true);
  });

  it("should pin all three anchors and all four named banned phrases", () => {
    expect(REQUIRED_ANCHORS).toEqual(["skin", "situational-lighting", "camera-background"]);
    expect(REQUIRED_BANNED).toEqual(["cinematic masterpiece", "hyper-detailed", "ultra-glossy", "perfect lighting"]);
  });
});
