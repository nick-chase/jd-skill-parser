# PostToolUse hook - run tests after edits to parser files
# Fires after any Edit/Write tool call on relevant files

param(
    [string]$FilePath
)

# Trigger on parser-related files (matches both old and new structures)
$ParserPatterns = @(
    'src/jd-skill-parser\.jsx',
    'src/lib/registry\.js',
    'src/core/parser/',
    'data/skills\.json',
    'data/soft-skills\.json',
    'tests/'
)

$ShouldTest = $false
foreach ($pattern in $ParserPatterns) {
    if ($FilePath -match $pattern) {
        $ShouldTest = $true
        break
    }
}

if ($ShouldTest) {
    $FileName = Split-Path -Leaf $FilePath
    Write-Output "🔍 Running tests after edit to $FileName..."
    
    # Run Vitest
    $testOutput = npm test --silent 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        # Show last 10 lines of output
        $testOutput | Select-Object -Last 10 | ForEach-Object { Write-Output $_ }
        Write-Output "✅ Tests passed"
    }
    else {
        $testOutput | Select-Object -Last 10 | ForEach-Object { Write-Output $_ }
        Write-Output "⚠️  Tests failing — review before committing"
    }
}

exit 0