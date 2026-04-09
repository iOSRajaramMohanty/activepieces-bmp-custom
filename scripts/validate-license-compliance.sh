#!/usr/bin/env bash
#
# validate-license-compliance.sh
# Validates that code changes comply with Activepieces MIT/EE license terms.
# Run before committing or distributing to ensure license compliance.
#
# EE paths changed vs HEAD: upstream byte-match only excuses them during a merge conclusion
# (when MERGE_HEAD exists — i.e. you are committing after `git merge` / pull merge).
# Set AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT=1 to allow upstream match on any commit (old behavior).
# Set AP_LICENSE_UPSTREAM_REF to force the ref (e.g. AP_LICENSE_UPSTREAM_REF=upstream/main).
# Note: fast-forward merges do not set MERGE_HEAD; use `git merge --no-ff` if you need this exemption.
#
# When EE files fail the check, a unified diff vs HEAD is printed (line numbers in @@ hunks).
#   AP_LICENSE_EE_DIFF_LINES   Max lines of diff output per file (default 160; 0 = no limit).
#   AP_LICENSE_NO_EE_DIFF=1    Skip printing diffs (file list only).
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

resolve_license_upstream_ref() {
  if [[ -n "${AP_LICENSE_UPSTREAM_REF:-}" ]]; then
    if git rev-parse --verify "${AP_LICENSE_UPSTREAM_REF}^{commit}" >/dev/null 2>&1; then
      echo "${AP_LICENSE_UPSTREAM_REF}"
      return 0
    fi
    echo "  ⚠ WARNING: AP_LICENSE_UPSTREAM_REF=${AP_LICENSE_UPSTREAM_REF} is not a valid ref; upstream EE matching skipped" >&2
    return 1
  fi
  for ref in upstream/main origin/main; do
    if git rev-parse --verify "${ref}^{commit}" >/dev/null 2>&1; then
      echo "$ref"
      return 0
    fi
  done
  return 1
}

# True while git is concluding a merge commit (pre-commit runs before the merge commit is recorded).
merge_commit_in_progress() {
  git rev-parse -q --verify MERGE_HEAD >/dev/null 2>&1
}

# Returns 0 when index and working tree match $ref for $path (same blob, or both sides omit the path).
# Uses git diff only so removals that match upstream (file gone on ref and gone in index/wt) still match.
ee_file_matches_upstream() {
  local ref="$1"
  local path="$2"
  git diff --quiet "$ref" --cached -- "$path" 2>/dev/null || return 1
  git diff --quiet "$ref" -- "$path" 2>/dev/null || return 1
  return 0
}

