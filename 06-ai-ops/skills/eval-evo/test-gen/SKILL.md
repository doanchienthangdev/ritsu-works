---
name: eval-evo/test-gen
description: |
  Generates regression tests for an entity being modified by /update or
  /evolve. Embeds the All-Edge-Cases-Test 5-phase methodology VERBATIM
  (committed per @cto NIT T7 to avoid drift from ~/.claude/CLAUDE.md
  source). Per-type test conventions; co-located under <entity-dir>/tests/.
  Invoked by orchestrators in Phase 7.
trigger: invoked-by-orchestrator-only
budget_cap_task_kind: entity-update-test-gen-any   # $0.25 default
spec: wiki/capabilities/update/spec.md (after Phase 8 promotion); draft .archives/cla/update/spec.md
---

# Skill: eval-evo/test-gen

The verification arm. After install-improvement applies a diff, this skill
produces regression tests that the founder reviews + CI runs. Tests land
under `<entity-dir>/tests/<diff-id>.test.cjs` (per Sprint 1 playbook
allowed_paths_for_proposer extension).

## Contract

### Input (from orchestrator)
```json
{
  "run_id": "<uuid>",
  "entity_type": "skill | command | agent | sop",
  "entity_path": "<modified-file-or-dir>",
  "entity_content_before": "<content at base>",
  "entity_content_after": "<content after install>",
  "diff": "<unified diff that was applied>",
  "diff_id": "<short slug — used in test filename>",
  "test_dir": "<entity-dir>/tests/"
}
```

### Output
```json
{
  "tests_written": [{ "path": "<test-file-path>", "test_count": <int> }],
  "skipped_reason": null | "no_testable_surface" | "trivial_doc_only",
  "total_cost_usd": <float>,
  "skip_telegram_notify": <bool>    // true when skipped_reason is non-null (Sprint 4 wire)
}
```

## When to skip

- `entity_type='command'` and diff is markdown-only (no argv schema change)
  → may skip with `skipped_reason='trivial_doc_only'`
- `entity_type='sop'` and diff is README-only → skip
- Diff < 3 lines AND no functional change → skip

Skip writes a Tier-B Telegram notify event payload but does NOT fail the
/update or /evolve run. Sprint 4 wires the Telegram bot path.

## Process

### Step 1 — Per-type prompt selection

| entity_type | model | focus |
|---|---|---|
| skill | Sonnet | function/method contract tests of any helper exported by the skill; SKILL.md frontmatter validity |
| command | Sonnet | argv parsing tests; subcommand dispatch table coverage |
| agent | Sonnet | persona voice consistency (less testable; often skipped); role permission allowlist assertions |
| sop | Sonnet | flow.yaml step ordering tests; HITL tier assertions; drift_check truthy assertion |

### Step 2 — Construct the test-gen prompt with All-Edge-Cases-Test rule VERBATIM

The All-Edge-Cases-Test 5-phase methodology is COMMITTED VERBATIM below
(per @cto NIT T7 — avoid drift from `~/.claude/CLAUDE.md` source via
hash-drift CI check warning, NOT fail; founder syncs quarterly).

#### PHASE 1 — Code Analysis (BEFORE writing any test)

Read the function/module under test and extract:

**1A. Signature Analysis**
- List every parameter with its type, optionality, and default value
- List the return type (including union types, Promise wrappers)
- Note overloaded signatures if any

**1B. Branch Analysis**
- Map every `if/else`, `switch/case`, ternary (`? :`), `try/catch`, early `return`, `throw`, logical short-circuit (`&&`, `||`, `??`)
- Count total branches. Every branch MUST have at least 1 test
- Note guard clauses and validation checks at the top of the function

**1C. Dependency Analysis**
- List every external call (API, database, file system, imported function)
- Identify which calls can fail (throw, reject, return error)
- Note any side effects (mutations, writes, events emitted)

**1D. Classification**
- Does the function handle user input? → Enable security tests
- Is it async? → Enable timing/race condition tests
- Is it stateful? → Enable state transition tests
- Does it do I/O? → Enable failure/timeout tests
- Is it a data transform? → Enable property-based/invariant tests
- Does it consume output from another function in the same pipeline? → Enable contract tests
- Does it have JSDoc @example, @param/@returns docs, or a spec? → Enable specification-driven tests
- Has it had production bugs before? (check git log, Fix:/HOTFIX comments) → Enable regression tests

**1E. Specification Check** (BEFORE Phase 2)
- Read JSDoc, @example tags, README, and any referenced docs/specs
- Write 2-3 tests based ONLY on the spec, without reading implementation
  These test "what SHOULD it do?" not "what DOES the code do?"
- Each @example in JSDoc becomes a test case

**1F. Regression Check**
- Search git log for fixes to this function: `git log --oneline -20 -- <file>`
- Search code for "Fix:", "HOTFIX", "bugfix", "regression" comments
- Each prior bug becomes a test: `it('regression: [issue] — [description]')`

#### PHASE 2 — Edge Case Mapping (BEFORE writing any test)

For each parameter from Phase 1A, apply the corresponding edge case values:

