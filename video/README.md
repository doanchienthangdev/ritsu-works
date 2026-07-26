# video — Ritsu video production

Home for every Ritsu video: the **design systems** that define how a video looks
and moves, and the **HyperFrames projects** that render them.

Committed to `ritsu-works` and PR-governed. Independent of any git worktree.

## Layout

| Path | What |
|---|---|
| `design-systems/<name>/` | A video/motion **design system** — one folder = one artifact bundle (`DESIGN.md` + `assets/`). Start from `design-systems/_TEMPLATE/`. |
| `hyperframes/<slug>/` | A **HyperFrames project** — one folder per video (`index.html`, `hyperframes.json`, `assets/`). |

## Conventions

- **One design system per look.** `design-systems/ritsu/` is the house style for Ritsu
  videos. It **extends** the company brand system at `00-core/design-system/ritsu/DESIGN.md`
  (same palette + type + logo) and adds the video-only layer: motion doctrine, scene
  timing, easing, letterbox, audio. Don't re-hardcode brand tokens — reference them.
- **One project per video.** Name folders by intent + length, e.g. `ritsu-launch-25s`.
- **Renders are build output, not source.** `*.mp4` and `snapshots/` are `.gitignore`d
  (reproducible via `npx hyperframes render` / `snapshot`). Keep a final cut here locally;
  `git add -f <file>.mp4` only if you deliberately want it versioned.

## Build a video

```bash
cd video/hyperframes/<slug>
npx hyperframes check          # lint + runtime + layout + contrast gate
npx hyperframes preview        # scrub in HyperFrames Studio (open the localhost URL in your browser)
npx hyperframes render --quality high --output <slug>.mp4
```

Authoring skills: `npx skills add heygen-com/hyperframes` (installs the `/hyperframes` skill pack).
