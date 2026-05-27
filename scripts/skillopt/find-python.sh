#!/usr/bin/env bash
# find-python.sh — prints absolute path to a python3 ≥ 3.10 on stdout.
#
# Usage:
#   PYTHON=$(bash scripts/skillopt/find-python.sh) || exit 2
#   "$PYTHON" -m pip install ...
#   "$PYTHON" vendor/skillopt/scripts/train.py ...
#
# Why this exists: vendor/skillopt uses `@dataclass(slots=True)` (Python 3.10+
# feature). macOS ships /usr/bin/python3 = 3.9.6, which fails to import the
# vendor module. Homebrew + pyenv installs typically provide 3.11/3.13/3.14 in
# /opt/homebrew/bin or /usr/local/bin but those come AFTER /usr/bin in the
# default PATH on macOS, so `python3` resolves to 3.9 by default.
#
# Search order (highest priority first):
#   1. $SKILLOPT_PYTHON env var (operator override)
#   2. runtime/skillopt/.venv/bin/python3 (project venv created by install-python-deps.sh)
#   3. python3.14, python3.13, python3.12, python3.11, python3.10 in PATH
#   4. Common explicit Homebrew paths
#   5. `python3` if it reports ≥ 3.10
#
# Exit codes:
#   0 — printed path on stdout
#   2 — no python3 ≥ 3.10 found; printed diagnostic on stderr

set -euo pipefail

MIN_MAJOR=3
MIN_MINOR=10

is_ge_310() {
  # Args: <python-path>
  # Returns 0 if it's >= 3.10, non-zero otherwise.
  "$1" -c "import sys; sys.exit(0 if sys.version_info >= (${MIN_MAJOR}, ${MIN_MINOR}) else 1)" 2>/dev/null
}

print_if_ok() {
  if [[ -x "$1" ]] && is_ge_310 "$1"; then
    echo "$1"
    exit 0
  fi
}

# 1. Operator override
if [[ -n "${SKILLOPT_PYTHON:-}" ]]; then
  if is_ge_310 "${SKILLOPT_PYTHON}"; then
    echo "${SKILLOPT_PYTHON}"
    exit 0
  else
    echo "find-python: SKILLOPT_PYTHON=${SKILLOPT_PYTHON} does not satisfy ≥ ${MIN_MAJOR}.${MIN_MINOR}" >&2
    exit 2
  fi
fi

# 2. Project venv (created by install-python-deps.sh — PEP 668 escape on
#    macOS where brew-managed Python refuses system-wide pip install).
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || echo "")"
if [[ -n "${REPO_ROOT}" ]]; then
  VENV_PYTHON="${REPO_ROOT}/runtime/skillopt/.venv/bin/python3"
  print_if_ok "${VENV_PYTHON}"
fi

# 3. Standard names in PATH
for v in 3.14 3.13 3.12 3.11 3.10; do
  if command -v "python${v}" >/dev/null 2>&1; then
    print_if_ok "$(command -v python${v})"
  fi
done

# 4. Common Homebrew paths
for p in \
  /opt/homebrew/bin/python3.14 \
  /opt/homebrew/bin/python3.13 \
  /opt/homebrew/bin/python3.12 \
  /opt/homebrew/bin/python3.11 \
  /opt/homebrew/bin/python3.10 \
  /opt/homebrew/bin/python3 \
  /usr/local/bin/python3.14 \
  /usr/local/bin/python3.13 \
  /usr/local/bin/python3.12 \
  /usr/local/bin/python3.11 \
  /usr/local/bin/python3.10 \
  /usr/local/bin/python3; do
  print_if_ok "$p"
done

# 5. python3 itself, if it satisfies
if command -v python3 >/dev/null 2>&1; then
  print_if_ok "$(command -v python3)"
fi

# Fail
cat >&2 <<EOF
find-python: no python3 >= ${MIN_MAJOR}.${MIN_MINOR} found.

vendor/skillopt uses Python 3.10+ features (@dataclass(slots=True)).
macOS /usr/bin/python3 is 3.9.6 which is not new enough.

Install via:
  brew install python@3.13       # recommended
  brew install python@3.11       # alternative
  asdf install python 3.13.0     # if you use asdf
  pyenv install 3.13.0           # if you use pyenv

Then either prepend to PATH OR set:
  export SKILLOPT_PYTHON=\$(brew --prefix python@3.13)/bin/python3.13
EOF
exit 2