**2A. Numbers**: 0, -0, 1, -1, NaN, Infinity, -Infinity, MAX_SAFE_INTEGER,
MIN_SAFE_INTEGER, MAX_VALUE, MIN_VALUE, EPSILON, floating-point imprecision (0.1+0.2), rounding (1.5)

**2B. Strings**: "", " ", "\t\n", single char "a", very long ("a".repeat(10000)),
null byte "\x00", control chars, unicode/emoji, RTL, homoglyphs, "null"/"undefined"/"false"/"0",
zero-width space, "<script>alert(1)</script>"

**2C. Arrays**: [], [null], [undefined], sparse Array(5), large Array(10000),
nested [[x]], mixed-type [1,"a",null], single element, all duplicates

**2D. Objects**: {}, null, undefined, prototype pollution { __proto__: { polluted: true } },
no-prototype Object.create(null), Object.freeze, Object.seal, circular references,
deeply nested { nested: { deep: { value: 1 } } }, throwing getter

**2E. Booleans + Falsy**: false, 0, -0, 0n, "", null, undefined, NaN;
truthy surprises "0", "false", " ", [], {}, new Date(0)

**2F. Dates** (if relevant): epoch new Date(0), invalid Date, max valid 8640000000000000,
leap year Feb 29, DST transition, midnight + end-of-day boundaries

**2G. Callbacks/Functions** (if relevant): undefined (not provided), sync throw,
async reject, returns nothing

**2H. Cross-Parameter Interactions**: combinations of boundary values,
one param null while others valid, all params at boundary simultaneously

**2I. State & Timing** (if async or stateful): race conditions (concurrent calls),
double invocation (idempotency), abort/cancel mid-operation, timeout, state transitions
empty → populated → empty

**2J. Error Propagation**: mock each dependency to throw/reject, malformed data
(partial response, wrong type), partial batch failure, verify error type AND message

**2K. Security** (if user input): SQL injection, XSS, path traversal, command
injection, template injection, SSRF, header injection, null byte

**2L. Business Logic**: off-by-one, single-vs-multi-item, exactly-at-threshold,
division by zero, modulo zero, empty aggregation, floating point 0.1+0.2 !== 0.3

**2M. Behavioral Relationships** (data transforms / pipelines):
Invariants: roundtrip encode(decode(x))===x, idempotence f(f(x))===f(x),
subset/superset, length preservation
Metamorphic: irrelevant addition leaves output unchanged, semantic-preserving
transforms give equivalent output, monotonicity, commutativity, partition equivalence

