# Capability Spec: `video-platform` — the `/video` command

**Phase:** 5 (canonical capability spec) · **ID:** `video-platform`
**Selected option (Phase 4):** **Option B — deterministic spine + LLM at the seams**
**HITL tier:** C · **Run:** `ccf9d3b3-a6b0-4c6c-9bba-c4d27f2db1a9` · **Generated:** 2026-07-29

---

## 1. Problem statement (carried from Phase 1)

We shipped a 2:55 explainer film and produced **an artifact, not a capability**. Every decision
— beat structure, the `SC`/`LA`/`AV`/`VO`/`MG` asset-code system, media prep, composition
patterns, QC, publishing kit — was derived live in one session and lives in one folder.
Several lessons cost real debugging time and are **invisible to every gate we own**: `hyperframes
check` passed, `snapshot` passed, and the first render came out **mostly blank**.

Build `/video`: a thin orchestrator that turns a request into a finished video **plus its full
artifact folder**, reproducibly, by any operator, driven by an **extensible type registry** so
that video line #2 costs a registry row, not a rewrite.

## 2. Selected approach

A **deterministic Node pipeline** owns everything mechanical and stateful (scaffold, asset
ledger, media prep, render, **QC gates**, resume state), driven by a `run.json` in the project
folder. **LLM skills own only the creative seams** (script authoring/transformation, composition
authoring, publishing kit). `run.json` is the contract between them.

**Governing rule:** *every lesson that can be a script must be a script with a non-zero exit
code.* A bullet in a SKILL.md is advisory and will be skipped on video #4.

**Registry-vs-skill test:** *if a gate or a flag default reads it → YAML; if only an LLM reads
it → skill.*

## 3. The seam — what `/video` owns vs delegates

**This section is the anti-duplication contract. It is normative.**

### Owns (nothing else can)
- The project contract: `video/projects/<slug>/` scaffold, artifact naming, the commit/ignore boundary
- Type resolution (`knowledge/video-types.yaml`)
- The **asset-code system** (`FOOTAGE.md`: beat → slot → concrete file + checksum) — the actual
  invention of the reference production
- Pipeline state + `--resume` (the human hand-off is the whole reason this is a capability)
- The 7 enforcement gates
- Cost accounting + `--max-cost-usd` across all sub-generators (no sub-tool sees the total)

### Delegates — and the duplication trap for each

| Concern | Delegate to | Trap to avoid |
|---|---|---|
| compose / check / snapshot / render / preview | `hyperframes-cli` (`npx hyperframes …`) | Wrapping the CLI and drifting from its flags. Its own SKILL.md marks `validate`/`inspect`/`layout` as deprecated aliases — a wrapper will encode them. |
| loudness measure/normalise/stitch | **`scripts/voice/lib/audio.cjs`** — exports `measureLoudness`, `normalizeLoudness`, `stitchAudio`, `DEFAULT_LUFS {i:-16,tp:-1.5,lra:4}` (`:95`), `LEVELING_CHAIN` (`:108`) | **Highest-probability duplication.** Lesson #1's exact targets are already implemented + tested. `scripts/video/lib/audio.cjs` MUST be a thin re-export. |
| narration TTS | `/voice` (`scripts/voice/gen.cjs`) | A `/video`-local ElevenLabs client — forks the lane, makes the registry a lie, breaks metering. |
| BGM / SFX / stock / icon / logo / grade | `media-use` `resolve.mjs --type bgm\|sfx\|image\|…` (HeyGen catalog + ledger) | Writing `scripts/video/music.cjs`. `media-use` already has the cross-project reuse ledger. |
| thumbnails / brand plates | `/image` (`--style=ritsu` already composites the lockup) | Hand-rolling a thumbnail generator. |
| script craft | `/write --type=video-script` (**already exists**, `write-types.yaml:156`) | `video-types.yaml` restating structure hints. **Reference via `write_type:`, don't restate.** |
| brand tokens / motion doctrine | `video/design-systems/ritsu/frame.md` | Re-hardcoding `#0ABCD0` anywhere in `/video` code. |

