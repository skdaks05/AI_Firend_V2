# v1.16.0 — Contract Drift Remediation

Release date: 2026-02-11  
Tag: `v1.16.0`  
Base commits: `db0e094`, `0cccee4`

## New Features
- Loop Guard (Contract 7): `max_wall_time_sec`, `aborted` task result, and `verify/doctor --verify-gate` exit code `3` for aborted/unverifiable runs.
- Verify refine flow (Contract 4): `oh-my-ag verify --refine` generates `refinement_plan.md` on verification failure.
- SSOT state progression (Contract 2): `evidence_pack.yaml` status is updated automatically from verify outcomes.

## Architecture
- Status 2-axis model:
  - ProcessStatus: `running | exited | crashed`
  - TaskResult: `pending | completed | failed | aborted`
- Agent types centralized in `cli/types/index.ts` (`AGENT_TYPES`, `EXTENDED_AGENTS`, related types).
- Version source of truth unified through dynamic resolve from `package.json`.
- Result storage model updated:
  - `result-{agent}.md` = latest snapshot
  - `result-{agent}.history.md` = audit history
- Child process type wrapper added (`cli/lib/process.ts`) to isolate Bun/Node typing conflicts.

## Config / CLI
- `output_parser` introduced with vendor parser adapter routing.
- `response_jq` backward-compatible shim added (automatic mapping + deprecation warning).
- `cli-config.yaml` hardcoded absolute binary paths removed (PATH-resolved command names).
- `EVIDENCE_PATH` field synchronized in subagent prompt template for verify compatibility.

## Documentation
- `README.md` / `README.ko.md` command lists synchronized with `cli.ts` command registrations.
- `verify --refine` usage documented.
- Dead workflow reference replaced:
  - `verify.sh` -> `oh-my-ag verify`

## Testing
- E2E contract integration suite added: `cli/__tests__/contract-e2e.test.ts` (15 tests)
  - TaskResult status contract
  - EVIDENCE_PATH pattern contract
  - Evidence pack schema keys + status
  - Approvals schema contract
  - Aborted -> verify exit code `3`
  - SSOT status progression (`ok=true/ok=false`)
- Latest validation result: 115/115 passing in current environment.

## Migration Guide
- Config transition:
  - Before: `response_jq: ".response"`
  - After: `output_parser: "gemini"`

Example:

```yaml
vendors:
  gemini:
    command: gemini
    output_parser: "gemini"
```

## Exit Codes (verify / doctor --verify-gate)
- `0`: PASS
- `1`: FAIL
- `2`: Usage/input error
- `3`: Aborted/unverifiable (Loop Guard)

## Deprecations
- `response_jq` -> `output_parser`
- Backward-compat shim remains for one release cycle, then scheduled for removal.

## Known Issues
- Intermittent environment-specific Windows false positives may occur around shell command compatibility (legacy `find.exe` behavior).
