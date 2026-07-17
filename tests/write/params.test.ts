import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  SUBCOMMANDS, UNIVERSAL_PARAMS, MODES, OUT_FORMATS, DEFAULTS,
  parseWriteArgs, readRequestFile, ParamsError,
  normalizeMode, normalizeOut, computeWarnings, splitPlus,
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

// ---------------------------------------------------------------------------
// --request-file. Declared in UNIVERSAL_PARAMS since v0.1 (#274) but never read,
// so it passed the unknown-flag gate and was then silently dropped — strictly
// worse than an unknown flag, and a violation of the command's stated contract
// ("Unknown flags WARN, never silently dropped").
// Skipped: metamorphic — resolution is a single file read, no transform relations.
// ---------------------------------------------------------------------------
describe("--request-file", () => {
  let dir: string;
  const write = (name: string, body: string) => {
    const p = path.join(dir, name);
    fs.writeFileSync(p, body);
    return p;
  };

  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), "write-reqfile-")); });
  afterEach(() => { fs.rmSync(dir, { recursive: true, force: true }); });

  describe("happy path", () => {
    it("regression: --request-file is read into request instead of being silently dropped", () => {
      const p = write("brief.md", "Write a company about-page for Ritsu");
      const r = parseWriteArgs([`--request-file=${p}`]);
      expect(r.options.request).toBe("Write a company about-page for Ritsu");
    });
    it("preserves internal newlines of a multi-line brief, trimming only the ends", () => {
      const p = write("brief.md", "\n  Line one\n\nLine two  \n\n");
      expect(parseWriteArgs([`--request-file=${p}`]).options.request).toBe("Line one\n\nLine two");
    });
    it("still marks the flag as provided so it is not reported as unknown", () => {
      const p = write("b.md", "hello");
      const r = parseWriteArgs([`--request-file=${p}`]);
      expect(r.provided.has("request-file")).toBe(true);
      expect(computeWarnings(r.provided)).toEqual([]);
    });
    it("emits no warning when the file is the only request source", () => {
      const p = write("b.md", "hello");
      expect(parseWriteArgs([`--request-file=${p}`]).warnings).toEqual([]);
    });
    it("composes with other flags", () => {
      const p = write("b.md", "the brief");
      const r = parseWriteArgs([`--request-file=${p}`, "--type=bio", "--medium=company-about"]);
      expect(r.options.request).toBe("the brief");
      expect(r.options.type).toBe("bio");
      expect(r.options.medium).toBe("company-about");
    });
  });

  describe("input boundaries", () => {
    it("reads a single-character file", () => {
      expect(parseWriteArgs([`--request-file=${write("b.md", "x")}`]).options.request).toBe("x");
    });
    it('reads a file whose entire content is the falsy-looking string "0"', () => {
      expect(parseWriteArgs([`--request-file=${write("b.md", "0")}`]).options.request).toBe("0");
    });
    it("strips a leading UTF-8 BOM", () => {
      expect(parseWriteArgs([`--request-file=${write("b.md", "﻿brief text")}`]).options.request).toBe("brief text");
    });
    it("preserves CRLF line endings inside the body", () => {
      expect(parseWriteArgs([`--request-file=${write("b.md", "a\r\nb")}`]).options.request).toBe("a\r\nb");
    });
    it("preserves unicode and emoji", () => {
      expect(parseWriteArgs([`--request-file=${write("b.md", "học tập 🔮 chăm chỉ")}`]).options.request).toBe("học tập 🔮 chăm chỉ");
    });
    it("reads a very long brief intact", () => {
      const body = "word ".repeat(10000).trim();
      expect(parseWriteArgs([`--request-file=${write("b.md", body)}`]).options.request).toBe(body);
    });
    it("reads a path containing spaces", () => {
      expect(parseWriteArgs([`--request-file=${write("my brief.md", "spaced")}`]).options.request).toBe("spaced");
    });
  });

  describe("error handling", () => {
    it("throws ParamsError naming the path when the file does not exist", () => {
      const missing = path.join(dir, "nope.md");
      expect(() => parseWriteArgs([`--request-file=${missing}`])).toThrow(ParamsError);
      expect(() => parseWriteArgs([`--request-file=${missing}`])).toThrow(/could not be read/);
      expect(() => parseWriteArgs([`--request-file=${missing}`])).toThrow(missing);
    });
    it("throws ParamsError when the path is a directory", () => {
      expect(() => parseWriteArgs([`--request-file=${dir}`])).toThrow(/could not be read/);
    });
    it("throws ParamsError when the file is empty", () => {
      expect(() => parseWriteArgs([`--request-file=${write("b.md", "")}`])).toThrow(/is empty/);
    });
    it("throws ParamsError when the file is whitespace-only", () => {
      expect(() => parseWriteArgs([`--request-file=${write("b.md", "  \n\t\n ")}`])).toThrow(/is empty/);
    });
    it("throws when the flag is passed bare with no path", () => {
      expect(() => parseWriteArgs(["--request-file"])).toThrow(/requires a path/);
    });
    it("throws when the flag is passed with an empty value", () => {
      expect(() => parseWriteArgs(["--request-file="])).toThrow(/requires a path/);
    });
    it("throws when the path is whitespace-only", () => {
      expect(() => parseWriteArgs(["--request-file=   "])).toThrow(/requires a path/);
    });
    it("never fails silently — the run stops rather than proceeding with no request", () => {
      let caught: any = null;
      try { parseWriteArgs([`--request-file=${path.join(dir, "ghost.md")}`, "--type=blog"]); } catch (e) { caught = e; }
      expect(caught).toBeInstanceOf(ParamsError);
      expect(caught.name).toBe("ParamsError");
    });
  });

  describe("cross-parameter interactions", () => {
    it("--request wins over --request-file, and the file is reported as ignored", () => {
      const p = write("b.md", "from file");
      const r = parseWriteArgs([`--request-file=${p}`, "--request=inline wins"]);
      expect(r.options.request).toBe("inline wins");
      expect(r.warnings).toEqual([expect.stringContaining("--request-file ignored")]);
    });
    it("a positional request also wins over --request-file", () => {
      const p = write("b.md", "from file");
      const r = parseWriteArgs(["positional", "wins", `--request-file=${p}`]);
      expect(r.options.request).toBe("positional wins");
      expect(r.warnings).toEqual([expect.stringContaining("--request-file ignored")]);
    });
    it("does not read the file at all when an inline request wins", () => {
      // a nonexistent path must NOT throw when the file is not the request source
      const r = parseWriteArgs(["inline", `--request-file=${path.join(dir, "missing.md")}`]);
      expect(r.options.request).toBe("inline");
      expect(r.warnings).toEqual([expect.stringContaining("--request-file ignored")]);
    });
    it("warns exactly once when ignored", () => {
      const p = write("b.md", "x");
      expect(parseWriteArgs(["inline", `--request-file=${p}`]).warnings).toHaveLength(1);
    });
    it("distill: the author slug is unaffected and the file still resolves the unused request", () => {
      const p = write("b.md", "notes");
      const r = parseWriteArgs(["distill", "seth-godin", `--request-file=${p}`]);
      expect(r.options["author-style"]).toBe("seth-godin");
      expect(r.subcommand).toBe("distill");
    });
  });

  describe("security", () => {
    it("treats file content as request TEXT — flags inside the file are not parsed", () => {
      const p = write("b.md", "--type=evil --push=twitter/all ; rm -rf /");
      const r = parseWriteArgs([`--request-file=${p}`]);
      expect(r.options.request).toBe("--type=evil --push=twitter/all ; rm -rf /");
      expect(r.options.type).toBeUndefined();
      expect(r.options.push).toBeUndefined();
      expect(r.provided.has("type")).toBe(false);
    });
    it("does not expand $-tokens or template markers in file content", () => {
      const p = write("b.md", "cap is $0.50 and $ARGUMENTS stays literal");
      expect(parseWriteArgs([`--request-file=${p}`]).options.request).toBe("cap is $0.50 and $ARGUMENTS stays literal");
    });
  });

  describe("behavioral relationships", () => {
    it("is idempotent — parsing the same argv twice yields the same request", () => {
      const p = write("b.md", "stable brief");
      const a = parseWriteArgs([`--request-file=${p}`]);
      const b = parseWriteArgs([`--request-file=${p}`]);
      expect(a.options.request).toBe(b.options.request);
    });
  });

  describe("readRequestFile (direct)", () => {
    it("returns trimmed contents", () => {
      expect(readRequestFile(write("b.md", "  hi  "))).toBe("hi");
    });
    it.each([[true], [undefined], [null], [42], [""], ["   "]])(
      "rejects non-path value %p", (v: any) => {
        expect(() => readRequestFile(v)).toThrow(/requires a path/);
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
  it("--research + --longform default to auto", () => {
    expect(DEFAULTS.research).toBe("auto");
    expect(DEFAULTS.longform).toBe("auto");
    expect(parseWriteArgs([]).options.research).toBe("auto");
    expect(parseWriteArgs(["--research=deep"]).options.research).toBe("deep");
  });
  it("--grounding is multi-value (+ and repeated)", () => {
    expect(parseWriteArgs(["--grounding=deepask+wiki"]).options.grounding).toEqual(["deepask", "wiki"]);
    expect(parseWriteArgs(["--grounding=deepask", "--grounding=brain"]).options.grounding).toEqual(["deepask", "brain"]);
    expect(parseWriteArgs([]).options.grounding).toEqual([]);
  });
  it("OUT_FORMATS + UNIVERSAL_PARAMS are non-empty", () => {
    expect(OUT_FORMATS.length).toBeGreaterThan(0);
    expect(UNIVERSAL_PARAMS).toContain("author-style");
  });
});
