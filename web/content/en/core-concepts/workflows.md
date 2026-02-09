---
title: Workflows
description: Explicit slash-command workflows and when to use them.
---

# Workflows

## Workflow Commands

- `/coordinate`
- `/orchestrate`
- `/plan`
- `/review`
- `/debug`

## Skills vs Workflows

- Skills: auto-activated from request intent
- Workflows: explicit multi-step pipelines triggered by the user

## Typical Multi-Agent Sequence

1. `/plan` for decomposition
2. `/coordinate` for staged execution
3. `agent:spawn` for parallel sub-agents
4. `/review` for QA gate
