import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  SUBCOMMANDS, UNIVERSAL_PARAMS, MODES, OUT_FORMATS, DEFAULTS,
  parseWriteArgs, normalizeMode, normalizeOut, computeWarnings, splitPlus,
} = require("../../scripts/write/lib/params.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). Pure functions of the /write universal
// param layer (capability write-platform v0.1).

describe("parseWriteArgs", () => {
  describe("subcommand detection", () => {
    it("defaults to 'write' when no subcommand token", () => {
      expect(parseWriteArgs(["hello", "world"]).subcommand).toBe("write");
    });
    it.each(["distill", "authors", "types", "templates", "humanize", "write"])(
      "detects '%s' as the subcommand", (sc) => {
        expect(parseWriteArgs([sc]).subcommand).toBe(sc);
      });
    it("only the FIRST positional is the subcommand", () => {
      const r = parseWriteArgs(["humanize", "types"]);
      expect(r.subcommand).toBe("humanize");
    });
    it("a subcommand-looking word after a flag is still positional, not the subcommand", () => {
      // first positional is 'write request', 'distill' appears later as request text
      const r = parseWriteArgs(["write", "about", "distill"]);
      expect(r.subcommand).toBe("write");
      expect(r.options.request).toBe("about distill");
    });
  });

  describe("request assembly", () => {
    it("joins positionals into request for the default subcommand", () => {
      expect(parseWriteArgs(["a", "b", "c"]).options.request).toBe("a b c");
    });
    it("distill: first remaining positional becomes author-style", () => {
      const r = parseWriteArgs(["distill", "seth-godin"]);
      expect(r.options["author-style"]).toBe("seth-godin");
      expect(r.options.request).toBeUndefined();
    });
    it("explicit --request wins over positional", () => {
      const r = parseWriteArgs(["positional", "--request=explicit"]);
      expect(r.options.request).toBe("explicit");
    });
  });

  describe("flag forms", () => {
    it("--key=val sets the value", () => {
      expect(parseWriteArgs(["--type=blog"]).options.type).toBe("blog");
    });
    it("bare --dry-run is true", () => {
      expect(parseWriteArgs(["--dry-run"]).options["dry-run"]).toBe(true);
    });
    it.each(["false", "0", "no", "off"])("--dry-run=%s is false", (v) => {
      expect(parseWriteArgs([`--dry-run=${v}`]).options["dry-run"]).toBe(false);
    });
    it("records explicitly-provided flags in `provided`", () => {
      const r = parseWriteArgs(["--type=blog", "--image"]);
      expect(r.provided.has("type")).toBe(true);
      expect(r.provided.has("image")).toBe(true);
      expect(r.provided.has("medium")).toBe(false);
    });
  });

  describe("multi-value flags (ref / ref-src / out)", () => {
    it("splits on + within one flag", () => {
      expect(parseWriteArgs(["--ref=a+b+c"]).options.ref).toEqual(["a", "b", "c"]);
    });
    it("accumulates across repeated flags", () => {
      const r = parseWriteArgs(["--ref=a", "--ref=b+c"]);
      expect(r.options.ref).toEqual(["a", "b", "c"]);
    });
    it("--out splits + and dedupes, defaulting when emptied", () => {
      expect(parseWriteArgs(["--out=md+pdf+md"]).options.out).toEqual(["md", "pdf"]);
      expect(parseWriteArgs([]).options.out).toEqual(["default"]);
    });
    it("ref-src accumulates for distill", () => {
      const r = parseWriteArgs(["distill", "x", "--ref-src=raw/a+raw/b", "--ref-src=raw/c"]);
      expect(r.options["ref-src"]).toEqual(["raw/a", "raw/b", "raw/c"]);
    });
  });

  describe("tri-state flags (image / dataviz)", () => {
    it("bare flag means 'on'", () => {
      expect(parseWriteArgs(["--image"]).options.image).toBe("on");
    });
    it.each(["auto", "on", "off"])("honors --image=%s", (v) => {
      expect(parseWriteArgs([`--image=${v}`]).options.image).toBe(v);
    });
    it("invalid tri-state value falls back to 'auto'", () => {
      expect(parseWriteArgs(["--dataviz=maybe"]).options.dataviz).toBe("auto");
    });
    it("defaults are auto/auto", () => {
      const r = parseWriteArgs([]);
      expect(r.options.image).toBe("auto");
      expect(r.options.dataviz).toBe("auto");
    });
  });

  describe("humanize flag", () => {
    it("defaults to 'on'", () => { expect(parseWriteArgs([]).options.humanize).toBe("on"); });
    it("bare --humanize is on", () => { expect(parseWriteArgs(["--humanize"]).options.humanize).toBe("on"); });
    it.each(["off", "false", "0", "no"])("--humanize=%s is off", (v) => {
      expect(parseWriteArgs([`--humanize=${v}`]).options.humanize).toBe("off");
    });
    it("--humanize=on is on", () => { expect(parseWriteArgs(["--humanize=on"]).options.humanize).toBe("on"); });
  });

  describe("numeric flags", () => {
    it("parses --max-cost-usd as a number", () => {
      expect(parseWriteArgs(["--max-cost-usd=3.5"]).options["max-cost-usd"]).toBe(3.5);
    });
    it("default max-cost-usd is 2.0", () => {
      expect(parseWriteArgs([]).options["max-cost-usd"]).toBe(2.0);
    });
  });

  describe("unknown + malformed input", () => {
    it("records unknown flags without throwing", () => {
      const r = parseWriteArgs(["--frobnicate=7"]);
      expect(r.provided.has("frobnicate")).toBe(true);
      expect(r.options.frobnicate).toBe("7");
    });
    it("ignores non-string argv elements", () => {
      // @ts-ignore deliberately malformed
      expect(() => parseWriteArgs([null, undefined, 42, "--type=blog"])).not.toThrow();
      // @ts-ignore
      expect(parseWriteArgs([null, "--type=blog"]).options.type).toBe("blog");
    });
    it("handles empty argv", () => {
      const r = parseWriteArgs([]);
      expect(r.subcommand).toBe("write");
      expect(r.options.request).toBeUndefined();
    });
    it("handles non-array argv", () => {
      // @ts-ignore
      expect(() => parseWriteArgs(undefined)).not.toThrow();
    });
  });
});

describe("normalizeMode", () => {
  it.each(MODES)("keeps valid mode %s", (m: string) => expect(normalizeMode(m)).toBe(m));
  it("unknown mode → standard", () => expect(normalizeMode("turbo")).toBe("standard"));
  it("undefined → standard", () => expect(normalizeMode(undefined)).toBe("standard"));
});

describe("normalizeOut", () => {
  it("keeps known formats", () => {
    expect(normalizeOut(["md", "pdf"]).formats).toEqual(["md", "pdf"]);
  });
  it("warns + drops unknown formats", () => {
    const r = normalizeOut(["md", "xyz"]);
    expect(r.formats).toEqual(["md"]);
    expect(r.warnings[0]).toMatch(/xyz/);
  });
  it("empty/all-unknown → default", () => {
    expect(normalizeOut(["nope"]).formats).toEqual(["default"]);
  });
  it("accepts a single string", () => {
    expect(normalizeOut("pdf").formats).toEqual(["pdf"]);
  });
});

describe("computeWarnings", () => {
  it("warns on reserved flags with the consequence", () => {
    const w = computeWarnings(new Set(["use"]));
    expect(w.join(" ")).toMatch(/use/);
  });
  it("warns on unknown flags", () => {
    expect(computeWarnings(new Set(["bogus"]))[0]).toMatch(/unknown flag --bogus/);
  });
  it("does not warn on known universal params", () => {
    expect(computeWarnings(new Set(["type", "medium", "out"]))).toEqual([]);
  });
});

describe("splitPlus", () => {
  it("splits, trims, drops empties", () => {
    expect(splitPlus("a + b +  + c")).toEqual(["a", "b", "c"]);
  });
  it("single value", () => expect(splitPlus("solo")).toEqual(["solo"]));
});

describe("contracts", () => {
  it("SUBCOMMANDS includes the documented set", () => {
    expect(SUBCOMMANDS).toEqual(expect.arrayContaining(["write", "distill", "authors", "types", "templates", "humanize"]));
  });
  it("DEFAULTS are frozen + sane", () => {
    expect(DEFAULTS.humanize).toBe("on");
    expect(DEFAULTS.style).toBe("ritsu");
    expect(DEFAULTS.framework).toBe("auto");
    expect(() => { (DEFAULTS as any).style = "x"; }).toThrow();
  });
  it("--framework defaults to auto, and an explicit value overrides", () => {
    expect(parseWriteArgs([]).options.framework).toBe("auto");
    expect(parseWriteArgs(["--framework=pas"]).options.framework).toBe("pas");
    expect(parseWriteArgs(["--framework=none"]).options.framework).toBe("none");
  });
  it("OUT_FORMATS + UNIVERSAL_PARAMS are non-empty", () => {
    expect(OUT_FORMATS.length).toBeGreaterThan(0);
    expect(UNIVERSAL_PARAMS).toContain("author-style");
  });
});
