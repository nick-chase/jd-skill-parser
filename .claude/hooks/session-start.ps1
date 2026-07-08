# .claude/hooks/session-start.ps1
# Runs when Claude Code starts or resumes a session.
# Output is injected as context before the first user message.

Write-Output "=== Nat20 Session Context ==="
Write-Output ""

# ─── Git state ───────────────────────────────────────────
$branch = git branch --show-current 2>$null
Write-Output "Branch: $branch"
Write-Output ""

Write-Output "Last 5 commits:"
git log -5 --oneline 2>$null
Write-Output ""

$modified = git status --short 2>$null | Select-Object -First 10
if ($modified) {
    Write-Output "Modified (uncommitted):"
    $modified | ForEach-Object { Write-Output "  $_" }
} else {
    Write-Output "Working tree: clean"
}
Write-Output ""

# ─── Master plan phase headers ───────────────────────────
$masterPlan = "..\nat20-core\docs\master-plan-v5.md"
if (Test-Path $masterPlan) {
    Write-Output "=== Phase Status (master-plan-v5.md) ==="
    Select-String -Path $masterPlan -Pattern "^## Phase|^### Phase" |
        Select-Object -First 10 |
        ForEach-Object { Write-Output "  $($_.Line)" }
    Write-Output ""
} else {
    Write-Output "WARNING: master-plan-v5.md not found at $masterPlan"
    Write-Output ""
}

# ─── Path to launch (tasks + bugs, combined) ─────────────
$pathToLaunch = "..\nat20-core\PATH_TO_LAUNCH.md"
if (Test-Path $pathToLaunch) {
    Write-Output "=== Path to Launch (PATH_TO_LAUNCH.md) ==="

    # Current phase header
    $phaseHeader = Select-String -Path $pathToLaunch -Pattern "^## Current Phase" |
        Select-Object -First 1
    if ($phaseHeader) {
        Write-Output "  $($phaseHeader.Line)"
    }

    # Unchecked task lines
    Select-String -Path $pathToLaunch -Pattern "^- \[ \]" |
        Select-Object -First 10 |
        ForEach-Object {
            $line = $_.Line -replace "^- \[ \]\s*", "  "
            if ($line.Length -gt 90) { $line = $line.Substring(0, 87) + "..." }
            Write-Output $line
        }

    # Extract rows from the Open bugs table, if present
    # Reads lines between "## Open" and the next "## " heading
    $bugContent = Get-Content $pathToLaunch
    $inOpenSection = $false
    $bugCount = 0

    foreach ($line in $bugContent) {
        if ($line -match "^## Open") {
            $inOpenSection = $true
            continue
        }
        if ($inOpenSection -and $line -match "^## ") {
            break
        }
        if ($inOpenSection -and $line -match "^\|\s*\d+\s*\|") {
            # Table row — trim to 90 chars
            $trimmed = $line.Trim()
            if ($trimmed.Length -gt 90) { $trimmed = $trimmed.Substring(0, 87) + "..." }
            Write-Output "  $trimmed"
            $bugCount++
        }
    }

    if ($bugCount -eq 0) {
        Write-Output "  No open bugs."
    }

    Write-Output ""
    Write-Output "  Full details: ..\nat20-core\PATH_TO_LAUNCH.md"
    Write-Output ""
} else {
    Write-Output "WARNING: PATH_TO_LAUNCH.md not found at $pathToLaunch"
    Write-Output "         Create it at: ..\nat20-core\PATH_TO_LAUNCH.md"
    Write-Output ""
}

# ─── Workflow reminders ───────────────────────────────────
Write-Output "=== Reminders ==="
Write-Output "  1. All work on a feature branch -- never edit master directly"
Write-Output "  2. npm test must pass before staging any change"
Write-Output "  3. Stage only -- Nicholas commits via GitHub Desktop"
Write-Output "  4. Never write to ..\nat20-core\ -- read only"
Write-Output "  5. Effort: medium by default -- opus for @architect only"
Write-Output ""
Write-Output "Full rules: CLAUDE.md"
Write-Output "============================================"