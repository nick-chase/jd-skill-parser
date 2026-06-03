#!/bin/bash
# Runs when Claude finishes a task
# Reminds you to update master plan if commits happened

INPUT=$(cat)

# If commits happened in the last hour, suggest a plan update
if git log --since="1 hour ago" --oneline 2>/dev/null | grep -q "."; then
  echo ""
  echo "📋 Master Plan Update Reminder:"
  echo ""
  echo "   Recent commits detected. Per CLAUDE.md Task Completion Protocol:"
  echo "   1. cd ../nat20-private/"
  echo "   2. Update docs/master-plan-v4.md"
  echo "      - Mark completed tasks ✅ with today's date"
  echo "      - Update phase progress notes"
  echo "   3. Commit: 'docs(plan): mark TASK_ID complete'"
  echo "   4. Push private repo"
  echo ""
fi

exit 0