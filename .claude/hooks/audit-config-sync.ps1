# scripts/audit-config-sync.ps1
#
# Checks whether CLAUDE.md, agent files, settings.json, and live
# documents are in sync with the current project state.
# Flags staleness without making any changes.
#
# Run before major sessions or after architectural changes:
#   powershell -File scripts/audit-config-sync.ps1
#
# Checks:
#   1.  CLAUDE.md exists and references live documents (not hardcoded state)
#   2.  All live documents exist and are readable
#   3.  CLAUDE.md does NOT contain a hardcoded test count
#   4.  CLAUDE.md does NOT contain the old v1 scoring formula
#   5.  CLAUDE.md has branch discipline section
#   6.  CLAUDE.md task completion protocol prohibits direct commits/pushes
#   7.  CLAUDE.md references PATH_TO_LAUNCH.md (not an inline bugs table)
#   8.  Agent files all have model: field set to sonnet/haiku/opus
#   9.  All six expected agents are present
#   10. settings.json has deny rules for push and commit
#   11. settings.json whitelists Read(**)
#   12. PATH_TO_LAUNCH.md current phase marker is readable
#   13. npm test exits cleanly (all groups green)

Write-Output ""
Write-Output "=== Nat20 Config Sync Audit ==="
Write-Output "$(Get-Date -Format 'yyyy-MM-dd HH:mm')"
Write-Output ""

$issues   = @()
$warnings = @()
$ok       = @()

# ─────────────────────────────────────────────
# CHECK 1 — CLAUDE.md exists
# ─────────────────────────────────────────────

$claudeMd = "CLAUDE.md"
if (Test-Path $claudeMd) {
    $claudeContent = Get-Content $claudeMd -Raw
    $ok += "CLAUDE.md found"
} else {
    $issues += "CLAUDE.md not found in repo root — session context will be missing"
    $claudeContent = ""
}

# ─────────────────────────────────────────────
# CHECK 2 — All live documents exist
# ─────────────────────────────────────────────

$liveDocs = @{
    "PATH_TO_LAUNCH.md"    = "..\nat20-core\PATH_TO_LAUNCH.md"
    "master-plan-v5.md"    = "..\nat20-core\docs\master-plan-v5.md"
    "scoring-model.md"     = "..\nat20-core\docs\scoring-model.md"
    "affiliate_masterplan" = "..\nat20-core\docs\affiliate_masterplan.md"
}

foreach ($name in $liveDocs.Keys) {
    $path = $liveDocs[$name]
    if (Test-Path $path) {
        $ok += "Live doc present: $name"
    } else {
        $issues += "Live doc missing: $name at $path"
    }
}

# ─────────────────────────────────────────────
# CHECK 3 — CLAUDE.md does NOT hardcode a test count
# ─────────────────────────────────────────────

if ($claudeContent) {
    # Flag patterns like "393 tests", "404 passing", "122 tests must pass"
    $hardcodedCount = [regex]::Match($claudeContent, '\b(\d{3,})\s*(tests? must pass|passing|tests? pass)')
    if ($hardcodedCount.Success) {
        $issues += "CLAUDE.md hardcodes a test count ('$($hardcodedCount.Value)') — remove it; test groups are the stable reference, not counts"
    } else {
        $ok += "CLAUDE.md does not hardcode a test count"
    }
}

# ─────────────────────────────────────────────
# CHECK 4 — CLAUDE.md does NOT contain old v1 scoring formula
# ─────────────────────────────────────────────

if ($claudeContent) {
    # Old formula used W_type and M_duration; new formula uses E, C, D, R
    if ($claudeContent -match 'W_type' -or $claudeContent -match 'M_duration') {
        $issues += "CLAUDE.md still references old v1 scoring formula (W_type / M_duration) — replace with E×C×D×R and point to scoring-model.md"
    } else {
        $ok += "CLAUDE.md does not reference stale v1 scoring formula"
    }

    if ($claudeContent -match 'E.*C.*D.*R|E×C×D×R') {
        $ok += "CLAUDE.md references current E×C×D×R formula"
    } else {
        $warnings += "CLAUDE.md may not mention E×C×D×R formula — verify scoring section is current"
    }
}

# ─────────────────────────────────────────────
# CHECK 5 — CLAUDE.md has branch discipline section
# ─────────────────────────────────────────────

