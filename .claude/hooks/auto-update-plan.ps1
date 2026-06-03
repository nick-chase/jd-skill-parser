# Stop hook — reminds you to update both OPEN_TASKS and master-plan-v4 after commits
# Fires when Claude finishes a session/task

$recentCommits = git log --since="1 hour ago" --oneline 2>$null

if ($recentCommits) {
    Write-Output ""
    Write-Output "=== Task Completion Protocol Reminder ==="
    Write-Output ""
    Write-Output "Recent commits detected. Per the two-tier task system:"
    Write-Output ""
    Write-Output "STEP 1: Update the working list"
    Write-Output "  cd C:\Users\nikec\Desktop\nat20-core"
    Write-Output "  Open docs\OPEN_TASKS.md"
    Write-Output "  Remove the line for the task you just completed"
    Write-Output ""
    Write-Output "STEP 2: Update the strategy doc"
    Write-Output "  Open docs\master-plan-v4.md"
    Write-Output "  Find the task row in the relevant phase table"
    Write-Output "  Mark it: | TASK_ID | description | ✅ YYYY-MM-DD | DoD notes |"
    Write-Output ""
    Write-Output "STEP 3: Commit both changes in nat20-core"
    Write-Output "  git add docs/OPEN_TASKS.md docs/master-plan-v4.md"
    Write-Output "  git commit -m 'docs: complete TASK_ID (working list + plan)'"
    Write-Output "  git push"
    Write-Output ""
    Write-Output "Skipping STEP 1 makes the working list drift."
    Write-Output "Skipping STEP 2 makes the strategy doc drift."
    Write-Output "Claude cannot do either — nat20-core is read-only from this side."
    Write-Output ""
}

exit 0