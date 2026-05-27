#!/usr/bin/env bash
# install-python-deps.sh — install vendor/skillopt Python deps into a venv.
#
# Usage:
#   bash scripts/skillopt/install-python-deps.sh [--yes] [--upgrade] [--recreate]
#
# What it does:
#   1. Locates a system python3 ≥ 3.10 (vendor requires it).
#   2. Creates a venv at runtime/skillopt/.venv/ (idempotent; --recreate
#      blows away + rebuilds).
#   3. Checks if openai, yaml, numpy are already importable IN THE VENV. If yes,
#      exits 0 with "already satisfied" message.
#   4. Else: prints requirements summary and prompts confirmation. `--yes` skips.
#   5. Runs `<venv-python> -m pip install -r vendor/skillopt/requirements.txt`.
#   6. Verifies the 3 core imports inside the venv.
#   7. Exit 0 on success.
#
# Why a venv: macOS Homebrew-managed Python is PEP 668 "externally managed" —
# system-wide `pip install` and `--user` are both refused. The official escape
# hatch (beyond --break-system-packages, which risks breaking Homebrew) is a
# project venv. find-python.sh checks for runtime/skillopt/.venv/bin/python3
# FIRST, so once this helper runs, all downstream scripts (install-vendor.sh
# smoke, runner Phase C subprocess) automatically use the venv.
#
# Capability: evolve v1.1.2 sandbox flow companion.
# Spec gap fix: surfaced by /evolve skillopt wiki-sync/ask --dry-run 2026-05-27.

set -euo pipefail

YES=0
UPGRADE=0
RECREATE=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) YES=1 ;;
    --upgrade) UPGRADE=1 ;;
    --recreate) RECREATE=1 ;;
    -h|--help)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    *)
      echo "error: unknown flag '$arg'" >&2
      echo "usage: install-python-deps.sh [--yes] [--upgrade] [--recreate]" >&2
      exit 1
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
REQ_FILE="${REPO_ROOT}/vendor/skillopt/requirements.txt"
VENV_DIR="${REPO_ROOT}/runtime/skillopt/.venv"
VENV_PYTHON="${VENV_DIR}/bin/python3"

if [[ ! -f "${REQ_FILE}" ]]; then
  echo "error: ${REQ_FILE} not found — run scripts/skillopt/install-vendor.sh first" >&2
  exit 2
fi

# Step 1 — locate a system python3 >= 3.10 for venv creation. We bypass the
# venv-first lookup in find-python.sh by ignoring the venv path explicitly
# (so we don't accidentally use an existing venv's python to create itself).
ORIG_VENV_DIR="${VENV_DIR}"
SKIP_VENV_CHECK=1 SYSTEM_PYTHON=""
# Try common version-suffixed binaries first
for v in 3.14 3.13 3.12 3.11 3.10; do
  if command -v "python${v}" >/dev/null 2>&1; then
    candidate="$(command -v "python${v}")"
    if "${candidate}" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
      SYSTEM_PYTHON="${candidate}"
      break
    fi
  fi
done
# Then operator override
if [[ -z "${SYSTEM_PYTHON}" && -n "${SKILLOPT_PYTHON:-}" ]]; then
  if "${SKILLOPT_PYTHON}" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
    SYSTEM_PYTHON="${SKILLOPT_PYTHON}"
  fi
fi
# Then Homebrew explicit paths
if [[ -z "${SYSTEM_PYTHON}" ]]; then
  for p in /opt/homebrew/bin/python3.14 /opt/homebrew/bin/python3.13 \
           /opt/homebrew/bin/python3.12 /opt/homebrew/bin/python3.11 \
           /opt/homebrew/bin/python3.10 /usr/local/bin/python3.11; do
    if [[ -x "$p" ]] && "$p" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
      SYSTEM_PYTHON="$p"
      break
    fi
  done
fi
if [[ -z "${SYSTEM_PYTHON}" ]]; then
  echo "[install-python-deps] FAIL: no system python3 >= 3.10 found." >&2
  echo "  Install one of: brew install python@3.13 / @3.11 / @3.14" >&2
  exit 2
fi
echo "[install-python-deps] system python: ${SYSTEM_PYTHON} ($(${SYSTEM_PYTHON} --version))"
echo "[install-python-deps] venv target:   ${VENV_DIR}"

# Step 2 — create / recreate venv
if [[ ${RECREATE} -eq 1 && -d "${VENV_DIR}" ]]; then
  echo "[install-python-deps] --recreate: removing existing venv at ${VENV_DIR}"
  rm -rf "${VENV_DIR}"
fi
if [[ ! -d "${VENV_DIR}" ]]; then
  echo "[install-python-deps] creating venv..."
  mkdir -p "$(dirname "${VENV_DIR}")"
  "${SYSTEM_PYTHON}" -m venv "${VENV_DIR}"
fi
if [[ ! -x "${VENV_PYTHON}" ]]; then
  echo "[install-python-deps] FAIL: venv created but ${VENV_PYTHON} not executable." >&2
  exit 2
fi

# Step 3 — already satisfied in venv?
if "${VENV_PYTHON}" -c 'import openai, yaml, numpy' 2>/dev/null; then
  echo "[install-python-deps] already satisfied in venv:"
  "${VENV_PYTHON}" -c 'import openai, yaml, numpy; print(f"  openai {openai.__version__}, yaml {yaml.__version__}, numpy {numpy.__version__}")'
  exit 0
fi

# Step 4 — confirm
echo "[install-python-deps] venv created. Need to pip install requirements."
echo ""
echo "Will run: ${VENV_PYTHON} -m pip install $([ $UPGRADE -eq 1 ] && echo "--upgrade ") -r ${REQ_FILE}"
echo ""
echo "Packages (from requirements.txt):"
grep -v '^#\|^$' "${REQ_FILE}" | sed 's/^/  - /'
echo ""
echo "Estimated download: ~50 MB (includes azure-* SDKs from upstream SkillOpt)."
echo ""

if [[ ${YES} -eq 0 ]]; then
  printf "Proceed? [y/N] "
  read -r REPLY
  if [[ ! "${REPLY}" =~ ^[Yy]$ ]]; then
    echo "[install-python-deps] aborted by user. Run with --yes to skip prompt." >&2
    exit 1
  fi
fi

# Step 5 — install (inside venv, no PEP 668 issue)
PIP_ARGS=("-m" "pip" "install" "--quiet")
[[ ${UPGRADE} -eq 1 ]] && PIP_ARGS+=("--upgrade")
PIP_ARGS+=("-r" "${REQ_FILE}")

echo "[install-python-deps] running: ${VENV_PYTHON} ${PIP_ARGS[*]}"
"${VENV_PYTHON}" "${PIP_ARGS[@]}"

# Step 6 — verify
echo ""
echo "[install-python-deps] verifying imports..."
if ! "${VENV_PYTHON}" -c 'import openai, yaml, numpy; print(f"  openai {openai.__version__}, yaml {yaml.__version__}, numpy {numpy.__version__}")'; then
  echo "[install-python-deps] FAIL: post-install verify failed inside venv." >&2
  echo "  Try --recreate to rebuild the venv from scratch." >&2
  exit 3
fi

echo ""
echo "[install-python-deps] OK. venv ready at ${VENV_DIR}"
echo "[install-python-deps] find-python.sh will now return ${VENV_PYTHON} on first match"
echo "[install-python-deps] (so install-vendor.sh smoke + runner Phase C subprocess auto-use it)."
