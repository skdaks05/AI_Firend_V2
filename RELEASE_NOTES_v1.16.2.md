# v1.16.2 - Listener Cleanup and Evidence Path Hardening

Release date: 2026-02-11
Tag: `v1.16.2`

## Summary
- Reduces listener-related warning noise in repeated bridge/agent execution paths.
- Adds regression coverage for nested CWD project-root resolution.
- Hardens verify compatibility by preserving `EVIDENCE_PATH` from prompt context when vendor output omits it.

## Fixes Included
- `bridge` command now avoids accumulating repeated listeners on:
  - `process.stdin` (`data`)
  - `process` signals (`SIGINT`, `SIGTERM`)
- `agent:spawn` now removes signal handlers on error/exit paths.
- New regression test validates that nested CWD execution still:
  - finds root `.agent` config
  - writes results under root `.serena/memories`
- Result post-processing adds `EVIDENCE_PATH` from prompt into result content only when:
  - result lacks `EVIDENCE_PATH`
  - prompt contains a valid `EVIDENCE_PATH` line

## Test Status
- `bun run --cwd cli test`: **116/116 passed**

## Notes
- This is a patch release with no breaking CLI flags or schema changes.
