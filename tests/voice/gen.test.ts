import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const gen = require("../../scripts/voice/gen.cjs");
// @ts-ignore
const { UNIVERSAL_PARAMS } = require("../../scripts/voice/lib/params.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). voice-platform v0.1 gen.cjs PURE surface
// (registry/model/pace resolution + arg parsing) + the registry CONTRACT (loadRegistry
// reads the REAL knowledge/voice-adapters.yaml — contract 2N, not a mock). The provider
// calls + file writes are live-verified out-of-band; not unit-tested here.

const adapters = gen.loadRegistry();

describe("loadRegistry (real voice-adapters.yaml)", () => {
  it("loads adapters and includes both real engines + the whisper preset", () => {
    const ids = adapters.map((a: any) => a.id);
    expect(ids).toContain("gemini-tts-3.1-flash");
    expect(ids).toContain("openai-tts");
    expect(ids).toContain("whisper");
  });
  it("every adapter's supports[] ⊆ UNIVERSAL_PARAMS (contract with params.cjs)", () => {
    const universal = new Set(UNIVERSAL_PARAMS);
    for (const a of adapters) {
      for (const p of [...(a.supports || []), ...(a.unsupported_warn || [])]) {
        expect(universal.has(p), `"${p}" on ${a.id} not in UNIVERSAL_PARAMS`).toBe(true);
      }
    }
  });
});

describe("resolveAdapter", () => {
  it("a plain installed adapter resolves to itself", () => {
    const r = gen.resolveAdapter(adapters, "gemini-tts-3.1-flash");
    expect(r.error).toBeUndefined();
    expect(r.target.id).toBe("gemini-tts-3.1-flash");
  });
  it("a preset resolves to its target (whisper → openai-tts)", () => {
    const r = gen.resolveAdapter(adapters, "whisper");
    expect(r.target.id).toBe("openai-tts");
  });
  it("an unknown adapter → typed error", () => {
    const r = gen.resolveAdapter(adapters, "no-such");
    expect(r.error).toMatch(/unknown adapter/);
    expect(r.target).toBeUndefined();
  });
  it("a registered-not-built stub resolves (status checked downstream in run())", () => {
    const r = gen.resolveAdapter(adapters, "azure-tts");
    expect(r.error).toBeUndefined();
    expect(r.target.status).toBe("registered-not-built");
  });
});

describe("resolveModel", () => {
  const gemini = adapters.find((a: any) => a.id === "gemini-tts-3.1-flash");
  it("no override → the adapter default_model", () => {
    expect(gen.resolveModel(gemini)).toBe("gemini-3.1-flash-tts-preview");
  });
  it("friendly aliases map to the real provider ids", () => {
    expect(gen.resolveModel(gemini, "gemini-2.5-flash")).toBe("gemini-2.5-flash-preview-tts");
    expect(gen.resolveModel(gemini, "gemini-2.5-pro")).toBe("gemini-2.5-pro-preview-tts");
    expect(gen.resolveModel(gemini, "gemini-tts-3.1-flash")).toBe("gemini-3.1-flash-tts-preview");
  });
  it("an unknown override passes through verbatim", () => {
    expect(gen.resolveModel(gemini, "some-future-model")).toBe("some-future-model");
  });
  it("MODEL_ALIAS maps whisper → gpt-4o-mini-tts", () => {
    expect(gen.MODEL_ALIAS.whisper).toBe("gpt-4o-mini-tts");
  });
});

describe("withPace", () => {
  it("normal pace → instructions unchanged", () => {
    expect(gen.withPace("Voice: a clear voice.", "normal")).toBe("Voice: a clear voice.");
  });
  it("non-normal pace appends a Pacing line", () => {
    expect(gen.withPace("Voice: a clear voice.", "fast")).toMatch(/Pacing: speak brisk/);
  });
  it("does NOT double-state when pace is already mentioned", () => {
    const ins = "Voice: x. Pacing: speak slowly with pauses.";
    expect(gen.withPace(ins, "very-low")).toBe(ins);
  });
});

describe("parseArgs (gen)", () => {
  it("reads the file-path plumbing flags", () => {
    const o = gen.parseArgs(["--text-file=/a.txt", "--instructions-file=/b.txt", "--name=003", "--out=/d"]);
    expect(o["text-file"]).toBe("/a.txt");
    expect(o["instructions-file"]).toBe("/b.txt");
    expect(o.name).toBe("003");
    expect(o.out).toBe("/d");
  });
  it("OPENAI_NATIVE contains the direct-write formats and not m4a/ogg", () => {
    expect(gen.OPENAI_NATIVE.has("mp3")).toBe(true);
    expect(gen.OPENAI_NATIVE.has("wav")).toBe(true);
    expect(gen.OPENAI_NATIVE.has("pcm")).toBe(true);
    expect(gen.OPENAI_NATIVE.has("m4a")).toBe(false);
    expect(gen.OPENAI_NATIVE.has("ogg")).toBe(false);
  });
});

describe("run — pure short-circuits (no network)", () => {
  it("unknown adapter → typed api_error without spending", async () => {
    const r = await gen.run(["--use=no-such", "--text=hi"]);
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("api_error");
  });
  it("registered-not-built adapter → not_built", async () => {
    const r = await gen.run(["--use=azure-tts", "--text=hi"]);
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("not_built");
  });
  it("empty input → input_error", async () => {
    const r = await gen.run(["--use=openai-tts", "--text=   "]);
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("input_error");
  });
});
