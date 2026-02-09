---
title: Use Case: Dashboard Monitoring
description: Operate orchestrator sessions with terminal/web dashboards and actionable runbook signals.
---

# Use Case: Dashboard Monitoring

## Start commands

```bash
bunx oh-my-ag dashboard
bunx oh-my-ag dashboard:web
```

Web dashboard default URL: `http://localhost:9847`

## Recommended terminal layout

Use at least 3 terminals:

1. terminal dashboard (`oh-my-ag dashboard`)
2. agent spawn commands
3. test/build logs

Keep the web dashboard open for shared visibility during team sessions.

## What the dashboards watch

Data source: `.serena/memories/`

Primary signals:

- session status (`running`, `completed`, `failed`)
- task board assignment and state changes
- per-agent progress turns
- result publication events

Updates are event-driven from changed files; no full directory polling loop is required.

## Runbook: signal → action

- `No agents detected`
  - verify agents were spawned with the same `session-id`
  - confirm `.serena/memories/` is being written
- `Session stuck in running`
  - inspect latest `progress-*` file timestamps
  - restart failed or blocked agent with clearer prompt
- `Frequent reconnects (web)`
  - check local firewall/proxy
  - restart `dashboard:web` and re-open the page
- `Missing activity while agents are active`
  - verify orchestrator writes are not redirected to another workspace

## Pre-merge monitoring checklist

- all required agents reached completed state
- no unresolved high-severity QA findings
- latest result files are present for each agent
- integration tests executed after final agent outputs

## Done criteria

Monitoring phase is done when:

- session reached terminal state (`completed` or intentionally stopped)
- activity history explains final output provenance
- release/merge decision is made with full status visibility
