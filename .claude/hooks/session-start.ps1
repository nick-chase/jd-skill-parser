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
    $openTasks = "..\nat20-core\docs\OPEN_TASKS.md"
    if (Test-Path $openTasks) {
        Write-Output ""
        Write-Output "=== Open Tasks (from OPEN_TASKS.md) ==="
        Select-String -Path $openTasks -Pattern "^- \[ \]" |
        Select-Object -First 10 |
        ForEach-Object {
            # Strip the "- [ ] " prefix for compact display
            $line = $_.Line -replace "^- \[ \]\s*", "  "
            # Truncate long lines for terminal readability
            if ($line.Length -gt 90) {
                $line = $line.Substring(0, 87) + "..."
            }
            Write-Output $line
        }
        Write-Output ""
        Write-Output "  Full task details + plan refs: ..\nat20-core\docs\OPEN_TASKS.md"
        Write-Output "  Strategy context: ..\nat20-core\docs\master-plan-v4.md"
    }
    else {
        Write-Output ""
        Write-Output "  WARNING: OPEN_TASKS.md not found at $openTasks"
        Write-Output "           Falling back to master plan only."
    }

}
else {
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
Write-Output "1. Run 'npm test' before any commit (all tests must pass)"
Write-Output "2. Branch from main, never edit main directly"
Write-Output "3. Update nat20-core\docs\master-plan-v4.md manually when tasks complete"
Write-Output "4. Pre-commit hook must be installed (see CLAUDE.md)"