## 4. Component changes

### 4.1 `knowledge/video-types.yaml` — the extensibility spine

Follows the **`/write` YAML model** (`write-types.yaml` + `validate-write-registries.cjs`),
explicitly **NOT** `/voice`'s in-code `TYPES` constants (`scripts/voice/lib/params.cjs:40,68`).

```yaml
- id: explainer
  aliases: [product-explainer, launch-film]
  status: installed            # installed | registered-not-built
  default: false
  description: "Narrated product/concept explainer. Reference: ritsu-product-launch."
  resolution: 1920x1080
  fps: 30
  aspect: "16:9"
  duration:   { target_s: 175, min_s: 60,  max_s: 300 }
  beats:      { min: 6, max: 14, default: 11 }
  asset_slots: [screen, footage, voice, avatar, music, sfx, brand, mg]
  handoff:     [screen, footage]        # the human-supplied subset (lesson: hand-off + resume)
  narration:  { source: voice, target_lufs: -16, true_peak: -1.5 }   # lesson 1 as DATA
  framing:    { forbidden_zoom_band: [1.10, 1.25], safe_at_or_below: 1.0, safe_at_or_above: 1.26 }  # lesson 5 as DATA
  gates:      { min_bitrate_kbps: 3500, require_filmstrip: true, filmstrip_frames: 30, min_region_stddev: 8 }  # lessons 2+3 as DATA
  design_system: ritsu
  artifacts: [SCRIPT.md, FOOTAGE.md, TIMELINE.md, TIMELINE.html, YOUTUBE.md, index.html]
  publish_targets: [youtube]
  write_type: video-script      # the join to knowledge/write-types.yaml:156
  skill: 06-ai-ops/skills/video/types/explainer
```
Plus a `default` type (same shape, looser gates, `default: true`).

### 4.2 `scripts/cross-tier/validate-video-types.cjs` — L2, critical

Must assert:
1. unique slug ids + slug regex · 2. `status` enum; `installed` ⇒ `skill` path exists on disk
3. **`asset_slots ⊆ UNIVERSAL_SLOTS`** (exported from `scripts/video/lib/params.cjs`) — the
   supports⊆universal pattern; *without it the registry becomes decorative*
4. `handoff ⊆ asset_slots` · 5. `design_system` resolves in `design-systems.yaml` **or** on disk
6. `artifacts ⊆ KNOWN_ARTIFACTS`; `publish_targets ⊆ KNOWN_TARGETS`; `write_type ∈ write-types.yaml`
7. **`narration.target_lufs == -16 && true_peak <= -1.5` for EVERY type** — pins lesson #1
8. **`gates.min_bitrate_kbps > 0 && require_filmstrip == true` for every installed type** — pins #2/#3
9. `resolution` matches `WxH`; `fps ∈ {24,25,30,60}` · 10. exactly one `default: true`

**Register in BOTH** `scripts/check-consistency.cjs` (list at `:247-257`) **and** an
`l2-video-types` job in `.github/workflows/cross-tier-consistency.yml` (template: `l2-voice-adapters`
at `:145`). CI runs a hand-picked per-job subset — miss the second edit and CI is blind.

### 4.3 The 7 lessons → mechanisms

