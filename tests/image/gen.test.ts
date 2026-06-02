import { describe, it, expect } from "vitest";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";
// @ts-ignore — Node interop from TS to CJS (repo convention)
const {
  run,
  loadRegistry,
  resolveAdapter,
  buildPayload,
  classifyError,
  slugify,
} = require("../../scripts/image/gen.cjs");

// All-Edge-Cases-Test (global CLAUDE.md). image-platform gen.cjs orchestrator
// (capability image-platform v0.1 PR-1). The fetch/API is the impure edge — NOT exercised
// here; every assertion uses a no-network path (dry_run / not_built / breaker_refusal /
// validation error) or a pure helper (resolveAdapter / buildPayload / classifyError / slugify).
// Contract test (2N): run() consumes the REAL knowledge/image-adapters.yaml via loadRegistry.

const TMP = path.join(os.tmpdir(), "image-gen-test");

describe("loadRegistry (contract: the real registry)", () => {
  it("loads the 5 v0.1 adapters incl. gpt-image-2 (installed) + stubs", () => {
    const adapters = loadRegistry();
    const ids = adapters.map((a: any) => a.id);
    expect(ids).toContain("gpt-image-2");
    expect(ids).toContain("gpt-image-2-pro-max");
    expect(ids).toContain("midjourney");
    const real = adapters.find((a: any) => a.id === "gpt-image-2");
    expect(real.status).toBe("installed");
    expect(real.generator).toBe("scripts/image/gen.cjs");
  });
});

describe("resolveAdapter", () => {
  it("resolves a plain installed adapter to itself", () => {
    const adapters = loadRegistry();
    const r = resolveAdapter(adapters, "gpt-image-2");
    expect(r.error).toBeUndefined();
    expect(r.target.id).toBe("gpt-image-2");
    expect(r.presetFlags).toEqual({});
  });
  it("resolves a preset to its target + carries preset_flags", () => {
    const adapters = loadRegistry();
    const r = resolveAdapter(adapters, "gpt-image-2-pro-max");
    expect(r.target.id).toBe("gpt-image-2");
    expect(r.presetFlags).toMatchObject({ enhance: true, quality: "high" });
  });
  it("returns an error object for an unknown --use", () => {
    const adapters = loadRegistry();
    const r = resolveAdapter(adapters, "does-not-exist");
    expect(r.error).toMatch(/unknown adapter/);
  });
});

describe("classifyError", () => {
  it("classifies moderation/content-policy strings as moderation_block", () => {
    expect(classifyError("Your request was rejected by content_policy")).toBe("moderation_block");
    expect(classifyError("moderation: blocked")).toBe("moderation_block");
    expect(classifyError("safety system flagged this")).toBe("moderation_block");
  });
  it("classifies other errors as api_error", () => {
    expect(classifyError("400: invalid size")).toBe("api_error");
    expect(classifyError("rate limit exceeded")).toBe("api_error");
  });
});

describe("slugify", () => {
  it("kebabs, strips punctuation, caps words+length", () => {
    expect(slugify("A Calm Mountain Lake!")).toBe("a-calm-mountain-lake");
    expect(slugify("")).toBe("image");
    expect(slugify(undefined)).toBe("image");
    const long = slugify("one two three four five six seven eight nine ten");
    expect(long.split("-").length).toBeLessThanOrEqual(6);
  });
});

describe("buildPayload (richer-than-baseline, safe defaults)", () => {
  const base = { prompt: "x", size: "1024x1024", quality: "medium", n: 1 };
  it("default png run == the proven minimal baseline (no extra fields)", () => {
    const p = buildPayload({ ...base, options: { format: "png" }, provided: new Set() });
    expect(p).toEqual({ model: "gpt-image-2", prompt: "x", size: "1024x1024", quality: "medium", n: 1 });
  });
  it("adds output_format only for jpeg/webp", () => {
    const p = buildPayload({ ...base, options: { format: "webp" }, provided: new Set(["format"]) });
    expect(p.output_format).toBe("webp");
  });
  it("adds moderation only when --safety explicitly provided", () => {
    const off = buildPayload({ ...base, options: { format: "png", safety: "standard" }, provided: new Set() });
    expect(off.moderation).toBeUndefined();
    const on = buildPayload({ ...base, options: { format: "png", safety: "relaxed" }, provided: new Set(["safety"]) });
    expect(on.moderation).toBe("low");
  });
  it("honors --model override", () => {
    const p = buildPayload({ ...base, options: { format: "png", model: "gpt-image-2-experimental" }, provided: new Set() });
    expect(p.model).toBe("gpt-image-2-experimental");
  });
});

describe("run() — no-network outcomes (the impure edge is NOT hit)", () => {
  it("dry_run: writes run.json + prompt sidecar, no files, ok=true", async () => {
    const out = path.join(TMP, "dry");
    const r = await run(["--prompt=test scene", "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe("dry_run");
    expect(r.files).toEqual([]);
    expect(fs.existsSync(path.join(out, "run.json"))).toBe(true);
    expect(fs.existsSync(path.join(out, "01.png.prompt.txt"))).toBe(true);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.outcome).toBe("dry_run");
    expect(rj.prompt_sent).toBe("test scene");
    expect(rj.size).toBe("1024x1024");
  });
  it("not_built: --use=midjourney → ok=false, outcome not_built, cites registry", async () => {
    const r = await run(["--prompt=x", "--use=midjourney"]);
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("not_built");
    expect(r.error).toMatch(/registered-not-built/);
  });
  it("breaker_refusal: estimate over --max-cost-usd aborts before any call", async () => {
    const out = path.join(TMP, "brk");
    const r = await run(["--prompt=x", "--quality=high", "--max-cost-usd=0.001", `--out=${out}`]);
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("breaker_refusal");
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.breaker_tripped).toBe(true);
  });
  it("missing prompt → ok=false with a clear error", async () => {
    const r = await run(["--dry-run", `--out=${path.join(TMP, "noprompt")}`]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/prompt is required/);
  });
  it("preset pro-max applies enhance+high (size 2048x2048) via dry_run", async () => {
    const out = path.join(TMP, "preset");
    const r = await run(["--prompt=x", "--use=gpt-image-2-pro-max", "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.enhance).toBe(true);
    expect(rj.quality).toBe("high");
    expect(rj.size).toBe("2048x2048");
  });
  it("--seed on gpt-image-2 → still ok (dry_run) + a consequence-honest warning", async () => {
    const out = path.join(TMP, "seed");
    const r = await run(["--prompt=x", "--seed=42", "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    expect(r.warnings.join(" ")).toMatch(/NOT reproducible/);
  });
});
