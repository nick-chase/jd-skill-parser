# Runs when Claude Code starts/resumes a session
# Output gets injected as context for Claude

Write-Output "=== Nat20 / ResumeMatch Session Context ==="
Write-Output ""

$branch = git branch --show-current 2>$null
Write-Output "Current branch: $branch"
Write-Output ""

Write-Output "Last 5 commits:"
git log -5 --oneline 2>$null
Write-Output ""

Write-Output "Modified files (uncommitted):"
git status --short 2>$null | Select-Object -First 10
Write-Output ""

# Master plan lives in nat20-core (read-only from Claude's perspective)
$masterPlan = "..\nat20-core\docs\master-plan-v4.md"
if (Test-Path $masterPlan) {
    Write-Output "=== Master Plan Status (from nat20-core) ==="
    Select-String -Path $masterPlan -Pattern "^## Phase|^### Phase" `
        | Select-Object -First 10 `
        | ForEach-Object { $_.Line }
    Write-Output ""
    Write-Output "=== Open Tasks (table rows without checkmark) ==="

    # Match table rows: | ID | Task | DoD |
    # ID is 1-3 alphanumeric chars (E1, E10, E-TRIAGE, B3, etc.)
    # An "open" task has NO checkmark anywhere in the row
    Select-String -Path $masterPlan -Pattern "^\|\s*[A-Z]+-?[A-Z0-9]+\s*\|" `
        | Where-Object { $_.Line -notmatch "✅" } `
        | Select-Object -First 8 `
        | ForEach-Object {
            # Extract just the ID and short description for readability
            $parts = $_.Line -split '\|'
            if ($parts.Count -ge 3) {
                $taskId = $parts[1].Trim()
                $taskDesc = $parts[2].Trim()
                # Truncate long descriptions
                if ($taskDesc.Length -gt 70) {
                    $taskDesc = $taskDesc.Substring(0, 67) + "..."
                }
                Write-Output "  $taskId — $taskDesc"
            }
        }
} else {
    Write-Output "WARNING: Master plan not found at $masterPlan"
    Write-Output "         Expected: C:\Users\nikec\Desktop\nat20-core\docs\master-plan-v4.md"
}
Write-Output ""

Write-Output "=== Known Bugs (from CLAUDE.md) ==="
if (Test-Path "CLAUDE.md") {
    Select-String -Path "CLAUDE.md" -Pattern "^\| \d+ \|" `
        | Where-Object { $_.Line -notmatch "Fixed" } `
        | Select-Object -First 3 `
        | ForEach-Object { $_.Line }
}
Write-Output ""

Write-Output "=== Workflow Reminders ==="
Write-Output "1. Run 'npm test' before any commit (122 tests must pass)"
Write-Output "2. Branch from main, never edit main directly"
Write-Output "3. Update nat20-core\docs\master-plan-v4.md manually when tasks complete"
Write-Output "4. Pre-commit hook must be installed (see CLAUDE.md)"