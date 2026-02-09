---
title: Use Case: Multi-Agent Project
description: End-to-end flow for complex cross-domain delivery with explicit coordination gates.
---

# Use Case: Multi-Agent Project

## When to use this path

Use this when a feature spans multiple domains (for example backend + frontend + QA) and parallel execution is beneficial.

## Coordination model

Recommended sequence:

1. `/plan` for decomposition and dependency mapping
2. `/coordinate` for execution order and ownership
3. parallel `agent:spawn` per domain
4. `/review` for QA/security/perf gate

## Session and workspace strategy

Use one session ID per feature stream:

```text
session-auth-v2
```

Assign isolated workspaces per domain to reduce merge conflicts:

- backend: `./apps/api`
- frontend: `./apps/web`
- mobile: `./apps/mobile`

## Spawn example

```bash
oh-my-ag agent:spawn backend "Implement JWT auth API + refresh flow" session-auth-v2 -w ./apps/api
oh-my-ag agent:spawn frontend "Build login + refresh UX with error states" session-auth-v2 -w ./apps/web
oh-my-ag agent:spawn qa "Review auth risks, test matrix, and regression scope" session-auth-v2
```

## Contract-first rule

Before parallel coding, lock shared contracts:

- request/response schemas
- error codes and messages
- auth/session lifecycle assumptions

If contracts change mid-run, pause downstream agents and reissue prompts with the updated contract.

## Merge gates

Do not merge unless all gates pass:

1. domain-level tests pass
2. integration points match agreed contracts
3. QA high/critical issues resolved or explicitly waived
4. changelog or release notes updated when externally visible behavior changes

## Operational anti-patterns

Avoid:

- sharing one workspace across all agents
- changing contracts without notifying other agents
- merging backend/frontend independently before compatibility check

## Done criteria

Multi-agent execution is done when:

- planned tasks are complete across all domains
- cross-domain integration is validated
- QA sign-off (or documented risk acceptance) is recorded
