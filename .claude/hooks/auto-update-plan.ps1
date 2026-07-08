# Stop hook — reminds you to update both PATH_TO_LAUNCH.md and master-plan-v5 after commits
# Fires when Claude finishes a session/task

$recentCommits = git log --since="1 hour ago" --oneline 2>$null

if ($recentCommits) {
    Write-Output ""
    Write-Output "=== Task Completion Protocol Reminder ==="
    Write-Output ""
    Write-Output "Recent commits detected. Per the two-tier task system:"
    Write-Output ""
    Write-Output "STEP 1: Ask C.C. to generate updated planning docs"
    Write-Output "  Use @ship-feature to produce FINAL_ versions of any"
    Write-Output "  docs that changed this session:"
    Write-Output "    - docs/FINAL_path-to-launch.md"
    Write-Output "    - docs/FINAL_master-plan-v5.md"
    Write-Output "  C.C. reads from ../nat20-core and writes complete"
    Write-Output "  finished files to jd-skill-parser/docs/"
    Write-Output ""
    Write-Output "STEP 2: Copy the complete files into nat20-core"
    Write-Output "  No cherry-picking. Full file replacement only."
    Write-Output "  Copy-Item 'jd-skill-parser\docs\FINAL_path-to-launch.md'"
    Write-Output "            'nat20-core\PATH_TO_LAUNCH.md' -Force"
    Write-Output "  Copy-Item 'jd-skill-parser\docs\FINAL_master-plan-v5.md'"
    Write-Output "            'nat20-core\docs\master-plan-v5.md' -Force"
    Write-Output ""
    Write-Output "STEP 3: Commit nat20-core"
    Write-Output "  git add PATH_TO_LAUNCH.md docs/master-plan-v5.md"
    Write-Output "  git commit -m 'docs: update plan after [session summary]'"
    Write-Output "  git push"
    Write-Output ""
    Write-Output "Skipping STEP 1 means planning docs will not be updated."
    Write-Output "Skipping STEP 2 means nat20-core will drift from the FINAL_ files."
    Write-Output "Claude cannot write to nat20-core - you must copy the files manually."
    Write-Output ""
}

exit 0