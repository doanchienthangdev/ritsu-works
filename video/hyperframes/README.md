# hyperframes — Ritsu HyperFrames projects

One folder per video. Each is a standalone HyperFrames composition (HTML → video).

| Project | What |
|---|---|
| `ritsu-launch-25s/` | 25s product-launch film for ritsu.ai — dark, cinematic, design-system-accurate, beat-synced score. |
| `hf-billboard/` | 8s "for beginners" HyperFrames billboard (demo). |

## Work on one

```bash
cd video/hyperframes/<slug>
npx hyperframes check                                   # gate: lint + runtime + layout + contrast
npx hyperframes preview                                 # scrub in Studio (open the localhost URL in your browser)
npx hyperframes render --quality high --output <slug>.mp4
```

- Renders (`*.mp4`), `snapshots/`, and `.thumbnails/` are `.gitignore`d — reproducible from source.
- The look should follow `../design-systems/ritsu/`.
- The `AGENTS.md` / `CLAUDE.md` inside each project are the HyperFrames scaffold's
  own agent instructions (project-scoped) — leave them.
