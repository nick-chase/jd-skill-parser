# PreToolUse hook - block dangerous bash/git commands before they execute
# Fires before any Bash tool call in Claude Code

param(
    [string]$Command
)

# Block direct pushes to main/master
if ($Command -match 'git push.*\bmain\b|git push.*\bmaster\b') {
    Write-Error "BLOCKED: Direct push to main/master not allowed. Use a feature branch." -ErrorAction Stop
    exit 2
}

# Block force pushes anywhere
if ($Command -match 'git push.*-f|git push.*--force') {
    Write-Error "BLOCKED: Force push not allowed." -ErrorAction Stop
    exit 2
}

# Block .env modifications
if ($Command -match 'rm.*\.env|>.*\.env') {
    Write-Error "BLOCKED: Cannot modify .env files." -ErrorAction Stop
    exit 2
}

# Block dropping prod tables
if ($Command -match -icase 'drop table|truncate.*users|truncate.*profiles') {
    Write-Error "BLOCKED: Destructive database operation." -ErrorAction Stop
    exit 2
}

# Also block writes to nat20-core (Nicholas updates manually)
if ($Command -match 'nat20-core' -and $Command -match '(cp|mv|write|echo|>|Set-Content)') {
    Write-Error "BLOCKED: Cannot write to nat20-core from Claude Code. That repo is read-only on this side — Nicholas updates it manually." -ErrorAction Stop
    exit 2
}

exit 0