# .archives/ — local-only scratch space

This folder is a **scratch space**. Subfolder structure is committed (so every clone has predictable paths), but **file contents are local-only**.

## What goes here

Intermediate work that helps agents do their job but doesn't deserve to be canonical or even reference:

- Multi-step reasoning drafts ("Plan: first I'll do X, then Y…")
- Failed experiments and abandoned attempts
- Long agent thinking dumps before producing a final artifact
- Generated content awaiting review (blog drafts, email drafts)
- Diff staging — old version vs new version when comparing
- Ad-hoc data pulls used once and discarded
- Conversation logs from agent-to-agent collaboration sessions

## Why "shell committed, contents ignored"

The root `.gitignore` excludes `.archives/*` but allows `.archives/**/.gitkeep` and `.archives/README.md`. This means:

- ✅ Subfolder structure (e.g. `.archives/drafts/`, `.archives/experiments/`) is in git → every fresh clone has the same layout
- ❌ Actual content files (drafts, dumps, experiments) stay local only

This pattern solves a real problem: agents need predictable working directories. Without committed `.gitkeep` files, an agent on a fresh clone wouldn't know `.archives/drafts/` exists and might create `.archives/draft-output/` or `.archives/temp/` instead — drift.

## Suggested subfolder convention

```
.archives/
├── drafts/                 # in-progress generated content
│   └── .gitkeep
├── experiments/            # one-off agent experiments
│   └── .gitkeep
├── thinking/               # long reasoning dumps
│   └── .gitkeep
├── diffs/                  # before/after comparisons
│   └── .gitkeep
└── conversations/          # multi-agent collab logs
    └── .gitkeep
```

Add new subfolders by creating `.archives/<new>/` with a `.gitkeep` inside, then `git add .archives/<new>/.gitkeep` and commit. The shell update propagates to other operators on next pull.

## Lifecycle

```
Agent thinks → writes draft to .archives/drafts/blog-post-v1.md
            → iterates: .archives/drafts/blog-post-v2.md
            → final → moved to wiki/, charter, or out to publishing tool
            → drafts purged when done
```

There is no obligation to clean up. `.archives/` can accumulate; size is bounded by your disk, not the repo.

## Difference from raw/

| | `raw/` | `.archives/` |
|---|---|---|
| Origin | External — uploaded, downloaded, recorded | Internal — produced during work |
| Treatment | Mine for knowledge | Workspace for reasoning |
| Typical content | PDFs, recordings, screenshots, exports | Drafts, plans, intermediate outputs |
| Sync | Local-only, no shell tracked | Local-only, **shell tracked** |
| Lifespan | Until extracted, then can delete | Until task done, then can delete |

The shell-tracking is the only mechanical difference, but the *intent* difference matters: `raw/` is "stuff coming in from the world," `.archives/` is "stuff I'm producing while working."

## Rules for agents

1. **Default scratch location.** When you need to dump intermediate output, default to `.archives/<appropriate-subfolder>/` rather than creating new top-level temp folders.
2. **Don't reference .archives/ from canonical files.** Tier 1 files should never have a link to `.archives/foo.md` because `.archives/foo.md` doesn't exist on other operators' machines.
3. **Promote, don't reference.** When something in `.archives/` becomes worth keeping, **move** it to the right home (`wiki/`, Tier 1, Tier 3) rather than leaving it in archives and pointing at it.
4. **Date long-running drafts.** Use a timestamp prefix for things you'll iterate over multiple sessions: `.archives/drafts/2026-05-02-q3-strategy-draft.md`.

## What does NOT go here

- Anything you want another operator to read → `wiki/` or Tier 1
- Anything that needs to survive disk wipe → `raw/` is wrong too; use Tier 3 storage
- Long-term agent memory → `ops.agent_runs` (Tier 2) + `ops-agent-logs` bucket (Tier 3)
- Secrets — even temporarily. Use the secret manager.
