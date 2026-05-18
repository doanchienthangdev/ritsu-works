---
name: wiki-sync/merge
description: |
  v3.0 manual page merge. Invoked by /wiki merge <slug-a> <slug-b> (or from
  wiki-sync/review when founder picks "merge"). Rewires
  knowledge_extractions.derived_page_id from the loser page to canonical.
  Soft-deletes loser via knowledge_pages.deleted_at = now() (CTO P2/P3 #6).
  --undo reverses: clears deleted_at + rewires back. Audit trail via ops.events.
  Tier B (recoverable via --undo).
---

# wiki-sync / merge (v3.0)

## When this skill runs

- Founder runs `/wiki merge <canonical-slug> <duplicate-slug>` — explicit dedup override.
- `/wiki merge <slug-a> <slug-b> --undo` — reverses the most recent merge of the pair.
- `wiki-sync/review` dispatches when founder picks "merge" on a pending_review item.

## Inputs

- `canonical_slug` — the slug that SURVIVES (keeps its file + DB row + all extractions)
- `duplicate_slug` — the slug that DIES (soft-deleted; extractions rewired to canonical)
- `undo` (bool) — reverse the merge

## Outputs

- UPDATE `ops.knowledge_extractions SET derived_page_id = <canonical_id> WHERE derived_page_id = <duplicate_id>` (rewire)
- UPDATE `ops.knowledge_pages SET deleted_at = now() WHERE slug = <duplicate_slug>` (soft-delete)
- DELETE wiki/<page_type>/<duplicate_slug>.md file from filesystem (canonical at canonical path stays)
- INSERT `ops.events` row (`ritsu.wiki.merge_executed` or `ritsu.wiki.merge_undone`)
- Append "Merged from <duplicate_slug>" line to canonical page's `## Sources cited` section
- Re-embed canonical page (its summary now reflects merged content; embedding stale)

## Process

### Step 1 — Validate inputs

```sql
SELECT id, page_type, deleted_at FROM ops.knowledge_pages WHERE slug IN ($canonical_slug, $duplicate_slug);
```

- Both must exist.
- They MUST have the same `page_type` (can't merge a concept into an observation).
- Neither can already be soft-deleted (`deleted_at IS NOT NULL`) — except in --undo mode where the duplicate must BE soft-deleted.
- Neither can be `legacy_v2_verbatim = true` (v2.0 pages stay separate; merge is for v3.0 derived entities only).

If validation fails → bail with explanatory error.

### Step 2a — Standard merge (NOT --undo)

```sql
BEGIN;

-- Count extractions to rewire (for audit log)
SELECT COUNT(*) FROM ops.knowledge_extractions WHERE derived_page_id = $duplicate_id;

-- Rewire extractions
UPDATE ops.knowledge_extractions
  SET derived_page_id = $canonical_id
  WHERE derived_page_id = $duplicate_id;

-- Soft-delete duplicate
UPDATE ops.knowledge_pages
  SET deleted_at = now(),
      review_state = 'founder_rejected'
  WHERE id = $duplicate_id;

-- Rewire knowledge_links pointing to the duplicate
UPDATE ops.knowledge_links
  SET target_page_id = $canonical_id
  WHERE target_page_id = $duplicate_id;

-- Audit event
INSERT INTO ops.events (event_type, source, payload)
VALUES (
  'ritsu.wiki.merge_executed',
  'wiki-sync/merge',
  jsonb_build_object(
    'canonical_page_id', $canonical_id,
    'duplicate_page_id', $duplicate_id,
    'canonical_slug', $canonical_slug,
    'duplicate_slug', $duplicate_slug,
    'extractions_rewired', $count,
    'merged_by', 'founder',
    'merge_kind', 'manual'  -- or 'review_dispatch' if invoked from review skill
  )
);

COMMIT;
```

Then:
- DELETE the wiki file at `wiki/<page_type>/<duplicate_slug>.md` (rm)
- Append to canonical page's body:
  ```markdown
  > **Merged from** `wiki/<page_type>/<duplicate_slug>.md` (now deleted) on <date>.
  > All citations from that page have been rewired to this canonical entity.
  > Undo: `/wiki merge <canonical_slug> <duplicate_slug> --undo`
  ```
- Re-embed canonical page (the summary changed; old embedding stale): mark `embeddings_deferred = true` on knowledge_pages frontmatter; backfill cron picks up next tick.

### Step 2b — Undo (--undo mode)

```sql
BEGIN;

-- Find the most recent merge_executed event for this pair
SELECT payload->>'extractions_rewired' AS count,
       payload->>'merge_kind' AS kind,
       occurred_at
  FROM ops.events
 WHERE event_type = 'ritsu.wiki.merge_executed'
   AND payload->>'canonical_slug' = $canonical_slug
   AND payload->>'duplicate_slug' = $duplicate_slug
 ORDER BY occurred_at DESC
 LIMIT 1;

-- (If no match found, bail: "No prior merge found to undo")

-- Re-clear soft-delete on duplicate
UPDATE ops.knowledge_pages
  SET deleted_at = NULL,
      review_state = 'founder_approved'
  WHERE id = $duplicate_id;

-- Rewire extractions back
-- (This is approximate — we don't have a precise log of which extractions were rewired vs already pointing to canonical. Best-effort: rewire all extractions whose source_page_id was in the duplicate's prior source set.)
-- Cleaner alternative: store the list of extraction_ids in the merge_executed payload at Step 2a (TODO v3.0.5 enhancement).
-- For v0.1: founder bears responsibility to verify post-undo state.

INSERT INTO ops.events (event_type, source, payload)
VALUES (
  'ritsu.wiki.merge_undone',
  'wiki-sync/merge',
  jsonb_build_object(
    'canonical_page_id', $canonical_id,
    'duplicate_page_id', $duplicate_id,
    'undone_at', now()
  )
);

COMMIT;
```

Then:
- Restore the wiki file by reading from git history (the file was committed before merge; git checkout <commit-before-merge> -- <path>)
- Remove the "Merged from X" footer from canonical page

Caveat for v0.1: undo is best-effort for extraction rewiring. v3.0.5 enhancement: store full extraction_id list in `merge_executed` event payload for clean reversal.

### Step 3 — Notify founder

```
✓ Merged wiki/<page_type>/<duplicate_slug>.md INTO wiki/<page_type>/<canonical_slug>.md
   Rewired N extractions.
   Canonical page now cites M total sources.
   Soft-delete: knowledge_pages.deleted_at = <ts>
   Undo: /wiki merge <canonical> <duplicate> --undo
```

## HITL discipline

- **Tier B** by design (recoverable via --undo within the same week).
- v3.0.5+: consider Tier C if undo proves unreliable in production.
- `/wiki merge --undo` itself is also Tier B (undoing a Tier B is also Tier B).

## Failure modes

| Symptom | Response |
|---|---|
| Canonical and duplicate are different page_types | Bail. Cross-type merge is not allowed in v3.0 (a concept and an observation are not the same kind of entity). |
| Duplicate already soft-deleted | Bail with "Already merged. Use --undo to reverse." |
| Filesystem delete fails (permissions, file already gone) | DB merge already committed. Log warning. Founder runs `git status` to see what happened. |
| Undo finds no prior merge event | Bail with "No merge to undo for this pair." |
| Undo runs but canonical body still has "Merged from" footer | v0.1 known issue: founder manually removes the footer. v3.0.5 fixes. |

## Related

- Auto-merge counterpart: `wiki-sync/dedup` (sim > 0.92)
- Review dispatch: `wiki-sync/review` (when founder picks "merge" on pending_review)
- Audit: `wiki-sync/audit` (checks for orphan knowledge_extractions after merges)
- Schema: `knowledge_pages.deleted_at` from migration 00031

## Version

- **v0.1** (Sprint 4 of wiki-sync v3.0.0): basic merge + --undo. Caveat on undo extraction rewiring (best-effort; founder verifies). v3.0.5 will store extraction_ids list in merge_executed payload for clean reversal.