| # | Lesson | Mechanism | Auto? |
|---|---|---|---|
| 1 | Loudness −16 LUFS / −1.5 dBTP | `scripts/video/gates/check-loudness.cjs` re-exporting `voice/lib/audio.cjs`; fails if `abs(I−target) > 1.0` or `TP > −1.5`; runs pre-composition **and** on the master. Targets read from the registry. | ✅ |
| 2 | Stacked `<video>` → blank render | **Two layers** (below) | ✅ empirically |
| 3 | Filmstrip QC | `out/filmstrip.jpg` **required artifact** (absent ⇒ fail) + machine pre-screen; human confirms at an explicit HITL checkpoint before the publishing kit | artifact+variance ✅, final eyeball ❌ |
| 4 | `.line{overflow:hidden}` clips descenders | Recipe moves **into** `frame.md` `motion.entrance_vocab` so no project hand-rolls it + lint: `overflow:hidden` on a text-mask without compensating padding ⇒ fail | mostly ✅ |
| 5 | Screen-record zoom band | `framing.forbidden_zoom_band` as registry **data** → emitted in the record spec; ingest rejects a capture whose detected UI edge lands in the band | ~80% spec-side |
| 6 | Never fabricate figures | **Citation spine**: every on-screen numeric in `SCRIPT.md` carries an asset code resolving to a `FOOTAGE.md` row; validator fails on an uncited numeric. Converts "don't lie" → "cite your capture" (same discipline as `ops.knowledge_extractions`) | citation ✅, truth ❌ |
| 7 | No `drawtext`; mute ambient beds | Capability probe in `local-install/dependencies.cjs` (`ffmpeg -filters`) so `/video` *selects* a text strategy; muting is a deterministic `-an` at ingest | ✅ |

#### Lesson #2 in detail — the keystone

**(a) `scripts/video/gates/lint-stage-video.cjs`** (pre-render, cheap, preventive, *insufficient
alone*): parse `index.html` with a real HTML/CSS parser (**not regex** — regex here produces
false confidence), find every stage wrapper with ≥2 `<video>` children, assert each resolves to
`position:absolute`. Honest limit: cannot resolve external stylesheets/computed style. Ship
anyway — catches the common authoring mistake at zero cost.

**(b) `scripts/video/gates/verify-render.cjs`** (post-render — *the gate that actually fires*):
- **Bitrate floor.** `bytes / duration_s` vs `gates.min_bitrate_kbps`. Our own numbers:
  **58 MB/175 s ≈ 2.6 Mbps (broken)** vs **93 MB/175 s ≈ 4.3 Mbps (correct)**. Heuristic — say so
  in the SOP — but deterministic, one `ffprobe`, and it is the tell that fired.
- **Blank-segment detection.** `/video` authored `TIMELINE.md`, so it knows which time ranges must
  carry live video. Sample frames from the finished MP4 in those ranges; compute luma std-dev; fail
  if a range that should carry footage falls below `gates.min_region_stddev`.
  **Validated 2026-07-29 on the real render:** content **19.64 / 19.35** vs flat control **3.77**
  (~5× separation; threshold 8 separates cleanly).
  Command shape (works on this machine; `drawtext` absent, lavfi `movie=` unreliable):
  `ffmpeg -ss <t> -i <mp4> -frames:v 1 -vf "crop=<rect>,scale=160:90,format=gray" -f rawvideo -` → stddev.
- Only then hand the contact sheet to the human.

> **Sprint-1 exit condition:** if `verify-render.cjs` cannot be demonstrated **failing** against a
> deliberately-broken stacked-video fixture, Sprint 1 is not done.

### 4.4 `run.json` — SLOT-level state (not stage-level)

Lives at `video/projects/<slug>/run.json`, **committed** (~KB). **No `ops.*` table in v0.1** —
same Option A+ precedent as `/voice` and `/image` (`SOP-AIOPS-014` `observability.v0_1`); the
columns are a forward-compat superset of a future `ops.video_runs` (`/cla extend`, INSERT-wiring
only). Cost attribution is already served by `ops.cost_attributions` + the `ai-ops-video` bucket.

Stage-level state does not survive the hand-off, because the blocking condition is **per-asset**
("waiting on 4 of 22 screen captures"):

```json
{ "slug": "...", "type": "explainer", "version": "0.1.0", "created_at": "...",
  "stage": "composing",
  "beats": [ { "id": "b4", "script_ref": "SCRIPT.md#beat-4" } ],
  "slots": [ { "code": "SC-01", "kind": "screen", "state": "requested|supplied|prepped|placed",
               "spec": {}, "source_path": null, "prepped_path": null,
               "sha256": null, "bytes": null, "duration_s": null, "prepped_at": null } ],
  "gates": [ { "id": "narration-loudness", "state": "pass|fail|pending", "evidence": {}, "at": "..." } ],
  "renders": [ { "path": "out/....mp4", "bytes": 0, "duration_s": 0,
                 "bitrate_kbps": 0, "filmstrip": "out/filmstrip.jpg", "verdict": "pass|fail" } ] }
```

