---
name: video
description: >
  Umbrella skill for the video-platform capability — the brain behind /video. Owns the
  project contract, the asset-code system, pipeline state + resume, and the enforcement
  gates; ORCHESTRATES the HyperFrames suite, /voice, /image, media-use and /write rather
  than reimplementing them. Routes to per-stage and per-type sub-skills.
---

# `video` — the `/video` umbrella

Turn a request into a finished video **plus its full artifact folder**, reproducibly, by any
operator. Same family as `image`, `voice`, `write`, `translate`, `dataviz`: a **thin
orchestrator** over a deterministic Node spine, with LLM judgment only at the creative seams.

> **Governing rule.** Every lesson that *can* be a script **is** a script with a non-zero exit
> code. A bullet in a SKILL.md is advisory and will be skipped on video #4. If you catch
> yourself writing "remember to…" here, move it into `scripts/video/gates/`.

## Routing table

| You are doing… | Go to |
|---|---|
| Choosing / shaping the beats for a line | `types/<id>/SKILL.md` (`explainer`, `default`) |
| Brainstorming or transforming a script | `plan/SKILL.md` → delegates to `/write --type=video-script` |
| Gathering + generating assets, hand-off | `assets/SKILL.md` → `/voice`, `media-use`, `/image` |
| Authoring the composition | `compose/SKILL.md` → HyperFrames `core`/`animation`/`keyframes` |
| Verifying a render | `qc/SKILL.md` → the three gate scripts |
| Timeline view + publishing kit | `publish/SKILL.md` |

## The seam (normative)

**Owns** — nothing else can:
- the project contract (`video/projects/<slug>/`, artifact naming, the commit/ignore boundary)
- type resolution (`knowledge/video-types.yaml`)
- the **asset-code system** (`FOOTAGE.md`: beat → slot → file → sha256) — the real invention
- pipeline state + `--resume` (the hand-off is why this is a capability, not a skill)
- the enforcement gates
- total cost accounting across sub-generators (no sub-tool sees the sum)

**Delegates** — and the trap for each:

| Concern | Delegate | Trap |
|---|---|---|
| compose / check / snapshot / render | `hyperframes-cli` | wrapping the CLI, then drifting from its flags (it already deprecates `validate`/`inspect`/`layout`) |
| loudness | `scripts/voice/lib/audio.cjs` | reimplementing it — its `DEFAULT_LUFS` is *already* `{i:-16, tp:-1.5}` |
| narration TTS | `/voice --use=elevenlabs` | a `/video`-local ElevenLabs client |
| BGM / SFX / stock / logo / grade | `media-use` | writing a HeyGen-catalog client (it already has the reuse ledger) |
| stills / thumbnails | `/image` | hand-rolling one |
| script craft | `/write --type=video-script` | restating its structure in the registry |
| brand tokens / motion doctrine | `video/design-systems/<ds>/frame.md` | a hex literal anywhere in `/video` code |

## Pipeline

```
0 doctor → 1 script → 2 assets ⇄ HAND-OFF → 3 compose → 4 render → 5 qc → 6 publish
                          ↑                                            │
                          └──────────────── --resume ──────────────────┘
```

`run.json` is the contract between the deterministic spine and the LLM stages. It is
**SLOT-level, not stage-level**, because the blocking condition is per-asset ("waiting on 4 of
22 screen captures"), never per-stage.

Stages are **idempotent + content-addressed**: a stage whose recorded input checksum still
matches is skipped.

## Resume — reconcile, never trust

Media is gitignored (founder sync contract), so a teammate who clones sees `stage: composed`
with **zero bytes on disk**. Therefore `--resume`:

1. probes every slot path and compares `sha256`; downgrades `placed → requested` if missing
2. re-runs the cheap deterministic gates (re-measuring 11 files takes seconds — never trust a
   recorded pass)
3. treats a render verdict as valid only while its mp4 checksum matches
4. prints a resume plan naming exactly which codes are missing, and re-emits their specs

## The seven guardrails and who owns each

| # | Lesson | Mechanism |
|---|---|---|
| 1 | Loudness −16 LUFS / −1.5 dBTP | `gates/check-loudness.cjs` (re-export of `voice/lib/audio.cjs`); also flags **spread** — what the ear catches at a cut |
| 2 | Stacked `<video>` → blank render | `gates/lint-stage-video.cjs` (static, cheap, *insufficient alone*) **+** `gates/verify-render.cjs` (authoritative, on the finished mp4) |
| 3 | QC evidence | filmstrip is a required artifact and is committed |
| 4 | Mask-rise clips descenders | recipe lives in `frame.md`; lint flags an uncompensated wrapper |
| 5 | Screen-capture framing band | `framing.forbidden_zoom_band` is registry **data**; emitted in the record spec |
| 6 | Never invent figures | citation spine — every on-screen numeric cites an asset code that resolves to a `FOOTAGE.md` row |
| 7 | Environment | `gates/selfcheck.cjs` probes ffmpeg **filters** (this build has no `drawtext`); ingest mutes stock ambient beds |

Lesson #6 is the one a machine cannot finish: the **citation** is checkable, the **truth** of the
figure is not. Use what the product actually renders. On the reference film the script called for
a fabricated "7/10"; the capture showed **6.0 out of 10**, and the real number shipped.

## Adding a production line

1. Add a row to `knowledge/video-types.yaml`.
2. Drop `types/<id>/SKILL.md` with the judgment for that line.

**Zero command change, zero pipeline change.** The L2 validator pins the loudness floor and the
render gates for every type, so a new line cannot quietly opt out of the discipline.

*Registry-vs-skill test:* if a gate or a flag default reads it → **YAML**. If only an LLM reads
it → **the skill**.

## Cost

Tier A runtime. Media generation is out-of-band and therefore invisible to the in-session budget
hook — the per-run `--max-cost-usd` breaker **refuses before spending** and is the real guard.
Cost-bucket `ai-ops-video`; per-stage caps in `governance/ROLES.md`. Publishing publicly is
**Tier C** — the capability produces the kit; the founder posts.
