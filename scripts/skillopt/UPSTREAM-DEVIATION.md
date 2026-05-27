# SkillOpt vendor — upstream deviation contract

**Capability:** `evolve` v1.1 (SkillOpt integration). See `.archives/cla/evolve-extend-skillopt/spec.md` (promoted to `wiki/capabilities/evolve/spec.md` at Phase 8) §19 for design rationale.

**Submodule:** `vendor/skillopt/` → https://github.com/microsoft/SkillOpt (MIT-licensed)
**Pinned SHA:** see `vendor/skillopt.pin`
**L1 invariant:** `skillopt-vendor-sha-pinned` (registered in `scripts/check-consistency.cjs`; implementation at `scripts/cross-tier/validate-skillopt-vendor.cjs`)

---

## Why we patch instead of fork

Spec §19.4 originally described adding a new backend file *inside* `vendor/skillopt/skillopt/model/backends/ritsu_file_queue.py` as "the ONLY modification (additive)" and tracking it in the parent repo. **That isn't how git submodules work**: files inside a submodule belong to its git tree, not the parent's. A parent repo can only point at a submodule SHA; it cannot track individual file additions inside.

The two viable resolutions were:

| | Patch-on-install (this approach) | Vendor mirror fork |
|---|---|---|
| Submodule URL | `microsoft/SkillOpt` (upstream) | `doanchienthangdev/skillopt-vendor-mirror` |
| Backend file lives | `scripts/skillopt/upstream-patches/` in our repo | committed to the fork's branch |
| Router edit lives | `scripts/skillopt/upstream-patches/router.patch` in our repo | committed to the fork's branch |
| Install machinery | `scripts/skillopt/install-vendor.sh` applies patches post-clone | none (clone already has them) |
| Founder action required | none | one-time `gh repo create` + mirror-sync cron |
| `vendor/skillopt/` working-tree state | "dirty" after install (intentional signal) | clean |
| Upstream PR path (spec Q10 default YES) | delete the patches after merge | rebase the mirror after merge |

Per `/cla resume evolve` 2026-05-27 decision (founder Tier B approval in-session), we use **patch-on-install** for v1.1. The fork option remains available as the spec's "vendor rescue" mechanism if upstream is archived/deleted (see spec §19.4 "Vendor rescue" — same machinery, different submodule URL).

## What gets patched in, exactly

After `git submodule update --init vendor/skillopt`, `install-vendor.sh` makes two mutations to the submodule working tree:

1. **`vendor/skillopt/skillopt/model/ritsu_file_queue.py`** — copied verbatim from `scripts/skillopt/upstream-patches/ritsu_file_queue.py`. Implements the SkillOpt backend interface (chat_optimizer, chat_target, chat_with_deployment, chat_*_messages, get_token_summary, reset_token_tracker, set_reasoning_effort, set_target_deployment, set_optimizer_deployment) on top of a JSON file-queue. Makes zero HTTP calls; relies on the session bridge (Sprint 1 sub-PR C) to dispatch via subagent + subscription billing.
2. **`vendor/skillopt/skillopt/model/router.py`** — patched via `scripts/skillopt/upstream-patches/router.patch`. Adds:
   - One signature comment line (`# ritsu-works:ritsu_file_queue:v1`) above the imports — used by the validator to detect "patch applied".
   - `ritsu_file_queue` to the import line (`from . import …, ritsu_file_queue`).
   - One `if name == "ritsu_file_queue": return ritsu_file_queue` branch to `_backend_module`.
   - `ritsu_file_queue` to the `_all_backend_modules()` list and the `set_backend()` valid-name set.

No other file under `vendor/skillopt/` is touched. After install, `git -C vendor/skillopt status` will show `router.py` modified + `ritsu_file_queue.py` untracked. That is the intentional signal that patches were applied.

## Upstream interface assumptions

Patches assume the SkillOpt backend interface as it existed at the pinned SHA — module-level functions (not class-based), flat layout under `skillopt/model/<name>_backend.py` or `skillopt/model/<name>.py`. If a future upstream pin bump changes either:
- The `_backend_module` function signature in `router.py`
- The function signatures of `chat_optimizer` / `chat_target` / `chat_*_messages` / `get_token_summary` / `reset_token_tracker`

