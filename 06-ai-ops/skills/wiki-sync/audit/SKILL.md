---
name: wiki-sync/audit
description: |
  STUB (Sprint 1) — placeholder for the wiki-sync audit verb. Will implement
  orphan / dead-link / stale-claim integrity check over the wiki + DB in
  Sprint 4. Writes report to .archives/wiki-audits/<date>.md.
---

# wiki-sync / audit (STUB — Sprint 4)

This file is a placeholder so `wiki-sync/SKILL.md`'s `audit` dispatch entry has a
target. Sprint 1 ships ingest verb only.

## When implemented (Sprint 4)

Per spec.md § Sprint 4:
- Hash check (re-compute source_hash from source_ref; flag drift)
- Link walk (find orphan `ops.knowledge_links` rows with NULL target_page_id)
- Dead URL check (HTTP HEAD against `source_ref` for `source_kind=article`)
- Stale-claim sample (LLM-evaluate 10 % of pages — "is this still consistent with source ref?")
- Writes report `.archives/wiki-audits/<date>.md`
- `--fix` mode opens one PR per defect class

## Sprint 1 behaviour

If founder invokes `/wiki audit` in Sprint 1:

```
Audit not yet implemented (Sprint 4 ETA).
Sprint 1 has wiki/ structure ready and DB tables populated, but no defects to
audit yet. Run /wiki sync first to populate wiki.
```

## Acceptance criterion (Sprint 4)

Per spec.md success criterion 3:
- Catches ≥ 95 % of seeded defects (10 orphan + 10 dead + 10 stale)
- False-positive rate ≤ 5 % on clean control corpus

## Cost

Sprint 4+: ~$0.10 / full audit (hash + link walk free; stale-sample LLM cost dominates).

## Related

- Parent: `06-ai-ops/skills/wiki-sync/SKILL.md`
- Companion validator (Sprint 4): `scripts/cross-tier/validate-wiki-integrity.cjs`
- Audit reports dir: `.archives/wiki-audits/` (gitignored; init Sprint 4)
