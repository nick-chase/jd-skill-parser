#!/usr/bin/env bash
# Ad-hoc validation: confirms .gitignore correctly blocks known private filenames.
# Run from the repo root: bash scripts/verify-gitignore.sh

PASS=0
FAIL=0

check_ignored() {
  local file="$1"
  local expect_ignored="$2"

  local result
  git check-ignore -q "$file" 2>/dev/null && result="ignored" || result="tracked"

  if [ "$expect_ignored" = "yes" ] && [ "$result" = "ignored" ]; then
    echo "  PASS  $file (correctly ignored)"
    ((PASS++))
  elif [ "$expect_ignored" = "no" ] && [ "$result" = "tracked" ]; then
    echo "  PASS  $file (correctly not ignored)"
    ((PASS++))
  else
    echo "  FAIL  $file  expected ignored=$expect_ignored, got $result"
    ((FAIL++))
  fi
}

echo ""
echo "=== verify-gitignore.sh ==="
echo ""
echo "Private files (should be ignored):"
check_ignored "docs/master-plan-v4.md"           "yes"
check_ignored "docs/research-dive-skills.md"      "yes"
check_ignored "docs/scoring-model-v2.md"          "yes"
check_ignored "docs/pricing-tiers.md"             "yes"
check_ignored "docs/backlog.md"                   "yes"
check_ignored "docs/launch-strategy.md"           "yes"
check_ignored "software_inventory.txt"            "yes"
check_ignored "User-Agent-Protocol.txt"           "yes"
check_ignored "Universal_Signal_Vocabulary_v2.md" "yes"
check_ignored ".env"                              "yes"
check_ignored ".env.local"                        "yes"
check_ignored "NickResume.pdf"                    "yes"

echo ""
echo "Public files (should NOT be ignored):"
check_ignored "src/lib/registry.js"   "no"
check_ignored "data/skills.json"      "no"
check_ignored "data/soft-skills.json" "no"
check_ignored "README.md"             "no"
check_ignored "CLAUDE.md"             "no"

echo ""
if [ "$FAIL" -eq 0 ]; then
  echo "All $PASS checks passed."
  exit 0
else
  echo "$FAIL check(s) FAILED out of $((PASS + FAIL)) total."
  exit 1
fi
