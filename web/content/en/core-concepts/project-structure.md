---
title: Project Structure
description: Updated repository tree after splitting CLI and web docs workspaces.
---

# Project Structure

Updated directory tree for the current monorepo layout (`cli` + `web` workspaces).

## Top-Level Tree

```text
.
├── .agent/
│   ├── config/
│   │   └── user-preferences.yaml
│   ├── workflows/
│   │   ├── coordinate.md
│   │   ├── orchestrate.md
│   │   ├── plan.md
│   │   ├── review.md
│   │   ├── debug.md
│   │   ├── setup.md
│   │   └── tools.md
│   └── skills/
│       ├── _shared/
│       ├── workflow-guide/
│       ├── pm-agent/
│       ├── frontend-agent/
│       ├── backend-agent/
│       ├── mobile-agent/
│       ├── qa-agent/
│       ├── debug-agent/
│       ├── orchestrator/
│       └── commit/
├── .github/
│   └── workflows/
│       ├── release-please.yml
│       └── docs-deploy.yml
├── .serena/
│   └── memories/
├── cli/
│   ├── bin/
│   │   └── cli.js
│   ├── package.json
│   ├── cli.ts
│   ├── commands/
│   ├── lib/
│   ├── types/
│   ├── __tests__/
│   ├── dashboard.ts
│   ├── terminal-dashboard.ts
│   └── generate-manifest.ts
├── web/
│   ├── content/
│   │   ├── en/
│   │   │   ├── getting-started/
│   │   │   ├── core-concepts/
│   │   │   ├── guide/
│   │   │   └── cli-interfaces/
│   │   └── ko/
│   │       ├── getting-started/
│   │       ├── core-concepts/
│   │       ├── guide/
│   │       └── cli-interfaces/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   └── lib/
│   ├── package.json
│   └── next.config.ts
├── docs/
│   ├── consumer-templates/
│   └── demo/
├── package.json
├── bun.lock
├── README.md
└── README.ko.md
```

## Key Notes

- CLI source moved from `src/` to `cli/`.
- Documentation pages are now maintained under `web/content/{lang}/{group}/*.md`.
- Root `docs/` is now reserved for templates and demos used by consumers.
