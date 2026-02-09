---
title: Use Case: Multi-Agent Project
description: End-to-end flow for complex cross-domain delivery.
---

# Use Case: Multi-Agent Project

## Scenario

A feature spans backend, frontend, and QA.

## Recommended Sequence

1. `/plan`
2. `/coordinate`
3. Parallel `agent:spawn`
4. `/review`

## Example

```bash
oh-my-ag agent:spawn backend "Implement JWT auth API" session-app-01 -w ./apps/api
oh-my-ag agent:spawn frontend "Build auth UI flow" session-app-01 -w ./apps/web
oh-my-ag agent:spawn qa "Review auth risks" session-app-01
```

## Coordination Rules

- Use one session ID per feature stream
- Isolate domains by workspace
- Merge only after QA findings are addressed
