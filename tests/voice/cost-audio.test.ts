import { describe, it, expect } from "vitest";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { estimateCost, ratePerMinute, CHARS_PER_MINUTE, DEFAULT_RATE_PER_MIN } = require("../../scripts/voice/lib/cost.cjs");
// @ts-ignore
const { pcmToWav, outputArgsFor, ffmpegAvailable } = require("../../scripts/voice/lib/audio.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). voice-platform v0.1 cost estimator + the PURE
// audio header wrapper. The ffmpeg shells are live-verified out-of-band (mp3 round-trips);
// here we test the pure pieces: rate resolution, minute/USD math, WAV header bytes,
// ffmpeg arg mapping.

describe("ratePerMinute", () => {
  it("known models resolve their $/min", () => {
    expect(ratePerMinute("gpt-4o-mini-tts")).toBe(0.015);
    expect(ratePerMinute("gemini-2.5-flash-preview-tts")).toBe(0.015);
    expect(ratePerMinute("gemini-3.1-flash-tts-preview")).toBe(0.03);
  });
  it("substring match (a dated snapshot id) still resolves", () => {
    expect(ratePerMinute("gpt-4o-mini-tts-2025-12-15")).toBe(0.015);
  });
  it("unknown / non-string → conservative default", () => {
    expect(ratePerMinute("mystery-model")).toBe(DEFAULT_RATE_PER_MIN);
    expect(ratePerMinute(undefined)).toBe(DEFAULT_RATE_PER_MIN);
  });
});

describe("estimateCost", () => {
  it("CHARS_PER_MINUTE of text ≈ 1 minute at the model rate", () => {
    const r = estimateCost({ chars: CHARS_PER_MINUTE, model: "gpt-4o-mini-tts" });
    expect(r.minutes).toBe(1);
    expect(r.usd).toBeCloseTo(0.015, 4);
    expect(r.isEstimate).toBe(true);
  });
  it("scales linearly with chars", () => {
    const a = estimateCost({ chars: 8500, model: "gemini-3.1-flash-tts-preview" });
    expect(a.minutes).toBe(10);
    expect(a.usd).toBeCloseTo(0.3, 4);
  });
  it("zero / negative / NaN chars → $0", () => {
    expect(estimateCost({ chars: 0, model: "gpt-4o-mini-tts" }).usd).toBe(0);
    expect(estimateCost({ chars: -100, model: "gpt-4o-mini-tts" }).usd).toBe(0);
    expect(estimateCost({ chars: NaN, model: "gpt-4o-mini-tts" }).usd).toBe(0);
  });
  it("unknown model uses the conservative default rate", () => {
    expect(estimateCost({ chars: CHARS_PER_MINUTE, model: "x" }).ratePerMin).toBe(DEFAULT_RATE_PER_MIN);
  });
});

describe("pcmToWav (pure header)", () => {
  it("prepends a 44-byte RIFF/WAVE header", () => {
    const wav = pcmToWav(Buffer.alloc(100));
    expect(wav.length).toBe(144);
    expect(wav.slice(0, 4).toString("ascii")).toBe("RIFF");
    expect(wav.slice(8, 12).toString("ascii")).toBe("WAVE");
    expect(wav.slice(36, 40).toString("ascii")).toBe("data");
  });
  it("encodes 24kHz / mono / 16-bit by default", () => {
    const wav = pcmToWav(Buffer.alloc(0));
    expect(wav.readUInt16LE(22)).toBe(1); // channels
    expect(wav.readUInt32LE(24)).toBe(24000); // sample rate
    expect(wav.readUInt16LE(34)).toBe(16); // bit depth
    expect(wav.readUInt32LE(40)).toBe(0); // data size for empty pcm
  });
  it("RIFF chunk size = 36 + dataSize", () => {
    const wav = pcmToWav(Buffer.alloc(200));
    expect(wav.readUInt32LE(4)).toBe(36 + 200);
    expect(wav.readUInt32LE(40)).toBe(200);
  });
  it("custom params are honored", () => {
    const wav = pcmToWav(Buffer.alloc(10), { sampleRate: 48000, channels: 2, bitDepth: 16 });
    expect(wav.readUInt32LE(24)).toBe(48000);
    expect(wav.readUInt16LE(22)).toBe(2);
    expect(wav.readUInt32LE(28)).toBe(48000 * 2 * 2); // byte rate
  });
  it("accepts a non-Buffer (coerces) without throwing", () => {
    expect(() => pcmToWav([] as any)).not.toThrow();
  });
});

describe("outputArgsFor", () => {
  it("pcm → raw s16le 24k mono", () => {
    expect(outputArgsFor("pcm")).toEqual(["-f", "s16le", "-ar", "24000", "-ac", "1"]);
  });
  it("opus/ogg → libopus; m4a/aac → aac", () => {
    expect(outputArgsFor("opus")).toEqual(["-c:a", "libopus"]);
    expect(outputArgsFor("ogg")).toEqual(["-c:a", "libopus"]);
    expect(outputArgsFor("m4a")).toEqual(["-c:a", "aac"]);
    expect(outputArgsFor("aac")).toEqual(["-c:a", "aac"]);
  });
  it("mp3/wav/flac → [] (codec inferred from extension)", () => {
    expect(outputArgsFor("mp3")).toEqual([]);
    expect(outputArgsFor("wav")).toEqual([]);
    expect(outputArgsFor("flac")).toEqual([]);
  });
});

describe("ffmpegAvailable", () => {
  it("returns a boolean (memoized; no throw)", () => {
    expect(typeof ffmpegAvailable()).toBe("boolean");
  });
});
