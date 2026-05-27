#!/usr/bin/env bash
# install-vendor.sh — apply ritsu-works patches to the vendor/skillopt submodule.
#
# Idempotent. Safe to run multiple times. Invoked via `pnpm install`
# postinstall hook and directly via `pnpm setup:skillopt`.
#
# What it does, in order:
#   1. `git submodule update --init` for vendor/skillopt (no-op if already cloned)
#   2. Verify pinned SHA matches the committed gitlink (else exits 1 with re-pin hint)
#   3. Copy scripts/skillopt/upstream-patches/ritsu_file_queue.py into
#      vendor/skillopt/skillopt/model/ (idempotent; overwrites)
#   4. If vendor/skillopt/skillopt/model/router.py lacks the signature line
#      `# ritsu-works:ritsu_file_queue:v1`, apply scripts/skillopt/upstream-patches/router.patch
#   5. Smoke test: env -i ANTHROPIC_API_KEY= HOME=$HOME PATH=$PATH
#      PYTHONPATH=vendor/skillopt python3 vendor/skillopt/scripts/train.py
#      --backend ritsu_file_queue --help  → expects exit 0
#
# Failure modes:
#   - pin mismatch                 → exits 1 with `git submodule update --remote` hint
#   - patch already partially applied (signature present, file missing) → exits 1
#   - python3 not on PATH          → exits 1
#   - smoke test fails             → exits 1 with last 30 lines of train.py output
#
# Documented in scripts/skillopt/UPSTREAM-DEVIATION.md.

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

VENDOR_DIR="vendor/skillopt"
PATCHES_DIR="scripts/skillopt/upstream-patches"
PIN_FILE="vendor/skillopt.pin"
SIGNATURE="# ritsu-works:ritsu_file_queue:v1"
BACKEND_BASENAME="ritsu_file_queue.py"
ROUTER_REL="skillopt/model/router.py"
BACKEND_DEST_REL="skillopt/model/${BACKEND_BASENAME}"

# 1. Submodule init (idempotent)
echo "[install-vendor] ensuring submodule ${VENDOR_DIR} is initialized..."
git submodule update --init -- "${VENDOR_DIR}" >/dev/null

# 2. Verify pinned SHA
if [[ ! -f "${PIN_FILE}" ]]; then
  echo "[install-vendor] FATAL: ${PIN_FILE} missing." >&2
  exit 1
fi
PINNED_SHA="$(grep '^vendor/skillopt:' "${PIN_FILE}" | sed 's/^vendor\/skillopt:[[:space:]]*//' | tr -d '[:space:]')"
if [[ ! "${PINNED_SHA}" =~ ^[0-9a-f]{40}$ ]]; then
  echo "[install-vendor] FATAL: malformed pin in ${PIN_FILE}: '${PINNED_SHA}'" >&2
  exit 1
fi
ACTUAL_SHA="$(git ls-tree HEAD "${VENDOR_DIR}" | awk '{print $3}')"
if [[ -z "${ACTUAL_SHA}" ]]; then
  # Working-tree state (submodule not yet committed) — fall back to checked-out HEAD
  ACTUAL_SHA="$(git -C "${VENDOR_DIR}" rev-parse HEAD)"
fi
if [[ "${PINNED_SHA}" != "${ACTUAL_SHA}" ]]; then
  echo "[install-vendor] FATAL: pin/gitlink mismatch." >&2
  echo "  pinned : ${PINNED_SHA}" >&2
  echo "  gitlink: ${ACTUAL_SHA}" >&2
  echo "  Re-pin via:" >&2
  echo "    git submodule update --remote vendor/skillopt" >&2
  echo "    echo \"vendor/skillopt: \$(git -C vendor/skillopt rev-parse HEAD)\" > vendor/skillopt.pin" >&2
  exit 1
fi

# 3. Copy backend file
if [[ ! -f "${PATCHES_DIR}/${BACKEND_BASENAME}" ]]; then
  echo "[install-vendor] FATAL: ${PATCHES_DIR}/${BACKEND_BASENAME} missing." >&2
  exit 1
fi
cp "${PATCHES_DIR}/${BACKEND_BASENAME}" "${VENDOR_DIR}/${BACKEND_DEST_REL}"
echo "[install-vendor] copied ${BACKEND_BASENAME} → ${VENDOR_DIR}/${BACKEND_DEST_REL}"

# 4. Apply router patch if signature not present.
#    @cto sub-PR A SHOULD-FIX (folded into sub-PR B): two-signal check.
#    A single `grep -q` for the signature comment could miss the case where
#    upstream lands our PR with a slightly different shape (signature line
#    survives but the dispatch branch doesn't), causing the patch to be
#    silently skipped while the import fails at runtime. We now require BOTH
#    the anchored signature comment AND the `_backend_module` dispatch
#    branch to be present before considering the file already patched.
ROUTER_PATH="${VENDOR_DIR}/${ROUTER_REL}"
ALREADY_PATCHED=0
if grep -qE "^# ritsu-works:ritsu_file_queue:v1" "${ROUTER_PATH}" \
   && grep -q 'if name == "ritsu_file_queue"' "${ROUTER_PATH}"; then
  ALREADY_PATCHED=1
fi
if [[ "${ALREADY_PATCHED}" == "1" ]]; then
  echo "[install-vendor] router.py already patched (signature + dispatch branch present); skipping."
