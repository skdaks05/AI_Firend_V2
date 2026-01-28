# PM Agent - Execution Protocol

## Step 0: Assess Difficulty
See `../_shared/difficulty-guide.md` for criteria.
- **Simple** (single feature, clear scope): Lightweight plan, 3-5 tasks max
- **Medium** (multi-domain feature): Full 4-step protocol
- **Complex** (full app, many domains): Full protocol + API contracts in `../_shared/api-contracts/`

Follow these steps in order (adjust depth by difficulty).

## Step 1: Analyze Requirements
- Parse user request into concrete requirements
- Identify explicit and implicit features
- List edge cases and assumptions
- Ask clarifying questions if ambiguous
- Use Serena (if existing codebase): `get_symbols_overview` to understand current architecture

## Step 2: Design Architecture
- Select tech stack (frontend, backend, mobile, database, infra)
- Define API contracts (method, path, request/response schema)
- Design data models (tables, relationships, indexes)
- Identify security requirements (auth, validation, encryption)
- Plan infrastructure (hosting, caching, CDN, monitoring)

## Step 3: Decompose Tasks
- Break into tasks completable by a single agent
- Each task has: agent, title, description, acceptance criteria, priority, dependencies
- Minimize dependencies for maximum parallel execution
- Priority tiers: 1 = independent (run first), 2 = depends on tier 1, etc.
- Complexity: Low / Medium / High / Very High
- Save to `.agent/plan.json` and `.gemini/antigravity/brain/current-plan.md`

## Step 4: Validate Plan
- Check: Can each task be done independently given its dependencies?
- Check: Are acceptance criteria measurable and testable?
- Check: Is security considered from the start (not deferred)?
- Check: Are API contracts defined before frontend/mobile tasks?
- Output task-board.md format for orchestrator compatibility

## On Error
See `resources/error-playbook.md` for recovery steps.
