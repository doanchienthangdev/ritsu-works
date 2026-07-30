import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// vitest supports named imports from CommonJS module.exports.
import {
  UNIVERSAL_SLOTS,
  SLOT_CODE_PREFIX,
  HANDOFF_CAPABLE_SLOTS,
  KNOWN_ARTIFACTS,
  KNOWN_TARGETS,
  NARRATION_TARGET_LUFS,
  NARRATION_MAX_TRUE_PEAK,
  GATE_DEFAULTS,
  VALID_FPS,
  RESOLUTION_RE,
  SLUG_RE,
  assetCode,
  inForbiddenZoomBand,
} from "../../scripts/video/lib/params.cjs";
import { lint, tokenize, parseCss, selectorMatches } from "../../scripts/video/gates/lint-stage-video.cjs";
import { parseArgs as vrParseArgs, loadTypeGates } from "../../scripts/video/gates/verify-render.cjs";
import { parseArgs as clParseArgs, loadTypeNarration } from "../../scripts/video/gates/check-loudness.cjs";
import { resolveElevenVoiceId, catalogFor, ELEVENLABS_VOICES } from "../../scripts/voice/lib/voices.cjs";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const VALIDATOR = path.join(REPO_ROOT, "scripts", "cross-tier", "validate-video-types.cjs");
const REGISTRY = path.join(REPO_ROOT, "knowledge", "video-types.yaml");

/** Run the L2 validator against a (possibly mutated) registry; returns {code, out}. */
function runValidator(): { code: number; out: string } {
  try {
    const out = execFileSync("node", [VALIDATOR], { encoding: "utf-8", cwd: REPO_ROOT });
    return { code: 0, out };
  } catch (e: any) {
    return { code: e.status ?? 1, out: `${e.stdout || ""}${e.stderr || ""}` };
  }
}

/** Mutate the real registry, run the validator, always restore. */
function withMutatedRegistry(mutate: (src: string) => string, fn: (r: { code: number; out: string }) => void) {
  const original = fs.readFileSync(REGISTRY, "utf-8");
  try {
    fs.writeFileSync(REGISTRY, mutate(original), "utf-8");
    fn(runValidator());
  } finally {
    fs.writeFileSync(REGISTRY, original, "utf-8");
  }
}

