# CHANGELOG — design-system-styling

Lineage of changes to the `design-system-styling` capability. Newest first.
Created by `/cla fix` Phase 8 (SOP-AIOPS-001-fix). Spec: `wiki/capabilities/design-system-styling/spec.md`.

## v1.0.1 — 2026-06-01 — `/cla fix` (Tier B)

**Problem.** Two real `npx getdesign@latest add <name>` outputs failed to materialize, hard-crashing the consuming command instead of degrading:

1. **spotify** — getdesign returned a DESIGN.md of pure prose with **no YAML token frontmatter** (`# Design System Inspired by Spotify`). `parse-design-md` threw `DESIGN.md has no YAML token frontmatter` and the throw propagated through `resolve-style` to the caller.
2. **supabase** — valid colors/typography, but a long **unquoted `description:` with an embedded `": "`** broke js-yaml (`bad indentation of a mapping entry (3:323)`).

**Goal.** Materializing ANY getdesign system never hard-crashes a consuming command; worst case is a clean plain fallback + a logged warning. sRGB / ref-cycle validation stays strict for systems that *do* have valid token blocks.

**Fix (3 composed changes, single PR, no architecture change).**

1. **`resolve-style.cjs` — graceful safety net.** The present-file branch now wraps `parseDesignMd`. A present-but-unusable DESIGN.md (`DesignMdParseError`: tokenless, malformed-beyond-recovery, non-sRGB colors, or a `{ref}` cycle) returns `{mode:'plain', warning, …}` instead of throwing. A present file with unusable content is a clean "no usable tokens" miss — distinct from the AD-3 cache-miss that still hard-fails. A real (non-parse) read/IO error still propagates.
2. **`parse-design-md.cjs` — frontmatter recovery.** On a YAML parse error, one recovery pass (`sanitizeFrontmatterScalars`) double-quotes risky **top-level** scalar values (those with an embedded `": "`, a `" #"`, or a leading indicator char) and re-parses once. Scope is column-0 scalars only — nested token blocks are never rewritten, and a genuinely-broken document still throws. This recovers `supabase` to a fully-valid `styled` system.
3. **`parse-design-md.cjs` — hyphenated `{ref}` keys.** The `{token.ref}` regex now allows `-` in path segments (`getByPath` already split on `.` and supported hyphenated keys — the regex was the lone inconsistency). getdesign emits hyphenated token keys pervasively (`on-primary`, `button-md`, `primary-deep`); without this, a recovered `supabase` would inject ~26 literal `{colors.on-primary}` strings into the styled output. sRGB and ref-cycle checks are unchanged.

**Tests.** +38 All-Edge-Cases regression tests across `tests/design-system/parse-design-md.test.ts` + `resolve-style.test.ts`, including the two **real captured getdesign outputs** as fixtures (`tests/design-system/fixtures/{spotify,supabase}-DESIGN.md`).

**Known limitation (follow-up, not addressed here).** A `{ref}` whose target is a non-scalar (e.g. `{typography.button-md}` → a typography *object*) stringifies to `"[object Object]"`. This is a pre-existing rendering quirk (string→object substitution is a semantic change beyond a Tier-B fix), not a crash; valid systems are unaffected.

**Files.** `scripts/design-system/parse-design-md.cjs`, `scripts/design-system/resolve-style.cjs`, `tests/design-system/parse-design-md.test.ts`, `tests/design-system/resolve-style.test.ts`, `tests/design-system/fixtures/{spotify,supabase}-DESIGN.md`, `wiki/capabilities/design-system-styling/spec.md` (§4.8 contract accuracy), `knowledge/capability-registry.yaml` (version bump).

## v1.0.0 — 2026-06-01 — `/cla propose` Phase 8 promotion

Initial capability: SPLIT registry (`knowledge/design-systems.yaml`) + `/design-system` command + `resolve-style.cjs` universal `--style` helper + adoption contract (SOP-AIOPS-007) + deepask as first consumer + the `ritsu` brand system installed in Tier-1 `00-core/design-system/ritsu/`. ops.capability_runs id `fbd8edb1-9436-42c0-9e60-8c3b72c46914`; Tier-C decision `bf3a6323`.