**`--resume` must reconcile, never trust.** Media is gitignored, so a fresh clone shows
`stage: composed` with zero media on disk. Therefore:
1. Probe every slot path; compare `sha256`; downgrade `placed → requested` if missing.
2. Re-run cheap deterministic gates (re-measuring 11 files is seconds — never trust a recorded pass).
3. A render verdict is valid only if the MP4 checksum still matches.
4. Print a resume plan: *"18/22 screen captures present; 4 missing (SC-07, SC-11, SC-14, SC-19) —
   record specs re-emitted below."*

Every stage is **idempotent + content-addressed** (skip when the recorded input checksum matches).
The hand-off is a legitimate wait-state, not a failure.

### 4.5 File manifest (everything created)

```
.claude/commands/video.md                          thin orchestrator (≤170 lines, voice.md shape)
knowledge/video-types.yaml                         + knowledge/schemas/video-types.schema.json
scripts/cross-tier/validate-video-types.cjs        L2 critical (register in 2 places)
scripts/video/{run,scaffold,plan,prep,compose,render,qc,publish}.cjs
scripts/video/lib/{params,state,assets,audio,framing,manifest}.cjs   audio.cjs = thin re-export
scripts/video/gates/{check-loudness,lint-stage-video,verify-render}.cjs
06-ai-ops/skills/video/SKILL.md                    umbrella + routing table
06-ai-ops/skills/video/{plan,assets,compose,qc,publish}/SKILL.md
06-ai-ops/skills/video/types/{explainer,default}/SKILL.md
06-ai-ops/sops/SOP-AIOPS-018-video-runtime-contract/flow.yaml
video/.gitignore                                   REWRITE (projects/ contract)
video/README.md                                    REWRITE (two planes: design-systems + projects)
governance/ROLES.md                                + gps per_task_kind_caps (after :162)
knowledge/capability-registry.yaml                 + video-platform entry
knowledge/design-systems.yaml                      + layer: video-frame axis
scripts/local-install/dependencies.cjs             + video block
scripts/local-install/test-suite/groups.cjs        + video group
```

### 4.6 `video/.gitignore` — the new sync contract (founder Q1)

```gitignore
# projects/ — TEXT is shared, MEDIA is local.
projects/*/assets/
projects/*/build/
projects/*/out/
!projects/*/out/filmstrip.jpg      # the one committed binary: QC evidence
```
(The existing repo-wide `*.mp4` rule under `video/` already keeps renders out; keep it.)

## 5. Cost-bucket impact (Bài #7)

New bucket **`ai-ops-video`** under `gps`. Added to `governance/ROLES.md` after `:162`:

| task_kind | cap | note |
|---|---|---|
| `video-plan` | $0.30 | script brainstorm/transform (in-session) |
| `video-generate` | $1.50 | **ADVISORY** — out-of-band TTS + avatar; `--max-cost-usd` is the real breaker |
| `video-compose` | $0.75 | composition authoring (in-session) |
| `video-qc` | $0.05 | pure ffmpeg/Node, ~$0 |
| `video-publish` | $0.20 | publishing kit |

**`--max-cost-usd` ships with refuse-before-spend semantics** (matching `voice.md:62`) — ROLES
caps are advisory for out-of-band spend, so the breaker is the real guard.

## 6. Sprint plan + exit gates