// ===========================================================================
describe("video/lib/params — the universal vocabulary", () => {
  describe("happy path", () => {
    it("should expose a non-empty, unique slot vocabulary", () => {
      expect(UNIVERSAL_SLOTS.length).toBeGreaterThan(0);
      expect(new Set(UNIVERSAL_SLOTS).size).toBe(UNIVERSAL_SLOTS.length);
    });

    it("should give every slot an asset-code prefix", () => {
      for (const slot of UNIVERSAL_SLOTS) {
        expect(SLOT_CODE_PREFIX[slot], `slot ${slot} has no code prefix`).toBeTruthy();
      }
    });

    it("should keep asset-code prefixes unique so codes cannot collide", () => {
      const prefixes = UNIVERSAL_SLOTS.map((s: string) => SLOT_CODE_PREFIX[s]);
      expect(new Set(prefixes).size).toBe(prefixes.length);
    });

    it("should only allow hand-off for slots that exist", () => {
      for (const s of HANDOFF_CAPABLE_SLOTS) expect(UNIVERSAL_SLOTS).toContain(s);
    });
  });

  describe("assetCode", () => {
    it("should zero-pad the ordinal to two digits", () => {
      expect(assetCode("screen", 1, 4)).toBe("SC-01-b4");
    });

    it("should not truncate an ordinal already >= 10", () => {
      expect(assetCode("footage", 13, 10)).toBe("LA-13-b10");
    });

    it("should throw a named error for an unknown slot kind", () => {
      expect(() => assetCode("bogus", 1, 1)).toThrowError(/unknown slot kind: bogus/);
    });
  });

  describe("inForbiddenZoomBand — lesson #5 boundaries", () => {
    const band = [1.1, 1.25];

    it("should reject a zoom strictly inside the band", () => {
      expect(inForbiddenZoomBand(1.18, band)).toBe(true);
    });

    it("should allow the exact lower bound (boundary is safe, band is exclusive)", () => {
      expect(inForbiddenZoomBand(1.1, band)).toBe(false);
    });

    it("should allow the exact upper bound", () => {
      expect(inForbiddenZoomBand(1.25, band)).toBe(false);
    });

    it("should allow a whole-app framing below the band", () => {
      expect(inForbiddenZoomBand(1.0, band)).toBe(false);
    });

    it("should allow a deep push-in above the band", () => {
      expect(inForbiddenZoomBand(1.38, band)).toBe(false);
    });

    it("should return false for a malformed band rather than throwing", () => {
      expect(inForbiddenZoomBand(1.18, [] as any)).toBe(false);
      expect(inForbiddenZoomBand(1.18, undefined as any)).toBe(false);
      expect(inForbiddenZoomBand(1.18, [1.1] as any)).toBe(false);
    });
  });

  describe("pinned non-negotiables", () => {
    it("should pin the loudness target that the reference production required", () => {
      expect(NARRATION_TARGET_LUFS).toBe(-16);
      expect(NARRATION_MAX_TRUE_PEAK).toBe(-1.5);
    });

    it("should default the render gates to the empirically derived values", () => {
      // 58MB/175s = 2.6 Mbps broken vs 93MB/175s = 4.3 Mbps correct → floor between them.
      expect(GATE_DEFAULTS.min_bitrate_kbps).toBeGreaterThan(2600);
      expect(GATE_DEFAULTS.min_bitrate_kbps).toBeLessThan(4300);
      // content std-dev ~19.4 vs flat ~3.8 → threshold must separate them.
      expect(GATE_DEFAULTS.min_region_stddev).toBeGreaterThan(3.8);
      expect(GATE_DEFAULTS.min_region_stddev).toBeLessThan(19.35);
      expect(GATE_DEFAULTS.require_filmstrip).toBe(true);
    });
  });

  describe("regex vocabulary", () => {
    it.each([
      ["1920x1080", true],
      ["1080x1920", true],
      ["19201080", false],
      ["1920X1080", false],
      ["", false],
    ])("RESOLUTION_RE(%s) → %s", (v, ok) => {
      expect(RESOLUTION_RE.test(v as string)).toBe(ok);
    });

    it.each([
      ["explainer", true],
      ["social-short", true],
      ["Explainer", false],
      ["1explainer", false],
      ["-explainer", false],
    ])("SLUG_RE(%s) → %s", (v, ok) => {
      expect(SLUG_RE.test(v as string)).toBe(ok);
    });
  });
});

