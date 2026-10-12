# PreToolUse hook - block dangerous commands and out-of-scope writes before they execute
# Fires before Bash, PowerShell, Edit, MultiEdit, Write and NotebookEdit tool calls
# Claude Code passes tool data as JSON via stdin

$raw = [Console]::In.ReadToEnd()
$json = $raw | ConvertFrom-Json
$Command = $json.tool_input.command

# --- nat20-core write guard -------------------------------------------------
# The ONLY file Claude Code may write in nat20-core is PATH_TO_LAUNCH.md, and
# only through the Edit/Write tools. Every shell write into nat20-core is blocked.
# NAT20_CORE_DIR overrides the sibling-folder default (used for hook testing).
$RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
if ($env:NAT20_CORE_DIR) {
    $CoreRoot = [System.IO.Path]::GetFullPath($env:NAT20_CORE_DIR)
} else {
    $CoreRoot = [System.IO.Path]::GetFullPath((Join-Path (Split-Path $RepoRoot -Parent) 'nat20-core'))
}
$CoreRoot    = $CoreRoot.TrimEnd('\')
$AllowedFile = Join-Path $CoreRoot 'PATH_TO_LAUNCH.md'

# File tools (Edit / MultiEdit / Write / NotebookEdit): check the resolved target path
$TargetPath = $json.tool_input.file_path
if (-not $TargetPath) { $TargetPath = $json.tool_input.notebook_path }
if ($TargetPath) {
    # Git-bash style /c/Users/... -> C:\Users\...
    if ($TargetPath -match '^/([a-zA-Z])/(.*)$') { $TargetPath = "$($Matches[1]):\$($Matches[2])" }
    $BaseDir = if ($json.cwd) { $json.cwd } else { $RepoRoot }
    if ([System.IO.Path]::IsPathRooted($TargetPath)) {
        $FullPath = [System.IO.Path]::GetFullPath($TargetPath)
    } else {
        $FullPath = [System.IO.Path]::GetFullPath((Join-Path $BaseDir $TargetPath))
    }
    $InCore = ($FullPath -ieq $CoreRoot) -or $FullPath.StartsWith($CoreRoot + '\', [System.StringComparison]::OrdinalIgnoreCase)
    if ($InCore -and ($FullPath -ine $AllowedFile)) {
        Write-Error "BLOCKED: nat20-core is read-only except PATH_TO_LAUNCH.md. Refused write to: $FullPath"
        exit 2
    }
    exit 0
}

if (-not $Command) { exit 0 }

# Shell commands (Bash / PowerShell) that touch nat20-core: block anything that writes.
# PATH_TO_LAUNCH.md edits go through the Edit/Write tools, never the shell.
if ($Command -imatch 'nat20-core') {
    # Drop harmless redirects (2>/dev/null, 2>$null, 2>&1, >NUL) before looking for real ones
    $Scrubbed = $Command -replace '\d?>\s*(/dev/null|\$null|NUL)\b', '' -replace '\d>&\d', ''
    $WritePatterns = @(
        '>',                                                                     # redirect into a file
        '\b(rm|rmdir|del|mv|cp|touch|mkdir|tee|truncate|ln|chmod|patch|unzip|tar)\b',
        '\b(Remove-Item|Move-Item|Copy-Item|Rename-Item|New-Item|Set-Content|Add-Content|Out-File|Clear-Content|Tee-Object|Expand-Archive)\b',
        '\bsed\b[^|;&]*\s(-[a-zA-Z]*i|--in-place)',
        '\bperl\b[^|;&]*\s-[a-zA-Z]*i',
        '\b(node|python3?|py|ruby)\s+(-e|-c)\b',                                  # inline scripts can write anywhere
        '\bgit\b.*\b(add|commit|push|pull|merge|rebase|reset|checkout|switch|restore|stash|rm|mv|clean|cherry-pick|revert|tag|apply|am|init)\b'
    )
    foreach ($p in $WritePatterns) {
        if ($Scrubbed -imatch $p) {
            Write-Error "BLOCKED: shell writes to nat20-core are not allowed. Edit ../nat20-core/PATH_TO_LAUNCH.md with the Edit/Write tool; every other nat20-core file is read-only."
            exit 2
        }
    }
}

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