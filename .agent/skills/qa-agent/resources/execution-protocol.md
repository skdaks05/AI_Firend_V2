# QA Agent - Execution Protocol

## Step 0: Assess Difficulty
See `../_shared/difficulty-guide.md` for criteria.
- **Simple** (single file review): Quick security + quality check
- **Medium** (feature review, 5-10 files): Full 4-step protocol
- **Complex** (full audit, 10+ files): Full protocol + prioritized scope (see error-playbook)

Follow these steps in order (adjust depth by difficulty).

## Step 1: Scope
- Identify what to review: new feature, full audit, or specific concern
- List all files/modules to inspect
- Determine review depth: quick check vs. comprehensive audit
- Use Serena to map the codebase:
  - `get_symbols_overview("src/")`: Understand structure
  - `search_for_pattern("password.*=.*[\"']")`: Find hardcoded secrets
  - `search_for_pattern("execute.*\\$\\{")`: Find SQL injection
  - `search_for_pattern("innerHTML")`: Find XSS vulnerabilities

## Step 2: Audit
Review in this priority order:
1. **Security** (CRITICAL): OWASP Top 10, auth, injection, data protection
2. **Performance**: API latency, N+1 queries, bundle size, Core Web Vitals
3. **Accessibility**: WCAG 2.1 AA, keyboard nav, screen reader, contrast
4. **Code Quality**: test coverage, complexity, architecture adherence

Use `resources/checklist.md` (renamed qa-checklist) as the comprehensive review guide.

## Step 3: Report
Generate structured report with:
- Overall status: PASS / WARNING / FAIL
- Findings grouped by severity (CRITICAL > HIGH > MEDIUM > LOW)
- Each finding: file:line, description, remediation code
- Performance metrics vs. targets

## Step 4: Verify
- Run `resources/self-check.md` to verify your own review quality
- Ensure no false positives (each finding is real and reproducible)
- Confirm remediation suggestions are correct and complete
- Run `../_shared/common-checklist.md` for general quality

## On Error
See `resources/error-playbook.md` for recovery steps.