// ===========================================================================
describe("validate-video-types — the L2 gate that pins the lessons", () => {
  describe("happy path", () => {
    it("should pass against the committed registry", () => {
      const r = runValidator();
      expect(r.out).toContain("[PASS]");
      expect(r.code).toBe(0);
    });
  });

  describe("pinned invariants (regression: a future line must not opt out)", () => {
    it("should reject a type that relaxes the loudness target", () => {
      withMutatedRegistry(
        (s) => s.replace("target_lufs: -16", "target_lufs: -14"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/target_lufs must be -16/);
        },
      );
    });

    it("should reject a type that raises true peak above the ceiling", () => {
      withMutatedRegistry(
        (s) => s.replace("true_peak: -1.5", "true_peak: -0.5"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/true_peak must be ≤ -1\.5/);
        },
      );
    });

    it("should reject an installed type that turns off the filmstrip requirement", () => {
      withMutatedRegistry(
        (s) => s.replace("require_filmstrip: true", "require_filmstrip: false"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/require_filmstrip: true/);
        },
      );
    });
  });

  describe("vocabulary drift", () => {
    it("should reject an asset_slot that is not in UNIVERSAL_SLOTS", () => {
      withMutatedRegistry(
        (s) => s.replace("asset_slots: [screen, footage, voice, avatar, music, sfx, brand, mg]",
                         "asset_slots: [screen, footage, voice, avatar, music, sfx, brand, mg, bogus]"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/not a UNIVERSAL_SLOT/);
        },
      );
    });

    it("should reject a handoff slot the type did not declare", () => {
      // NB: `explainer` declares every slot, so nothing is invalid for it. `default`
      // deliberately omits screen+avatar, which makes it the honest test case.
      withMutatedRegistry(
        (s) => s.replace("handoff: [footage]", "handoff: [footage, avatar]"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/handoff "avatar" is not in this type's asset_slots/);
        },
      );
    });

    it("should reject a write_type that does not exist in write-types.yaml", () => {
      withMutatedRegistry(
        (s) => s.replace("write_type: video-script", "write_type: not-a-real-write-type"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/is not an id in knowledge\/write-types\.yaml/);
        },
      );
    });
  });

  describe("structural invariants", () => {
    it("should require exactly one default type", () => {
      withMutatedRegistry(
        (s) => s.replace("    default: true", "    default: false"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/exactly one type must carry default: true \(found 0\)/);
        },
      );
    });

    it("should reject an installed type whose skill is not on disk", () => {
      withMutatedRegistry(
        (s) => s.replace("skill: 06-ai-ops/skills/video/types/explainer",
                         "skill: 06-ai-ops/skills/video/types/does-not-exist"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/is missing on disk/);
        },
      );
    });

    it("should reject an incoherent duration window", () => {
      withMutatedRegistry(
        (s) => s.replace("duration: { target_s: 175, min_s: 60, max_s: 300 }",
                         "duration: { target_s: 400, min_s: 60, max_s: 300 }"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/duration incoherent/);
        },
      );
    });

    it("should reject an unsupported fps", () => {
      withMutatedRegistry(
        (s) => s.replace("fps: 30", "fps: 47"),
        (r) => {
          expect(r.code).toBe(1);
          expect(r.out).toMatch(/fps must be one of/);
        },
      );
    });
  });

  describe("registry ↔ code coherence", () => {
    it("should keep every registry artifact inside KNOWN_ARTIFACTS", () => {
      const src = fs.readFileSync(REGISTRY, "utf-8");
      const declared = [...src.matchAll(/artifacts: \[([^\]]+)\]/g)]
        .flatMap((m) => m[1].split(",").map((s) => s.trim()));
      for (const a of declared) expect(KNOWN_ARTIFACTS).toContain(a);
    });

    it("should keep every registry publish target inside KNOWN_TARGETS", () => {
      const src = fs.readFileSync(REGISTRY, "utf-8");
      const declared = [...src.matchAll(/publish_targets: \[([^\]]+)\]/g)]
        .flatMap((m) => m[1].split(",").map((s) => s.trim()));
      for (const t of declared) expect(KNOWN_TARGETS).toContain(t);
    });

    it("should declare every registry fps within VALID_FPS", () => {
      const src = fs.readFileSync(REGISTRY, "utf-8");
      for (const m of src.matchAll(/^\s+fps: (\d+)/gm)) {
        expect(VALID_FPS).toContain(Number(m[1]));
      }
    });
  });
});