**2N. Contract Boundaries** (consumes another function's output):
upstream returns valid structure but empty/default values, valid + boundary-adjacent,
valid + extra unexpected fields, upstream output type allows values downstream rejects,
end-to-end through pipeline checking final output

**2O. Dependency Degradation** (I/O — beyond 2J's hard failures):
correct type but empty/meaningless data, partial data (some required missing),
stale/outdated data, extreme latency (just before timeout), extra unexpected fields

**2P. State Sequences** (stateful / lifecycle — beyond 2I):
rapid re-invocation, error recovery, stale context, full lifecycle
(empty → loaded → error → retry → loaded → cleared), operation after cleanup

#### PHASE 3 — Test Generation

Mandatory structure:
```typescript
describe('functionName', () => {
  describe('happy path', () => { /* normal expected usage */ });
  describe('specification conformance', () => { /* Phase 1E — if spec exists */ });
  describe('input boundaries', () => {
    describe('paramName boundaries', () => { /* Phase 2 edge values */ });
  });
  describe('cross-parameter interactions', () => { /* Phase 2H */ });
  describe('contract boundaries', () => { /* Phase 2N — real upstream output */ });
  describe('error handling', () => { /* Phase 2J */ });
  describe('dependency degradation', () => { /* Phase 2O */ });
  describe('state and timing', () => { /* Phase 2I */ });
  describe('security', () => { /* Phase 2K — only if handles user input */ });
  describe('business logic edge cases', () => { /* Phase 2L */ });
  describe('behavioral relationships', () => { /* Phase 2M — only if data transform */ });
  describe('regressions', () => { /* Phase 1F — only if prior bugs found */ });
  describe('performance', () => { /* large input — critical paths */ });
});
```

Test writing rules:
- Test name = sentence describing input + expected outcome
- Every test MUST have ≥ 1 explicit assertion
- Tests MUST be independent (no shared mutable state; beforeEach for setup)
- Error tests MUST verify both error TYPE AND message content
- Async tests MUST verify both resolve AND reject paths
- NEVER use toBeTruthy()/toBeFalsy() for specific values — use toBe(), toEqual(), toStrictEqual()
- NEVER leave console.log in tests
- Follow Arrange-Act-Assert
- Contract tests MUST use actual upstream function output (call the real function), not hand-crafted mock data
- Regression tests MUST include issue/sprint reference in test name
- Specification tests SHOULD be written before reading the implementation

#### PHASE 4 — Verification Sweep (AFTER writing tests)

Mental checklist. ANY "no" answer → add the missing test.
- Every parameter tested with null? undefined? empty? boundary? invalid type?
- Every branch tested true path? false path? exact boundary?
- Every error path: thrown? correct type? correct message?
- Every async op: success? failure/rejection? timeout?
- Every external dependency: mocked? tested when throws? tested with unexpected return?
- Cross-parameter interactions tested?
- All falsy values tested where relevant?
- Large input tested (performance)?
- Security inputs tested (if user-facing)?
- Contract: real upstream output used?
- Metamorphic: irrelevant addition leaves output unchanged? Semantic-preserving transforms?
- Dependency degradation: empty/partial/stale dependency data?
- State sequences: rapid re-invocation, error recovery, stale context?
- Regressions: every known prior bug has a named test case?

#### PHASE 5 — Run Tests and Fix

- Run the full test suite for the affected package/module
- ALL tests MUST pass
- If a test reveals a bug in implementation → fix implementation, NOT delete/weaken test
- If a test is truly impossible to pass (intentionally undefined) → skip with explicit WHY

#### Pragmatic Exceptions

MAY skip categories with explicit justification (comment in test file):
- Pure display component with no props → skip input boundary tests
- TypeScript compile-time prevents invalid types → skip type coercion (but still test runtime nulls from API/JSON)
- Trivial getters/setters → skip security + performance
- Pure utility with no upstream consumer → skip contract tests
- Stateless pure function → skip state sequence tests
- No known prior bugs and no Fix/Hotfix comments → skip regression tests
- No JSDoc/spec/README → skip specification conformance tests
- Function called by only one consumer in one way → skip metamorphic tests
- When skipping: comment `// Skipped: [category] — [reason]`

#### Output Format (per the methodology)

When executing, briefly note the phase:
- Phase 1: "Analyzing [function] — N params, M branches, K deps. Contract: [upstream]. Spec: [yes/no]. Regressions: [N found]"
- Phase 2: "Mapping edge cases — [relevant categories]"
- Phase 3: Writing the tests
- Phase 4: "Verification sweep — [any gaps found]"
- Phase 5: Running tests

### Step 3 — Construct + dispatch the test-gen prompt

```
prompt:
"""
You are eval-evo test-gen. Apply the All-Edge-Cases-Test 5-phase
methodology (verbatim above in this skill) to generate regression tests
for the entity modified by /update or /evolve.

Entity type: <entity_type>
Entity path: <entity_path>
Diff applied (the change to test against):
---
<diff>
---

Content after install:
---
<entity_content_after>
---

OUTPUT FORMAT — A single test file in TypeScript (vitest) following the
mandatory structure in PHASE 3 above. Test file path: <test_dir>/<diff_id>.test.cjs.

CONSTRAINTS:
1. Tests MUST exercise the BEHAVIOR added/modified by this diff specifically.
2. Tests MUST follow Arrange-Act-Assert.
3. Test names MUST be sentences describing input + expected outcome.
4. NEVER use toBeTruthy/toBeFalsy for specific values.
5. NEVER leave console.log.
6. If the diff is doc/comment-only (no behavior change) → output
   {{ "skipped": true, "reason": "trivial_doc_only" }} and no test file.

Output JSON:
{
  "test_file_content": "<full TypeScript test file body>",
  "test_count": <int>,
  "phases_covered": ["happy path", "input boundaries", "<other>"],
  "skipped": false
}
OR (if doc-only):
{
  "skipped": true,
  "reason": "trivial_doc_only"
}
"""

settings: temp=0.2, max_tokens=8000
```

### Step 4 — Parse + write test file

1. Parse JSON. On parse failure: log + return `skipped_reason='parse_error'`.
2. If `skipped=true`: don't write any file; return with skip reason.
3. Else write `<test_dir>/<diff_id>.test.cjs` with `test_file_content`.
4. Run the new test file via `vitest run <path>` to verify it parses + passes.
   - On PASS: success, return.
   - On FAIL (test fails because implementation has a real bug): SURFACE to
     orchestrator — this is a real bug; orchestrator may revert the install.
   - On FAIL (test syntax error): regenerate with a 2nd-try prompt that
     includes the error message. Max 1 retry.

### Step 5 — Emit run_summary

> "test-gen: wrote N tests at <path> covering phases [<list>]; runtime <s>ms"

## CI hash-drift check (per @cto NIT T7)

A separate validator `scripts/cross-tier/validate-test-gen-methodology-drift.cjs`
(Sprint 4 deliverable) compares the SHA-256 of the PHASE 1-5 sections in
this SKILL.md vs the corresponding sections in `~/.claude/CLAUDE.md` (the
source of truth for the user's global rule). On drift: WARN (do not fail
CI) so the founder can sync quarterly. The mismatch is logged to
`ops.events` as `ritsu.entity.test_gen_methodology_drift`.

## Cost

- Sonnet per invocation: ~$0.10-0.25 (entity content + diff context can be ~5-15 KB)
- Hard cap: $0.25 per task_kind `entity-update-test-gen-any` (governance/ROLES.md)

## Reuse

This skill is invokable by BOTH /update orchestrator (Sprint 3+) AND
optionally /evolve orchestrator (v1.1+ if /evolve adopts test-gen as a
post-install verification step).
