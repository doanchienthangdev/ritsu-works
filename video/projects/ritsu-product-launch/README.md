# ritsu-product-launch — 3-min product launch film

Local-only HyperFrames project (per-operator; gitignored) — the launch video for ritsu.ai.

- **`SCRIPT.md`** — the full shooting script + production bible: 11 beats (avatar + faceless),
  detailed **footage / animation / assets / text-motion** per faceless beat, **5 use-case situations**
  (exam-in-3-days · YouTube lecture · research paper · problem set · learn-a-framework), the clean VO
  read, and the master asset checklist. Author against `../../design-systems/ritsu/frame.md`.
- **`assets/`** — screen-captures, props (source files), brand marks, testimonial cards.
- **`index.html`** — *(to build)* the HyperFrames composition.

## Build

```bash
cd video/hyperframes/ritsu-product-launch
# author index.html against ../../design-systems/ritsu/frame.md, then:
npx hyperframes check && npx hyperframes preview
npx hyperframes render --quality high --output ritsu-product-launch.mp4
```

Share as a canonical company asset (opt-in): `git add -f video/hyperframes/ritsu-product-launch`.