the patch may fail to apply cleanly (`install-vendor.sh` will exit 1 with a re-pin hint) OR the backend may import but fail at runtime. The L1 validator catches the first; runtime smoke (`pnpm setup:skillopt` or CI postinstall) catches the second.

## Bridge write contract (for sub-PR C author)

The `ritsu_file_queue.py` backend reads response files with a defensive
`try/except json.JSONDecodeError` loop (in `_await_response`, around line
~116 of `ritsu_file_queue.py`), but the contract is that the bridge
(`scripts/skillopt/session-bridge.cjs`) MUST write response files
**atomically**. Two-step pattern, matching the request side
(`_enqueue_request`, around line ~89 of the same file):

```javascript
// Inside session-bridge.cjs response writer
const tmpPath = `${respDir}/resp-${reqId}.json.tmp`;
const finalPath = `${respDir}/resp-${reqId}.json`;
fs.writeFileSync(tmpPath, JSON.stringify(responseObj));
fs.renameSync(tmpPath, finalPath);   // atomic on POSIX
```

Direct `fs.writeFileSync(finalPath, ...)` is forbidden — a `read_text()` on
the Python side could observe a partial write and crash on `json.loads`.
The defensive catch in `_await_response` is belt-and-suspenders, not a
license to skip atomic write on the bridge side.

**L1 check:** the L1 invariant `skillopt-vendor-sha-pinned` does NOT (yet)
verify the bridge follows this contract — that's a contract assertion, not
a static check. Sub-PR C should add a unit test for `session-bridge.cjs`
that exercises the atomic-rename path.

**Why this matters:** the `_await_response` poll loop runs ~2x/second per
in-flight request. Across a 25-message rollout batch, that's 50 reads/second
peaking. A non-atomic write window of even 10ms gives a >40% probability
of catching a partial file per batch. The `JSONDecodeError` catch keeps
behavior correct, but adds a wasted poll interval per occurrence — adding
~500ms latency per batch when the bridge is sloppy. Atomic-rename eliminates
this entirely.

## Refresh procedure (founder Tier B)

When updating the pinned SHA:

```bash
# 1. Update submodule to latest upstream
git submodule update --remote vendor/skillopt

# 2. Re-pin
echo "vendor/skillopt: $(git -C vendor/skillopt rev-parse HEAD)" > vendor/skillopt.pin

# 3. Re-apply patches and run smoke test
bash scripts/skillopt/install-vendor.sh

# 4. If install fails (e.g., router.py contract changed), update the patch:
#    a. Manually edit vendor/skillopt/skillopt/model/router.py to register ritsu_file_queue
#    b. (cd vendor/skillopt && git diff skillopt/model/router.py) > scripts/skillopt/upstream-patches/router.patch
#    c. Re-run install to verify clean apply
#    Document the upstream change in this file's changelog below.

# 5. Run pnpm check; commit
pnpm check
git add vendor/skillopt vendor/skillopt.pin scripts/skillopt/upstream-patches/router.patch
git commit -m "chore(vendor): bump SkillOpt pin to <short-sha>"
```

## Upstream PR (spec Q10 default YES)

We intend to submit `ritsu_file_queue.py` + the router registration as a PR to `microsoft/SkillOpt` after Sprint 1 lands. The pattern is purely additive at the upstream level (a new backend module + 4 line-additions to router.py). On acceptance:
- `vendor/skillopt/skillopt/model/ritsu_file_queue.py` becomes part of the upstream tree at the next pin bump.
- `scripts/skillopt/upstream-patches/ritsu_file_queue.py` can be deleted.
- `scripts/skillopt/upstream-patches/router.patch` can be deleted (or kept as a "previous-version-of-upstream" fallback).
- `install-vendor.sh` can simplify to only verify the pin.
- L1 validator's signature check should be either dropped or relaxed (since the upstream router will have its own form).

Until upstream PR merges, this contract stays in force.

## Changelog

- **2026-05-27** — initial patch contract. Pin: `99212e3956c963d648219fad56a23f9e13c81b54`. Patches: backend + 4-segment router diff.
