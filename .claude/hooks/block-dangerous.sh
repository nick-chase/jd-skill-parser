#!/bin/bash
# Read the command Claude wants to run
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Block direct pushes to main
if echo "$COMMAND" | grep -qE "git push.*\bmain\b|git push.*\bmaster\b"; then
  echo "BLOCKED: Direct push to main/master not allowed. Use a feature branch." >&2
  exit 2
fi

# Block force pushes anywhere
if echo "$COMMAND" | grep -qE "git push.*-f|git push.*--force"; then
  echo "BLOCKED: Force push not allowed." >&2
  exit 2
fi

# Block .env modifications
if echo "$COMMAND" | grep -qE "rm.*\.env|>.*\.env"; then
  echo "BLOCKED: Cannot modify .env files." >&2
  exit 2
fi

# Block dropping prod tables
if echo "$COMMAND" | grep -qiE "drop table|truncate.*users|truncate.*profiles"; then
  echo "BLOCKED: Destructive database operation." >&2
  exit 2
fi

exit 0