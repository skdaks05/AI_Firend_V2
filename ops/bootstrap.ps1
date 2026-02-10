$ErrorActionPreference = "Stop"
$root = (git rev-parse --show-toplevel) 2>$null
if (-not $root) { throw "Not a git repo" }
Set-Location $root

Write-Host "[1] Node version hint (.nvmrc):" -ForegroundColor Cyan
if (Test-Path .\.nvmrc) { Get-Content .\.nvmrc } else { Write-Host "missing .nvmrc" }

Write-Host "[2] Install JS deps (npm ci if lock exists)" -ForegroundColor Cyan
if (Test-Path .\package-lock.json) { npm ci } else { npm install }

Write-Host "[3] Git hooksPath (optional)" -ForegroundColor Cyan
# 원하면 활성화: git config core.hooksPath .githooks

Write-Host "[DONE] bootstrap complete" -ForegroundColor Green
