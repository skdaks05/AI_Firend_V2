---
title: Use Case: Single Skill
description: Fast path for focused, single-domain work with clear scope and quick feedback loops.
---

# Use Case: Single Skill

## When to use this path

Use this when the output is narrowly scoped and mostly owned by one domain:

- one UI component
- one API endpoint
- one bug in one layer
- one refactor in one module

If the task requires cross-domain coordination (API contract + UI + QA), use [`Multi-Agent Project`](./multi-agent-project.md).

## Preflight checklist

Before prompting, define:

1. exact output (file or behavior)
2. target stack and versions
3. acceptance criteria
4. test expectations

## Prompt template

```text
Build <specific artifact> using <stack>.
Constraints: <style/perf/security constraints>.
Acceptance criteria:
1) ...
2) ...
Add tests for: <critical cases>.
```

## Example prompt

```text
Create a login form component in React + TypeScript + Tailwind CSS.
Constraints: accessible labels, client-side validation, no external form library.
Acceptance criteria:
1) email and password validation messages
2) disabled submit while invalid
3) keyboard and screen-reader friendly
Add unit tests for valid/invalid submit paths.
```

## Expected execution flow

1. The relevant skill is auto-selected.
2. The agent proposes implementation and assumptions.
3. You confirm or adjust assumptions.
4. The agent ships code and tests.
5. You run local verification and request small follow-ups.

## Quality gate before merge

- behavior matches acceptance criteria
- tests cover happy path and core edge cases
- no unrelated file changes
- no hidden breaking changes to shared modules

## Escalation signals

Switch to multi-agent flow when:

- UI work requires new API contracts
- one fix creates cascading changes across layers
- scope grows beyond one domain after first iteration

## Done criteria

Single-skill execution is done when:

- target artifact is implemented
- acceptance criteria are demonstrably satisfied
- tests are added or updated for the changed behavior
