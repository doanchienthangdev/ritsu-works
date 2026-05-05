# raw/ — local-only intake

This folder is **local-only**. Nothing inside it is synced to GitHub except this README and `.gitkeep`.

## What goes here

Raw source material before extraction. Examples:

- PDF research papers downloaded for analysis
- Competitor screenshots and exported HTML
- Customer call recordings (`.mp3`, `.m4a`)
- Exported transcripts from Zoom/Granola/Otter
- Voice notes from the founder
- Bulk exports from third-party tools (Stripe CSVs, GA dumps, ad platform data)
- Any source document a human or agent intends to mine for knowledge

## Lifecycle

```
raw/some-source.pdf  →  agent extracts  →  wiki/<topic>/<note>.md
                                       OR  .archives/draft-<id>.md (if intermediate)
                                       OR  Tier 3 storage (if it should be permanent — see manifest)

raw/some-source.pdf  →  (when no longer needed) → delete
```

Files here are **disposable by design**. If you need permanence, the artifact belongs in Tier 3 (Supabase Storage). If you need queryability, the extracted knowledge belongs in `wiki/` or as a Tier 1 update.

## Why local-only

- **Privacy.** Customer recordings, NDA-covered material, paper preprints all may live here transiently.
- **Size.** Raw video/audio/binary blobs would bloat the repo and slow `git clone`.
- **Per-operator workspace.** Each operator (founder + trusted agents) collects their own raw; not shared.
- **Forces extraction.** If raw/ were synced, agents would query it directly and skip the extraction step. Local-only makes extraction the only path forward.

## Suggested subfolder convention

Not enforced, but agents should use these by default:

```
raw/
├── customer/          # calls, support tickets, user interviews
├── research/          # papers, articles, reports being studied
├── competitors/       # screenshots, exports, public docs
├── market/            # bulk data dumps
├── voice-notes/       # founder's audio
└── inbox/             # anything not yet sorted
```

Use `inbox/` as the default landing zone, then move files into the right subfolder when you process them.

## Rules for agents

1. **Read raw, write wiki.** When you extract knowledge, the output goes in `wiki/`, not back into `raw/`.
2. **Cite source paths in extracted notes.** A `wiki/competitors/quizlet.md` note should reference `raw/competitors/quizlet-pricing-2026-04.png` if that's where the data came from. The path is a private breadcrumb — anyone with the raw file on their disk can verify; anyone without it sees just the path.
3. **Don't trust raw as canonical.** Raw is inputs. Tier 1 (charter, SOPs, skills) is canonical. Wiki sits between as reference notes.
4. **Don't bulk-purge without confirmation.** Even though raw is local-only, the operator may not want their voice notes deleted. HITL applies.

## What does NOT go here

- Anything that should be PR-reviewed → Tier 1 (`00-charter/`, pillars, skills)
- Anything that should be queried by agents at runtime → Tier 2 (Supabase) via proper schema
- Anything that should persist forever and be searchable → Tier 3 (Storage) with index in manifest
- Drafts or intermediate work → `.archives/`
- Reference notes meant to be shared → `wiki/`
