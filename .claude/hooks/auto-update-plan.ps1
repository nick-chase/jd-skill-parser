# Stop hook - a task is not done until ../nat20-core/PATH_TO_LAUNCH.md is updated.
#
# Blocks the stop (exit 2, reason on stderr) when tracked files in this repo have
# uncommitted changes AND PATH_TO_LAUNCH.md shows no uncommitted change.
#
# Loop guard: when Claude is already continuing because of this hook, the input
# JSON carries stop_hook_active = true and the hook lets the stop through. So it
# blocks at most once per stop. (Claude Code also force-overrides a Stop hook
# after 8 consecutive blocks.)
#
# NAT20_REPO_DIR / NAT20_CORE_DIR override the default folders (used for hook testing).

$raw = [Console]::In.ReadToEnd()
$json = $null
if ($raw) { try { $json = $raw | ConvertFrom-Json } catch { $json = $null } }

if ($json -and $json.stop_hook_active -eq $true) { exit 0 }

if ($env:NAT20_REPO_DIR) {
    $RepoRoot = $env:NAT20_REPO_DIR
} else {
    $RepoRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}
if ($env:NAT20_CORE_DIR) {
    $CoreRoot = $env:NAT20_CORE_DIR
} else {
    $CoreRoot = Join-Path (Split-Path $RepoRoot -Parent) 'nat20-core'
}

# Tracked files changed (staged or unstaged, untracked files ignored)
$changed = git -C $RepoRoot status --porcelain --untracked-files=no 2>$null
if (-not $changed) { exit 0 }

$ptlPath = Join-Path $CoreRoot 'PATH_TO_LAUNCH.md'
if (-not (Test-Path $ptlPath)) {
    Write-Output "WARNING: tracked files changed but PATH_TO_LAUNCH.md was not found at $ptlPath"
    exit 0
}

$ptlChanged = git -C $CoreRoot status --porcelain -- PATH_TO_LAUNCH.md 2>$null
if ($ptlChanged) { exit 0 }

$count = @($changed).Count
[Console]::Error.WriteLine("BLOCKED: $count tracked file(s) changed in jd-skill-parser, but ../nat20-core/PATH_TO_LAUNCH.md has no uncommitted change. A task is not done until PATH_TO_LAUNCH.md is updated: move the task to Completed (date + branch), add any new bugs, add a one-line decision entry if one was made. If no update is warranted, say so to the user and stop.")
exit 2
