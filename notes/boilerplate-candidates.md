# Boilerplate Candidates — Tracking Patterns for Future Generalization

**Purpose:** Document patterns observed during Ritsu implementation that could be generalized into Agent OS boilerplate.

**Reference:** Playbook chương 31 — Agent OS Boilerplate Strategy

**When to use:** Update continuously during Ritsu Phase B implementation. When 2nd project starts, this file becomes the audit list for boilerplate extraction.

---

## How to use

After each implementation session, document:

1. **Pattern observed** — what code/config repeated
2. **Generic level** — 0-100% how much is reusable
3. **Customization needed** — what would change for another project
4. **Friction points** — what was hard

---

## Patterns observed

### Wave 1 — Foundation Schema

#### 2026-MM-DD — Bài #13 schema convention
- **Pattern:** 4-column convention (state, state_since, state_history, audit) applied to all ops.* tables
- **Generic level:** 100%
- **Customization:** None — pattern works for any domain
- **Note:** Confirm GBrain heritage applicable across projects

#### 2026-MM-DD — Tier 1 YAML scaffolding
- **Pattern:** All Tier 1 files có version + schema validation
- **Generic level:** 100% schemas, 0% values
- **Customization:** Values change per project
- **Action:** Create `templates/` folder with `{{PLACEHOLDER}}` patterns

---

### Wave 2 — Triggers + Orchestration

#### 2026-05-05 — Tier 1 YAML → bundled TS module pattern
- **Pattern:** Node CJS bundler reads a Tier 1 yaml at build time and emits an
  AUTO-GENERATED TS file with a typed const for the Edge Function (Deno) to
  import. Bundler enforces the structural invariants the consumer cares about
  (id presence, uniqueness) on top of schema-level validation.
  Concrete instance: `scripts/wave2-bundle-schedules.cjs` →
  `supabase/functions/_shared/schedules.generated.ts` consumed by
  `scheduled-run-dispatcher`.
- **Generic level:** 95% (the yaml→TS mechanics are pure boilerplate; only
  the input filename and the consuming module path differ per Tier 1 file)
- **Customization:** input yaml path; output TS path; ScheduleEntry type
  import; structural invariants
