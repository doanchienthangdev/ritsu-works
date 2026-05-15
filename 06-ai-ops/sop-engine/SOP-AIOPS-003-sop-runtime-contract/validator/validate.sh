#!/usr/bin/env bash
# SOP flow.yaml validator — runs over every flow.yaml in repo and checks schema conformance.
#
# Usage: validator/validate.sh [path/to/flow.yaml ...]
#        If no args, validates ALL flow.yaml in repo (recursive find).
#
# Exit codes:
#   0 — all flow.yaml pass validation
#   1 — at least one flow.yaml failed
#   2 — script error (missing dependencies)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/../flow-schema.yaml"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Dependency check
if ! command -v ajv >/dev/null 2>&1 && ! command -v python3 >/dev/null 2>&1; then
    echo "ERROR: requires 'ajv-cli' OR 'python3' with PyYAML+jsonschema" >&2
    echo "  Install: npm i -g ajv-cli ajv-formats   OR   pip3 install pyyaml jsonschema" >&2
    exit 2
fi

# Find files to validate (compatible with bash 3.2 on macOS)
FILES=()
if [ "$#" -gt 0 ]; then
    FILES=("$@")
else
    # Find every flow.yaml in repo (excluding node_modules, .archives, .git)
    while IFS= read -r line; do
        FILES+=("$line")
    done < <(
        find "$REPO_ROOT" \( -name "flow.yaml" -o -name "*-example.yaml" \) \
            -not -path "*/node_modules/*" \
            -not -path "*/.archives/*" \
            -not -path "*/.git/*" \
            -not -path "*/.migration-tmp/*" 2>/dev/null
    )
fi

if [ "${#FILES[@]}" -eq 0 ]; then
    echo "No flow.yaml files found to validate."
    exit 0
fi

echo "Validating ${#FILES[@]} flow.yaml file(s) against $SCHEMA_FILE"
echo

PASS=0
FAIL=0
FAILED_FILES=()

for f in "${FILES[@]}"; do
    if command -v ajv >/dev/null 2>&1; then
        # Prefer ajv (faster, native JS Schema validator)
        if ajv validate -s "$SCHEMA_FILE" -d "$f" --spec=draft2020 --strict=false 2>/dev/null; then
            echo "  PASS  $f"
            PASS=$((PASS + 1))
        else
            echo "  FAIL  $f"
            ajv validate -s "$SCHEMA_FILE" -d "$f" --spec=draft2020 --strict=false 2>&1 | sed 's/^/        /'
            FAIL=$((FAIL + 1))
            FAILED_FILES+=("$f")
        fi
    else
        # Python fallback
        if python3 -c "
import sys, yaml, json
from jsonschema import validate, ValidationError, Draft202012Validator
with open('$SCHEMA_FILE') as s: schema = yaml.safe_load(s)
with open('$f') as d: data = yaml.safe_load(d)
try:
    Draft202012Validator(schema).validate(data)
    sys.exit(0)
except ValidationError as e:
    print(f'    {e.message}', file=sys.stderr)
    sys.exit(1)
" 2>&1; then
            echo "  PASS  $f"
            PASS=$((PASS + 1))
        else
            echo "  FAIL  $f"
            FAIL=$((FAIL + 1))
            FAILED_FILES+=("$f")
        fi
    fi
done

echo
echo "Summary: $PASS pass, $FAIL fail"

if [ "$FAIL" -gt 0 ]; then
    echo
    echo "Failed files:"
    printf '  %s\n' "${FAILED_FILES[@]}"
    exit 1
fi

exit 0