// ===========================================================================
describe("lint-stage-video — lesson #2 caught statically", () => {
  const stacked = (position: string) => `
    <html><head><style>
      .stage { position:absolute; overflow:hidden; }
      .stage video { ${position} width:100%; height:100%; }
    </style></head><body>
      <div id="root">
        <div id="stA" class="stage">
          <video id="v1" src="a.mp4"></video>
          <video id="v2" src="b.mp4"></video>
          <video id="v3" src="c.mp4"></video>
        </div>
      </div>
    </body></html>`;

  describe("the bug", () => {
    it("should FAIL when several videos in one container are not absolutely positioned", () => {
      const res = lint(stacked(""));
      const errs = res.findings.filter((f: any) => f.severity === "error");
      expect(errs).toHaveLength(1);
      expect(errs[0].rule).toBe("stacked-video-not-absolute");
      expect(errs[0].offenders).toHaveLength(3);
    });

    it("should PASS once position:absolute is present", () => {
      const res = lint(stacked("position:absolute; inset:0;"));
      expect(res.findings.filter((f: any) => f.severity === "error")).toHaveLength(0);
    });

    it("should accept an inline style on the element itself", () => {
      const html = `<div class="stage">
        <video id="v1" style="position:absolute"></video>
        <video id="v2" style="position: absolute"></video>
      </div>`;
      expect(lint(html).findings.filter((f: any) => f.severity === "error")).toHaveLength(0);
    });

    it("should NOT flag a container holding a single video (stacking needs two)", () => {
      const html = `<div class="stage"><video id="only"></video></div>`;
      expect(lint(html).findings.filter((f: any) => f.severity === "error")).toHaveLength(0);
    });

    it("should treat sibling containers independently", () => {
      const html = `
        <style>.ok video{position:absolute}</style>
        <div class="ok"><video id="a"></video><video id="b"></video></div>
        <div class="bad"><video id="c"></video><video id="d"></video></div>`;
      const errs = lint(html).findings.filter((f: any) => f.severity === "error");
      expect(errs).toHaveLength(1);
      expect(errs[0].offenders.map((o: any) => o.id).sort()).toEqual(["c", "d"]);
    });

    it("should report the offending element ids so the fix is actionable", () => {
      const errs = lint(stacked("")).findings.filter((f: any) => f.severity === "error");
      expect(errs[0].offenders.map((o: any) => o.id)).toEqual(["v1", "v2", "v3"]);
    });
  });

  describe("lesson #4 — mask-rise descender clipping", () => {
    it("should warn on a text-mask wrapper with no padding compensation", () => {
      const html = `<style>.line { overflow:hidden; }</style><div class="line"><span>gy</span></div>`;
      const warns = lint(html).findings.filter((f: any) => f.rule === "mask-rise-clips-descenders");
      expect(warns).toHaveLength(1);
    });

    it("should stay quiet when padding-bottom + negative margin compensate", () => {
      const html = `<style>.line { overflow:hidden; padding-bottom:.2em; margin-bottom:-.2em; }</style>`;
      expect(lint(html).findings.filter((f: any) => f.rule === "mask-rise-clips-descenders")).toHaveLength(0);
    });

    it("should not warn on an unrelated overflow:hidden rule", () => {
      const html = `<style>.panel { overflow:hidden; }</style>`;
      expect(lint(html).findings.filter((f: any) => f.rule === "mask-rise-clips-descenders")).toHaveLength(0);
    });
  });

  describe("tokenizer edge cases", () => {
    it("should not treat markup inside a <script> body as elements", () => {
      const { nodes } = tokenize(`<div><script>var s = "<video id='fake'>";</script></div>`);
      expect(nodes.filter((n: any) => n.tag === "video")).toHaveLength(0);
    });

    it("should ignore comments", () => {
      const { nodes } = tokenize(`<div><!-- <video id="ghost"></video> --></div>`);
      expect(nodes.filter((n: any) => n.tag === "video")).toHaveLength(0);
    });

    it("should parse attributes with single, double, and unquoted values", () => {
      const { nodes } = tokenize(`<video id='a' class="b c" data-start=3 muted></video>`);
      const v = nodes.find((n: any) => n.tag === "video");
      expect(v.attrs.id).toBe("a");
      expect(v.attrs.class).toBe("b c");
      expect(v.attrs["data-start"]).toBe("3");
      expect(v.attrs.muted).toBe("");
    });

    it("should keep void elements from swallowing their siblings", () => {
      const { nodes } = tokenize(`<div><img src="x"><video id="v1"></video><video id="v2"></video></div>`);
      const vids = nodes.filter((n: any) => n.tag === "video");
      expect(vids).toHaveLength(2);
      expect(vids[0].parent).toBe(vids[1].parent);
    });

    it("should survive an unclosed tag without throwing", () => {
      expect(() => tokenize(`<div><video id="v1">`)).not.toThrow();
    });

    it("should return empty structures for empty input", () => {
      const { nodes, styles } = tokenize("");
      expect(nodes).toHaveLength(0);
      expect(styles).toHaveLength(0);
    });
  });

  describe("css parsing", () => {
    it("should strip comments rather than parsing them as rules", () => {
      const rules = parseCss(["/* .ghost { position:absolute } */ .real { position:absolute }"]);
      expect(rules.map((r: any) => r.selector)).toEqual([".real"]);
    });

    it("should expand a comma-separated selector list into separate rules", () => {
      const rules = parseCss([".a, .b { position:absolute }"]);
      expect(rules.map((r: any) => r.selector).sort()).toEqual([".a", ".b"]);
    });

    it("should descend into @media blocks", () => {
      const rules = parseCss(["@media (min-width:100px) { .m { position:absolute } }"]);
      expect(rules.some((r: any) => r.selector === ".m")).toBe(true);
    });
  });

  describe("selector matching", () => {
    const { nodes } = tokenize(`<div class="stage"><video id="v" class="clip"></video></div>`);
    const video = nodes.find((n: any) => n.tag === "video");

    it.each([
      ["video", true],
      [".clip", true],
      ["#v", true],
      ["video.clip", true],
      [".stage video", true],
      ["*", true],
      ["audio", false],
      [".missing", false],
      ["#other", false],
      [".nope video", false],
    ])("selectorMatches(%s) → %s", (sel, expected) => {
      expect(selectorMatches(sel as string, video, nodes)).toBe(expected);
    });
  });
});

