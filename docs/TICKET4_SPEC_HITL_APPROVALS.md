# TICKET-4 SPEC — HITL Approvals 의미 강제 (Stage 4)

**doc_id**: ticket4_spec_hitl_approvals_v1.0  
**status**: Draft for Implementation  
**created**: 2026-02-10  

---

## 1) 목적

TICKET-3까지로 Evidence Pack은 **자동 생성(init)**되고, TICKET-2의 `verify`는 Evidence Pack의 **형식/존재/최소키**를 검증할 수 있게 되었습니다.  
Stage 4(TICKET-4)의 목적은 Approvals를 **“파일이 있다”에서 “승인 의미가 강제된다”**로 격상시키는 것입니다.

- 위험 작업(삭제/DB write/릴리즈 등)은 approvals가 **APPROVED가 아니면 실행/적용(apply) 불가**
- `verify`의 Approvals 단계가 **상태 의미(PENDING/APPROVED/REJECTED/CANCELLED)**까지 검증
- 이로써 “완료(Complete)”의 정의가 사람/에이전트 해석이 아니라 **게이트**로 고정

---

## 2) 범위

### 2.1 In-Scope
1) `approvals.json` 상태 모델/스키마 확정
2) `verify` Approvals 단계 의미 검증(상태 값/필드 일관성)
3) 위험 작업(Risky Action) 정의 + 위험 작업 실행 전 approvals guard
4) DoD 재현 증빙(PROOF) 작성

### 2.2 Out-of-Scope
- `doctor.ts`에 `verify`를 강제 연결하는 작업(= Stage 5)
- UI/웹 기반 승인 화면(후속)
- 외부 알림(슬랙/이메일) 연동(후속)

### 2.3 Non-touch (이번 티켓 변경 금지)
- `GOALS.md` / `Goal.md`
- `AGENT_GUIDE.md`
- `mcp_config.json`
- `.serena/memories` 기존 구조

---

## 3) 설계

## 3.1 approvals.json 상태 모델(정규화)
`approvals.json.status`는 아래 중 하나여야 합니다.

- `PENDING` : 승인 요청은 존재하나 아직 결정 없음 → 위험 작업 **BLOCK**
- `APPROVED` : 승인 완료 → 위험 작업 **ALLOW**
- `REJECTED` : 거절 → 위험 작업 **BLOCK**
- `CANCELLED` : 요청 취소 → 위험 작업 **BLOCK**

> Stage 4의 핵심은 “존재”가 아니라 “승인 상태의 의미”로 실행을 통제하는 것입니다.

## 3.2 approvals.json 최소 스키마(필수 키)
아래 키는 반드시 존재해야 하며, 누락 시 `verify` Approvals는 **FAIL**(exit 1)합니다.

```json
{
  "schema_version": "1",
  "run_id": "RUN_...",
  "task_id": "TICKET-4",
  "status": "PENDING|APPROVED|REJECTED|CANCELLED",
  "requested_by": "Owner|Codex|Claude|...",
  "requested_at": "2026-02-10T14:05:00+09:00",
  "decision": {
    "by": "string|null",
    "at": "ISO-8601|null",
    "reason": "string|null"
  },
  "scope": {
    "risk_level": "LOW|MEDIUM|HIGH",
    "actions": ["string"],
    "targets": ["string"]
  }
}
```

**필드 일관성 규칙**
- `status=PENDING`이면 `decision.by/at/reason`은 `null` 허용
- `status=APPROVED|REJECTED|CANCELLED`이면 `decision.by`와 `decision.at`는 **필수**
- `scope.actions/targets`는 빈 배열 금지(최소 1개)

## 3.3 위험 작업(Risky Action) 정의(최소 룰)
“확실한 위험”부터 시작합니다(과도한 확장 금지).

- 삭제/정리 계열: `git clean -fd`, 대량 파일 삭제/이동
- DB write/migration/삭제 (프로젝트에 해당 경로/명령이 있다면)
- 릴리즈/배포/태그/버전 업데이트
- 헌법/규율 영역 변경(Goal/GOALS/AGENT_GUIDE/ADR, .agent/rules/workflows) 시도

## 3.4 Gate 동작 정책

