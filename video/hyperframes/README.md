# hyperframes — your local HyperFrames projects (NOT pushed)

This is a **per-operator, local-only plane** — like `raw/`. Individual video projects
live here on your machine but are **not committed to GitHub**: each operator makes their
own videos ("mỗi user sẽ khác nhau"). Only this `README.md` and `.gitkeep` are versioned;
everything else under `hyperframes/` is `.gitignore`d.

The **shared** part of video production — the design system every video follows — lives
one level up in `../design-systems/ritsu/` (committed). Author against that.

## Make a video

```bash
cd video/hyperframes            # your local plane
npx hyperframes init <slug> --non-interactive --example blank --resolution landscape
cd <slug>
npx hyperframes check           # gate: lint + runtime + layout + contrast
npx hyperframes preview         # scrub in Studio (open the localhost URL in your browser)
npx hyperframes render --quality high --output <slug>.mp4
```

- Follow the look in `../design-systems/ritsu/frame.md`.
- Name folders by intent + length, e.g. `ritsu-launch-25s`, `exam-in-3-days-15s`.

## Sharing a canonical video (opt-in)

If a specific video IS an official company asset worth versioning for everyone:

```bash
git add -f video/hyperframes/<slug>     # force past the ignore
```

Prefer this over committing every experiment.
