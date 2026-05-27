#!/usr/bin/env bash
# init-sandbox.sh — scaffold a sandbox copy of an existing skill for /evolve skillopt.
#
# Usage:
#   bash scripts/skillopt/init-sandbox.sh <skill-name> [--with-examples]
#
# What it does:
#   1. Validates 06-ai-ops/skills/<skill-name>/SKILL.md exists.
#   2. Computes sandbox path: runtime/sandboxes/<flattened-name>/SKILL.md
#      (slashes in skill-name flattened to -; e.g. wiki-sync/ask → wiki-sync-ask).
#   3. Copies production SKILL.md → sandbox path.
#   4. If --with-examples: appends an "## Examples" section template with
#      5 numbered <example>...</example> placeholder blocks for founder
#      to fill in.
#   5. Prints next-step command:
#      /evolve skillopt <skill-name> --entity-path=<abs-sandbox-path> --dry-run
#
# Sandbox files live under runtime/ which is gitignored (local-only).
# Capability: evolve v1.1.1 (sandbox flow).

set -euo pipefail

if [[ $# -lt 1 ]]; then
  cat >&2 <<'EOF'
usage: init-sandbox.sh <skill-name> [--with-examples]

  <skill-name>      slug under 06-ai-ops/skills/ (e.g. wiki-sync/ask, task-decompose)
  --with-examples   append 5 placeholder <example> blocks for Pillar 1 seed

Output: prints absolute path to the sandbox SKILL.md + next-step command.
EOF
  exit 1
fi

SKILL_NAME="$1"
WITH_EXAMPLES=0
shift
for arg in "$@"; do
  case "$arg" in
    --with-examples) WITH_EXAMPLES=1 ;;
    *)
      echo "error: unknown flag '$arg'" >&2
      exit 1
      ;;
  esac
done

REPO_ROOT="$(git rev-parse --show-toplevel)"
PROD_PATH="${REPO_ROOT}/06-ai-ops/skills/${SKILL_NAME}/SKILL.md"

if [[ ! -f "${PROD_PATH}" ]]; then
  echo "error: production SKILL.md not found: ${PROD_PATH}" >&2
  echo "       (slug must match an existing skill under 06-ai-ops/skills/)" >&2
  exit 1
fi

FLATTENED_NAME="${SKILL_NAME//\//-}"
SANDBOX_DIR="${REPO_ROOT}/runtime/sandboxes/${FLATTENED_NAME}"
SANDBOX_PATH="${SANDBOX_DIR}/SKILL.md"

mkdir -p "${SANDBOX_DIR}"

if [[ -f "${SANDBOX_PATH}" ]]; then
  echo "warn: sandbox already exists at ${SANDBOX_PATH}" >&2
  echo "      Existing content preserved. Delete + re-run to overwrite." >&2
  echo "${SANDBOX_PATH}"
  exit 0
fi

cp "${PROD_PATH}" "${SANDBOX_PATH}"

if [[ "${WITH_EXAMPLES}" == "1" ]]; then
  cat >> "${SANDBOX_PATH}" <<'EOF'

## Examples

<!-- v1.1.1 sandbox seed: founder fills these in with authentic input/output
     pairs that demonstrate the skill's intended behavior. Pillar 1 (gold)
     extraction in eval-evo/skillopt-gen-data reads these blocks at confidence
     0.95 (auto_accepted) — so quality here directly drives gen-data signal. -->

<example>
INPUT:
{ "<field>": "<value>" }

EXPECTED OUTPUT:
<expected output>

RUBRIC:
- <criterion 1>
- <criterion 2>
- <criterion 3>
</example>

<example>
INPUT:
<input 2>

EXPECTED OUTPUT:
<expected output 2>

RUBRIC:
- <criterion 1>
- <criterion 2>
</example>

<example>
INPUT:
<input 3>

EXPECTED OUTPUT:
<expected output 3>

RUBRIC:
- <criterion 1>
- <criterion 2>
</example>

<example>
INPUT:
<input 4 — edge case>

EXPECTED OUTPUT:
<expected output 4>

RUBRIC:
- <criterion 1 — protects against the edge>
- <criterion 2>
</example>

<example>
INPUT:
<input 5 — degenerate or invalid>

EXPECTED OUTPUT:
<expected response — usually rejection or no-coverage>

RUBRIC:
- <criterion: handles bad input gracefully>
- <criterion: zero-cost reject path if applicable>
</example>
EOF
fi

echo ""
echo "[init-sandbox] scaffolded ${SKILL_NAME} → ${SANDBOX_PATH}"
if [[ "${WITH_EXAMPLES}" == "1" ]]; then
  echo "[init-sandbox] appended 5 <example> block placeholders (fill them in before /evolve)."
fi
echo ""
echo "Next steps:"
echo "  1. Edit ${SANDBOX_PATH} (add real <example> blocks if not already)."
echo "  2. Run /evolve skillopt ${SKILL_NAME} --entity-path=${SANDBOX_PATH} --dry-run"
echo "  3. Inspect runtime/skillopt/${FLATTENED_NAME}/runs/<rid>/best-skill.md"
echo "  4. If happy: cp <best-skill.md> ${PROD_PATH}; git diff; commit."
echo ""
echo "${SANDBOX_PATH}"
