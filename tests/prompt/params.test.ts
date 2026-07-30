import { describe, it, expect, beforeEach } from "vitest";
import path from "node:path";

// vitest supports named imports from CommonJS module.exports.
import {
  UNIVERSAL_PARAMS,
  BOOLEAN_PARAMS,
  LIST_PARAMS,
  DEFAULTS,
  VERBS,
  MAX_COUNT,
  ATTACHED_ALIASES,
  loadRegistry,
  resolveDirection,
  resolveRefs,
  parseArgs,
  validate,
  parse,
} from "../../scripts/prompt/lib/params.cjs";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

// PHASE 1 — params.cjs: 2 exported entry points (parseArgs pure, validate pure),
// ~30 branches across flag forms, vocabulary lookup, and coherence rules.
// PHASE 2 — edge cases mapped: empty argv, unknown flag, missing value, boolean
// negation, list accumulation, count boundaries (0/1/20/21/NaN/float), ar regex,
// mode/ref coherence, registered-not-built fallthrough.

describe("params.cjs", () => {
  let doc: any;
  beforeEach(() => {
    doc = loadRegistry(REPO_ROOT);
  });

  describe("registry contract", () => {
    it("should load a registry carrying all five required vocabulary axes", () => {
      for (const axis of ["modes", "outputs", "verbs", "realism_levels", "directions"]) {
        expect(Array.isArray(doc[axis]), `${axis} must be an array`).toBe(true);
        expect(doc[axis].length).toBeGreaterThan(0);
      }
    });

    it("should expose exactly the documented flag vocabulary", () => {
      expect(UNIVERSAL_PARAMS).toEqual([
        "type", "mode", "output", "model", "count", "ar", "ref",
        "preserve", "change", "realism", "out", "generate", "dry-run", "lang",
      ]);
    });

    it("should treat only generate and dry-run as boolean flags", () => {
      expect([...BOOLEAN_PARAMS].sort()).toEqual(["dry-run", "generate"]);
    });

    it("should treat ref, preserve and change as list flags", () => {
      expect([...LIST_PARAMS].sort()).toEqual(["change", "preserve", "ref"]);
    });

    it("should default to text mode, default output, max realism and count 1", () => {
      expect(DEFAULTS.mode).toBe("text");
      expect(DEFAULTS.output).toBe("default");
      expect(DEFAULTS.realism).toBe("max");
      expect(DEFAULTS.count).toBe(1);
    });
  });

  describe("resolveDirection", () => {
    it("should resolve a direction by its exact id", () => {
      expect(resolveDirection(doc, "image")?.id).toBe("image");
    });

    it("should resolve a direction by a registered alias", () => {
      expect(resolveDirection(doc, "photo")?.id).toBe("image");
      expect(resolveDirection(doc, "img")?.id).toBe("image");
    });

    it("should resolve case-insensitively", () => {
      expect(resolveDirection(doc, "IMAGE")?.id).toBe("image");
    });

    it("should fall back to the default direction when the token is absent", () => {
      expect(resolveDirection(doc, undefined)?.id).toBe("image");
    });

    it("should return null for an unregistered token", () => {
      expect(resolveDirection(doc, "hologram")).toBe(null);
    });
  });

  describe("parseArgs — flag forms", () => {
    it("should read the first positional as the direction", () => {
      expect(parseArgs(["image", "a cat"]).directionToken).toBe("image");
    });

    it("should read a known verb as the second positional", () => {
      const r = parseArgs(["image", "enhance", "old prompt"]);
      expect(r.verb).toBe("enhance");
      expect(r.input).toBe("old prompt");
    });

    it("should not consume the second positional when it is not a verb", () => {
      const r = parseArgs(["image", "a", "cat"]);
      expect(r.verb).toBeUndefined();
      expect(r.input).toBe("a cat");
    });

    it("should parse --flag=value form", () => {
      expect(parseArgs(["image", "--mode=json", "x"]).flags.mode).toBe("json");
    });

    it("should parse --flag value form", () => {
      expect(parseArgs(["image", "--mode", "json", "x"]).flags.mode).toBe("json");
    });

    it("should set a bare boolean flag to true", () => {
      expect(parseArgs(["image", "--dry-run", "x"]).flags["dry-run"]).toBe(true);
    });

    it("should honour explicit boolean negation", () => {
      for (const falsy of ["false", "0", "no", "off"]) {
        expect(parseArgs(["image", `--generate=${falsy}`, "x"]).flags.generate).toBe(false);
      }
    });

    it("should accumulate a repeated list flag", () => {
      const r = parseArgs(["image", "--ref=a.png", "--ref=b.png", "x"]);
      expect(r.flags.ref).toEqual(["a.png", "b.png"]);
    });

    it("should split a comma-separated list flag and trim each item", () => {
      const r = parseArgs(["image", "--preserve= face , hair ,skin ", "x"]);
      expect(r.flags.preserve).toEqual(["face", "hair", "skin"]);
    });

    it("should error on an unregistered flag rather than ignoring it", () => {
      const r = parseArgs(["image", "--bogus=1", "x"]);
      expect(r.errors.some((e: string) => e.includes("unknown flag --bogus"))).toBe(true);
    });

    it("should error when a value-taking flag is given no value", () => {
      const r = parseArgs(["image", "--mode"]);
      expect(r.errors.some((e: string) => e.includes("--mode requires a value"))).toBe(true);
    });

    it("should not swallow the following flag as a value", () => {
      const r = parseArgs(["image", "--mode", "--dry-run", "x"]);
      expect(r.errors.some((e: string) => e.includes("--mode requires a value"))).toBe(true);
      expect(r.flags["dry-run"]).toBe(true);
    });

    it("should error on a bare -- token", () => {
      const r = parseArgs(["image", "--", "x"]);
      expect(r.errors.some((e: string) => e.includes('empty flag "--"'))).toBe(true);
    });

    it("should return an empty input when only a direction is given", () => {
      expect(parseArgs(["image"]).input).toBe("");
    });

    it("should tolerate an entirely empty argv", () => {
      const r = parseArgs([]);
      expect(r.directionToken).toBeUndefined();
      expect(r.input).toBe("");
      expect(r.errors).toEqual([]);
    });

    it("should ignore non-string argv entries", () => {
      const r = parseArgs(["image", null as any, undefined as any, "x"]);
      expect(r.input).toBe("x");
    });
  });

  describe("validate — refusals", () => {
    const v = (argv: string[]) => validate(parseArgs(argv), doc);

    it("should accept a minimal valid invocation", () => {
      const r = v(["image", "a girl in a gym"]);
      expect(r.ok).toBe(true);
      expect(r.errors).toEqual([]);
      expect(r.direction.id).toBe("image");
      expect(r.verb).toBe("build");
    });

    it("should refuse when no direction is supplied", () => {
      const r = v([]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("direction is required"))).toBe(true);
    });

    it("should refuse an unregistered direction and name the registered ones", () => {
      const r = v(["hologram", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes('unknown direction "hologram"'))).toBe(true);
      expect(r.errors.some((e: string) => e.includes("image"))).toBe(true);
    });

    it("should refuse a registered-not-built direction WITH its stated reason", () => {
      const r = v(["video", "x"]);
      expect(r.ok).toBe(false);
      const msg = r.errors.join(" ");
      expect(msg).toContain("registered but not built");
      expect(msg.length).toBeGreaterThan(60); // the reason is carried, not just the verdict
    });

    it("should refuse an empty input for build", () => {
      const r = v(["image"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("build requires an idea"))).toBe(true);
    });

    it("should refuse an empty input for enhance with a verb-specific message", () => {
      const r = v(["image", "enhance"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("enhance requires the prompt to repair"))).toBe(true);
    });

    it("should refuse an unregistered mode", () => {
      const r = v(["image", "--mode=telepathy", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes('unknown --mode "telepathy"'))).toBe(true);
    });

    it("should refuse an unregistered realism level", () => {
      const r = v(["image", "--realism=extreme", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes('unknown --realism "extreme"'))).toBe(true);
    });

    it("should refuse an unregistered model and name the registered ones", () => {
      const r = v(["image", "--model=dall-e-1", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("unknown --model"))).toBe(true);
      expect(r.errors.some((e: string) => e.includes("gpt-image-2"))).toBe(true);
    });

    it("should refuse --mode=ref without any --ref", () => {
      const r = v(["image", "--mode=ref", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("--mode=ref requires at least one --ref"))).toBe(true);
    });
  });

  describe("validate — count boundaries", () => {
    const count = (c: string) => validate(parseArgs(["image", `--count=${c}`, "x"]), doc);

    it("should accept the lower bound of 1", () => {
      expect(count("1").ok).toBe(true);
    });

    it(`should accept the upper bound of ${MAX_COUNT}`, () => {
      expect(count(String(MAX_COUNT)).ok).toBe(true);
    });

    it("should refuse 0", () => {
      expect(count("0").ok).toBe(false);
    });

    it("should refuse a negative count", () => {
      expect(count("-1").ok).toBe(false);
    });

    it(`should refuse ${MAX_COUNT + 1}, one past the ceiling`, () => {
      expect(count(String(MAX_COUNT + 1)).ok).toBe(false);
    });

    it("should refuse a non-numeric count", () => {
      const r = count("many");
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("--count must be an integer"))).toBe(true);
    });

    it("should refuse a fractional count", () => {
      expect(count("2.5").ok).toBe(false);
    });

    it("should coerce a valid numeric string to a number", () => {
      expect(count("3").flags.count).toBe(3);
    });
  });

  describe("validate — aspect ratio", () => {
    it("should accept a W:H ratio", () => {
      expect(validate(parseArgs(["image", "--ar=16:9", "x"]), doc).ok).toBe(true);
    });

    it("should refuse a ratio without a colon", () => {
      expect(validate(parseArgs(["image", "--ar=169", "x"]), doc).ok).toBe(false);
    });

    it("should refuse a non-numeric ratio", () => {
      expect(validate(parseArgs(["image", "--ar=wide:tall", "x"]), doc).ok).toBe(false);
    });

    it("should fall back to the direction default when --ar is not supplied", () => {
      // v0.2: the founder set a direction-level default_ar, so --ar is always
      // resolved by the time a skill sees it. Precedence: flag > type > direction.
      expect(validate(parseArgs(["image", "x"]), doc).flags.ar).toBe("16:9");
    });
  });

  describe("validate — warnings never drop a registered flag", () => {
    it("should warn and fall back when an output is registered-not-built", () => {
      const r = validate(parseArgs(["image", "--output=pdf", "x"]), doc);
      expect(r.ok).toBe(true);
      expect(r.flags.output).toBe("default");
      expect(r.warnings.some((w: string) => w.includes("registered but not built"))).toBe(true);
    });

    it("should carry the not-built reason into the warning, not just the verdict", () => {
      const r = validate(parseArgs(["image", "--output=excel", "x"]), doc);
      expect(r.warnings.join(" ").length).toBeGreaterThan(50);
    });

    it("should warn when --ref is supplied outside ref mode but KEEP the value", () => {
      const r = validate(parseArgs(["image", "--ref=attached", "x"]), doc);
      expect(r.ok).toBe(true);
      expect(r.flags.ref).toEqual(["attached"]);
      expect(r.warnings.some((w: string) => w.includes("did you mean --mode=ref"))).toBe(true);
    });

    it("should warn when --preserve is used outside ref mode", () => {
      const r = validate(parseArgs(["image", "--preserve=face", "x"]), doc);
      expect(r.warnings.some((w: string) => w.includes("--preserve only applies to --mode=ref"))).toBe(true);
    });

    it("should warn when --change is used outside ref mode", () => {
      const r = validate(parseArgs(["image", "--change=outfit", "x"]), doc);
      expect(r.warnings.some((w: string) => w.includes("--change only applies to --mode=ref"))).toBe(true);
    });

    it("should warn that realism=off weakens reference consistency", () => {
      const r = validate(parseArgs(["image", "--mode=ref", "--ref=attached", "--realism=off", "x"]), doc);
      expect(r.ok).toBe(true);
      expect(r.warnings.some((w: string) => w.includes("reference consistency"))).toBe(true);
    });

    it("should warn that --generate with count>1 chains N spending runs", () => {
      const r = validate(parseArgs(["image", "--generate", "--count=4", "x"]), doc);
      expect(r.warnings.some((w: string) => w.includes("chain 4"))).toBe(true);
    });

    it("should not warn on a clean invocation", () => {
      expect(validate(parseArgs(["image", "a girl in a gym"]), doc).warnings).toEqual([]);
    });
  });

  describe("validate — model resolution", () => {
    it("should select the registry default model when none is asked for", () => {
      expect(validate(parseArgs(["image", "x"]), doc).model.id).toBe("gpt-image-2");
    });

    it("should select the explicitly requested model", () => {
      expect(validate(parseArgs(["image", "--model=midjourney", "x"]), doc).model.id).toBe("midjourney");
    });

    it("should carry the realism keyword and its position for gpt-image-2", () => {
      const m = validate(parseArgs(["image", "x"]), doc).model;
      expect(m.realism_keyword).toBe("photorealism");
      expect(m.keyword_position).toBe("end");
    });

    it("should mark midjourney as taking trailing parameter flags, not prose", () => {
      const m = validate(parseArgs(["image", "--model=midjourney", "x"]), doc).model;
      expect(m.syntax).toBe("prose-plus-params");
      expect(m.param_flags.length).toBeGreaterThan(0);
    });

    it("should give the generic model no engine-specific realism keyword", () => {
      expect(validate(parseArgs(["image", "--model=generic", "x"]), doc).model.realism_keyword).toBeUndefined();
    });
  });

  describe("parse — end-to-end against the real registry on disk", () => {
    it("should validate a fully-flagged realistic invocation", () => {
      const r = parse(
        ["image", "build", "--mode=smart", "--model=flux", "--count=2", "--ar=4:5", "--realism=balanced", "a ramen shop at midnight"],
        REPO_ROOT,
      );
      expect(r.ok).toBe(true);
      expect(r.flags.mode).toBe("smart");
      expect(r.flags.count).toBe(2);
      expect(r.model.id).toBe("flux");
      expect(r.input).toBe("a ramen shop at midnight");
    });

    it("should expose every verb the registry declares", () => {
      expect(VERBS).toEqual(["build", "enhance"]);
    });
  });
});

