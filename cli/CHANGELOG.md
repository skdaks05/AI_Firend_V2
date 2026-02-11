# Changelog

## [1.16.0](https://github.com/skdaks05/AI_Firend_V2/compare/cli-v1.15.0...cli-v1.16.0) (2026-02-11)


### Features

* **cli:** finalize contract-drift remediation and regression tests ([db0e094](https://github.com/skdaks05/AI_Firend_V2/commit/db0e0941e89b43b0bf144d6da27d67ce5fc793dd))
* evidence init command with proof (TICKET-3) ([d64b1a4](https://github.com/skdaks05/AI_Firend_V2/commit/d64b1a4d0668dbdd933e9a4f5f5c0eaa0a829f5c))
* split cli/web workspaces and docs release flow ([5609032](https://github.com/skdaks05/AI_Firend_V2/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
* **ticket-6:** add doctor verify-gate and HITL regression tests ([20811a9](https://github.com/skdaks05/AI_Firend_V2/commit/20811a9a83aad29e44e69d3718deea0c95eba7f1))
* **ticket-7:** add spec-to-tech contract command and tests ([5f38589](https://github.com/skdaks05/AI_Firend_V2/commit/5f38589fc6aaa5336be23dd2253de247ff49d7b4))
* **ticket-8:** harden spec-to-tech with template SSOT and dry-run gate ([cbb483e](https://github.com/skdaks05/AI_Firend_V2/commit/cbb483e06ffae3b6f548314cabbfd2841d0e6629))
* **verify,cleanup:** HITL approvals gate (TICKET-4) ([e3c5cf9](https://github.com/skdaks05/AI_Firend_V2/commit/e3c5cf9d66652f033633fdf59ee004af3b086286))
* **verify:** add Evidence Pack gate to verify command ([23c30b3](https://github.com/skdaks05/AI_Firend_V2/commit/23c30b3fd2315e73d1df6d430920e8deda6ed40d))


### Bug Fixes

* **cli:** align evidence:init workspace and verify remediation hint ([ca093b9](https://github.com/skdaks05/AI_Firend_V2/commit/ca093b95ed0a9b083a8d61b9b9cccba941c7a217))
* **cli:** clean listener lifecycle and harden evidence-path result handling ([92feef8](https://github.com/skdaks05/AI_Firend_V2/commit/92feef8c718727cdeb7551c6d71e7d742d04adf9))
* **cli:** stabilize spawn root resolution and verify on windows ([633d25e](https://github.com/skdaks05/AI_Firend_V2/commit/633d25e91db059045afd3eaaa1b487f710bfd5ed))
* **evidence-init:** align skeleton with 9-key verify schema ([3b473c3](https://github.com/skdaks05/AI_Firend_V2/commit/3b473c343f1e62cbd22a795f9778142b0e6efd04))
* **ticket-4:** enforce cleanup evidence-path and approvals risk-level validation ([5b1983c](https://github.com/skdaks05/AI_Firend_V2/commit/5b1983c9a615b3da850caaed052d01d125e5661e))
* **verify:** enforce GOALS evidence schema keys (inputs/decisions/tests) ([3796b92](https://github.com/skdaks05/AI_Firend_V2/commit/3796b92b112adf121e21ccfe2b78a05b18b4bc58))


### Documentation

* **release:** add v1.16.0 release notes and changelog ([6f6d99a](https://github.com/skdaks05/AI_Firend_V2/commit/6f6d99a1d7e0423d6d06e8ed623dc2062668188a))


### Miscellaneous

* **main:** release cli 1.15.0 ([5deacf7](https://github.com/skdaks05/AI_Firend_V2/commit/5deacf780afe674d37f8f8064cbf4b16c9a1477e))
* **main:** release cli 1.15.0 ([1f23594](https://github.com/skdaks05/AI_Firend_V2/commit/1f23594723e81caf084ef2ae14ed6b41febb1c53))
* **release:** bump cli version to 1.16.0 ([0cccee4](https://github.com/skdaks05/AI_Firend_V2/commit/0cccee4b2df76052782dc3687a1967f3b05509ba))

## [1.16.2](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.16.1...cli-v1.16.2) (2026-02-11)

### Fixes

* prevent listener accumulation in `bridge` and `agent:spawn` signal handling
* add regression test for nested CWD root/config/result resolution
* add result post-processing policy to preserve `EVIDENCE_PATH` from prompt when missing in vendor output

## [1.16.1](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.16.0...cli-v1.16.1) (2026-02-11)

### Fixes

* fix `agent:spawn` project-root resolution when invoked from nested CWD (`--cwd cli`)
* unify result/history/checkStatus paths to repository root `.serena/memories`
* prevent log file descriptor leak in spawn path via `try/finally` close
* fix `verify` Python syntax check for Windows (`where` + PowerShell file discovery)
* remove temporary debug logs from release code paths

## [1.16.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.15.0...cli-v1.16.0) (2026-02-11)


### Features

* finalize contract drift remediation across orchestrator, verify, and guard flows
* add Loop Guard aborted handling and verify refine workflow
* add E2E contract integration tests (15 cases)


## [1.15.0](https://github.com/first-fluke/oh-my-ag/compare/cli-v1.14.1...cli-v1.15.0) (2026-02-09)


### Features

* split cli/web workspaces and docs release flow ([5609032](https://github.com/first-fluke/oh-my-ag/commit/5609032bf657e4e4d71e0acaa2e319effcdf8a35))
