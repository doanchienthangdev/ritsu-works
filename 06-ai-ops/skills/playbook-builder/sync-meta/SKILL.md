---
name: playbook-builder/sync-meta
description: |
  Sync TOC and build_pdf.py metadata from chapter source files. Reads
  .archives/ritsu-handoff-bundle/playbook/chapters/, derives chapter list +
  H1 titles, writes 4 version fields in 00-toc.md + 3 fields in build_pdf.py.
  Deterministic transform — no LLM. Invoked by playbook-builder/build at
  Step 5 OR by founder for manual `/playbook check --fix` workflow.
trigger: invoked-by-playbook-builder/build
budget_cap_task_kind: skill-library-build
spec: wiki/capabilities/playbook-builder/spec.md (after Phase 8 promotion); draft .archives/cla/playbook-builder/spec.md
---

# Skill: playbook-builder/sync-meta

Bridges chapter source files → TOC + build_pdf.py metadata. Pure deterministic
transform. Idempotent — running on already-synced state is no-op.

## When to invoke

- Step 5 of `playbook-builder/build` (every build).
- Founder runs `/playbook check --fix` to repair detected drift.

Do NOT invoke standalone — it's a composed step, not a user-facing skill.

## Inputs

```json
{
  "version":      "X.Y.Z",
  "chapters_dir": ".archives/ritsu-handoff-bundle/playbook/chapters",
  "toc_path":     ".archives/ritsu-handoff-bundle/playbook/00-toc.md",
  "build_pdf_path": ".archives/ritsu-handoff-bundle/playbook/build_pdf.py",
  "date":         "YYYY-MM-DD"   // for "Ngày: cập nhật cuối" + "vX.Y · YYYY-MM-DD"
}
```

## Outputs

```jsonc
{
  "toc_updates":         ["version", "date", "chapter_list"],
  "build_pdf_updates":   ["CHAPTER_ORDER", "pdf_path", "cover_meta"],
  "chapter_count":       43,
  "noop":                false | true   // true if all 7 fields already in sync
}
```

## Process

### Step 1 — Scan chapters

```js
// Top-level chapters (01-13)
const topLevelChapters = glob.sync(`${chapters_dir}/[0-9][0-9]-*.md`).sort();

// Phase A.2 chapters (14+)
const phaseA2Chapters = glob.sync(`${chapters_dir}/phase-a2/[0-9][0-9]-*.md`).sort();

// Appendices
const appendices = glob.sync(`${chapters_dir}/A[0-9]-*.md`).sort();

const allChapters = [
  ...topLevelChapters.map(p => path.relative(chapters_dir, p)),
  ...phaseA2Chapters.map(p => path.relative(chapters_dir, p)),
  ...appendices.map(p => path.relative(chapters_dir, p)),
];
```

For each chapter, parse first H1 (`# Chương N — Title`) to derive title.

### Step 2 — Update 00-toc.md

Replace 4 fields (preserve surrounding prose):

1. `**Phiên bản:** v<X.Y> ...` — first line matching `^\*\*Phiên bản:\*\*`. Update version, preserve trailing parenthetical prose.
2. `**Ngày:** ... (cập nhật cuối: YYYY-MM-DD)` — update date.
3. Chapter list — entries `NN. **Chương NN — title**`. Regenerate from scan.
4. (Preserve) `### Phần I/II/...` section headers and intro prose.

**Heuristic for chapter entry prose:** if chapter already has a prose blurb in TOC (long-form description from prior version), preserve it. If NEW chapter (added since last sync), use chapter H1 as base + leave bracketed `[TODO: prose description]` for founder to fill.

### Step 3 — Update build_pdf.py

3 fields to update:

1. `CHAPTER_ORDER = [...]` — Python list, update entries from scan. Preserve `# section comments` between entries (e.g., `# Phần V — Phase A.2`).
2. `pdf_path = BUILD_DIR / "ai-native-company-playbook-vX.Y.pdf"` — update version.
3. `<div>vX.Y · YYYY-MM-DD</div>` (cover-meta) — update version + date.

Use AST-safe text replace (regex anchored on field name) to avoid accidentally rewriting Python code.

### Step 4 — Idempotency check

If all 7 field reads return current values matching new values → `noop: true`, exit 0 without writing.

## Compose with

- `playbook-builder/build` (caller, Step 5)
- `validate-playbook-coherence.cjs` (this skill's output validated by the validator post-write)

## Cost model

- Per invocation: **$0** (deterministic file I/O + regex)
- Wall-clock: <0.5s for 43 chapters
- Idempotent — running on synced state is a no-op

## Reference

- Spec: `wiki/capabilities/playbook-builder/spec.md` (after Phase 8 promotion)
- Sister skill: `playbook-builder/build`
