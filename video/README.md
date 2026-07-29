# video — Ritsu video production

Home for Ritsu video: the **design systems** that define how a video looks and moves, and the
**projects** that use them. Both planes are versioned; what differs is *which files*.

Built and driven by **`/video`** (capability `video-platform`).

## Two planes

| Path | What | Committed? |
|---|---|---|
| `design-systems/<name>/` | Video/motion design systems — one folder = one bundle (`frame.md` + `assets/`). Every video follows one. Start from `_TEMPLATE/`. | ✅ fully |
| `projects/<slug>/` | One folder = one video. Its **text is shared, its media is local.** | ✅ text · ❌ media |

> **`hyperframes/` is gone.** It was a per-operator local-only plane; its three projects moved
> into `projects/` on 2026-07-29 when `/video` landed. One home, no drift. Relative paths survived
> the move unchanged — both planes sit two levels under `video/`, so `../../design-systems` still
> resolves.

## The sync contract for `projects/`

| Path | Committed? | Why |
|---|---|---|
| `SCRIPT.md` `FOOTAGE.md` `TIMELINE.md` `TIMELINE.html` `YOUTUBE.md` `index.html` `README.md` `run.json` | ✅ | ~130 KB — the actual IP. A teammate can read, review, and edit the film. |
| `assets/` `build/` `out/` | ❌ | Heavy (one 3-min explainer = 1.8 GB source + a 93 MB render) and reproducible. |
| `out/filmstrip.jpg` | ✅ | The **one** committed binary — because media is ignored, this contact sheet is the only auditable evidence a render was verified. |

**The consequence `/video` is built around:** a fresh clone has the composition but none of the
bytes. So `--resume` **re-probes the disk and never trusts `run.json`** — it will correctly report
every asset as missing and re-emit the record specs.

## Make a video

```bash
/video --type=explainer --script=raw/my-brief.md
```

- `--type` picks the production line from `knowledge/video-types.yaml` (`explainer` is line #1;
  `default` is the fallback). Adding a line is a **registry edit + one skill file** — no command change.
- `--script` absent → brainstorms the script with you. Present → ingests that source and
  transforms it into the standard `SCRIPT.md` shape.
- `--resume` continues a production that parked waiting on human-supplied assets.

`/video` auto-generates everything it holds a key for (narration via `/voice`, avatars + score via
the HeyGen catalog) and **hands off** what it cannot: screen recordings and live-action. It emits
exact record specs and ready-to-paste prompts, then parks.

## Guardrails that are enforced, not documented

Each cost real debugging time on the first film, and each is now a script with a non-zero exit
code (`scripts/video/gates/`):

| Gate | Catches |
|---|---|
| `verify-render.cjs` | Stacked `<video>` rendering **blank** — `hyperframes check` *and* `snapshot` both pass while the render is broken. Bitrate floor + per-region luma std-dev on the finished mp4. |
| `check-loudness.cjs` | Narration sources drifting apart (avatar audio arrives quieter than TTS) so the film jumps at every cut. Normalises to −16 LUFS / −1.5 dBTP. |
| `lint-stage-video.cjs` | The stacking mistake statically, before you spend a render. Also mask-rise clipping descenders. |
| `selfcheck.cjs` | A machine that cannot actually run `/video` (missing ffmpeg, HyperFrames skills, or filters). |

## Conventions

- **One design system per look.** `design-systems/ritsu/frame.md` is the house style; it
  **extends** the company brand system at `00-core/design-system/ritsu/DESIGN.md` — reference
  brand tokens, never re-hardcode them.
- **Asset codes are the filename.** `<CODE>-<NN>-b<BEAT>.<ext>` — code, sequence, beat, nothing
  else. Whole-film assets use `-all`.
- **Never put a number on screen the product does not produce.** Every on-screen numeric cites an
  asset code that resolves to a `FOOTAGE.md` row.

Independent of any git worktree; committed to `ritsu-works` and PR-governed.
