# design-systems — video/motion design systems

Each subfolder is ONE design system = one bundle of artifacts that defines how a
class of Ritsu videos looks and moves.

## A design system folder holds

| File | What |
|---|---|
| `DESIGN.md` | Tokens + rationale (palette, type, motion doctrine, timing, letterbox, audio), in the `design.md` format. The single source of truth for the look. |
| `assets/` | Binary artifacts the videos reuse: logo, mark, fonts, LUTs, sfx, textures. |
| `README.md` | One paragraph — what this look is + when to use it. |

Start a new one by copying `_TEMPLATE/`.

## `ritsu/` — the house style

`ritsu/` is the default look for Ritsu videos. It **extends** the company brand
design system at `00-core/design-system/ritsu/DESIGN.md` (electric cyan `#0ABCD0`
on deep slate, Inter + JetBrains Mono, the four-blade mark) and adds the
video-only layer (motion, timing, letterbox, audio). Reference brand tokens from
there — don't duplicate them — so brand + video stay in sync.

> These video design systems are **not** registered in `knowledge/design-systems.yaml`.
> That registry + the `/design-system` capability serve UI/artifact systems and
> require the files to already exist (registering an empty one fails `check-drift`).
> These stay self-documented here until authored.
