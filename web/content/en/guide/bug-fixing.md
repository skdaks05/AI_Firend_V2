---
title: Use Case: Bug Fixing
description: Structured reproduce-diagnose-fix-regress loop.
---

# Use Case: Bug Fixing

## Trigger Example

```text
Login button throws TypeError after token refresh.
```

## Execution Loop

1. Reproduce exactly
2. Isolate root cause
3. Implement targeted fix
4. Add regression test
5. Re-check adjacent paths

## QA Escalation Signals

Escalate to QA when the bug touches:

- auth/session behavior
- data integrity
- performance/accessibility
- security-sensitive handling
