---
name: pre-edit-tier1
version: 0.2.0
type: pre-tool
tools: [Edit, Write, MultiEdit, str_replace, create_file]
default_decision: allow
fail_mode: closed
---

# Hook: pre-edit-tier1

> Blocks direct edits to Tier 1 files. Forces all changes through PR + governance per `governance/HITL.md`.

## What it does

Inspects the file path for any Edit/Write/MultiEdit operation. If the path matches a Tier 1 protected pattern AND the operation is on the `main` branch (or detached HEAD on a Tier 1 file), the hook escalates or blocks per the file's specific tier.

## Protected paths

The protected patterns map to HITL tiers as follows:

```
00-charter/**                    → Tier C  (escalate, require PR)
governance/ROLES.md              → Tier C  (escalate, require PR)
governance/HITL.md               → D-MAX   (block unless override+ceremony)
governance/SECRETS.md            → D-MAX   (block unless override+ceremony)
governance/BUDGET.md             → C       (when file exists; planned)
knowledge/manifest.yaml          → C       (escalate)
knowledge/schemas/*.sql          → D-Std   (escalate, magic phrase)
.claude/hooks/*                  → D-Std   (escalate; modifying hooks weakens safety)
.claude/agents/*                 → C       (escalate)
**/SOP-*/**                      → C       (escalate)
skills/**                        → C       (escalate)
mcp/servers.yaml                 → C       (escalate)
mcp/custom/**                    → C       (escalate)
_build/**                        → C       (escalate)
workflows/**                     → C       (escalate)
```

Paths NOT in the list are not Tier 1 protected. The hook lets them through unconditionally:

- `wiki/**`, `raw/**`, `.archives/**` (workspace plane)
- `.archives/**/*.gitkeep` (shell tracking)
- README.md and CLAUDE.md at root → these ARE Tier 1, but special-cased: agents propose updates via PR only via the standard flow

## Decision logic

```
function decide(payload):
    path = payload.tool_payload.file_path
    branch = current_git_branch()  # from cwd

    if path matches D-MAX pattern:
        if has_active_override(payload.session_id, action="edit:" + path):
            log_extras["override_check"] = "passed"
            return allow(reason="override active")
        return block(reason="D-MAX file requires override ceremony per governance/HITL.md")

    if path matches D-Std pattern:
        if has_active_override(payload.session_id, action="edit:" + path):
            return allow(reason="override active")
        return escalate(reason="D-Std file edit; HITL approval required")

    if path matches Tier C pattern:
        if branch == "main" and not is_pull_request_context():
            return block(reason="direct edit to main forbidden; create branch and open PR")
        return escalate(reason="Tier 1 edit; PR + founder approval required")

    return allow()
```

## Inputs needed

- `payload.tool_payload.file_path` — the file being edited
- `payload.session_id` — for override check
- Current git branch — read from `.git/HEAD` or `git symbolic-ref HEAD`
- Override state — query `ops.agent_runs.was_override` recent rows for this session_id (cache aggressively)

## Special cases

- **Symlinks:** resolve to canonical path before matching
- **`.gitignore`'d paths matching protected patterns:** still block, even though the change wouldn't be committed (defense in depth)
- **Multi-file operations (MultiEdit):** apply check to each file; if any single file would be blocked, the entire operation is blocked
- **`create_file`:** treated same as Edit — creating `governance/HITL.md` afresh is even more dangerous than editing
- **Renames within protected dirs:** treated as Edit on the destination

## Mutation cases

This hook never mutates payloads. Always allow/block/escalate.

## Test cases

| # | Scenario | Expected |
|---|---|---|
| 1 | Edit `wiki/competitors/anki.md` | allow |
| 2 | Edit `wiki/_private-note.md` | allow |
| 3 | Edit `.archives/drafts/foo.md` | allow |
| 4 | Edit `00-charter/product.md` on a feature branch | escalate |
| 5 | Edit `00-charter/product.md` on `main` | block |
| 6 | Edit `governance/HITL.md` with no override | block |
| 7 | Edit `governance/HITL.md` with active override for this session | allow |
| 8 | Edit `governance/SECRETS.md` (D-MAX) | block |
| 9 | Edit `knowledge/schemas/agent_runs.sql` | escalate |
| 10 | Edit `.claude/hooks/pre-edit-tier1.md` (this file) | escalate |
| 11 | Edit `.claude/agents/gps.md` | escalate |
| 12 | Edit `01-growth/SOP-GROWTH-001/playbook.md` | escalate |
| 13 | Edit `skills/blog-post-drafting/SKILL.md` | escalate |
| 14 | Edit `mcp/servers.yaml` | escalate |
| 15 | MultiEdit covering both `wiki/foo.md` and `governance/HITL.md` | block (the strict one wins) |
| 16 | Create `governance/HITL.md` from scratch (file doesn't exist) | block |
| 17 | Symlink `governance/HITL.md` → `/tmp/foo` then edit `/tmp/foo` | block (resolve symlink) |

## Performance notes

- Cache `governance/HITL.md` and the path-pattern table; re-read only on mtime change
- Override check should hit a local cache populated by the Telegram bot ack callback; falling back to Supabase query is acceptable but slow

## Observability

Log every block with `match_rule = "<path-pattern>"` so dashboard can show which files trigger most blocks. High-frequency blocks indicate either (a) a confused agent (training opportunity) or (b) a workflow gap that should become a recipe.

## Implementation reference

Pseudocode in TypeScript style:

```typescript
import { resolve } from 'path';
import { execSync } from 'child_process';

const PATTERNS = [
  { match: /^governance\/HITL\.md$/, tier: 'D-MAX' },
  { match: /^governance\/SECRETS\.md$/, tier: 'D-MAX' },
  { match: /^knowledge\/schemas\/.+\.sql$/, tier: 'D-Std' },
  { match: /^\.claude\/hooks\/.+/, tier: 'D-Std' },
  { match: /^00-charter\//, tier: 'C' },
  { match: /^governance\/ROLES\.md$/, tier: 'C' },
  { match: /^knowledge\/manifest\.yaml$/, tier: 'C' },
  { match: /^.+\/SOP-[A-Z]+-\d+\//, tier: 'C' },
  { match: /^skills\//, tier: 'C' },
  { match: /^mcp\//, tier: 'C' },
  { match: /^_build\//, tier: 'C' },
  { match: /^workflows\//, tier: 'C' },
  { match: /^\.claude\/agents\//, tier: 'C' },
];

export function decide(payload: HookInput): HookDecision {
  const filePath = resolve(payload.tool_payload.file_path);
  const repoRel = makeRepoRelative(filePath);
  const match = PATTERNS.find(p => p.match.test(repoRel));
  if (!match) return { decision: 'allow', reason: 'not Tier 1' };
  // ...continue per decision logic above
}
```

---

*The first line of defense. If this hook fails, every other safety mechanism in the repo is on the honor system.*
