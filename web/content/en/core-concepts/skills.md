---
title: Skills
description: Progressive disclosure and token-optimized skill architecture.
---

# Skills

## Progressive Disclosure

Skills are selected from request intent. Manual skill selection is usually unnecessary.

## Two-Layer Design

- `SKILL.md`: identity, routing, core rules
- `resources/`: execution protocol, examples, checklists, playbooks, snippets

## Shared Resource Layer

`_shared/` centralizes reusable protocols:

- reasoning templates
- clarification protocol
- context budget strategy
- routing references
- verification checklist

## Why It Matters

This keeps initial context lean while still supporting deep execution when required.
