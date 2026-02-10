# ops/safe_clean.ps1
# Usage:
#   pwsh ./ops/safe_clean.ps1 -DryRun
#   pwsh ./ops/safe_clean.ps1 -Apply -Force

param(
  [switch]$DryRun,
  [switch]$Apply,
  [switch]$Force
)

# 1) Repo root auto
$root = (git rev-parse --show-toplevel) 2>$null
if (-not $root) { Write-Error "Not a git repo."; exit 1 }
Set-Location $root

# 2) Block if docs are untracked
$untrackedDocs = git status --porcelain | Select-String "^\?\? docs/"
if ($untrackedDocs) {
  Write-Error "Blocked: Untracked docs detected. Run 'git add docs/<file>' first."
  $untrackedDocs | ForEach-Object { $_.Line } | Write-Host
  exit 1
}

# 3) Always show dry-run preview
Write-Host "=== git clean -fdn preview ==="
git clean -fdn

if ($DryRun) { exit 0 }

if ($Apply) {
  if (-not $Force) {
    Write-Error "Refusing to apply clean without -Force. Use: -Apply -Force"
    exit 1
  }
  Write-Host "=== APPLY: git clean -fd ===" -ForegroundColor Yellow
  git clean -fd
  exit 0
}

Write-Error "Specify -DryRun or -Apply -Force"
exit 1
