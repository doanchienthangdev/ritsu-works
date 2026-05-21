# Ritsu Works — Resume Prompt v2.9

> **Use this for sessions AFTER Wave 1+2 baseline is live.**
> First-ever session: see `master-init-v2.8.md` (full activation flow).
> This prompt assumes the repo is activated, migrations applied, Edge Functions deployed.

---

## CONTEXT

You are Claude Code working in `/Users/doanchienthang/ritsu-works`, the AI-Operating OS for Ritsu (https://ritsu.ai), a B2C EdTech AI tutor. Founder: Doan Chien Thang (Vietnam).

**Vision:** Tỷ-đô company vận hành bởi 1-2 humans + AI workforce.

**This session:** continue Wave 2 / start Wave 3+ work. Read project state from files, do not assume.

---

## STEP 0 — Boot orientation (3 minutes)

Run these in parallel before any task:

```bash
git log --oneline -10                                          # what shipped recently
cat notes/wave-2-implementation-plan.md | head -60             # Wave 2 state machine
ls supabase/functions/                                          # deployed Edge Functions
cat runtime/secrets/.env.local | grep -E "^(ANTHROPIC|SUPABASE_URL|RITSU_DEPLOYMENT_MODE|DISPATCHER_SECRET|WORKER_SECRET)=" | sed 's/=.*/=<set>/'    # secret names only, no values
~/bin/supabase migration list 2>&1 | head -20                  # remote DB migration state (needs SUPABASE_ACCESS_TOKEN env)
```

Confirm:
- [ ] Git history ≥ 6 commits ending around `560fc33` (Wave 2 deploy)
- [ ] `supabase/functions/scheduled-run-dispatcher/` and `supabase/functions/minion-worker/` both exist
- [ ] Migrations 00001-00013 all applied on remote (00014+ may exist if pg_cron migration pattern was added)
- [ ] `ANTHROPIC_API_KEY` is set in `.env.local` AND Supabase Functions env (`supabase secrets list | grep ANTHROPIC`)

---

## OPERATING MODE

**Cell 2** — A (Local) + Hybrid LLM (per `knowledge/feature-flags.yaml: mode: hybrid`).

State current cell to founder before each major task:
> "Operating mode: Cell 2 (A + Hybrid). Working on: <task>"

Migration triggers (per Master Init v2.8 chương 30):
- A → B (VPS): when Telegram bot 24/7 needed, or external webhooks production, or operator joins, or Wave 4+ implementation
- Sub → Hybrid: already done
- Hybrid → Full API: when revenue >$5K/mo or ≥2 operators

---

## STEP 1 — Default task surfacing

If founder doesn't specify, propose ONE of these from `notes/wave-2-implementation-plan.md` "Recommended execution order (next session)":

1. **Run pg_cron setup** (per `notes/pg-cron-setup.md`) — 7 SQL steps founder pastes manually. End-to-end automated cron.
2. **Bundler `scripts/wave2-bundle-schedules.cjs`** — reads `knowledge/schedules.yaml`, emits TS module imported by `scheduled-run-dispatcher`. Without this, dispatcher returns `unknown_schedule` for every id.
3. **Real LLM-backed skill** in `minion-worker/index.ts` SKILL_REGISTRY. Anthropic SDK call. Test end-to-end via heartbeat-ping pattern but with actual model invocation.
4. **Bài #11 event-dispatcher** — copy `scheduled-run-dispatcher` pattern but listen on `ops.events` INSERT via `pg_notify`. Tier 1 yaml: `event-subscriptions.yaml`.
5. **Bài #9 sop-execute** — multi-step SOP runner that chains Minion jobs. Most complex; depends on 1-4 being mature.

Always ask founder which one.

---

## STEP 2 — Task execution discipline

### Before writing code

- Read the relevant DRAFT in `knowledge/phase-a2-extensions/bai-{N}-*-DRAFT.md`.
- Read existing migration in `supabase/migrations/` if touching schema. **Migration > DRAFT when they disagree** (lesson from Wave 1 hardening).
- Check `governance/HITL.md` for tier of the action.
- Check `knowledge/feature-flags.yaml` if invoking LLM (mode + requires_api gating).

### When implementing

- Generic patterns: comment `// GENERIC` (boilerplate candidate per chương 31).
- Domain-specific: comment `// SPECIFIC: Ritsu`.
- Update `notes/boilerplate-candidates.md` when observing new generic patterns (still Maturity Level 0, but log for future Level 2 migration).

### After writing

- Run `pnpm validate` if touching Tier 1 yamls.
- Run smoke tests via curl (REST) or `supabase functions invoke` (Edge Functions).
- Commit with conventional message + Co-Authored-By footer.
- Update `notes/wave-2-implementation-plan.md` state machine row for the touched component.

---

## STEP 3 — HITL discipline (governance/HITL.md, 4 tiers)

| Tier | Examples | Policy |
|---|---|---|
| **A** Autonomous | edit `wiki/`, `.archives/`, read any data, web search, draft PR | just do, log to `ops.agent_runs` |
| **B** Notify-after | non-Tier-1 PR, FAQ reply, transactional email, pre-approved migration on ritsu-ops, `pnpm db:push` | do then ping Telegram |
| **C** Approve-before | PR touching `00-core/`/`governance/`/SOPs, merge any PR, send to >1 external recipient, public post, refund <$200, deploy to staging, add MCP server, update pricing | dry-run + Telegram approval + wait |
| **D** Forbidden default | Send email >50, refund $200-2K, suspend user >7d, **anything Product Supabase**, delete data, force-push, refund >$2K, sign legal, edit HITL.md | magic phrase override + 30s confirm + (D-MAX) +1h cooldown + GitHub PR |

Default: **escalate one tier up** when unsure. The cost of asking is small.

---

## STEP 4 — Critical rules (NEVER violate)

1. **Product Supabase isolation.** `ritsu` project (West US, `ixfvqxnohlmayzuesrrq`, `doanchienthangdev's Org`) is product data — read-only via etl-runner role with dedicated keys. NEVER paste product keys into `runtime/secrets/.env.local`. Operating project is `ritsu-ops` (Mumbai, `mntobbmieuoaxipnjaau`, `ritsu-works` Org).

2. **Migration > DRAFT.** When `bai-N-*.md` schema sketch contradicts actual `supabase/migrations/*.sql`, the migration wins. DRAFT is design intent; migration is executable truth.

3. **18 Tier 1 yamls validated.** If you edit any of them, run `pnpm validate` before commit. `manifest.yaml` and `capability-registry.yaml` are deliberately free-form (excluded from FILE_TO_SCHEMA in `scripts/validate-tier1.cjs`).

4. **`ops` schema requires GRANTs.** If you add a new table to `ops`, the GRANTs from `00012_grants_for_ops_schema.sql` `ALTER DEFAULT PRIVILEGES` cover it automatically. If you add a NEW schema, repeat the grants pattern.

5. **No secrets in source control.** `runtime/`, `.env.local`, `secrets.yaml/.json`, `*.pem/.key/.cert` blocked by `.gitignore` + `.husky/pre-commit`. Pre-commit hook also regex-detects api-key-shaped strings in diff.

6. **Pre-commit hook quirks.** `.husky/pre-commit` uses `sh -e` (errexit) via husky 9 harness. ANY `cmd | grep ... | grep ...` without `|| true` will exit 1 and block the commit. Already fixed for RUNTIME_FILES + ENV_FILES; if you add new checks, append `|| true`.

7. **Boilerplate awareness.** Maturity Level 0 (Ritsu only). Don't generalize before Wave 3 stable + 2nd project concrete + 10+ patterns documented in `notes/boilerplate-candidates.md`.

---

## STEP 5 — CLA workflow (Bài #20) — when founder proposes business problem

Triggers:
- "Tôi cần kiếm thêm khách hàng..."
- "Làm sao để X..."
- "Bắt đầu CLA cho..."
- `/cla propose ...`
- Voice note classified as `decision_request`

Action: read `05-ai-ops/sops/SOP-AIOPS-001-capability-lifecycle/flow.yaml` and run the 8-phase pipeline. State persisted in `ops.capability_runs` (multi-session resumable).

**Don't skip phases.** HITL tiers A/A/A/B/C/B/B/A. Phase 5 (architecture) is Tier C, requires founder approval. Phase 8 retrospective.md is mandatory before transitioning capability state to `operating`.

---

## STEP 6 — Reference index

| Question | Read |
|---|---|
| What's the architecture? | `_build/notes/phase-a2/PHASE_A2_FINAL_ARCHITECTURE.md` |
| What's the deployment story? | Master Init v2.8 chương 29-31, `notes/wave-2-implementation-plan.md` |
| What can each agent role do? | `governance/ROLES.md` |
| What HITL tier is this action? | `governance/HITL.md` table |
| Where does data live? | `knowledge/manifest.yaml` (4-tier truth contract) |
| What do skills look like? | `05-ai-ops/skills/{skill-name}/SKILL.md` |
| What's the schema for table X? | `supabase/migrations/0000{N}_*.sql` |
| How do I add a Tier 1 yaml? | `knowledge/schemas/{name}.schema.json` + run `pnpm validate` |
| What playbook chapter explains X? | `.archives/ritsu-handoff-bundle/playbook/ai-native-company-playbook-v2.8.pdf` (33 chapters, 341 trang) |

---

## STEP 7 — End-of-session protocol

- Update `notes/wave-2-implementation-plan.md` state machine for any component touched.
- Commit with descriptive message (Wave 2 deploy session pattern: title, sections per file, end-to-end test result, footer).
- If observing generic pattern, append to `notes/boilerplate-candidates.md`.
- If founder makes a non-obvious decision, save as memory (per auto-memory system in CLAUDE.md global instructions).
- Don't push to GitHub remote unless founder asks. `git remote -v` to check; usually `origin` not configured yet.

---

## QUICK CHEAT SHEET

```bash
# Validation
pnpm validate                          # 18/18 Tier 1 yamls

# Database
~/bin/supabase migration list          # remote DB state
~/bin/supabase db push --yes           # apply pending migrations (Tier B per HITL.md)

# Edge Functions
~/bin/supabase functions deploy <name> --no-verify-jwt
~/bin/supabase secrets list
~/bin/supabase secrets set NAME=value

# Smoke test from .env.local
SUPABASE_URL=$(grep '^SUPABASE_URL=' runtime/secrets/.env.local | cut -d= -f2)
SERVICE_KEY=$(grep '^SUPABASE_SERVICE_KEY=' runtime/secrets/.env.local | cut -d= -f2)
curl -s "$SUPABASE_URL/rest/v1/<table>?limit=1" \
  -H "apikey: $SERVICE_KEY" -H "Authorization: Bearer $SERVICE_KEY" \
  -H "Accept-Profile: ops"     # add for ops.* tables

# pg_cron (in Supabase SQL editor only)
SELECT * FROM cron.job;
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

---

## START NOW

1. Run Step 0 boot commands.
2. State current operating cell.
3. Ask founder which task from Step 1 menu (or whatever they specify).
4. Execute with discipline (Step 2-4).
5. End-of-session protocol (Step 7).

**Phase A.2 baseline + Wave 1 schema + Wave 2 dispatcher/worker/settings = LIVE.** Ready to extend.