else
  if [[ ! -f "${PATCHES_DIR}/router.patch" ]]; then
    echo "[install-vendor] FATAL: ${PATCHES_DIR}/router.patch missing." >&2
    exit 1
  fi
  echo "[install-vendor] applying router.patch..."
  ( cd "${VENDOR_DIR}" && git apply --check "${REPO_ROOT}/${PATCHES_DIR}/router.patch" 2>&1 ) || {
    echo "[install-vendor] FATAL: router.patch does not apply cleanly. Possible upstream change at the pinned SHA. See scripts/skillopt/UPSTREAM-DEVIATION.md for refresh procedure." >&2
    exit 1
  }
  ( cd "${VENDOR_DIR}" && git apply "${REPO_ROOT}/${PATCHES_DIR}/router.patch" )
  echo "[install-vendor] router.patch applied."
fi

# 4b. Apply train.py patch — adds ritsu_file_queue to argparse --backend choices.
#     Without this, `train.py --backend ritsu_file_queue` is rejected at CLI
#     parse time BEFORE router.py is consulted. Two-signal check matches the
#     router.patch pattern.
TRAIN_REL="scripts/train.py"
TRAIN_PATH="${VENDOR_DIR}/${TRAIN_REL}"
TRAIN_ALREADY_PATCHED=0
if grep -qE "^    # ritsu-works:ritsu_file_queue:v1" "${TRAIN_PATH}" \
   && grep -q '"ritsu_file_queue"' "${TRAIN_PATH}"; then
  TRAIN_ALREADY_PATCHED=1
fi
if [[ "${TRAIN_ALREADY_PATCHED}" == "1" ]]; then
  echo "[install-vendor] train.py already patched (signature + choice present); skipping."
else
  if [[ ! -f "${PATCHES_DIR}/train.patch" ]]; then
    echo "[install-vendor] FATAL: ${PATCHES_DIR}/train.patch missing." >&2
    exit 1
  fi
  echo "[install-vendor] applying train.patch..."
  ( cd "${VENDOR_DIR}" && git apply --check "${REPO_ROOT}/${PATCHES_DIR}/train.patch" 2>&1 ) || {
    echo "[install-vendor] FATAL: train.patch does not apply cleanly. Possible upstream change at the pinned SHA. See scripts/skillopt/UPSTREAM-DEVIATION.md for refresh procedure." >&2
    exit 1
  }
  ( cd "${VENDOR_DIR}" && git apply "${REPO_ROOT}/${PATCHES_DIR}/train.patch" )
  echo "[install-vendor] train.patch applied."
fi

# 5. Smoke test — env-cleared per @cto NIT 4.
#    Conditional on vendor's Python deps being installed (openai, pyyaml, etc.
#    — see vendor/skillopt/requirements.txt). Local dev without these deps
#    gets a friendly skip-with-hint; CI must `pip install -r vendor/skillopt/
#    requirements.txt` before this runs to get the full smoke coverage.
#    Vendor requires Python ≥ 3.10 (uses @dataclass(slots=True)). macOS ships
#    /usr/bin/python3 = 3.9 which fails. Use find-python.sh to locate a
#    suitable interpreter (prefers SKILLOPT_PYTHON env, then python3.14/13/12/
#    11/10, then Homebrew paths).
PYTHON=""
if [[ -x "${REPO_ROOT}/scripts/skillopt/find-python.sh" ]]; then
  PYTHON="$(bash "${REPO_ROOT}/scripts/skillopt/find-python.sh" 2>/dev/null)" || PYTHON=""
fi
if [[ -z "${PYTHON}" ]]; then
  echo "[install-vendor] WARN: no python3 >= 3.10 found; skipping smoke test."
  echo "[install-vendor] patches applied. Install Python 3.10+ then re-run."
  echo "    brew install python@3.13   # or python@3.11 / @3.14"
  echo "    bash scripts/skillopt/install-python-deps.sh   # then install deps"
  exit 0
fi
if ! "${PYTHON}" -c 'import openai, yaml, numpy' >/dev/null 2>&1; then
  echo "[install-vendor] WARN: vendor Python deps not installed for ${PYTHON}. Skipping smoke test."
  echo "[install-vendor] patches applied. To enable smoke, install deps via either:"
  echo "    bash scripts/skillopt/install-python-deps.sh              # guided helper (prompts + verifies)"
  echo "    ${PYTHON} -m pip install -r vendor/skillopt/requirements.txt # direct"
  exit 0
fi
SMOKE_OUT="$(mktemp)"
trap 'rm -f "${SMOKE_OUT}"' EXIT
if ! env -i ANTHROPIC_API_KEY= HOME="${HOME}" PATH="${PATH}" PYTHONPATH="${VENDOR_DIR}" \
  "${PYTHON}" "${VENDOR_DIR}/scripts/train.py" --backend ritsu_file_queue --help \
  >"${SMOKE_OUT}" 2>&1; then
  echo "[install-vendor] FATAL: train.py --help failed for --backend ritsu_file_queue (python: ${PYTHON})." >&2
  tail -30 "${SMOKE_OUT}" >&2
  exit 1
fi

echo "[install-vendor] vendor smoke ok (SHA ${PINNED_SHA}, backend ritsu_file_queue registered, python: ${PYTHON})."