// PHASE 1 — --type axis (v0.2): fixed-structure templates with slots.
// Branches: unknown id, alias resolution, not-installed, direction mismatch,
// requires_ref, compatible_modes, default application precedence, waiver warning.
describe("params.cjs — --type (fixed-structure templates)", () => {
  const doc = loadRegistry(REPO_ROOT);
  const v = (argv: string[]) => validate(parseArgs(argv), doc);

  describe("resolution", () => {
    it("should resolve a type by its canonical id", () => {
      expect(v(["image", "--type=character-turnaround", "--ref=attached", "x"]).type.id).toBe("character-turnaround");
    });

    it("should resolve a type by each registered alias", () => {
      for (const alias of ["character-sheet", "turnaround", "model-sheet"]) {
        expect(v(["image", `--type=${alias}`, "--ref=attached", "x"]).type.id, alias).toBe("character-turnaround");
      }
    });

    it("should normalise an alias to the canonical id in flags", () => {
      expect(v(["image", "--type=turnaround", "--ref=attached", "x"]).flags.type).toBe("character-turnaround");
    });

    it("should leave type null when the flag is absent", () => {
      expect(v(["image", "x"]).type).toBe(null);
    });

    it("should refuse an unregistered type and name the registered ones", () => {
      const r = v(["image", "--type=nonesuch", "--ref=attached", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes('unknown --type "nonesuch"'))).toBe(true);
      expect(r.errors.some((e: string) => e.includes("character-turnaround"))).toBe(true);
    });
  });

  describe("coherence rules", () => {
    it("should refuse a requires_ref type with no --ref", () => {
      const r = v(["image", "--type=character-turnaround", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("requires at least one --ref"))).toBe(true);
    });

    it("should refuse a mode the type does not support", () => {
      const r = v(["image", "--type=character-turnaround", "--ref=attached", "--mode=smart", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("does not support --mode=smart"))).toBe(true);
    });

    it("should accept every mode the type does support", () => {
      for (const m of ["text", "json"]) {
        expect(v(["image", "--type=character-turnaround", "--ref=attached", `--mode=${m}`, "x"]).ok, m).toBe(true);
      }
    });

    it("should not warn about --ref outside ref-mode when the type owns the reference", () => {
      const r = v(["image", "--type=character-turnaround", "--ref=attached", "x"]);
      expect(r.warnings.some((w: string) => w.includes("did you mean --mode=ref"))).toBe(false);
    });

    it("should not warn about --change outside ref-mode when the type owns the reference", () => {
      const r = v(["image", "--type=character-turnaround", "--ref=attached", "--change=outfit", "x"]);
      expect(r.warnings.some((w: string) => w.includes("only applies to --mode=ref"))).toBe(false);
    });
  });

  describe("defaults — the type fills only what the caller left unset", () => {
    it("should apply the type default aspect ratio", () => {
      expect(v(["image", "--type=character-turnaround", "--ref=attached", "x"]).flags.ar).toBe("16:9");
    });

    it("should let an explicit --ar beat the type default", () => {
      expect(v(["image", "--type=character-turnaround", "--ref=attached", "--ar=1:1", "x"]).flags.ar).toBe("1:1");
    });

    it("should apply the type default model", () => {
      expect(v(["image", "--type=character-turnaround", "--ref=attached", "x"]).model.id).toBe("gpt-image-2");
    });

    it("should let an explicit --model beat the type default", () => {
      expect(v(["image", "--type=character-turnaround", "--ref=attached", "--model=flux", "x"]).model.id).toBe("flux");
    });

    it("should apply the realism override and explain it in a warning", () => {
      const r = v(["image", "--type=character-turnaround", "--ref=attached", "x"]);
      expect(r.flags.realism).toBe("balanced");
      expect(r.warnings.some((w: string) => w.includes("sets --realism=balanced"))).toBe(true);
      expect(r.warnings.join(" ")).toContain("TECHNICAL reference");
    });

    it("should let an explicit --realism beat the override and emit no waiver warning", () => {
      const r = v(["image", "--type=character-turnaround", "--ref=attached", "--realism=max", "x"]);
      expect(r.flags.realism).toBe("max");
      expect(r.warnings.some((w: string) => w.includes("sets --realism"))).toBe(false);
    });
  });

  describe("direction default_ar fallback", () => {
    it("should fall back to the direction default aspect ratio when nothing else sets it", () => {
      expect(v(["image", "a plain build"]).flags.ar).toBe("16:9");
    });

    it("should still let an explicit --ar win over the direction default", () => {
      expect(v(["image", "--ar=9:16", "x"]).flags.ar).toBe("9:16");
    });
  });
});