if ($claudeContent) {
    if ($claudeContent -match 'Branch Discipline|feature branch|git checkout -b') {
        $ok += "CLAUDE.md has branch discipline section"
    } else {
        $issues += "CLAUDE.md missing branch discipline section — agents may work on master directly"
    }
}

# ─────────────────────────────────────────────
# CHECK 6 — CLAUDE.md task completion protocol prohibits commits/pushes
# ─────────────────────────────────────────────

if ($claudeContent) {
    $noCommit = $claudeContent -match 'do not commit|NEVER commit|never commit|Do not commit'
    $noPush   = $claudeContent -match 'do not push|NEVER push|never push|Do not push'

    if ($noCommit) {
        $ok += "CLAUDE.md explicitly prohibits direct commits"
    } else {
        $issues += "CLAUDE.md task completion protocol does not explicitly say 'do not commit' — agents may commit directly"
    }

    if ($noPush) {
        $ok += "CLAUDE.md explicitly prohibits direct pushes"
    } else {
        $issues += "CLAUDE.md task completion protocol does not explicitly say 'do not push' — agents may push directly"
    }

    # Check for dangerous old instruction pattern
    if ($claudeContent -match 'Push public repo|git push origin' -and -not $noPush) {
        $issues += "CLAUDE.md contains git push instructions without a prohibition — dangerous, agents may push to remote"
    }
}

# ─────────────────────────────────────────────
# CHECK 7 — CLAUDE.md references PATH_TO_LAUNCH.md for bugs, not an inline bug table
# ─────────────────────────────────────────────

if ($claudeContent) {
    $hasPointer     = $claudeContent -match 'PATH_TO_LAUNCH\.md'
    $hasInlineTable = ($claudeContent -match '\|\s*#\s*\|\s*Bug\s*\|') `
                      -and ($claudeContent -match '\|\s*\d+\s*\|.*priority')

    if ($hasPointer) {
        $ok += "CLAUDE.md points to PATH_TO_LAUNCH.md (single source for tasks + bugs)"
    } else {
        $warnings += "CLAUDE.md does not reference PATH_TO_LAUNCH.md — add a pointer so agents know where tasks and bugs live"
    }

    if ($hasInlineTable) {
        $issues += "CLAUDE.md contains an inline bug table — move bugs to PATH_TO_LAUNCH.md's Known Bugs section and replace with a pointer"
    } else {
        $ok += "CLAUDE.md does not contain an inline bug table"
    }
}

# ─────────────────────────────────────────────
# CHECK 8 — Agent files have valid model: field
# ─────────────────────────────────────────────

$agentsDir = ".claude\agents"
if (Test-Path $agentsDir) {
    $agentFiles = Get-ChildItem $agentsDir -Filter "*.md"
    foreach ($agent in $agentFiles) {
        $content = Get-Content $agent.FullName -Raw
        if ($content -match '^model:\s*(sonnet|haiku|opus)\s*$') {
            $ok += "Agent $($agent.BaseName): model = $($Matches[1])"
        } elseif ($content -match '^model:') {
            # Has a model field but value may have version strings
            $modelLine = ($content -split "`n" | Where-Object { $_ -match '^model:' } | Select-Object -First 1)
            $warnings += "Agent $($agent.BaseName) has model: field but value may include version string: '$modelLine' — should be just 'sonnet', 'haiku', or 'opus'"
        } else {
            $issues += "Agent $($agent.BaseName) missing model: field — will inherit session default unexpectedly"
        }
    }
} else {
    $warnings += ".claude/agents/ directory not found — skipping agent model checks"
}

# ─────────────────────────────────────────────
# CHECK 9 — All six expected agents present
# ─────────────────────────────────────────────

$expectedAgents = @("explorer", "ship-feature", "debugger", "code-reviewer", "test-writer", "architect")
if (Test-Path $agentsDir) {
    $presentAgents = Get-ChildItem $agentsDir -Filter "*.md" | ForEach-Object { $_.BaseName }
    foreach ($expected in $expectedAgents) {
        if ($presentAgents -contains $expected) {
            $ok += "Agent present: $expected"
        } else {
            $issues += "Expected agent missing: $expected — add .claude/agents/$expected.md"
        }
    }
}

# ─────────────────────────────────────────────
# CHECK 10 — settings.json deny rules
# ─────────────────────────────────────────────

