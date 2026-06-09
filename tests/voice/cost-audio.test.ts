import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { spawnSync } from "child_process";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const { estimateCost, ratePerMinute, CHARS_PER_MINUTE, DEFAULT_RATE_PER_MIN } = require("../../scripts/voice/lib/cost.cjs");
// @ts-ignore
const { pcmToWav, outputArgsFor, ffmpegAvailable, measureLoudness, normalizeLoudness, stitchAudio, DEFAULT_LUFS, LEVELING_CHAIN } = require("../../scripts/voice/lib/audio.cjs");

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

// v0.3 loudness-consistency (ffmpeg-backed). Skipped entirely when ffmpeg is absent so the
// suite stays green in a bare environment. Generates two tones at DIFFERENT loudness and proves
// normalization converges them to one target (the cure for the "lúc to lúc nhỏ" volume drift).
const HAVE_FFMPEG = ffmpegAvailable();
const d = HAVE_FFMPEG ? describe : describe.skip;
d("loudness consistency (loudnorm)", () => {
  let tmp: string; let loudWav: string; let quietWav: string;
  const tone = (out: string, vol: string) => spawnSync("ffmpeg",
    ["-y", "-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", "sine=frequency=300:duration=4", "-af", `volume=${vol}`, "-ar", "24000", "-ac", "1", out],
    { encoding: "utf-8" });
  beforeAll(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "voice-loud-test-"));
    loudWav = path.join(tmp, "loud.wav"); quietWav = path.join(tmp, "quiet.wav");
    tone(loudWav, "-3dB"); tone(quietWav, "-18dB");
  });

  it("DEFAULT_LUFS targets the audiobook standard (-16 LUFS)", () => {
    expect(DEFAULT_LUFS.i).toBe(-16);
  });
  it("measureLoudness reports a numeric input_i for a real file", () => {
    const m = measureLoudness(loudWav);
    expect(m).not.toBeNull();
    expect(Number.isFinite(Number(m.input_i))).toBe(true);
  });
  it("the two tones start at DIFFERENT loudness (the inconsistency to fix)", () => {
    const a = Number(measureLoudness(loudWav).input_i);
    const b = Number(measureLoudness(quietWav).input_i);
    expect(Math.abs(a - b)).toBeGreaterThan(5); // clearly audible gap
  });
  it("normalizeLoudness converges both to ~ -16 LUFS (gap shrinks below ~2 LU)", () => {
    const ln = path.join(tmp, "loud-n.wav"); const qn = path.join(tmp, "quiet-n.wav");
    expect(normalizeLoudness(loudWav, ln, { i: -16 }).ok).toBe(true);
    expect(normalizeLoudness(quietWav, qn, { i: -16 }).ok).toBe(true);
    const a = Number(measureLoudness(ln).input_i);
    const b = Number(measureLoudness(qn).input_i);
    expect(Math.abs(a - (-16))).toBeLessThan(2.5);
    expect(Math.abs(b - (-16))).toBeLessThan(2.5);
    expect(Math.abs(a - b)).toBeLessThan(2); // now uniform
  });
  it("stitchAudio with normalize:true joins both into one valid file + reports normalized", () => {
    const out = path.join(tmp, "stitched.mp3");
    const r = stitchAudio([loudWav, quietWav], out, "mp3", { normalize: true, targetLufs: -16 });
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe(true);
    expect(fs.existsSync(out)).toBe(true);
    expect(fs.statSync(out).size).toBeGreaterThan(0);
  });
  it("stitchAudio with normalize:false still works (raw concat)", () => {
    const out = path.join(tmp, "stitched-raw.mp3");
    const r = stitchAudio([loudWav, quietWav], out, "mp3", { normalize: false });
    expect(r.ok).toBe(true);
    expect(fs.existsSync(out)).toBe(true);
  });
  it("empty parts → typed error (never throws)", () => {
    expect(stitchAudio([], path.join(tmp, "x.mp3"), "mp3").ok).toBe(false);
  });

  // v0.3.1 — dynamic leveling CONTRACT. (The efficacy — LRA ~20 → ~4 on real speech, the cure for
  // "các đoạn tiếng nhỏ" — is an integration fact proven by the A/B measurement, not synthesizable
  // reliably from tones; here we assert the leveling stage is actually wired + applied.)
  it("LEVELING_CHAIN compresses then dynamically normalizes (acompressor → dynaudnorm)", () => {
    expect(LEVELING_CHAIN).toContain("acompressor");
    expect(LEVELING_CHAIN).toContain("dynaudnorm");
  });
  it("normalizeLoudness applies leveling by default, and skips it with level:false", () => {
    const out1 = path.join(tmp, "lev-on.wav"); const out2 = path.join(tmp, "lev-off.wav");
    const r1 = normalizeLoudness(loudWav, out1); // default
    const r2 = normalizeLoudness(loudWav, out2, { level: false });
    expect(r1.ok).toBe(true); expect(r1.leveled).toBe(true);
    expect(r2.ok).toBe(true); expect(r2.leveled).toBe(false);
    expect(fs.existsSync(out1) && fs.existsSync(out2)).toBe(true);
  });
  it("stitchAudio reports leveled:true by default and leveled:false with level:false", () => {
    const a = stitchAudio([loudWav, quietWav], path.join(tmp, "s-lev.mp3"), "mp3");
    const b = stitchAudio([loudWav, quietWav], path.join(tmp, "s-flat.mp3"), "mp3", { level: false });
    expect(a.ok).toBe(true); expect(a.leveled).toBe(true);
    expect(b.ok).toBe(true); expect(b.leveled).toBe(false);
  });
  it("DEFAULT_LUFS now targets a tight loudness range (audiobook-uniform)", () => {
    expect(DEFAULT_LUFS.lra).toBeLessThanOrEqual(6);
  });
});
