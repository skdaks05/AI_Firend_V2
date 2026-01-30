# Conventional Commits Guide

## Overview

Conventional Commits는 커밋 메시지에 일관된 규칙을 적용하여:
- 자동화된 CHANGELOG 생성
- Semantic Versioning 자동화
- 팀원 간 커밋 히스토리 이해도 향상

## Commit Message Structure

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

## Types

### Primary Types

| Type | Description | SemVer | Example |
|------|-------------|--------|---------|
| `feat` | 새로운 기능 추가 | MINOR | `feat: add user authentication` |
| `fix` | 버그 수정 | PATCH | `fix: resolve login timeout issue` |

### Secondary Types

| Type | Description | SemVer | Example |
|------|-------------|--------|---------|
| `docs` | 문서 변경 | - | `docs: update API documentation` |
| `style` | 코드 스타일 변경 (포맷팅, 세미콜론 등) | - | `style: fix indentation` |
| `refactor` | 기능 변경 없는 코드 개선 | - | `refactor: extract helper function` |
| `perf` | 성능 개선 | PATCH | `perf: optimize database queries` |
| `test` | 테스트 추가/수정 | - | `test: add unit tests for auth` |
| `chore` | 빌드, 설정, 패키지 관련 | - | `chore: update dependencies` |

## Scope

Scope는 변경된 코드의 영역을 나타냅니다:

```
feat(auth): add OAuth2 support
fix(api): handle null response
refactor(ui): simplify button component
```

### Common Scopes
- `auth` - 인증/인가
- `api` - API 엔드포인트
- `ui` - 사용자 인터페이스
- `db` - 데이터베이스
- `config` - 설정
- `deps` - 의존성

## Description

- **명령형** 사용: "add", "fix", "update" (NOT "added", "fixed", "updates")
- **첫 글자 소문자**
- **마침표 없음**
- **72자 이내**

### Good Examples
```
feat(auth): add JWT token refresh mechanism
fix(api): handle empty response from payment gateway
refactor(ui): extract common button styles
```

### Bad Examples
```
feat(auth): Added JWT token refresh mechanism.  # 과거형, 마침표
fix: fix bug  # 설명 부족
Update the authentication system to support OAuth2 tokens and refresh mechanism  # 너무 김
```

## Body

Body는 선택사항이지만, 복잡한 변경사항에 유용합니다:

```
feat(auth): add multi-factor authentication

Implement TOTP-based two-factor authentication:
- Add QR code generation for authenticator apps
- Store encrypted TOTP secrets in database
- Add backup codes for account recovery

Closes #123
```

## Breaking Changes

Breaking change는 `!` 또는 footer로 표시:

```
feat(api)!: change response format for user endpoint

BREAKING CHANGE: The user endpoint now returns a nested object
instead of a flat structure. Update client code accordingly.
```

## Footer

### Issue References
```
feat(auth): add password reset flow

Closes #456
Refs #123, #789
```

### Co-Authors
```
feat(ui): redesign dashboard

Co-Authored-By: Jane Doe <jane@example.com>
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

## Branch Naming Convention

| Type | Branch Prefix | Example |
|------|---------------|---------|
| feat | `feature/` | `feature/user-auth` |
| fix | `fix/` | `fix/login-timeout` |
| refactor | `refactor/` | `refactor/api-cleanup` |
| docs | `docs/` | `docs/api-guide` |
| hotfix | `hotfix/` | `hotfix/security-patch` |

## Commit Workflow

1. **Stage specific files** (NOT `git add .`):
   ```bash
   git add src/auth/login.ts
   git add tests/auth/login.test.ts
   ```

2. **Write commit message**:
   ```bash
   git commit -m "$(cat <<'EOF'
   feat(auth): add login rate limiting

   - Limit failed attempts to 5 per minute
   - Add exponential backoff for repeated failures
   - Log suspicious activity

   Closes #234

   Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
   EOF
   )"
   ```

3. **Verify**:
   ```bash
   git log -1 --format=full
   ```

## Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Angular Commit Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#commit)
