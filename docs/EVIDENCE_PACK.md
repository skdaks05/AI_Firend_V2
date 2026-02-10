# Evidence Pack 규격 (oh-my-ag Overlay)

> 본 문서는 GOALS.md(v2.1) 계약 3(Evidence Pack Required)의 **프로젝트 운영 문서**입니다.
> 충돌 시 `docs/GOALS.md`가 최우선입니다.

## 1. Primary Evidence Pack 위치 (단일 강제)

```
.serena/evidence/<run_id>/<task_id>/
```

- `run_id`: 세션/실행 식별자 (예: `20260210-1030-auth-fix`)
- `task_id`: 태스크 식별자 (예: `T-001`)
- 이 경로가 **유일한 Primary 위치**이다.

## 2. 필수 파일 (3파일)

각 `<task_id>/` 디렉토리에 아래 3파일이 **모두 존재**해야 Evidence로 인정된다:

| # | 파일명 | 용도 |
|---|--------|------|
| 1 | `evidence_pack.yaml` | 메타/가정/입력/산출물/승인 정보 |
| 2 | `verification_report.md` | Verifier의 PASS/FAIL 채점표 |
| 3 | `execution_log.txt` | 실행 명령/출력/환경 기록 (`.json`도 허용) |

## 3. evidence_pack.yaml 최소 스키마

```yaml
run_id: "20260210-1030-auth-fix"
task_id: "T-001"
timestamp_kst: "2026-02-10T10:30:00+09:00"

artifacts:
  paths:
    - "src/auth.ts"
    - "src/auth.test.ts"
  diff_summary: "Added JWT auth module"

inputs:
  source_refs:
    - "GOALS.md v2.1 §4"
  file_hashes:
    - "src/auth.ts: abc123"
  config_versions:
    - "tsconfig: 5.0"

assumptions:
  - "Node.js 20+ runtime available"
  # 빈 배열도 허용하지만, 키 자체가 없으면 FAIL (GOALS 계약5)

decisions:
  - "JWT over session-based auth for stateless scaling"

tests:
  - "vitest run --reporter=verbose"

approvals:
  hitl_required: false
  hitl_decision_ref: null  # hitl_required=true면 필수
```

### 필수 키 (누락 시 FAIL)

- `run_id`
- `task_id`
- `timestamp_kst`
- `artifacts` (내부에 `paths` 필수)
- `inputs` (객체, 내부에 `source_refs`, `file_hashes`, `config_versions` 필수)
- `assumptions` (빈 배열 허용, 키 누락 불가)
- `decisions` (배열, 빈 배열 허용, 키 누락 불가)
- `tests` (배열, 빈 배열 허용, 키 누락 불가)
- `approvals`
  - `hitl_required` (bool, 필수)
  - `hitl_decision_ref` (`hitl_required=true`일 때 필수, 없으면 FAIL)

## 4. result-{agent}.md에 EVIDENCE_PATH 기록 규칙

에이전트가 작업 완료 시 `result-{agent}.md`에 아래 라인을 포함해야 한다:

```
EVIDENCE_PATH: .serena/evidence/<run_id>/<task_id>/
```

- 한 줄로 작성
- 값은 workspace 기준 상대 경로
- 이 라인이 없으면 `oh-my-ag verify`에서 **FAIL** 처리됨

### 예시

```markdown
# Result: backend
## Task: T-001
## Status: completed
EVIDENCE_PATH: .serena/evidence/20260210-1030-auth-fix/T-001/

## Summary
Implemented JWT authentication API...
```

## 5. Export (OPTIONAL)

- CI/공유/장기보관 목적일 때 `outputs/evidence/<run_id>/<task_id>/`로 복사할 수 있다.
- Export를 사용하지 않았다는 이유로 **FAIL 처리하지 않는다**.
- 이는 GOALS.md v2.1 계약 3의 "Export는 선택(OPTIONAL)" 원칙에 따른다.

## 6. 검증 흐름 (oh-my-ag verify)

```
oh-my-ag verify <agent-type> --workspace <path>
```

1. `result-{agent}.md`에서 `EVIDENCE_PATH:` 추출
2. 경로 형식 검증 (`.serena/evidence/<run_id>/<task_id>/`)
3. 3파일 존재 확인 (`evidence_pack.yaml`, `verification_report.md`, `execution_log.txt`)
4. `evidence_pack.yaml` 파싱 + 필수 키 9개 검증
5. `artifacts.paths` 배열 존재 확인
6. `inputs` 객체 구조 검증 (`source_refs`, `file_hashes`, `config_versions`)
7. `decisions` 배열 타입 확인
8. `tests` 배열 타입 확인
9. `approvals.hitl_required=true` → `hitl_decision_ref` 존재 확인
10. 위 중 하나라도 실패 → **FAIL (exit 1)**

### approvals.json 방침

- `evidence:init`이 `approvals.json`을 함께 생성하지만, **verify에서 approvals.json 존재 여부는 검증하지 않는다**.
- `evidence_pack.yaml` 내부의 `approvals` 키만 검증 대상이다.
- HITL 의미론적 검증(상태 머신)은 TICKET-4 HITL 단계에서 별도 구현 예정이다.
