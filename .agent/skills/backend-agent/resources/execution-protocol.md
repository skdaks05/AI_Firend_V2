# Backend Agent - Execution Protocol

## Step 0: Assess Difficulty
See `../_shared/difficulty-guide.md` for criteria.
- **Simple** (single file, clear requirement): Skip to Step 3
- **Medium** (2-3 files, some design): Follow all 4 steps briefly
- **Complex** (4+ files, architecture decisions): Follow all steps + checkpoints at Step 2.5 and 3.5

Follow these steps in order (adjust depth by difficulty).

## Step 1: Analyze
- Read the task requirements carefully
- Identify which endpoints, models, and services are needed
- Check existing code with Serena: `get_symbols_overview("app/api")`, `find_symbol("existing_function")`
- List assumptions; ask if unclear

## Step 2: Plan
- Decide on file structure: models, schemas, routes, services
- Define API contracts (method, path, request/response types)
- Plan database schema changes (tables, columns, indexes, migrations)
- Identify security requirements (auth, validation, rate limiting)

## Step 3: Implement
- Create/modify files in this order:
  1. Database models + migrations
  2. Pydantic schemas (request/response)
  3. Service layer (business logic)
  4. API routes (thin, delegate to services)
  5. Tests (unit + integration)
- Use `resources/api-template.py` as reference
- Follow clean architecture: router -> service -> repository -> models

## Step 4: Verify
- Run `resources/checklist.md` items
- Run `../_shared/common-checklist.md` items
- Ensure all tests pass
- Confirm OpenAPI docs are complete

## On Error
See `resources/error-playbook.md` for recovery steps.