// ===========================================================================
describe("verify-render — argument + registry resolution", () => {
  describe("parseArgs", () => {
    it("should parse the full flag surface", () => {
      const a = vrParseArgs(["--render=a.mp4", "--type=explainer", "--regions=r.json", "--json"]);
      expect(a).toMatchObject({ render: "a.mp4", type: "explainer", regions: "r.json", json: true });
    });

    it("should default json to false and filmstripRequired to null (defer to registry)", () => {
      const a = vrParseArgs(["--render=a.mp4"]);
      expect(a.json).toBe(false);
      expect(a.filmstripRequired).toBeNull();
    });

    it("should let --no-filmstrip-required override the registry", () => {
      expect(vrParseArgs(["--no-filmstrip-required"]).filmstripRequired).toBe(false);
    });

    it("should coerce numeric overrides", () => {
      const a = vrParseArgs(["--min-bitrate-kbps=1200", "--min-region-stddev=4.5"]);
      expect(a.minBitrate).toBe(1200);
      expect(a.minStddev).toBe(4.5);
    });

    it("should ignore unknown flags rather than throwing", () => {
      expect(() => vrParseArgs(["--nonsense", "positional"])).not.toThrow();
    });
  });

  describe("loadTypeGates", () => {
    it("should read the explainer gates from the registry", () => {
      const g = loadTypeGates("explainer");
      expect(g.min_bitrate_kbps).toBe(3500);
      expect(g.require_filmstrip).toBe(true);
    });

    it("should resolve a type by alias", () => {
      expect(loadTypeGates("launch-film").min_bitrate_kbps).toBe(3500);
    });

    it("should fall back to defaults for an unknown type", () => {
      expect(loadTypeGates("no-such-type")).toEqual(GATE_DEFAULTS);
    });

    it("should fall back to defaults when no type is given", () => {
      expect(loadTypeGates(undefined)).toEqual(GATE_DEFAULTS);
    });
  });
});

