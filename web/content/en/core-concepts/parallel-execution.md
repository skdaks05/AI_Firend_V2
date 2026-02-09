---
title: Parallel Execution
description: CLI orchestration patterns for running multiple agents concurrently.
---

# Parallel Execution

## Basic Pattern

```bash
oh-my-ag agent:spawn backend "Implement auth API" session-01 &
oh-my-ag agent:spawn frontend "Create login form" session-01 &
wait
```

## Workspace-Aware Pattern

```bash
oh-my-ag agent:spawn backend "Auth + DB migration" session-02 -w ./apps/api
oh-my-ag agent:spawn frontend "Login + token refresh" session-02 -w ./apps/web
```

## Monitoring Pattern

```bash
bunx oh-my-ag dashboard:web
# open http://localhost:9847
```

## CLI Vendor Resolution Priority

1. `--vendor`
2. `agent_cli_mapping`
3. `default_cli`
4. `active_vendor` (legacy)
5. `gemini` fallback
