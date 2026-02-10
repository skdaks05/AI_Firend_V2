# Docs Safety Rules

This document defines safety rules for docs SSoT files.

## Rules (MUST)

1) docs SSoT 문서는 생성 즉시 git add
2) clean 전 반드시 dry-run
3) untracked docs가 있으면 clean 금지

## Rationale

- Untracked docs can be removed by `git clean -fd`.
- Dry-run (`git clean -fdn`) provides a safe preview.

## Enforcement

- Use `pwsh ./ops/safe_clean.ps1 -DryRun` before any clean.
- Only apply clean via `pwsh ./ops/safe_clean.ps1 -Apply -Force`.
