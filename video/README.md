# video — Ritsu video production

Home for Ritsu video: the **design systems** (shared) that define how a video looks and
moves, and a **local plane** where each operator builds their own HyperFrames projects.

## Two planes

| Path | Pushed to GitHub? | What |
|---|---|---|
| `design-systems/<name>/` | ✅ **committed (shared)** | Video/motion design systems — one folder = one bundle (`frame.md` / `DESIGN.md` + `assets/`). Every operator's videos follow these. Start from `_TEMPLATE/`. |
| `hyperframes/` | ❌ **local-only (per-operator)** | Where you build video projects on your machine. `.gitignore`d like `raw/` — not pushed ("mỗi user sẽ khác nhau"). Only its `README.md` + `.gitkeep` are versioned. `git add -f` to share one canonical video. |

Independent of any git worktree; committed to `ritsu-works` and PR-governed.

## Conventions

- **One design system per look.** `design-systems/ritsu/` is the house style; its
  authoritative spec is **`frame.md`** (HyperFrames loads it as brand truth). It
  **extends** the company brand system at `00-core/design-system/ritsu/DESIGN.md` —
  reference brand tokens, don't re-hardcode them.
- **Projects are yours + local.** Build them under `hyperframes/`; they aren't pushed.

## Build a video

```bash
cd video/hyperframes
npx hyperframes init <slug> --non-interactive --example blank --resolution landscape
cd <slug> && npx hyperframes check && npx hyperframes preview
npx hyperframes render --quality high --output <slug>.mp4
```

Authoring skills: `npx skills add heygen-com/hyperframes`. Follow `../design-systems/ritsu/frame.md`.
