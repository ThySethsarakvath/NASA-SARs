param(
    [ValidateSet('dev', 'build', 'preview', 'typecheck', 'lint', 'test', 'e2e', 'fixtures')]
    [string]$Task = 'dev'
)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$candidates = @()
if ($env:NASA_NODE) { $candidates += $env:NASA_NODE }
$candidates += Join-Path $projectRoot '.tools\node\node.exe'
$installed = Get-Command node -ErrorAction SilentlyContinue
if ($installed) { $candidates += $installed.Source }
$runtimeRoot = Join-Path $env:ProgramFiles 'WindowsApps'
$runtimes = Get-ChildItem -LiteralPath $runtimeRoot -Directory -Filter 'OpenAI.CodexPrimaryRuntime.v*' -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending
foreach ($runtime in $runtimes) { $candidates += Join-Path $runtime.FullName 'dependencies\node\bin\node.exe' }
$selectedNode = $null
foreach ($candidate in $candidates) {
    if (-not (Test-Path -LiteralPath $candidate)) { continue }
    $version = [version]((& $candidate --version).Trim().TrimStart('v'))
    if (($version.Major -eq 22 -and $version -ge [version]'22.18.0') -or $version -ge [version]'24.12.0') {
        $selectedNode = $candidate
        break
    }
}
if (-not $selectedNode) { throw 'Use Node 22.18+ or 24.12+. Set NASA_NODE to a supported node.exe, or place a portable runtime under .tools/node. Your global runtime was not changed.' }
$env:PATH = (Split-Path -Parent $selectedNode) + ';' + $env:PATH
Push-Location -LiteralPath $projectRoot
try {
    switch ($Task) {
        'dev' { & $selectedNode 'node_modules/vite/bin/vite.js' '--host' '127.0.0.1' '--port' '5173' '--strictPort' }
        'preview' { & $selectedNode 'node_modules/vite/bin/vite.js' 'preview' '--host' '127.0.0.1' }
        'typecheck' { & $selectedNode 'node_modules/vue-tsc/bin/vue-tsc.js' '-b' }
        'build' {
            & $selectedNode 'node_modules/vue-tsc/bin/vue-tsc.js' '-b'
            if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
            & $selectedNode 'node_modules/vite/bin/vite.js' 'build'
        }
        'lint' { & $selectedNode 'node_modules/eslint/bin/eslint.js' '.' }
        'test' { & $selectedNode 'node_modules/vitest/vitest.mjs' 'run' }
        'e2e' { & $selectedNode 'node_modules/@playwright/test/cli.js' 'test' }
        'fixtures' { & $selectedNode 'scripts/create-fixture.mjs' }
    }
    $taskExitCode = $LASTEXITCODE
} finally { Pop-Location }
exit $taskExitCode