$settingsFile = ".claude\settings.json"
if (Test-Path $settingsFile) {
    $settings = Get-Content $settingsFile -Raw

    if ($settings -match '"Bash\(git push') {
        $ok += "settings.json denies git push"
    } else {
        $issues += "settings.json missing deny for 'git push' — agents could push to remote"
    }

    if ($settings -match '"Bash\(git commit') {
        $ok += "settings.json denies git commit"
    } else {
        $issues += "settings.json missing deny for 'git commit' — agents could commit without review"
    }

    if ($settings -match '"Bash\(rm -rf') {
        $ok += "settings.json denies rm -rf"
    } else {
        $warnings += "settings.json does not explicitly deny 'rm -rf' — consider adding it"
    }
} else {
    $issues += ".claude/settings.json not found — no permission guardrails active"
}

# ─────────────────────────────────────────────
# CHECK 11 — settings.json whitelists Read
# ─────────────────────────────────────────────

if (Test-Path $settingsFile) {
    $settings = Get-Content $settingsFile -Raw
    if ($settings -match '"Read\(') {
        $ok += "settings.json whitelists Read — agents won't be prompted for file reads"
    } else {
        $warnings += "settings.json may not whitelist Read(**) — agents will be prompted for every file read"
    }
}

# ─────────────────────────────────────────────
# CHECK 12 — PATH_TO_LAUNCH.md current phase is readable
# ─────────────────────────────────────────────

$pathToLaunchPath = "..\nat20-core\PATH_TO_LAUNCH.md"
if (Test-Path $pathToLaunchPath) {
    $planContent = Get-Content $pathToLaunchPath -Raw

    # Primary: an explicit "Current Phase: E — ..." marker in the header note.
    $phaseMatch = [regex]::Match($planContent, 'Current Phase:\s*([A-Z])\b')

    if ($phaseMatch.Success) {
        $currentPhase = $phaseMatch.Groups[1].Value
        $ok += "Current phase readable from PATH_TO_LAUNCH.md: Phase $currentPhase"

        # Verify CLAUDE.md at least mentions this phase
        if ($claudeContent -and -not ($claudeContent -match "Phase $currentPhase")) {
            $warnings += "CLAUDE.md does not mention Phase $currentPhase — may be referencing a stale phase"
        }
    } else {
        $warnings += "Could not detect current phase from PATH_TO_LAUNCH.md — add a 'Current Phase: <letter> — ...' line to the header note section. session-start.ps1 reads the same marker, so without it both the audit and the session banner show no phase."
    }
} else {
    $issues += "PATH_TO_LAUNCH.md not found at $pathToLaunchPath — session context and phase detection will be missing"
}

# ─────────────────────────────────────────────
# CHECK 13 — npm test exits cleanly
# ─────────────────────────────────────────────

Write-Output "Running npm test..."
$testOutput = npm test --silent 2>&1
$testExitCode = $LASTEXITCODE

if ($testExitCode -eq 0) {
    $passMatch = [regex]::Match(($testOutput -join "`n"), 'Tests\s+(\d+) passed')
    $count = if ($passMatch.Success) { $passMatch.Groups[1].Value } else { "unknown" }
    $ok += "npm test passed ($count tests)"
} else {
    $failLines = $testOutput | Select-Object -Last 8
    $issues += "npm test is FAILING — fix before starting any session. Last output:`n  $($failLines -join "`n  ")"
}

# ─────────────────────────────────────────────
# REPORT
# ─────────────────────────────────────────────

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if ($issues.Count -gt 0) {
    Write-Output ""
    Write-Output "ISSUES — fix before starting session ($($issues.Count)):"
    foreach ($issue in $issues) {
        Write-Output "  ❌  $issue"
    }
}

if ($warnings.Count -gt 0) {
    Write-Output ""
    Write-Output "WARNINGS — review when convenient ($($warnings.Count)):"
    foreach ($warn in $warnings) {
        Write-Output "  ⚠️   $warn"
    }
}

if ($ok.Count -gt 0) {
    Write-Output ""
    Write-Output "OK ($($ok.Count)):"
    foreach ($item in $ok) {
        Write-Output "  ✓  $item"
    }
}

Write-Output ""
Write-Output "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
Write-Output "Result: $($issues.Count) issues  $($warnings.Count) warnings  $($ok.Count) passed"
Write-Output ""

if ($issues.Count -gt 0) {
    Write-Output "❌  Config has issues. Fix before opening a Claude Code session."
    exit 1
} elseif ($warnings.Count -gt 0) {
    Write-Output "⚠️   Config is usable but has warnings worth reviewing."
    exit 0
} else {
    Write-Output "✅  Config is clean. Ready to work."
    exit 0
}
