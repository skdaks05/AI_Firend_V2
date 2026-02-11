# v1.16.1 - Spawn/Verify Stability Patch

Release date: 2026-02-11
Tag: `v1.16.1`

## Summary
- Stabilizes `agent:spawn` when CLI is invoked from nested working directories.
- Fixes Windows-specific false failures in `verify` Python syntax checks.
- Cleans up release code by removing temporary debug traces.

## Fixes Included
- `agent:spawn` now resolves project root by walking up to the nearest `.agent/` marker.
- Vendor/config loading no longer depends on raw `process.cwd()` only.
- Result paths are normalized to root `.serena/memories` (`result-*.md`, `result-*.history.md`).
- `checkStatus` default root path now matches project-root semantics.
- Log FD lifecycle hardened with `try/finally` so `openSync` handles are always closed.
- `verify` Python syntax check made cross-platform:
  - `which uv` -> `where uv` on Windows
  - Unix `find` replacement on Windows via `Get-ChildItem`

## Test Status
- `bun run --cwd cli test`: **115/115 passed**

## Notes
- No breaking CLI flags or schema changes in this patch release.