// PHASE 1 — --ref accepts BOTH a file path and an attached-image sentinel (v0.2 fix).
// PHASE 2 — edge cases: every alias, :N index, missing path, absolute path, mixed list,
// whitespace, case, and the requires_ref interaction.
describe("params.cjs — --ref sources (path + attached)", () => {
  const doc = loadRegistry(REPO_ROOT);
  const v = (argv: string[]) => validate(parseArgs(argv), doc, REPO_ROOT, REPO_ROOT);

  describe("resolveRefs classification", () => {
    it("should classify every registered attached alias as kind=attached", () => {
      for (const alias of ATTACHED_ALIASES) {
        expect(resolveRefs([alias], REPO_ROOT)[0].kind, alias).toBe("attached");
      }
    });

    it("should classify an attached alias case-insensitively", () => {
      expect(resolveRefs(["Attached"], REPO_ROOT)[0].kind).toBe("attached");
      expect(resolveRefs(["UPLOAD"], REPO_ROOT)[0].kind).toBe("attached");
    });

    it("should default an attached ref to index 1", () => {
      expect(resolveRefs(["attached"], REPO_ROOT)[0].index).toBe(1);
    });

    it("should read the ordinal from attached:N", () => {
      expect(resolveRefs(["attached:3"], REPO_ROOT)[0].index).toBe(3);
    });

    it("should mark an attached ref as existing without touching the disk", () => {
      expect(resolveRefs(["attached:99"], REPO_ROOT)[0].exists).toBe(true);
    });

    it("should classify anything else as a path", () => {
      expect(resolveRefs(["avatar.png"], REPO_ROOT)[0].kind).toBe("path");
    });

    it("should resolve a real relative path against the repo root", () => {
      const r = resolveRefs(["package.json"], REPO_ROOT, REPO_ROOT)[0];
      expect(r.exists).toBe(true);
      expect(r.resolved).toContain("package.json");
    });

    it("should mark a missing path as not existing", () => {
      const r = resolveRefs(["no/such/file.png"], REPO_ROOT, REPO_ROOT)[0];
      expect(r.exists).toBe(false);
      expect(r.resolved).toBe(null);
    });

    it("should not treat a filename that merely contains 'attached' as the sentinel", () => {
      expect(resolveRefs(["my-attached-photo.png"], REPO_ROOT)[0].kind).toBe("path");
    });

    it("should return an empty array for no refs", () => {
      expect(resolveRefs(undefined as any, REPO_ROOT)).toEqual([]);
      expect(resolveRefs([], REPO_ROOT)).toEqual([]);
    });
  });

  describe("validate — attached satisfies the ref requirement", () => {
    it("should accept --mode=ref with an attached image and no file at all", () => {
      const r = v(["image", "--mode=ref", "--ref=attached", "walking home at night"]);
      expect(r.ok).toBe(true);
      expect(r.refs[0].kind).toBe("attached");
    });

    it("should accept a requires_ref type with an attached image", () => {
      expect(v(["image", "--type=character-turnaround", "--ref=attached", "x"]).ok).toBe(true);
    });

    it("should still accept a real file path", () => {
      expect(v(["image", "--mode=ref", "--ref=package.json", "x"]).ok).toBe(true);
    });

    it("should accept a path and an attached image mixed in one call", () => {
      const r = v(["image", "--mode=ref", "--ref=attached,package.json", "x"]);
      expect(r.ok).toBe(true);
      expect(r.refs.map((x: any) => x.kind)).toEqual(["attached", "path"]);
    });

    it("should still refuse ref mode with no ref of either kind", () => {
      const r = v(["image", "--mode=ref", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("--ref=attached"))).toBe(true);
    });
  });

  describe("validate — a missing path is a refusal, not a silent pass", () => {
    it("should refuse a path that does not exist on disk", () => {
      const r = v(["image", "--mode=ref", "--ref=no/such/file.png", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.some((e: string) => e.includes("not found on disk"))).toBe(true);
    });

    it("should point the founder at the attached sentinel in that error", () => {
      const r = v(["image", "--mode=ref", "--ref=typo.png", "x"]);
      expect(r.errors.join(" ")).toContain("--ref=attached");
    });

    it("should refuse when only one ref of several is missing", () => {
      const r = v(["image", "--mode=ref", "--ref=package.json,ghost.png", "x"]);
      expect(r.ok).toBe(false);
      expect(r.errors.filter((e: string) => e.includes("not found on disk")).length).toBe(1);
    });

    it("should not refuse an attached ref for not existing on disk", () => {
      const r = v(["image", "--mode=ref", "--ref=attached", "x"]);
      expect(r.errors.some((e: string) => e.includes("not found on disk"))).toBe(false);
    });
  });
});
