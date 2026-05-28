---
name: playbook-builder/build
description: |
  Rebuild + version-bump + publish the AI-Native Company Playbook PDF
  (.archives/ritsu-handoff-bundle/playbook/). Detects chapter changes,
  auto-bumps version (semver: patch for content tweak, minor for new chapter,
  major requires founder confirm Tier B), syncs TOC + CHAPTER_ORDER via
  playbook-builder/sync-meta, invokes scripts/playbook/build.sh which runs
  build_pdf.py under /opt/anaconda3 Python with WeasyPrint native libs from
  /opt/homebrew/lib. Publishes vX.Y.pdf to playbook root alongside published
  versions.
trigger: invoked-by-/playbook-build-command
budget_cap_task_kind: skill-library-build   # deterministic, $0 LLM cost
spec: wiki/capabilities/playbook-builder/spec.md (after Phase 8 promotion); draft .archives/cla/playbook-builder/spec.md
---

# Skill: playbook-builder/build

The workhorse of /playbook build. Wires change detection + version bump +
meta sync + PDF render + publish into single Skill invocation. Zero LLM cost.

## When to invoke

- `/playbook build` command (default verb).
- `/playbook build --add-chapter=phase-a2/NN-foo.md` (convenience: add chapter file + immediately rebuild).
- Composed by docs-engine/sync when post-sync detects Tier 1 changes touching playbook-mapped chapters (per `knowledge/playbook-chapter-source-map.yaml`).

Do NOT invoke for chapter content authoring — that's separate Claude session work.

## Inputs

```json
{
  "version":      null | "X.Y.Z",        // explicit version override
  "add_chapter":  null | "<rel-path>",   // copy chapter file then build
  "dry_run":      false | true,          // validator only, skip build
  "force":        false | true            // skip change detection (rebuild even if no chapter mtime newer than latest PDF)
}
```

## Outputs

Strict JSON to stdout:

```jsonc
{
  "version_built":    "X.Y.Z",
  "pdf_path":         ".archives/ritsu-handoff-bundle/playbook/ai-native-company-playbook-vX.Y.pdf",
  "pdf_size_bytes":   3778763,
  "wall_clock_s":     3.2,
  "changes_detected": ["phase-a2/42-...md", "phase-a2/43-...md"],
  "version_bump":     "patch" | "minor" | "major",
  "agent_run_id":     "<uuid>",
  "skipped":          false | "no_changes_detected"
}
```

## Process — 7 steps

### Step 1 — Drift gate

Invoke `node scripts/cross-tier/validate-playbook-coherence.cjs`. If WARN-level issues exist, surface to founder via AskUserQuestion ("Drift detected before build — fix or ignore?"). FAIL-level issues abort.

### Step 2 — Change detection (skip if `force` or `add_chapter`)

```js
const latestPdf = glob.sync('.archives/ritsu-handoff-bundle/playbook/*.pdf').sort().pop();
const latestPdfMtime = fs.statSync(latestPdf).mtime;
const changedChapters = glob.sync('.archives/ritsu-handoff-bundle/playbook/chapters/**/*.md')
  .filter(f => fs.statSync(f).mtime > latestPdfMtime);
```

If `changedChapters.length === 0` AND `!add_chapter` AND `!force`:
- Return early with `skipped: 'no_changes_detected'`
- Exit 0

### Step 3 — Auto version bump

Read current TOC version (`Phiên bản: v<X.Y>`).

Bump rules:
- `add_chapter` is set OR new chapter file detected (file not in CHAPTER_ORDER yet) → **minor** (X.Y → X.(Y+1))
- Only existing chapter files modified → **patch** (X.Y → X.Y+0.1)
- New top-level section in chapters/ (e.g., new pillar dir) → **major** — surface to founder via AskUserQuestion Tier B

If `version` input explicit → use that.

### Step 4 — Add chapter (if `add_chapter`)

If input specifies `add_chapter`:
- Copy file to `chapters/<add_chapter>` (caller-provided relative path)
- Otherwise, file must already exist at that path

### Step 5 — Sync meta

Invoke `playbook-builder/sync-meta` skill with:
- `version`: from Step 3
- `chapters_dir`: `.archives/ritsu-handoff-bundle/playbook/chapters`

Sync-meta updates `00-toc.md` (4 fields) + `build_pdf.py` (3 fields).

### Step 6 — Build PDF

```bash
bash scripts/playbook/build.sh
```

Captures output PDF at `.archives/ritsu-handoff-bundle/playbook/build/ai-native-company-vX.Y.pdf`.

On non-zero exit, abort. Common failures:
- `[playbook] PYTHON not found at /opt/anaconda3/bin/python3` → fail with install hint
- WeasyPrint native lib missing → fail with `brew install` hint

### Step 7 — Publish

```bash
cp .archives/ritsu-handoff-bundle/playbook/build/ai-native-company-playbook-vX.Y.pdf \
   .archives/ritsu-handoff-bundle/playbook/
```

INSERT `ops.agent_runs` row:
- `agent_slug = 'playbook-builder/build'`
- `cost_bucket = 'ai-ops-skill-library'`
- `tier = 'A'` (B if major bump confirmed)
- `tokens_input = 0`, `tokens_output = 0`, `cost_usd = 0`
- `input_payload` = inputs above
- `output_payload` = strict JSON output

Emit `ops.events` event:
- `event_type = 'ritsu.playbook.built'`
- `payload = { version, pdf_path, version_bump, changes_detected }`

## State persistence

Single Skill invocation = single `ops.agent_runs` row. No multi-phase state needed.

## Compose with

- `playbook-builder/sync-meta` (Step 5)
- `scripts/playbook/build.sh` (Step 6 — helper script)
- `scripts/cross-tier/validate-playbook-coherence.cjs` (Step 1 — drift gate)
- `06-ai-ops/skills/docs-engine/sync/SKILL.md` (composition target — docs-engine invokes this skill post-sync)

## Cost model

- `unit: usd`. Per-invocation cost: **$0** (deterministic, no LLM calls).
- Setup cost: ~$4 LLM (CLA Phases 5-8).
- Founder time per invocation: ~1 minute (single `/playbook build`).

## Reference

- Spec: `wiki/capabilities/playbook-builder/spec.md` (after Phase 8 promotion; current draft `.archives/cla/playbook-builder/spec.md`)
- Capability run id: `39294f02-8552-4de3-83bc-430bf019e441`
- Sprint 1 PR: TBD
- Memory: `feedback_docs_sync_autosync_playbook.md` (interim rule until capability operating)
