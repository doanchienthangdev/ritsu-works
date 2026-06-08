import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { OPENAI_VOICES, GEMINI_VOICES, CATALOG, catalogFor, findVoice } = require("../../scripts/voice/lib/voices.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). voice-platform v0.1 voice catalogs (pure data)
// + the doc-sync CONTRACT (2N): the /voice command doc voice tables must list exactly the
// voices in voices.cjs, so the founder-facing catalog never drifts from the resolver.

describe("catalog integrity", () => {
  it("OpenAI has 13 voices, Gemini has 30", () => {
    expect(OPENAI_VOICES.length).toBe(13);
    expect(GEMINI_VOICES.length).toBe(30);
  });
  it("every voice has a name, a gender, and a descriptor", () => {
    for (const v of [...OPENAI_VOICES, ...GEMINI_VOICES]) {
      expect(typeof v.name).toBe("string");
      expect(v.name.length).toBeGreaterThan(0);
      expect(["male", "female", "neutral"]).toContain(v.gender);
      expect(typeof v.descriptor).toBe("string");
      expect(v.descriptor.length).toBeGreaterThan(0);
    }
  });
  it("voice names are unique within each adapter", () => {
    const oNames = OPENAI_VOICES.map((v: any) => v.name);
    const gNames = GEMINI_VOICES.map((v: any) => v.name);
    expect(new Set(oNames).size).toBe(oNames.length);
    expect(new Set(gNames).size).toBe(gNames.length);
  });
  it("each adapter default + defaultByGender are real voices in that catalog", () => {
    for (const [id, cat] of Object.entries(CATALOG) as any) {
      expect(findVoice(id, cat.default)).not.toBeNull();
      for (const g of Object.keys(cat.defaultByGender)) {
        expect(findVoice(id, cat.defaultByGender[g])).not.toBeNull();
      }
    }
  });
});

describe("findVoice", () => {
  it("case-insensitive lookup → canonical record", () => {
    expect(findVoice("openai-tts", "MARIN").name).toBe("marin");
    expect(findVoice("gemini-tts-3.1-flash", "kore").name).toBe("Kore");
  });
  it("miss → null", () => {
    expect(findVoice("openai-tts", "zzz")).toBeNull();
    expect(findVoice("gemini-tts-3.1-flash", "")).toBeNull();
  });
  it("unknown adapter → null", () => {
    expect(findVoice("no-such", "marin")).toBeNull();
  });
  it("non-string voiceName → null (no throw)", () => {
    expect(findVoice("openai-tts", null as any)).toBeNull();
  });
});

describe("catalogFor (alias map)", () => {
  it("resolves a preset alias to its target catalog", () => {
    expect(catalogFor("whisper", { whisper: "openai-tts" })).toBe(CATALOG["openai-tts"]);
  });
  it("unknown → null", () => {
    expect(catalogFor("nope")).toBeNull();
  });
});

describe("contract 2N — command doc tables match voices.cjs", () => {
  const doc = fs.readFileSync(path.join(__dirname, "..", "..", ".claude", "commands", "voice.md"), "utf-8");
  it("every OpenAI voice name appears in the command doc", () => {
    for (const v of OPENAI_VOICES) {
      expect(doc.includes(v.name), `openai voice "${v.name}" missing from /voice doc`).toBe(true);
    }
  });
  it("every Gemini voice name appears in the command doc", () => {
    for (const v of GEMINI_VOICES) {
      expect(doc.includes(v.name), `gemini voice "${v.name}" missing from /voice doc`).toBe(true);
    }
  });
  it("the doc states the correct voice counts (13 + 30)", () => {
    expect(doc).toMatch(/13 voices/);
    expect(doc).toMatch(/30 voices/);
  });
});