// ===========================================================================
describe("check-loudness — argument + narration resolution", () => {
  it("should split a comma-separated --files list", () => {
    expect(clParseArgs(["--files=a.mp3, b.mp3"]).files).toEqual(["a.mp3", "b.mp3"]);
  });

  it("should ignore empty entries in --files", () => {
    expect(clParseArgs(["--files=a.mp3,,"]).files).toEqual(["a.mp3"]);
  });

  it("should read the pinned narration target from the registry", () => {
    expect(loadTypeNarration("explainer")).toEqual({ target_lufs: -16, true_peak: -1.5 });
  });

  it("should fall back to the module constants for an unknown type", () => {
    expect(loadTypeNarration("nope")).toEqual({
      target_lufs: NARRATION_TARGET_LUFS,
      true_peak: NARRATION_MAX_TRUE_PEAK,
    });
  });
});

// ===========================================================================
describe("voice/lib/voices — ElevenLabs voice resolution (Sprint 1 adapter)", () => {
  it("should expose KAI as the default brand voice", () => {
    expect(catalogFor("elevenlabs").default).toBe("KAI");
  });

  it("should map every catalog voice to an env var, never a literal id", () => {
    for (const v of ELEVENLABS_VOICES) {
      expect(v.env, `${v.name} must resolve via env`).toMatch(/_VOICE_ID$/);
      expect(JSON.stringify(v)).not.toMatch(/[0-9a-f]{20,}/i);
    }
  });

  it("should resolve a catalog name through the supplied env", () => {
    expect(resolveElevenVoiceId("KAI", { KAI_VOICE_ID: "abc123def456ghi789" })).toBe("abc123def456ghi789");
  });

  it("should be case-insensitive on the catalog name", () => {
    expect(resolveElevenVoiceId("kai", { KAI_VOICE_ID: "abc123def456ghi789" })).toBe("abc123def456ghi789");
  });

  it("should return null when the env var backing a known name is absent", () => {
    expect(resolveElevenVoiceId("KAI", {})).toBeNull();
  });

  it("should pass a raw voice_id through unchanged", () => {
    expect(resolveElevenVoiceId("Xb7hH8MSUJpSbSDYk0k2", {})).toBe("Xb7hH8MSUJpSbSDYk0k2");
  });

  it("should reject a short garbage value rather than treating it as an id", () => {
    expect(resolveElevenVoiceId("nope", {})).toBeNull();
  });

  it.each([["", null], ["   ", null], [null, null], [undefined, null], [42 as any, null]])(
    "should return null for invalid input %s",
    (input, expected) => {
      expect(resolveElevenVoiceId(input as any, {})).toBe(expected);
    },
  );
});

// ===========================================================================
describe("selfcheck — the /video toolchain doctor", () => {
  it("should emit machine-readable JSON with a check list", () => {
    const out = execFileSync("node", [path.join(REPO_ROOT, "scripts/video/gates/selfcheck.cjs"), "--json"], {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    });
    const parsed = JSON.parse(out);
    expect(Array.isArray(parsed.checks)).toBe(true);
    expect(parsed.checks.length).toBeGreaterThanOrEqual(8);
  });

  it("should probe ffmpeg filters rather than assuming drawtext exists", () => {
    const out = execFileSync("node", [path.join(REPO_ROOT, "scripts/video/gates/selfcheck.cjs"), "--json"], {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    });
    const filters = JSON.parse(out).checks.find((c: any) => c.id === "ffmpeg-filters");
    expect(filters).toBeTruthy();
    expect(filters.detail).toMatch(/present:|absent:/);
  });

  it("should mark the out-of-repo hyperframes skills as a HARD requirement", () => {
    const out = execFileSync("node", [path.join(REPO_ROOT, "scripts/video/gates/selfcheck.cjs"), "--json"], {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    });
    const skills = JSON.parse(out).checks.find((c: any) => c.id === "hyperframes-skills");
    expect(skills.hard).toBe(true);
  });

  it("should treat HeyGen auth as optional so a non-video operator is not blocked", () => {
    const out = execFileSync("node", [path.join(REPO_ROOT, "scripts/video/gates/selfcheck.cjs"), "--json"], {
      encoding: "utf-8",
      cwd: REPO_ROOT,
    });
    const heygen = JSON.parse(out).checks.find((c: any) => c.id === "heygen");
    expect(heygen.hard).toBe(false);
  });
});

