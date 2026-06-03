#!/bin/bash
INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Trigger on parser-related files (matches both old and new structures)
if echo "$FILE_PATH" | grep -qE "src/jd-skill-parser\.jsx|src/lib/registry\.js|src/core/parser/|data/skills\.json|data/soft-skills\.json|tests/"; then
  echo "🔍 Running tests after edit to $(basename "$FILE_PATH")..."

  # Run Vitest (CLAUDE.md confirms this is the test runner)
  if npm test --silent 2>&1 | tail -10; then
    echo "✅ Tests passed"
  else
    echo "⚠️  Tests failing — review before committing"
  fi
fi

exit 0