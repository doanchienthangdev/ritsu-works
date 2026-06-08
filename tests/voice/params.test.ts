import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const params = require("../../scripts/voice/lib/params.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). voice-platform v0.1 universal parameter
// layer (pure). parseVoiceArgs / normalize* / resolveInputSpec / pace* / resolveVoice /
// buildFallbackInstructions / computeWarnings / slugify. resolveVoice exercises the REAL
// voices.cjs catalog (contract 2N — actual handoff, not a mock).
// Skipped: state sequences (stateless pure); security beyond the literal-string flags
// (the param layer never executes input — the impure edges are gen.cjs/audio.cjs).

describe("parseVoiceArgs", () => {
  it("positional tokens join into _positional when no input flag is set", () => {
    const { options } = params.parseVoiceArgs(["hello", "world"]);
    expect(options._positional).toBe("hello world");
  });
  it("does NOT set _positional when --text is provided", () => {
    const { options } = params.parseVoiceArgs(["foo", "--text=explicit"]);
    expect(options._positional).toBeUndefined();
    expect(options.text).toBe("explicit");
  });
  it("--key=value sets the option and records it as provided", () => {
    const { options, provided } = params.parseVoiceArgs(["--type=ads", "--voice=Kore"]);
    expect(options.type).toBe("ads");
    expect(options.voice).toBe("Kore");
    expect(provided.has("type")).toBe(true);
    expect(provided.has("voice")).toBe(true);
  });
  it("boolean flags: bare → true; =false/0/no/off → false", () => {
    expect(params.parseVoiceArgs(["--dry-run"]).options["dry-run"]).toBe(true);
    expect(params.parseVoiceArgs(["--stitch=false"]).options.stitch).toBe(false);
    expect(params.parseVoiceArgs(["--stitch=0"]).options.stitch).toBe(false);
    expect(params.parseVoiceArgs(["--multi-speaker=no"]).options["multi-speaker"]).toBe(false);
    expect(params.parseVoiceArgs(["--markup=on"]).options.markup).toBe(true);
  });
  it("numeric flags coerce to Number; invalid falls back to the default", () => {
    expect(params.parseVoiceArgs(["--chunk-chars=500"]).options["chunk-chars"]).toBe(500);
    expect(params.parseVoiceArgs(["--concurrency=abc"]).options.concurrency).toBe(params.DEFAULTS.concurrency);
    expect(params.parseVoiceArgs(["--max-cost-usd=2.5"]).options["max-cost-usd"]).toBe(2.5);
  });
  it("defaults are applied; use defaults to gemini-tts-3.1-flash", () => {
    const { options } = params.parseVoiceArgs([]);
    expect(options.use).toBe("gemini-tts-3.1-flash");
    expect(options.type).toBe("default");
    expect(options.pace).toBe("normal");
    expect(options.format).toBe("mp3");
  });
  it("unknown flags are still recorded (forward-compat, no throw)", () => {
    const { options, provided } = params.parseVoiceArgs(["--zzz=1"]);
    expect(provided.has("zzz")).toBe(true);
    expect(options.zzz).toBe("1");
  });
  it("non-string argv entries are ignored", () => {
    const { options } = params.parseVoiceArgs([null as any, 42 as any, "--type=news"]);
    expect(options.type).toBe("news");
  });
  it("non-array argv → all defaults", () => {
    expect(params.parseVoiceArgs(undefined as any).options.type).toBe("default");
  });
});

describe("normalizeType / normalizePace / normalizeFormat", () => {
  it("known values pass through", () => {
    expect(params.normalizeType("podcast")).toBe("podcast");
    expect(params.normalizePace("very-fast")).toBe("very-fast");
    expect(params.normalizeFormat("flac")).toBe("flac");
  });
  it("unknown values fall back to the safe default", () => {
    expect(params.normalizeType("nope")).toBe("default");
    expect(params.normalizePace("warp")).toBe("normal");
    expect(params.normalizeFormat("aiff")).toBe("mp3");
  });
  it("undefined / empty falls back", () => {
    expect(params.normalizeType(undefined)).toBe("default");
    expect(params.normalizePace("")).toBe("normal");
  });
  it("every declared TYPE/PACE/FORMAT round-trips", () => {
    for (const t of params.TYPES) expect(params.normalizeType(t)).toBe(t);
    for (const p of params.PACES) expect(params.normalizePace(p)).toBe(p);
    for (const f of params.FORMATS) expect(params.normalizeFormat(f)).toBe(f);
  });
});

describe("TYPE_STYLE coverage (v0.2 — 23 registers)", () => {
  const v02 = ["film", "conversation", "language-learning", "public-speaking", "audiobook",
    "asmr", "sports", "documentary", "customer-support", "character", "poetry", "comedy"];
  it("TYPES includes every v0.2 register and totals 23", () => {
    for (const t of v02) expect(params.TYPES, `missing register "${t}"`).toContain(t);
    expect(params.TYPES.length).toBe(23);
  });
  it("every TYPES value has a non-empty TYPE_STYLE recipe (no orphan type)", () => {
    for (const t of params.TYPES) {
      expect(typeof params.TYPE_STYLE[t], `TYPE_STYLE missing for "${t}"`).toBe("string");
      expect(params.TYPE_STYLE[t].length).toBeGreaterThan(10);
    }
  });
  it("buildFallbackInstructions embeds each register's style", () => {
    for (const t of params.TYPES) {
      const ins = params.buildFallbackInstructions(t, "normal");
      expect(ins).toContain("Voice:");
      expect(ins).toContain(params.TYPE_STYLE[t]);
    }
  });
  it("the command doc lists every v0.2 register (contract 2N)", () => {
    const doc = fs.readFileSync(path.join(__dirname, "..", "..", ".claude", "commands", "voice.md"), "utf-8");
    for (const t of v02) expect(doc.includes(t), `register "${t}" missing from /voice doc`).toBe(true);
  });
});

describe("resolveInputSpec", () => {
  it("explicit --folder wins", () => {
    expect(params.resolveInputSpec({ folder: "/x", file: "/y", text: "z" })).toEqual({ mode: "folder", value: "/x" });
  });
  it("explicit --file beats --text", () => {
    expect(params.resolveInputSpec({ file: "/y", text: "z" })).toEqual({ mode: "file", value: "/y" });
  });
  it("explicit --text", () => {
    expect(params.resolveInputSpec({ text: "hello" })).toEqual({ mode: "text", value: "hello" });
  });
  it("positional existing file → file mode", () => {
    expect(params.resolveInputSpec({ _positional: __filename })).toEqual({ mode: "file", value: __filename });
  });
  it("positional existing directory → folder mode", () => {
    expect(params.resolveInputSpec({ _positional: __dirname })).toEqual({ mode: "folder", value: __dirname });
  });
  it("positional non-path string → inline text", () => {
    expect(params.resolveInputSpec({ _positional: "just some words to say" })).toEqual({ mode: "text", value: "just some words to say" });
  });
  it("empty options → empty inline text", () => {
    expect(params.resolveInputSpec({})).toEqual({ mode: "text", value: "" });
  });
});

describe("pace helpers", () => {
  it("paceToSpeed maps each pace; default for unknown", () => {
    expect(params.paceToSpeed("very-low")).toBe(0.7);
    expect(params.paceToSpeed("normal")).toBe(1.0);
    expect(params.paceToSpeed("very-fast")).toBe(1.4);
    expect(params.paceToSpeed("bogus")).toBe(1.0);
  });
  it("paceToPhrase returns a non-empty phrase", () => {
    expect(params.paceToPhrase("normal")).toMatch(/natural/i);
    expect(params.paceToPhrase("very-low")).toMatch(/slow/i);
  });
  it("paceToTag is '' for normal, bracketed otherwise", () => {
    expect(params.paceToTag("normal")).toBe("");
    expect(params.paceToTag("very-fast")).toBe("[extremely fast]");
    expect(params.paceToTag("low")).toBe("[slow]");
  });
});

describe("resolveVoice (contract: real voices.cjs catalog)", () => {
  it("explicit --voice, case-insensitive → canonical name", () => {
    expect(params.resolveVoice("openai-tts", { voice: "MARIN" }).voice).toBe("marin");
    expect(params.resolveVoice("gemini-tts-3.1-flash", { voice: "kore" }).voice).toBe("Kore");
  });
  it("unknown --voice → adapter default + a warning", () => {
    const r = params.resolveVoice("openai-tts", { voice: "nonexistent" });
    expect(r.voice).toBe("marin");
    expect(r.warnings.join(" ")).toMatch(/not a openai-tts voice/);
  });
  it("--gender picks the adapter default of that gender", () => {
    expect(params.resolveVoice("openai-tts", { gender: "male" }).voice).toBe("cedar");
    expect(params.resolveVoice("openai-tts", { gender: "female" }).voice).toBe("marin");
    expect(params.resolveVoice("gemini-tts-3.1-flash", { gender: "male" }).voice).toBe("Charon");
    expect(params.resolveVoice("gemini-tts-3.1-flash", { gender: "female" }).voice).toBe("Kore");
  });
  it("no voice/gender → adapter default", () => {
    expect(params.resolveVoice("openai-tts", {}).voice).toBe("marin");
    expect(params.resolveVoice("gemini-tts-3.1-flash", { gender: "any" }).voice).toBe("Kore");
  });
  it("unknown adapter → undefined voice + warning (no throw)", () => {
    const r = params.resolveVoice("no-such-adapter", { voice: "x" });
    expect(r.voice).toBeUndefined();
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe("buildFallbackInstructions", () => {
  it("encodes the type style and the pace phrase", () => {
    const ins = params.buildFallbackInstructions("ads", "fast");
    expect(ins).toMatch(/energetic|persuasive/);
    expect(ins).toMatch(/briskly/);
    expect(ins).toMatch(/Voice:/);
    expect(ins).toMatch(/Pacing:/);
  });
  it("unknown type → default style; never throws", () => {
    expect(params.buildFallbackInstructions("bogus", "normal")).toMatch(/clear, natural, friendly/);
  });
});

describe("computeWarnings", () => {
  const openaiCaps = { supports: ["voice", "pace", "instructions", "lang", "format"], unsupported_warn: ["speed", "multi-speaker", "markup", "style"] };
  it("supported flags do not warn", () => {
    expect(params.computeWarnings(openaiCaps, new Set(["voice", "format"]))).toEqual([]);
  });
  it("unsupported flags warn with a consequence", () => {
    const w = params.computeWarnings(openaiCaps, new Set(["speed", "multi-speaker"]));
    expect(w.length).toBe(2);
    expect(w.join(" ")).toMatch(/speed/);
    expect(w.join(" ")).toMatch(/multi-speaker/);
  });
  it("operational plumbing flags never warn (text-file/out/dry-run/etc.)", () => {
    expect(params.computeWarnings(openaiCaps, new Set(["text-file", "instructions-file", "out", "name", "dry-run", "chunk-chars"]))).toEqual([]);
  });
  it("unknown flags get the 'not a recognized /voice flag' warning", () => {
    expect(params.computeWarnings(openaiCaps, new Set(["zzz"]))[0]).toMatch(/not a recognized \/voice flag/);
  });
  it("missing caps → empty supports, plain unsupported warnings", () => {
    expect(params.computeWarnings(undefined, new Set(["voice"]))[0]).toMatch(/not supported/);
  });
});

describe("slugify", () => {
  it("kebab-cases and strips punctuation", () => {
    expect(params.slugify("Hello, World!")).toBe("hello-world");
  });
  it("caps at 6 words and 40 chars", () => {
    expect(params.slugify("a b c d e f g h").split("-").length).toBeLessThanOrEqual(6);
    expect(params.slugify("x".repeat(80)).length).toBeLessThanOrEqual(40);
  });
  it("empty / falsy → 'voice'", () => {
    expect(params.slugify("")).toBe("voice");
    expect(params.slugify(null)).toBe("voice");
    expect(params.slugify("!!!")).toBe("voice");
  });
});