### 3.4.1 verify Approvals 의미 검증
- `approvals.json`이 존재하고 스키마/일관성을 만족해야 함
- **권장 정책(단순/강제):** `status != APPROVED`이면 Approvals 단계 FAIL + **exit 1**
  - 이렇게 하면 “승인 없으면 완료 불가”가 `verify` 한 번으로 고정됨

### 3.4.2 위험 작업 apply 전 Guard
- 위험 작업 실행 경로에 approvals 검사 삽입
- approvals가 `APPROVED`가 아니면:
  - **exit 1**
  - 어떤 approvals 파일이 필요하고, 어떤 상태로 만들어야 하는지 안내 메시지 출력

---

## 4) 진행 방법

### 4.1 구현 순서(권장)
1) 문서/템플릿: approvals.json 스키마/예시 확정
2) `verify`의 Approvals 단계 강화(스키마 + 의미)
3) “위험 작업 판별” 함수 추가(최소 룰)
4) 위험 작업 실행 전 approvals guard 연결(최소 침습)

### 4.2 Evidence/Proof
- 아래 DoD의 모든 커맨드/exit code/핵심 출력 요약을 PROOF에 기록

---

## 5) 산출물

- (수정) `verify` 관련 파일(Approvals 의미 검증 추가)
- (추가 권장) `docs/EVIDENCE_APPROVALS.md` : approvals 상태 모델/스키마/예시
- (추가) `docs/_canon/PROOF_TICKET4_HITL_APPROVALS.txt` : DoD 재현 증빙

> 파일 위치는 oh_my_ag 트리에 맞추되, **최소 변경** 원칙을 지킵니다.

---

## 6) DoD (Definition of Done)

### DoD-1: PENDING이면 BLOCK
- `approvals.json.status=PENDING`에서:
  - `verify` Approvals 단계 FAIL (exit 1)
  - 위험 작업 실행 시 BLOCK (exit 1)

### DoD-2: APPROVED면 ALLOW
- `status=APPROVED`에서:
  - `verify` Approvals PASS (exit 0)
  - 동일 위험 작업이 ALLOW (exit 0)

### DoD-3: REJECTED/CANCELLED는 명시적 BLOCK
- `status=REJECTED` 또는 `CANCELLED`에서:
  - `verify` FAIL (exit 1)
  - 위험 작업 BLOCK (exit 1)
  - 출력이 거절/취소를 구분

### DoD-4: 스코프/미접촉 준수
- `git diff --name-only --cached`에 TICKET-4 관련 파일만
- Non-touch 목록 변경 0

### DoD-5: PROOF 작성
- `docs/_canon/PROOF_TICKET4_HITL_APPROVALS.txt`에 DoD-1~4 재현 기록

---

## 7) Claude 지시문 (설계 확정)

**[CLAUDE / TICKET-4]**
1) approvals.json 상태 모델/스키마/일관성 규칙을 확정하라.
2) 위험 작업 정의를 “최소 룰”로 제한하라.
3) verify 정책을 확정하라: `status != APPROVED`이면 exit 1(권장).
4) 결과물: `docs/TICKET4_SPEC_HITL_APPROVALS.md` 1개로 제출하라.
5) Non-touch: GOALS.md, AGENT_GUIDE.md, doctor.ts, mcp_config.json 유지.

---

## 8) Codex 지시문 (구현 + DoD 재현)

**[CODEX / TICKET-4]**
1) 최소 변경으로 `verify` Approvals 단계에 “의미 검증”을 추가하라.
2) approvals.json 예시/템플릿과 4가지 상태(PENDING/APPROVED/REJECTED/CANCELLED)를 재현하라.
3) 위험 작업 guard는 “확실한 위험”만 우선 커버하라(삭제/DB write/릴리즈 중 최소 1개).
4) DoD-1~5를 PowerShell로 재현하고 `docs/_canon/PROOF_TICKET4_HITL_APPROVALS.txt`를 작성하라.
5) 최종 제출 시 `git status --porcelain`과 `git diff --name-only --cached`로 스코프 증빙을 포함하라.
6) Non-touch 유지: GOALS.md/AGENT_GUIDE.md/doctor.ts/mcp_config.json.
