# Author-styles — distilled voices for `/write`

This folder holds **distilled author voices**: reusable, committed, github-shared
artifacts that let `/write --author-style=<slug>` produce content in a specific
master's voice. They are to writing what `00-core/design-system/` is to visuals —
a captured identity you apply, not re-derive each time.

Each `<slug>/` folder is produced by **`/write distill <slug> --ref-src=<refs>`** from
that author's books, articles, talks, and posts. The index + provenance lives in
[`knowledge/author-styles.yaml`](../../../knowledge/author-styles.yaml).

## What a distilled style contains (the artifact contract)

Every `<slug>/` folder follows [`_TEMPLATE/`](_TEMPLATE/):

| File | Purpose | Loaded when |
|---|---|---|
| `STYLE.md` | The full style guide — voice DNA, diction, syntax, structure, rhetoric, themes, worldview, anti-patterns, and how-to-write-as-them. | Deep mode / first reference. |
| `voice-card.md` | The 1-page operational quick-ref (voice-in-a-sentence, top do/don't, signature openings/closings, rhythm + diction rules, micro-samples). | **Every write** (cheap, always loaded). |
| `signature-moves.md` | The author's named rhetorical devices, each with when + how + a short example. | Drafting. |
| `samples.md` | Curated, attributed, fair-use excerpts — the voice-calibration bank. | Drafting + humanize voice-injection. |
| `do-and-dont.md` | Explicit emulate / avoid list. | Drafting + humanize. |
| `meta.yaml` | Provenance: sources, distilled-on, confidence, copyright posture. | Audit. |

The `voice-card.md` is the operational heart — small enough to load on every run; the
rest is progressive disclosure the orchestrator/humanizer pull as needed.

## How a style is used

1. `/write … --author-style=<slug>` resolves the folder via `scripts/write/lib/authors.cjs`.
2. The orchestrator loads `voice-card.md` (+ `signature-moves.md` / `samples.md` as needed)
   into the drafting brief, so every section is written *in that voice*.
3. The `humanize` skill uses the same artifact as its **voice-calibration sample** — so
   "remove AI tells" and "sound like this author" are the same pass, not two.

## Copyright posture (canonical)

These artifacts are **transformative style analysis** plus **short, attributed, fair-use
excerpts**. Concretely:

- **Characterization, patterns, do/don't, how-to-write-as-them** — original analysis. Fine to share.
- **Excerpts** — kept short (≤ ~25 words from copyrighted books), fuller only from the author's
  **freely-published** writing (e.g. a public blog), **public talks/interviews**, or **public-domain**
  material. Always attributed.
- **Never** a reproduction of a protected work, and never a claim that generated output IS the author's.
  Output written "in the style of" an author is a derivative *style*, presented as such.

Each `<slug>/meta.yaml` records the per-author posture. Distillation that cannot meet this bar
should narrow to characterization-only.

## Adding an author

```
/write distill <slug> --ref-src=raw/write/<slug>            # a folder of sources
/write distill <slug> --ref-src=<file>+<url>+<folder>       # mixed refs (+ or repeated --ref-src)
```

The distill flow stages the sources, fans out the artifact sections via a Workflow,
assembles the 6 files into `<slug>/`, and registers the row in `author-styles.yaml`.
