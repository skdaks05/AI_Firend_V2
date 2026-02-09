---
title: Use Case: Dashboard Monitoring
description: Observe orchestrator runs from terminal or web dashboard.
---

# Use Case: Dashboard Monitoring

## Start Dashboards

```bash
bunx oh-my-ag dashboard
bunx oh-my-ag dashboard:web
```

## What to Monitor

- session state
- task board updates
- activity from progress/result files

## Data Source

Dashboards watch `.serena/memories/` and refresh from changed files only.

## Operational Tip

Run dashboard and agent spawning in separate terminals.
