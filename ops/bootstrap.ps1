$ErrorActionPreference = "Stop"
$root = (git rev-parse --show-toplevel) 2>$null
if (-not $root) { throw "Not a git repo" }
Set-Location $root

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "[1] Node version hint (.nvmrc):" -ForegroundColor Cyan
if (Test-Path .\.nvmrc) { Get-Content .\.nvmrc } else { Write-Host "missing .nvmrc" }
if (Test-Command "node") {
  Write-Host "node: $(node --version)"
}

Write-Host "[2] Install JS deps (prefer Bun when bun.lock exists)" -ForegroundColor Cyan
$hasBun = Test-Command "bun"
$hasBunLock = Test-Path .\bun.lock
$hasPackageLock = Test-Path .\package-lock.json

if ($hasBunLock -and $hasBun) {
  bun install --frozen-lockfile
} elseif ($hasPackageLock) {
  npm ci
  if ($hasBunLock -and -not $hasBun) {
    Write-Host "warning: bun.lock exists but Bun is not installed; workspace scripts using 'bun run' will fail." -ForegroundColor Yellow
  }
} else {
  npm install
}

Write-Host "[3] Toolchain checks (Bun / uv / CLIs)" -ForegroundColor Cyan
if ($hasBun) {
  Write-Host "bun: $(bun --version)"
} else {
  Write-Host "bun: missing (install from https://bun.sh)" -ForegroundColor Yellow
}

if (Test-Command "uv") {
  Write-Host "uv: $(uv --version)"
} else {
  Write-Host "uv: missing (required for Serena MCP command mode)" -ForegroundColor Yellow
}

foreach ($cli in @("gemini", "claude", "codex")) {
  if (Test-Command $cli) {
    $version = & $cli --version 2>$null
    Write-Host "${cli}: $version"
  } else {
    Write-Host "${cli}: missing" -ForegroundColor Yellow
  }
}

Write-Host "[4] Git hooksPath (optional)" -ForegroundColor Cyan
# Optional: git config core.hooksPath .githooks

Write-Host "[DONE] bootstrap complete" -ForegroundColor Green
