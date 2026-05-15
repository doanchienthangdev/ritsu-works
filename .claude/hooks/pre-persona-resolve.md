---
name: pre-persona-resolve
version: 0.1.0
type: pre-tool
tools: [Task]            # observes Agent-tool subagent dispatch + slash command resolution
default_decision: allow
fail_mode: closed
---

# Hook: pre-persona-resolve

> Resolves a `/<slug>` or `@<slug>` invocation against the workforce persona
> registry, injects `persona_slug` and `bound_role` into the agent context,
> and surfaces a clear error when the slug is unknown. **Does NOT broaden
> permissions** — narrowing only. Permission ceiling stays with the bound role
> per `governance/ROLES.md`.

## Why this is a hook, not a skill

A slash-command or subagent invocation is the FIRST event in a turn. By the time a skill could be invoked, the persona context is already needed. A hook runs before any user-facing tool call, which is the right injection point.

This hook is a **resolver**, not a gate. The hard gate lives in `pre-delegate-check.md` (PR 1) which now also reads `persona_slug` from context to apply persona-level narrowing on top of the role's HITL ceiling.

## What it does

When a turn's first signal is `@<slug>` or a slash command matching `/<slug>`:

1. Reads `knowledge/workforce-personas.yaml`.
2. Looks up `personas.<slug>`:
   - If missing → returns `decision: block`, `reason: "Unknown persona slug <slug>. Suggest closest: <fuzzy match>. See knowledge/workforce-personas.yaml."`
   - If `status: planned|deferred` → returns `decision: block`, `reason: "Persona <slug> is not active (status: <s>). Fallback per CEO routing-matrix.md."`
   - If `status: retired` → returns `decision: block`, `reason: "Persona <slug> retired. See dossier history at 06-ai-ops/workforce-personas/<slug>/dossier.md."`
   - If `status: active` → proceed.
3. Resolves `binds_to.primary` → looks up `governance/ROLES.md` role definition.
4. Injects into agent context:
   - `persona_slug = <slug>`
   - `bound_role = <role>`
   - `persona_default_hitl_max = <tier>` (from registry; never broader than role's `hitl_max_tier`)
5. Returns `decision: allow` plus `log_extras: { persona_slug, bound_role, persona_default_hitl_max }`.

## Interaction with `pre-delegate-check`

`pre-delegate-check` (existing hook) consumes `persona_default_hitl_max` from context when present. If the action's tier exceeds the persona narrowing, it blocks with the persona-narrowing reason. If the action would also exceed the role's ceiling, the role-level block takes precedence (rules layered, not parallel).

## Resolution rules

- **Persona slug** = lowercase 3-5 chars (per `knowledge/workforce-personas.yaml` `naming_policy`).
- **Slash form** `/<slug>` vs **mention form** `@<slug>` — both resolve through the same hook; only the agent file vs command file used downstream differs (see `.claude/agents/<slug>.md` and `.claude/commands/<slug>.md`).
- **No double-resolution.** Once `persona_slug` is in context, subsequent tool calls do NOT re-resolve. Resolution is idempotent per session.
- **No fabrication.** If the registry entry is malformed (missing `binds_to.primary`), this hook returns `decision: block` and surfaces the schema error rather than guessing.

## Audit signal

This hook does NOT write to `ops.agent_runs`. The companion hook `post-persona-log.md` does that at end-of-invocation with the final `tier` and outcome. Audit responsibility is split intentionally: resolver injects, logger persists.

## Failure modes covered

| Case | Hook decision | Audit footprint |
|---|---|---|
| Unknown slug | block | none (slug never resolved) |
| Slug in `status: planned` | block | `log_extras.block_reason='planned-persona'` |
| Slug active but `binds_to.primary` role missing in ROLES.md | block | `log_extras.block_reason='binding-broken'` |
| Slug active, role exists, but `default_hitl_max` > role's ceiling | block + alert | `log_extras.block_reason='persona-broadens-role'` — should never happen if validators run; if it does, drift incident |
| All clean | allow | `log_extras.persona_slug` populated |

## Why narrowing-only

Per ADR-003. Personas are façade. Broadening = persona claims more authority than the underlying role has. That's a forbidden category — any attempted broadening is a `pre-delegate-check` hard block + a `verify-persona-narrowing` validator failure (PR 2/4).

## Wired by

- `scripts/cross-tier/validate-personas.cjs` (L1 critical): verifies every active persona resolves cleanly through this hook's logic offline.
- `scripts/check-consistency.cjs`: includes the persona validator in default `pnpm check` run.

## Specifies behavior; implementation pending

This file is the spec / contract. The actual JavaScript that runs at hook-time is loaded by Claude Code's hook runtime per `.claude/hooks/SPEC.md`. Currently the spec is the source of truth; the runtime executor reads it and dispatches.
