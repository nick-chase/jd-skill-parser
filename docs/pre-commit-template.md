# pre-commit hook — reference copy for fresh clones
# Copy this content to .git/hooks/pre-commit and run: chmod +x .git/hooks/pre-commit

```bash
#!/usr/bin/env bash
# Blocks commits of private-content filenames from the public repo.
# Mirrors the banned patterns in .gitignore — update both together.

BANNED_PATTERNS=(
  "docs/master-plan"
  "docs/research-dive"
  "docs/scoring-model-v2"
  "docs/scoring-weights"
  "docs/backlog\.md$"
  "docs/launch-strategy\.md$"
  "docs/pricing"
  "^operations/"
  "^data-private/"
  "^tests-private/"
  "[Rr]esume.*\.pdf$"
  "software_inventory\.txt$"
  "User-Agent-Protocol\.txt$"
  "Universal_Signal_Vocabulary"
  "\.env$"
  "\.env\."
  "\.pem$"
  "\.key$"
  "\.secret$"
)

STAGED=$(git diff --cached --name-only 2>/dev/null)

if [ -z "$STAGED" ]; then
  exit 0
fi

FOUND=()
for pattern in "${BANNED_PATTERNS[@]}"; do
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    if echo "$file" | grep -qE "$pattern"; then
      FOUND+=("  ✗ $file  (matched: $pattern)")
    fi
  done <<< "$STAGED"
done

if [ ${#FOUND[@]} -gt 0 ]; then
  echo ""
  echo "COMMIT BLOCKED — private content detected in staged files:"
  echo ""
  for item in "${FOUND[@]}"; do
    echo "$item"
  done
  echo ""
  echo "These files belong in ../nat20-private/, not the public repo."
  echo "Unstage with: git restore --staged <file>"
  echo ""
  exit 1
fi

exit 0
```

Last verified working: 2026-05-30