| Sprint | Lands | Exit gate (hard) |
|---|---|---|
| **1 — Contract, gates, unblock** | registry + schema + validator (2 wiring points) · `params.cjs` `UNIVERSAL_SLOTS` · 3 gate scripts · **`/cla extend voice-platform` → ElevenLabs adapter** · local-install `video` block + test group | `pnpm check` green **AND** each gate demonstrably **FAILS** on a broken fixture (stacked-video HTML, un-normalised wav, sub-floor-bitrate mp4) |
| **2 — Pipeline, state, migration** | `video.md` · skill tree · `run.cjs` + `run.json` + reconcile-by-probe `--resume` · hand-off emitters · **migrate 3 projects + rewrite README + .gitignore in ONE PR** · `SOP-AIOPS-018` · ROLES caps + breaker | **Reproduce `ritsu-product-launch` end-to-end** from its committed `SCRIPT.md` + supplied assets, passing `verify-render.cjs`. *If `/video` cannot rebuild the film it was extracted from, it is a folder convention, not a capability.* |
| **3 — Second line + promotion** | `social-short` (9:16) as **registry edit + one type skill only** · resolver registration · capability-registry + `wiki/capabilities/video-platform/spec.md` | Adding `social-short` touches **zero** lines of `video.md` or `run.cjs` |

## 7. HITL points

| Phase | Tier | Action |
|---|---|---|
| 4 Options | B | ✅ founder picked Option B (2026-07-29) |
| 5 Architecture | **C** | founder approves this spec |
| 7 per PR | B | founder reviews + merges |
| runtime: publish | C | posting publicly stays Tier C per `governance/HITL.md` |

## 8. Rollback plan

1. **Code:** `git revert` the sprint's merge commit. No migration ⇒ nothing to unwind.
2. **Tier 1 yaml:** revert via PR.
3. **Migration of 3 projects:** the move is reversible; media is local and untouched by git.
4. **State:** `ops.capability_runs.state = 'deprecated'`.

**Reversibility: 5/5** — no DB migration, no new secret, no external provisioning. The only
one-way-ish step is the `hyperframes/` → `projects/` move, and even that is a directory rename
with relative paths verified identical-depth (`../../design-systems` survives).

## 9. `@cto` sanity-check (Phase 2/5)

**Verdict: request-changes → all must-fixes adopted.** Three findings, each **independently
verified against the code before acceptance**:

1. `voice-adapters.yaml:66` → ElevenLabs is `registered-not-built`, `voices: 0`. Decision #3
   cannot execute as written. → Sprint 1 builds the adapter via `/cla extend voice-platform`.
2. `hyperframes` appears **nowhere** in tracked repo code (only prose in `video/*.md` + a dirname
   allowlist). Unversioned, uninstalled, unpinned. → Sprint 1 adds the dependency block + probe.
3. `/voice` keeps types as code constants — the wrong sibling to copy. → follow `/write`'s YAML model.

Plus: SLOT-level state, reconcile-by-probe resume, bitrate floor, checksummed `FOOTAGE.md`,
`design-systems.yaml` layer axis, cost breaker, 3 sprints with hard exit gates. All adopted.

## 10. Risk register

| # | Risk | Mitigation |
|---|---|---|
| 1 | Unversioned `hyperframes` dependency → co-founder's install silently lacks it | Sprint 1 dependency block + pinned version in Tier 1 + doctor probe that fails loudly |
| 2 | Committed composition + ignored assets = unverifiable | `FOOTAGE.md` as checksummed manifest; validate internal coherence (every asset code in `index.html`/`TIMELINE.md` has a row; every beat maps to ≥1 slot) |
| 3 | The 7 lessons decay into prose | Each has a script with a non-zero exit; the two that resist automation (#5, #6) converted to checkable proxies (registry data; citation spine) |
| 4 | Migration reverses documented policy mid-repo | `video/README.md` + `video/hyperframes/README.md` + `video/.gitignore` change in the **same PR**; `validate-pillar-numbering.cjs:51-53` comment refreshed |
| 5 | No cost breaker on a 3-min film (11 TTS + 4 avatar + N Veo) | `--max-cost-usd` refuse-before-spend + `ai-ops-video` bucket |
| 6 | `/video` reimplements composition authoring | §3 seam is normative and restated in `SOP-AIOPS-018` |

## 11. Tier C decision record

- **Approved by:** founder · **Method:** Claude Code inline (Phase 4 + Phase 5 gates)
- **`ops.decisions` row:** written at approval

## 12. Next phase

Phase 6 (sprint plan — folded into §6 above) → **Phase 7 Sprint 1 implementation**.