# Prints git diff vs HEAD for each path in $1 (newline-separated). Uses git's @@ line metadata.
print_dangerous_ee_diffs() {
  local paths_block="$1"
  local max_lines="${AP_LICENSE_EE_DIFF_LINES:-160}"
  [[ "${AP_LICENSE_NO_EE_DIFF:-0}" == "1" ]] && return 0
  echo ""
  echo "  --- Diff vs HEAD (your commit would include these deltas) ---"
  echo "  Tip: AP_LICENSE_EE_DIFF_LINES=0 for full diff; AP_LICENSE_NO_EE_DIFF=1 to hide."
  while IFS= read -r ee_path; do
    [[ -z "$ee_path" ]] && continue
    echo ""
    echo "  >>> $ee_path"
    git --no-pager diff --stat HEAD -- "$ee_path" 2>/dev/null || true
    echo ""
    diff_text=$(git --no-pager diff -U3 HEAD -- "$ee_path" 2>/dev/null || true)
    line_count=$(printf '%s\n' "$diff_text" | wc -l | tr -d ' ')
    if [[ "$max_lines" == "0" ]] || [[ "$line_count" -le "$max_lines" ]]; then
      printf '%s\n' "$diff_text"
    else
      printf '%s\n' "$diff_text" | head -n "$max_lines"
      echo ""
      echo "  ... (truncated: $line_count lines — AP_LICENSE_EE_DIFF_LINES=0 for full output)"
    fi
  done < <(printf '%s\n' "$paths_block")
}

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
      echo "  Env: AP_LICENSE_UPSTREAM_REF=ref  Optional; default tries upstream/main then origin/main."
      echo "       Upstream EE match only applies during merge commits unless:"
      echo "       AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT=1  (allow upstream match on any commit)"
      echo "       AP_LICENSE_EE_DIFF_LINES=n  Max diff lines per failing EE file (default 160; 0=all)."
      echo "       AP_LICENSE_NO_EE_DIFF=1     Do not print diffs for failing EE files."
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
  MODIFIED_EE=$( (printf '%s\n' "$MODIFIED_ALL" | grep -E "$EE_PATH_PATTERN" || true) | sort -u )
  MODIFIED_MIT=$( (printf '%s\n' "$MODIFIED_ALL" | grep -v -E "$EE_PATH_PATTERN" || true) | grep -v '^$' | sort -u )

  LICENSE_UPSTREAM_REF=""
  ALLOW_UPSTREAM_EE_EXEMPT=false
  if merge_commit_in_progress || [[ "${AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT:-0}" == "1" ]]; then
    ALLOW_UPSTREAM_EE_EXEMPT=true
  fi

  if [[ -n "$MODIFIED_EE" ]]; then
    LICENSE_UPSTREAM_REF=$(resolve_license_upstream_ref) || true
    if merge_commit_in_progress; then
      echo "  ℹ Merge commit: EE files that byte-match upstream may be excused."
    elif [[ "${AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT:-0}" == "1" ]]; then
      echo "  ℹ AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT=1: upstream EE match allowed on this commit."
    else
      echo "  ℹ Non-merge commit: EE changes vs HEAD are flagged unless they are merge conclusions."
      echo "    Use \`git merge upstream/main\` (then commit), \`git merge --no-ff\` after fast-forward need, or AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT=1."
    fi
    if [[ -n "$LICENSE_UPSTREAM_REF" ]]; then
      echo "  ℹ EE upstream ref for byte match: $LICENSE_UPSTREAM_REF (set AP_LICENSE_UPSTREAM_REF to override)"
    else
      echo "  ℹ No upstream/main or origin/main ref found; fetch upstream or set AP_LICENSE_UPSTREAM_REF"
    fi
  fi

  DANGEROUS_EE=""
  EXCUSED_EE=""
  while IFS= read -r ee_path; do
    [[ -z "$ee_path" ]] && continue
    if [[ "$ALLOW_UPSTREAM_EE_EXEMPT" == "true" ]] && [[ -n "$LICENSE_UPSTREAM_REF" ]] && ee_file_matches_upstream "$LICENSE_UPSTREAM_REF" "$ee_path"; then
      EXCUSED_EE="${EXCUSED_EE}${ee_path}"$'\n'
    else
      DANGEROUS_EE="${DANGEROUS_EE}${ee_path}"$'\n'
    fi
  done < <(printf '%s\n' "$MODIFIED_EE")

  if [[ -n "$EXCUSED_EE" ]]; then
    EXCUSED_COUNT=$(echo "$EXCUSED_EE" | grep -c . || true)
    echo "  ✓ $EXCUSED_COUNT EE file(s) match $LICENSE_UPSTREAM_REF (upstream sync — excused for this merge/policy)"
    if [[ "$VERBOSE" == "true" ]]; then
      echo "$EXCUSED_EE" | sed '/^$/d' | sed 's/^/    - /'
    fi
  fi

  if [[ -n "$DANGEROUS_EE" ]]; then
    echo "  🚨 DANGER: EE-licensed files are not allowed as committed here (Commercial license applies):"
    echo "$DANGEROUS_EE" | sed '/^$/d' | sed 's/^/    - /'
    echo "    → Your changes should be MIT only. EE modifications require a commercial license for production."
    if [[ "$ALLOW_UPSTREAM_EE_EXEMPT" != "true" ]] && [[ -n "$LICENSE_UPSTREAM_REF" ]]; then
      echo "    → On non-merge commits, even EE files that match upstream are blocked; merge from upstream or set AP_LICENSE_EE_UPSTREAM_EXEMPT_ANY_COMMIT=1."
    elif [[ -n "$LICENSE_UPSTREAM_REF" ]]; then
      echo "    → Revert or align with $LICENSE_UPSTREAM_REF (git fetch), or use an Enterprise license."
    else
      echo "    → Revert EE changes, fetch upstream and set AP_LICENSE_UPSTREAM_REF if needed, or use an Enterprise license."
    fi
    print_dangerous_ee_diffs "$DANGEROUS_EE"
    DANGERS=$((DANGERS + 1))
  elif [[ -n "$MODIFIED_EE" ]]; then
    echo "  ✓ EE paths touched only match upstream under merge/upstream-exempt policy (vs $LICENSE_UPSTREAM_REF)"
  elif [[ -z "$MODIFIED_EE" ]]; then
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
    if [[ -n "$DANGEROUS_EE" ]]; then
      echo "  🚨 DANGER - EE-licensed changes (not MIT; production requires commercial license):"
      echo "$DANGEROUS_EE" | sed '/^$/d' | sed 's/^/    - /'
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
