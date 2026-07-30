# Starting With Ritsu — Ep 1: What Is Ritsu?

**Type** `explainer` · **Style** `ritsu` · **1920x1080 @ 30fps (16:9)**
Target runtime ~175s.

Built with `/video`. Regenerate or continue with:

```bash
/video --resume --slug=ritsu-getting-started/ep01-what-is-ritsu
```

## What is committed vs local

| Path | Committed? | Why |
|---|---|---|
| `SCRIPT.md` `FOOTAGE.md` `TIMELINE.*` `YOUTUBE.md` `index.html` `run.json` | ✅ | the actual IP — a teammate can read, review and edit the film |
| `assets/` `build/` `out/` | ❌ | heavy and reproducible |
| `out/filmstrip.jpg` | ✅ | the only evidence the render was verified |

Because media is local, `--resume` **re-probes the disk** rather than trusting
`run.json`. A fresh clone will correctly report every asset as missing.

## Asset codes

Files are named `<CODE>-<NN>-b<BEAT>.<ext>` — code, sequence, beat. Nothing else.
See `FOOTAGE.md` for the manifest (each row carries a sha256 so the committed
composition can be checked for coherence even without the bytes).
