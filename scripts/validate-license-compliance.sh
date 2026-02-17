#!/usr/bin/env bash
#
# validate-license-compliance.sh
# Validates that code changes comply with Activepieces MIT/EE license terms.
# Run before committing or distributing to ensure license compliance.
#
# Usage: ./scripts/validate-license-compliance.sh [--strict]
#   --strict: Exit 1 on any warning (default: exit 0 on warnings, 1 only on failures)
#

set -e

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

STRICT_MODE=false
VERBOSE=false
FAILED=0
WARNINGS=0
DANGERS=0

# EE paths (Commercial license)
EE_PATH_PATTERN="^packages/ee/|^packages/server/api/src/app/ee/"

# Parse args
for arg in "$@"; do
  case $arg in
    --strict) STRICT_MODE=true ;;
    --verbose|-v) VERBOSE=true ;;
    -h|--help)
      echo "Usage: $0 [--strict] [--verbose]"
      echo "  Validates MIT/EE license compliance for Activepieces fork."
      echo "  --strict:  Treat warnings as failures"
      echo "  --verbose: Show which license applies to your modified files"
      exit 0
      ;;
  esac
done

echo "=============================================="
echo "Activepieces License Compliance Validation"
echo "=============================================="
echo ""

# -----------------------------------------------
# Check 1: Root LICENSE file exists
# -----------------------------------------------
echo "[1/5] Checking root LICENSE file..."
if [[ -f "LICENSE" ]]; then
  if grep -q "Activepieces" LICENSE && grep -qi "MIT" LICENSE; then
    echo "  ✓ LICENSE exists and contains Activepieces + MIT"
  else
    echo "  ✗ FAIL: LICENSE exists but may be missing required copyright or MIT notice"
    FAILED=$((FAILED + 1))
  fi
else
  echo "  ✗ FAIL: Root LICENSE file is missing (required when distributing)"
  FAILED=$((FAILED + 1))
fi
echo ""

# -----------------------------------------------
# Check 2: EE LICENSE exists (if EE dirs exist)
# -----------------------------------------------
echo "[2/5] Checking EE license (if EE code present)..."
if [[ -d "packages/ee" ]] || [[ -d "packages/server/api/src/app/ee" ]]; then
  if [[ -f "packages/ee/LICENSE" ]]; then
    echo "  ✓ packages/ee/LICENSE exists (EE code present, license file retained)"
  else
    echo "  ✗ FAIL: packages/ee/LICENSE missing (EE code exists, license must be retained)"
    FAILED=$((FAILED + 1))
  fi
else
  echo "  - EE directories not found (CE-only fork); skipping"
fi
echo ""

# -----------------------------------------------
# Check 3: Modified EE files + license-by-change (git-based)
# -----------------------------------------------
echo "[3/5] Checking for modifications to EE-licensed code..."
if git rev-parse --git-dir > /dev/null 2>&1; then
  MODIFIED_ALL=$(git diff --name-only HEAD 2>/dev/null; git diff --cached --name-only 2>/dev/null)
  MODIFIED_EE=$(echo "$MODIFIED_ALL" | grep -E "$EE_PATH_PATTERN" || true | sort -u)
  MODIFIED_MIT=$(echo "$MODIFIED_ALL" | grep -v -E "$EE_PATH_PATTERN" || true | grep -v '^$' || true | sort -u)

  if [[ -n "$MODIFIED_EE" ]]; then
    echo "  🚨 DANGER: Your changes include EE-licensed files (Commercial license applies):"
    echo "$MODIFIED_EE" | sed 's/^/    - /'
    echo "    → Your changes should be MIT only. EE modifications require a commercial license for production."
    echo "    → Revert EE changes, or ensure you have an Activepieces Enterprise subscription."
    DANGERS=$((DANGERS + 1))
  else
    echo "  ✓ No modifications to EE-licensed paths (MIT only)"
  fi

  if [[ "$VERBOSE" == "true" ]] && [[ -n "$MODIFIED_ALL" ]]; then
    echo ""
    echo "  --- Which license applies to your changes? ---"
    if [[ -n "$MODIFIED_MIT" ]]; then
      echo "  ✓ MIT-licensed changes (you may modify, distribute under MIT):"
      echo "$MODIFIED_MIT" | head -20 | sed 's/^/    - /'
      MIT_COUNT=$(echo "$MODIFIED_MIT" | wc -l | tr -d ' ')
      [[ $MIT_COUNT -gt 20 ]] && echo "    ... and $((MIT_COUNT - 20)) more"
    fi
    if [[ -n "$MODIFIED_EE" ]]; then
      echo "  🚨 DANGER - EE-licensed changes (not MIT; production requires commercial license):"
      echo "$MODIFIED_EE" | sed 's/^/    - /'
    fi
  fi
else
  echo "  - Not a git repo; skipping modified-files check"
fi
echo ""

# -----------------------------------------------
# Check 4: AP_EDITION setting
# -----------------------------------------------
echo "[4/5] Checking AP_EDITION configuration..."
ENV_FILES=".env .env.local .env.production packages/server/api/.env.docker packages/server/api/.env.local"
FOUND_EE=false
for f in $ENV_FILES; do
  if [[ -f "$f" ]]; then
    if grep -qE "AP_EDITION=(ee|cloud)" "$f" 2>/dev/null; then
      echo "  ⚠ WARNING: $f sets AP_EDITION=ee or cloud (requires commercial license for production)"
      FOUND_EE=true
    fi
  fi
done
if [[ "$FOUND_EE" == "false" ]]; then
  echo "  ✓ No AP_EDITION=ee or cloud found in common env files"
elif [[ $WARNINGS -gt 0 ]]; then
  WARNINGS=$((WARNINGS + 1))
fi
echo ""

# -----------------------------------------------
# Check 5: Copyright notice in LICENSE
# -----------------------------------------------
echo "[5/5] Verifying required MIT attribution in LICENSE..."
if [[ -f "LICENSE" ]]; then
  if grep -q "copyright notice and this permission notice shall be included" LICENSE; then
    echo "  ✓ LICENSE contains required MIT attribution clause"
  else
    echo "  ✗ FAIL: LICENSE may not contain required MIT permission notice"
    FAILED=$((FAILED + 1))
  fi
else
  echo "  - Skipped (LICENSE missing)"
fi
echo ""

# -----------------------------------------------
# Summary
# -----------------------------------------------
echo "=============================================="
echo "Summary"
echo "=============================================="
echo "Failures: $FAILED"
echo "Dangers:  $DANGERS  (EE changes - your changes must be MIT only)"
echo "Warnings: $WARNINGS"
echo ""

if [[ $FAILED -gt 0 ]]; then
  echo "❌ VALIDATION FAILED: Fix the failures above before distributing."
  echo "   MIT license requires: copyright notice + permission notice in copies."
  exit 1
fi

if [[ $DANGERS -gt 0 ]]; then
  echo "🚨 VALIDATION FAILED (DANGER): Your changes include EE-licensed files."
  echo "   To stay MIT-only: revert changes under packages/ee/ and packages/server/api/src/app/ee/"
  echo "   Or obtain an Activepieces Enterprise license for production use."
  exit 1
fi

if [[ $WARNINGS -gt 0 ]]; then
  echo "⚠️  VALIDATION PASSED WITH WARNINGS."
  echo "   Review the warnings above."
  if [[ "$STRICT_MODE" == "true" ]]; then
    exit 1
  fi
  exit 0
fi

echo "✅ VALIDATION PASSED: Your changes are MIT-only and compliant."
echo "   When distributing: include the root LICENSE file."
exit 0
