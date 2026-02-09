---
title: Commands
description: Complete command surface from cli/cli.ts.
---

# Commands

The command surface below mirrors the current implementation in `cli/cli.ts`.

## Core Commands

```bash
oh-my-ag                         # interactive installer
oh-my-ag dashboard               # terminal dashboard
oh-my-ag dashboard:web           # web dashboard (:9847)
oh-my-ag usage                   # usage quotas
oh-my-ag update                  # update skills from registry
oh-my-ag doctor                  # environment/skill diagnostics
oh-my-ag stats                   # productivity metrics
oh-my-ag retro                   # retrospective report
oh-my-ag cleanup                 # cleanup orphan resources
oh-my-ag bridge [url]            # MCP stdio -> streamable HTTP
```

## Agent Commands

```bash
oh-my-ag agent:spawn <agent-id> <prompt> <session-id>
oh-my-ag agent:status <session-id> [agent-ids...]
```

## Memory and Verification

```bash
oh-my-ag memory:init
oh-my-ag verify <agent-type>
```