- **Reuse candidates:** any future Tier 1 yaml whose values must be available
  to a Deno Edge Function at request time (e.g.
  `event-subscriptions.yaml` → bundled module for the event-dispatcher in
  Bài #11; `mcp-tools.yaml` → bundled module for any MCP server)
- **Action:** when ≥ 2 such bundlers exist, factor out the common skeleton
  into `scripts/_shared/yaml-to-ts.cjs` taking config

#### 2026-05-05 — DI-friendly LLM skill factory
- **Pattern:** Skills that call Anthropic are written as `make<Skill>Handler({
  anthropic, model?, maxTokens? })` factories returning `SkillHandler`. The
  factory takes an `AnthropicLike` typed contract, not the real SDK, so unit
  tests inject a mock that captures `messages.create` calls. Errors from the
  SDK are routed through a shared `isRetryableAnthropicError` classifier
  (5xx / rate_limit / timeout / network) to set `retryable` flag for the
  worker.
  Concrete instance: `makeSynthesizeMorningBriefHandler` in
  `_shared/worker.ts`.
- **Generic level:** 90% (the factory + DI + retryable classifier are
  reusable across every Anthropic-backed skill; the prompt and output
  contract are skill-specific)
- **Customization:** system prompt; user prompt template; output payload
  shape; default model; max_tokens
- **Reuse candidates:** every future Anthropic-backed skill — pre-call-
  dossier, voice-note-classify, customer-360-summary, weekly-review-
  synthesis, etc. All would follow the same factory shape.
- **Action:** when ≥ 3 Anthropic skills exist, factor out
  `make<Skill>Handler` into a `makeAnthropicSkillHandler({prompt, parse,
  model?, maxTokens?})` higher-order factory

#### 2026-05-05 — pg_cron worker tick + bootstrap-injected secret
- **Pattern:** Schedule a worker function on a tight cadence (e.g. every
  minute). Migration creates the cron job with a "GUC pattern" command that
  reads `current_setting('app.<name>', true)` — source-control-safe. After
  migration, a bootstrap shell script runs `cron.unschedule + cron.schedule`
  via the Management API with the secret INLINED into `cron.job.command`.
  The secret then lives in `cron.job` (postgres-role-readable only), never
  in source. Re-run bootstrap on rotation or after `db reset`.
  Concrete instances:
    - migration: `00014_pg_cron_minion_worker_tick.sql`
    - bootstrap: `scripts/wave2-bootstrap-cron-secrets.sh`
- **Generic level:** 100%
- **Customization:** project URL; jobname; secret env-var name; cadence;
  source `.env` path
- **Friction:** the GUC pattern (`ALTER DATABASE … SET app.<x>`) does NOT
  work on hosted Supabase — `postgres` role lacks SUPERUSER and the call
  fails with `42501: permission denied to set parameter` from EVERY channel
  (SQL editor, `db push`, `db query --linked`). Verified empirically.
  The bootstrap-script pattern is therefore the only workable shape on
  hosted Supabase; document this clearly in any generated boilerplate so
  users don't waste time on the GUC ceremony.

---

### Wave 3 — State + Knowledge

(Update during implementation)

---

### Wave 4 — Visibility + Access

(Update during implementation)

---

### Wave 5 — Judgment + Privacy

(Update during implementation)

---

### Wave 6 — Multi-Surface + Ingestion

(Update during implementation)

---

### Wave 7 — Founder Capacity

(Update during implementation)

---

## Friction points (anti-patterns to avoid in boilerplate)

### 2026-MM-DD — Example friction
- **Issue:** [what was hard]
- **Workaround:** [what we did]
- **Boilerplate solution:** [how to avoid in template]

---

## Generic skills inventory

Track skills that are 80%+ generic:

| Skill | Generic % | Notes |
|---|---|---|
| state-transition | 100% | Pure framework, no domain logic |
| auto-link-extract | 100% | Regex patterns generic |
| schedule-dispatcher | 100% | Reads schedules.yaml |
| event-dispatcher | 100% | Reads event-subscriptions.yaml |
| muse-panel | 90% | Persona definitions specific |
| voice-note-classify | 70% | Classification categories specific |
| founder-triage-score | 95% | Scoring factors generic |
| morning-brief-synthesizer | 80% | Sources specific, synthesis generic |
| pre-call-dossier | 85% | Knowledge graph queries generic |
| customer-data-scan | 95% | GDPR machinery generic |

---

## Domain-specific overrides

Track project-specific code that won't generalize:

| Component | Why specific | Recommendation |
|---|---|---|
| Ritsu pricing tiers | EdTech pricing model | Keep in `01-growth/` pillar SOPs |
| Vietnamese-primary brand voice | Locale-specific | `00-core/brand_voice/brand_voice.vi.md` |
| 4-tier subscription | Ritsu business model | Domain-specific state machine |
| 17 activities × 7 modes | Product UX | Domain-specific entities |

---

## Tier 1 file split (generic schema vs specific values)

| File | Schema generic? | Values |
|---|---|---|
| schedules.yaml | ✅ | Ritsu rhythms |
| event-subscriptions.yaml | ✅ | Ritsu events |
| state-machines.yaml | ✅ | Ritsu entities |
| muse-personas.yaml | ✅ | Ritsu personas (29) |
| data-retention.yaml | ✅ | Ritsu data types |
| channels.yaml | ✅ | Ritsu surfaces |
| locales.yaml | ✅ | Ritsu locales |
| ingestion-sources.yaml | ✅ | Ritsu source kinds |
| founder-rhythm.yaml | ✅ | Founder-specific |
| feature-flags.yaml | ✅ | Ritsu features |

**Action:** When tách boilerplate, create `*.template.yaml` versions with `{{PLACEHOLDERS}}`.

---

## Open questions for boilerplate design

- OQ-BP-1: Should boilerplate include example data (fixtures) for testing?
- OQ-BP-2: How to version migrations across projects?
- OQ-BP-3: Should boilerplate be open-source eventually?
- OQ-BP-4: Plugin architecture (extensions package per domain)?
- OQ-BP-5: Multi-tenant within single boilerplate instance?

---

## Decision log

### 2026-MM-DD — Decision: not generalize during Wave 1-3
- **Decision:** Focus Ritsu, document patterns, defer extraction
- **Rationale:** Architecture not battle-tested, premature generalization risk
- **Reviewer:** Founder
- **Next review:** After Wave 3 stable

### (future entries)

---

## Generalization triggers (review monthly)

Re-evaluate quarterly:

- [ ] Is Ritsu Wave 1-3 stable?
- [ ] Is there a concrete 2nd project planned?
- [ ] Are 3+ patterns clearly identified as generic?
- [ ] Has founder articulated boilerplate value proposition?

If 3+ checkboxes ticked, start Phase 1 generalization (per chương 31.5).

---

*This file is a living document. Update during every implementation session that touches generic patterns.*

---

## docs-engine v1.0 Phase 8 contributions (2026-05-19)

Promotion of `docs-engine` (Live Documentation Engine — Fumadocs + Vercel) surfaced 4 reusable patterns. Source: `wiki/capabilities/docs-engine/retrospective.md` § Boilerplate-extractable patterns.

### 1. `scripts/<capability>-sync.cjs` walker template

The walker pattern in `scripts/docs-sync.cjs` is reusable for ANY codebase-to-rendered-artifact pipeline:
- Recursive `listSources` per source-kind
- Per-adapter dispatch
- 3-layer secret redaction
- `{/* generated-by */}` idempotency marker
- `--dry-run`, `--force`, `--area=<a>` CLI flags
- Frontmatter parser via `js-yaml`
- `source_hash = sha256(canonicalize(content))` drift detection

Future candidate extractions:
- `content-sync` (Tier 1 → blog posts on `ritsu.ai/blog`)
- `kpi-sync` (Tier 1 KPI definitions → dashboard config)
- `partner-sync` (CRM data → outreach content)

### 2. 3-layer fail-loud secret redactor

`docs/lint-secrets.cjs` pattern reusable for ANY auto-published surface:
- Layer 1: walker-exclude (never enter corpus)
- Layer 2: MDX/HTML regex scrub (fail-loud on match)
- Layer 3: CI gate (block deploy)
- Fail-loud not silent-scrub: a leak should produce loud build failure + incident issue

Future candidates: newsletter generator, public-facing changelog, status page, customer email templates.

### 3. CLA self-merge accelerated mode

Single-session compression of 3-sprint plan into ~6 hours via founder-authorized self-merge per PR. Worth documenting as optional `--accelerated` mode in `SOP-AIOPS-001-capability-lifecycle/`. Trade-off: founder time savings vs reduced per-PR review (founder reviews PR description on GitHub asynchronously instead of synchronous walk-through). Best for low-risk capabilities (reference-only docs, infrastructure scaffolding); NOT for capabilities touching production data, customer-facing surfaces, or D-tier actions.

### 4. CxO routing keyword extension when new domains emerge

`knowledge/cla-routing-keywords.yaml` `routes.code.keywords` should add: `docs`, `mdx`, `fumadocs`, `vercel`, `nextjs`. Currently routing worked by coincidence (matches on `code` + `hook` + `MCP`). Future doc/frontend capabilities may miss routing without keyword extension. Could be its own Phase 4 candidate `/cla fix cla-routing-keywords` task.