// ── series projects (nested slug) ──────────────────────────────────────────
// Added when the "Starting With Ritsu" series needed
// video/projects/<series>/<episode>/ instead of 11 sibling top-level projects.
// The regex is the cheap half; the .gitignore is the half that matters, because
// `projects/*/assets/` matches exactly ONE level — without the depth-2 lines an
// episode would commit gigabytes of source media.
describe("PROJECT_SLUG_RE — series nesting", () => {
  const { PROJECT_SLUG_RE, splitProjectSlug, SLUG_RE } = require("../../scripts/video/lib/params.cjs");

  it("accepts a flat project slug", () => {
    expect(PROJECT_SLUG_RE.test("ritsu-product-launch")).toBe(true);
  });

  it("accepts exactly one level of series nesting", () => {
    expect(PROJECT_SLUG_RE.test("ritsu-getting-started/ep01-what-is-ritsu")).toBe(true);
  });

  it("rejects two levels of nesting", () => {
    expect(PROJECT_SLUG_RE.test("a/b/c")).toBe(false);
  });

  it.each([
    ["leading slash", "/ep01"],
    ["trailing slash", "series/"],
    ["empty segment", "series//ep"],
    ["leading digit in segment", "series/1ep"],
    ["uppercase", "Series/ep01"],
    ["underscore", "series/ep_01"],
    ["path traversal", "series/../../etc"],
    ["dot segment", "series/./ep"],
    ["space", "series/ep 01"],
    ["empty string", ""],
  ])("rejects %s", (_label, slug) => {
    expect(PROJECT_SLUG_RE.test(slug)).toBe(false);
  });

  it("leaves the type-id regex flat — a type id may never contain a slash", () => {
    // Regression guard: SLUG_RE is shared with validate-video-types.cjs. Loosening
    // it instead of adding PROJECT_SLUG_RE would have allowed a type id `explainer/foo`.
    expect(SLUG_RE.test("explainer/foo")).toBe(false);
    expect(SLUG_RE.test("explainer")).toBe(true);
  });

  it("splits a nested slug into series and leaf", () => {
    expect(splitProjectSlug("ritsu-getting-started/ep01-what-is-ritsu")).toEqual({
      series: "ritsu-getting-started",
      leaf: "ep01-what-is-ritsu",
      depth: 2,
    });
  });

  it("reports depth 1 and a null series for a flat slug", () => {
    expect(splitProjectSlug("ritsu-product-launch")).toEqual({
      series: null,
      leaf: "ritsu-product-launch",
      depth: 1,
    });
  });

  it("returns null for an invalid slug rather than throwing", () => {
    expect(splitProjectSlug("a/b/c")).toBeNull();
    expect(splitProjectSlug(undefined as any)).toBeNull();
  });
});

describe("video/.gitignore — depth-2 media must stay ignored", () => {
  const ignore = fs.readFileSync(path.join(REPO_ROOT, "video", ".gitignore"), "utf-8");

  it.each(["assets", "build", "out"])(
    "ignores projects/*/*/%s/ so a series never commits media",
    (dir) => {
      expect(ignore).toContain(`projects/*/*/${dir}/`);
    },
  );

  it("keeps the filmstrip exception at depth 2", () => {
    // filmstrip.jpg is the ONE committed binary — the only auditable evidence a
    // render was verified. It must survive the depth-2 ignore just as it does at depth 1.
    expect(ignore).toContain("!projects/*/*/out/filmstrip.jpg");
  });

  it("still ignores depth-1 media (no regression)", () => {
    for (const dir of ["assets", "build", "out"]) {
      expect(ignore).toContain(`projects/*/${dir}/`);
    }
  });
});
