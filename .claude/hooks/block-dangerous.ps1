# PreToolUse hook - block dangerous bash/git commands before they execute
# Fires before any Bash tool call in Claude Code
# Claude Code passes tool data as JSON via stdin

$raw = [Console]::In.ReadToEnd()
$json = $raw | ConvertFrom-Json
$Command = $json.tool_input.command

if (-not $Command) { exit 0 }

# Block writes to global Claude config directory
if ($Command -match '~[\\\/]\.claude|C:\\Users\\nikec\\\.claude') {
    Write-Error "BLOCKED: Cannot modify global ~/.claude/ directory. All Claude config belongs in the project .claude/ folder only."
    exit 2
}

# Block direct pushes to main/master
if ($Command -match 'git push.*\bmain\b|git push.*\bmaster\b') {
    Write-Error "BLOCKED: Direct push to main/master not allowed. Use a feature branch."
    exit 2
}

# Block force pushes anywhere
if ($Command -match 'git push.*-f|git push.*--force') {
    Write-Error "BLOCKED: Force push not allowed."
    exit 2
}

# Block .env modifications
if ($Command -match 'rm.*\.env|>.*\.env') {
    Write-Error "BLOCKED: Cannot modify .env files."
    exit 2
}

# Block dropping prod tables
if ($Command -imatch 'drop table|truncate.*users|truncate.*profiles') {
    Write-Error "BLOCKED: Destructive database operation."
    exit 2
}

# Block deletions in nat20-core (edits allowed; deletions are not)
if ($Command -match 'nat20-core' -and $Command -match '\b(rm|del|Remove-Item)\b') {
    Write-Error "BLOCKED: Cannot delete files in nat20-core. Nicholas manages deletions manually."
    exit 2
}

# Block git clean (deletes untracked/ignored files from disk — irreversible)
if ($Command -match 'git clean') {
    Write-Error "BLOCKED: git clean deletes untracked files permanently. Run manually if needed."
    exit 2
}

# Block hard resets (nukes uncommitted changes — irreversible)
if ($Command -match 'git reset.*--hard') {
    Write-Error "BLOCKED: git reset --hard is irreversible. Run manually if needed."
    exit 2
}

# Block silent working tree overwrites
if ($Command -match 'git checkout -- ') {
    Write-Error "BLOCKED: git checkout -- overwrites working tree files silently. Run manually if needed."
    exit 2
}

exit 0