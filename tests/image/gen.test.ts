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
  mimeForImage,
  OPENAI_IMAGES_EDITS_URL,
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

// v0.2 — design-system --style wiring + --ref/--mask reference-guided generation.
describe("mimeForImage", () => {
  it("maps extensions to image mime types (default png)", () => {
    expect(mimeForImage("a.png")).toBe("image/png");
    expect(mimeForImage("a.jpg")).toBe("image/jpeg");
    expect(mimeForImage("a.jpeg")).toBe("image/jpeg");
    expect(mimeForImage("a.webp")).toBe("image/webp");
    expect(mimeForImage("a.gif")).toBe("image/png"); // fallback
  });
});

describe("OPENAI_IMAGES_EDITS_URL", () => {
  it("is the /v1/images/edits endpoint (derived from /generations)", () => {
    expect(OPENAI_IMAGES_EDITS_URL).toMatch(/\/v1\/images\/edits$/);
  });
});

describe("run() — v0.2 --style + --ref (no-network paths)", () => {
  // A committed, reliably-present image used as a reference fixture (absolute path → cwd-independent).
  const REF = path.resolve(__dirname, "../../00-core/design-system/ritsu/assets/ritsu-logo.png");

  it("--style=ritsu (dry_run) → run.json style_mode=styled + brand block in prompt_sent", async () => {
    const out = path.join(TMP, "style");
    const r = await run(["--prompt=a calm lake", "--style=ritsu", "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.style).toBe("ritsu");
    expect(rj.style_mode).toBe("styled");
    expect(rj.prompt_input).toBe("a calm lake");
    expect(rj.prompt_sent).toMatch(/brand design system/); // composed, not raw
    expect(rj.endpoint).toBe("generations"); // no --ref
  });

  it("plain (no --style) → style_mode=plain, prompt_sent == prompt_input", async () => {
    const out = path.join(TMP, "plain");
    const r = await run(["--prompt=just this", "--dry-run", `--out=${out}`]);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.style_mode).toBe("plain");
    expect(rj.prompt_sent).toBe("just this");
  });

  it("--ref=<existing> (dry_run) → endpoint=edits, ref recorded, NO api call", async () => {
    const out = path.join(TMP, "ref-ok");
    const r = await run(["--prompt=restyle this", `--ref=${REF}`, "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    expect(r.outcome).toBe("dry_run");
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.endpoint).toBe("edits");
    expect(rj.ref).toEqual([REF]);
  });

  it("--ref=<missing> → ok=false api_error before any call", async () => {
    const r = await run(["--prompt=x", "--ref=/tmp/nope-does-not-exist.png", "--dry-run", `--out=${path.join(TMP, "ref-missing")}`]);
    expect(r.ok).toBe(false);
    expect(r.outcome).toBe("api_error");
    expect(r.error).toMatch(/--ref file not found/);
  });

  it("--mask=<missing> → ok=false api_error", async () => {
    const r = await run(["--prompt=x", `--ref=${REF}`, "--mask=/tmp/nope-mask.png", "--dry-run", `--out=${path.join(TMP, "mask-missing")}`]);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/--mask file not found/);
  });
});

// v0.3 — brand corner logo OVERLAY routing (ritsu declares a logo.overlay policy).
describe("run() — v0.3 brand logo overlay (no-network dry_run paths)", () => {
  const REF = path.resolve(__dirname, "../../00-core/design-system/ritsu/assets/ritsu-logo.png");

  it("--style=ritsu + --ref → endpoint flips to generations, logo_overlay intent recorded, directive in prompt", async () => {
    const out = path.join(TMP, "overlay");
    const r = await run(["--prompt=poster", "--style=ritsu", `--ref=${REF}`, "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.endpoint).toBe("generations"); // NOT edits — the ref triggers a clean-base + overlay
    expect(rj.logo_overlay).toBeTruthy();
    expect(rj.logo_overlay.position).toBe("top-left");
    expect(rj.logo_overlay.applied).toBe(false); // dry-run never stamps
    // the stamped asset is the brand's canonical LOCKUP (mark + wordmark), not the raw --ref;
    // the --ref is recorded as the trigger.
    expect(rj.logo_overlay.asset).toMatch(/ritsu-lockup\.png$/);
    expect(rj.logo_overlay.trigger_ref).toBe(REF);
    expect(rj.prompt_sent).toMatch(/Do NOT draw/); // suppress-directive present
  });

  it("--style=ritsu WITHOUT --ref → no overlay (logo_overlay null), no suppress directive", async () => {
    const out = path.join(TMP, "no-overlay");
    await run(["--prompt=poster", "--style=ritsu", "--dry-run", `--out=${out}`]);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.logo_overlay).toBeNull();
    expect(rj.prompt_sent).not.toMatch(/Do NOT draw/);
  });

  it("--ref WITHOUT a brand --style → keeps edits endpoint (overlay is brand-scoped)", async () => {
    const out = path.join(TMP, "ref-nostyle");
    await run(["--prompt=x", `--ref=${REF}`, "--dry-run", `--out=${out}`]);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.endpoint).toBe("edits");
    expect(rj.logo_overlay).toBeNull();
  });

  it("overlay + --mask → mask-ignored warning (no inpaint mask on /generations)", async () => {
    const r = await run(["--prompt=x", "--style=ritsu", `--ref=${REF}`, `--mask=${REF}`, "--dry-run", `--out=${path.join(TMP, "overlay-mask")}`]);
    expect(r.warnings.some((w: string) => /--mask ignored/.test(w))).toBe(true);
  });

  it("overlay + non-png --format → 'overlay needs PNG' warning (corner logo not stamped)", async () => {
    const r = await run(["--prompt=x", "--style=ritsu", `--ref=${REF}`, "--format=webp", "--dry-run", `--out=${path.join(TMP, "overlay-webp")}`]);
    expect(r.warnings.some((w: string) => /overlay needs PNG/.test(w))).toBe(true);
  });
});

// v0.4 — --use=pro-max retrieval-augmented preset (the gpt-image-2-pro-max backend).
describe("run() — v0.4 pro-max preset (no-network dry_run)", () => {
  const REF = path.resolve(__dirname, "../../00-core/design-system/ritsu/assets/ritsu-logo.png");

  it("resolveAdapter('pro-max') → target gpt-image-2 + enhance/enhance-mode/quality preset flags", () => {
    const adapters = loadRegistry();
    const r = resolveAdapter(adapters, "pro-max");
    expect(r.error).toBeUndefined();
    expect(r.target.id).toBe("gpt-image-2");           // preset_of resolves to the real backend
    expect(r.presetFlags.enhance).toBe(true);
    expect(r.presetFlags["enhance-mode"]).toBe("pro-max");
    expect(r.presetFlags.quality).toBe("high");
  });

  it("'gpt-image-2-pro-max' long-form alias resolves to the same preset", () => {
    const adapters = loadRegistry();
    const r = resolveAdapter(adapters, "gpt-image-2-pro-max");
    expect(r.target.id).toBe("gpt-image-2");
    expect(r.presetFlags["enhance-mode"]).toBe("pro-max");
  });

  it("--use=pro-max (dry_run) → run.json enhance_mode=pro-max + quality high, no spurious warnings", async () => {
    const out = path.join(TMP, "pro-max");
    const r = await run(["--prompt=cosmetics livestream ad ring light", "--use=pro-max", "--dry-run", `--out=${out}`]);
    expect(r.ok).toBe(true);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.adapter).toBe("gpt-image-2");
    expect(rj.enhance).toBe(true);
    expect(rj.enhance_mode).toBe("pro-max");
    expect(rj.quality).toBe("high");
    expect(r.warnings).toEqual([]); // enhance-mode is supported / never-warn — no papercut
  });

  it("--pro-max-base attribution is recorded in run.json.pro_max, and composes with --style + --ref", async () => {
    const out = path.join(TMP, "pro-max-compose");
    const r = await run([
      "--prompt=exam prep poster", "--use=pro-max", "--style=ritsu", `--ref=${REF}`,
      "--pro-max-base=@Daniel · https://x.com/x/1 · SaaS AI Dashboard", "--dry-run", `--out=${out}`,
    ]);
    const rj = JSON.parse(fs.readFileSync(path.join(out, "run.json"), "utf-8"));
    expect(rj.pro_max).toEqual({ base: "@Daniel · https://x.com/x/1 · SaaS AI Dashboard" });
    expect(rj.style).toBe("ritsu");                       // pro-max composes with the brand
    expect(rj.logo_overlay.asset).toMatch(/ritsu-lockup\.png$/); // ...and the corner lockup
    expect(r.warnings).toEqual([]);
  });
});
