# GOALS.md — AI_friend (Constitution/Brain) × Antigravity IDE (Stage/Workroom) × Orchestration (Implementation-agnostic)

doc_id: goals_aifriend_v2_1_master_lockin
status: LOCK-IN (v2.1)
owner: Sungmin Oh
updated: 2026-02-10 (KST)

---

## 0. 확정 Goal (변경 금지)

Goal:
“Google Antigravity IDE 환경에서 오케스트레이션을 통해,
다중 모델이 장시간 작업을 수행하되 컨텍스트 오염 없이,
상태/증거를 외부화하고,
검증-수정(Verification & Refinement) 루프를 통해
재현 가능한 고품질 산출물을 Evidence Pack과 함께 생산하는 시스템을 만든다.

즉 AI_friend는 ‘뇌’이며,
Antigravity IDE는 AI들의 ‘작업 회의실’이자 결과물을 만드는 ‘작업실’이다.”

---

## 0.1 운영철학 (Operating Philosophy — 정체성 선언, 변경 금지)

아래 3문장은 AI_friend의 정체성을 정의하는 운영철학이며, 문구/의미를 임의로 약화시키거나 다른 문서로 위임하지 않는다.

1. **AI_friend = Constitution(헌법) + Brain(뇌)**

- AI_friend는 모델이 아니라 **규율**이다.
- “그럴듯한 답변”이 아니라 **검증·증거·상태·권한·루프가드**로 품질을 강제한다.

2. **Antigravity IDE = Stage(무대) = Workroom**

- Antigravity는 AI들이 모여 일하는 **작업 회의실/작업실**이다.
- 사람은 여기서 Goal을 던지고, 진행을 관측하며, 승인(HITL)으로 안전을 보장한다.

3. **Orchestration = Process over Prompting**

- 오케스트레이션은 역할 분담/라우팅/워크플로우 실행을 담당한다.
- 핵심은 “프롬프트를 길게”가 아니라, **프로세스 중심(Process over Prompting)**으로 장시간 작업을 안정화하는 것이다.

---

## 1. 운영 계약 7조항 (Goal을 ‘판정 가능한’ 계약으로 변환)

> 아래 7조항을 모두 만족하지 못하면 “Goal 달성/완료”로 간주하지 않는다.

### 계약 1 — Stage/Constitution 분리 (Boundary)

- Stage(무대): IDE/오케스트레이터/도구(실행 환경/라우팅/워크플로우)
- Constitution(헌법): AI_friend (검증·증거·상태 SSOT·권한·루프가드)
- Stage 구현 디테일(도구 설치/명령/특정 폴더 구조)은 GOALS에 넣지 않는다. (별도 운영 문서로 분리)

### 계약 2 — State is SSOT (상태 외부화, Implementation-agnostic)

- 모든 작업 진행 상태는 컨텍스트가 아니라 **파일 시스템 기반 SSOT**에 기록한다.
- “SSOT 구현(어떤 파일/폴더/스키마를 SSOT로 쓰는가)”은 프로젝트 운영 문서(예: TECH0)에서 정의할 수 있다.
- 단, 어떤 구현을 쓰더라도 아래 3가지는 필수로 만족해야 한다:
  1. **외부화(Externalized):** 채팅만으로 상태가 존재하면 무효
  2. **감사가능(Auditable):** 누가/언제/무엇을 했는지 추적 가능
  3. **재현가능(Reproducible):** 동일 입력이면 동일 상태/결과를 재구성 가능

### 계약 3 — Evidence Pack Required (증거 없으면 PASS 무효, “단일 근거” 원칙)

- Verifier가 PASS를 내리려면 반드시 **Evidence Pack(증거 묶음)**이 존재해야 한다.
- Evidence는 “텍스트 주장”이 아니라 **아티팩트/로그/검증 리포트**여야 한다.
- **운영 초기(v2.1) 규칙:** Evidence Pack은 **단일 위치(Primary)만** 필수로 요구한다.
  - Primary Evidence Pack 경로는 프로젝트 운영 문서가 정한다(예: `outputs/evidence/...` 또는 오케스트레이터 메모리 영역).
- **Export(2차 내보내기)는 선택(OPTIONAL)**이다.
  - Export는 CI/공유/장기보관 목적일 때만 사용하며,
  - Export를 사용하지 않았다는 이유로 FAIL 처리하지 않는다.

### 계약 4 — Verification & Refinement Loop (단일 루프 고정)

- 모든 작업은 단일 루프만 허용한다:
  - **PLAN → EXECUTE → VERIFY → (PASS | FAIL→REFINE) → RE-VERIFY**
- FAIL 상태에서 “수정 지시서(Refinement Plan)” 없이 Executor가 임의 수정하는 것을 금지한다.
- PASS는 **Verifier만** 선고할 수 있다(Chair/Executor의 PASS 금지).

### 계약 5 — No Silent Assumptions (가정은 기록·검증 대상화)

- 어떠한 가정도 “암묵적”이면 무효.
- 모든 가정은 Evidence Pack의 `assumptions`(또는 `assumptions.yaml`)에 기록되어야 하며,
  Verifier는 가정의 검증 여부를 PASS/FAIL 근거에 포함한다.

### 계약 6 — Least Privilege + HITL Gate (권한/승인)

- 기본은 RO-first(읽기 우선). 쓰기/변경은 단계적 승격.
- 아래 항목은 **무조건 HITL(인간 승인)** 없이는 apply 금지:
  - 데이터/산출물 삭제, 대규모 리팩터, DB 스키마 변경,
  - 보안/권한 설정 변경, 외부 네트워크/토큰/비밀정보 취급 변경
  - (보안 구체화) `mcp_config.json` 수정/생성/덮어쓰기/주입

### 계약 7 — Loop Guard (무한루프/비용폭주 방지)

- 루프에는 반드시 **횟수 + 시간 + 비용(토큰/호출량)** 제한이 존재해야 한다.
- 기본 가드(초기값, 조정 가능):
  - MAX_RETRY_PER_TASK = 3
  - MAX_WALL_TIME_PER_TASK = 60 minutes
  - MAX_TOKEN_BUDGET_PER_TASK = (프로젝트 설정값)
- 가드 초과 시 상태는 ABORTED로 전환하고,
  SSOT에 중단 사유 + 인간 개입 요청을 기록한다.

---

## 2. 역할(Responsibility)과 겸직 금지

### 2.1 추상 역할(Constitution Level)

- Chair/Planner: Goal을 task로 분해, 우선순위/의존성/DoD 정의, 최종 합성
- Executor: 구현/산출물 생성, Evidence Pack 채우기(아티팩트/로그/명령 기록)
- Verifier: Evidence Pack 기반 PASS/FAIL 판정(근거·체크리스트 포함)
- Diagnoser: FAIL 시 원인 분석 및 Refinement Plan 발급(직접 구현 금지)

### 2.2 구체 역할 매핑(Project Ops Level, 위임)

- 실제 에이전트/모델 배정(예: Gemini/Codex/Claude 또는 PM/QA/Debug 등)은
  **프로젝트별 운영 문서(예: TECH0)**에서 정의한다.
- 본 문서는 “겸직 금지/권한/판정 규칙”을 정의하고,
  “누가 누구인지(실명 배정)”는 프로젝트 운영 문서가 책임진다.

### 2.3 겸직 금지 규칙

- 동일 task_id에 대해 Executor와 Verifier는 겸직 불가.
- VERIFY 단계에서 Chair가 PASS를 내리는 행위 금지. PASS 권한은 Verifier만.

---

## 3. SSOT 최소 요구사항 (Implementation Contract)

SSOT 구현이 무엇이든(파일/폴더/DB/메모리 파일), 아래 필드는 **논리적으로 존재**해야 한다.
구체 스키마/경로/형식은 프로젝트 운영 문서가 정한다.

필수 개념(최소):

- run_id
- goal_text (또는 goal_hash)
- status: PENDING | IN_PROGRESS | NEEDS_REFINEMENT | VERIFIED_PASS | VERIFIED_FAIL | ABORTED | PAUSED
- current_task_id
- tasks[]: (id, status, evidence_ref, verification_attempts, retry_count)
- loop_guard: (max_retry, max_wall_time_sec, max_token_budget)
- last_updated (KST ISO)

---

## 4. Evidence Pack 최소 스펙 (PASS 판정의 유일 근거)

Primary Evidence Pack은 프로젝트 운영 문서에서 지정한 경로에 저장한다.

필수 구성(최소):

1. `evidence_pack.yaml` (메타/가정/입력식별자/산출물 경로)
2. `verification_report.md` (Verifier의 PASS/FAIL 채점표)
3. `execution_log.txt` 또는 `execution_log.json` (명령/출력/환경)

`evidence_pack.yaml` 필수 키(최소):

- run_id, task_id, timestamp_kst
- inputs: (source_refs, file_hashes, config_versions)
- artifacts: (paths, diff_summary)
- assumptions: [ ... ] # No Silent Assumptions 강제
- decisions: [ ... ] # 주요 의사결정과 근거
- tests: [ ... ] # 수행한 테스트/체크
- approvals: (hitl_required, hitl_decision_ref)

(옵션) Export Evidence Pack:

- CI/공유/장기보관 목적일 때만 `outputs/evidence/<run_id>/<task_id>/` 형태로 내보낼 수 있다.

---

## 5. 보안 운영 조항 (Security Addendum — 파일명 명시)

- **절대 금지:** 에이전트/오케스트레이터가 `mcp_config.json`을 자동으로 수정/생성/주입/덮어쓰기 하는 행위
- `mcp_config.json` 변경은 항상 HITL 대상이며, 변경 시 Evidence Pack에:
  - 변경 전/후 diff
  - 변경 사유
  - 승인자/승인 시각
    을 남긴다.
- 외부 네트워크/토큰 사용은 HITL 승인 및 Evidence Pack 기록 필수.

---

## 6. 성공 지표 (초기 KPI)

- PASS@1, PASS@k (V&RP 루프 효용)
- Evidence Completeness = 100% (완료 task 중 증거팩 누락 0%)
- State Integrity = 100% (SSOT와 실제 산출물/증거의 불일치 0%)
- Regression Rate (새 변경이 기존 검증을 깨는 비율)
- Cost per Task (토큰/시간/호출량)
- Safety Incidents = 0 (`mcp_config.json` 무승인 변경 0, 무승인 파괴적 변경 0)

---

## 7. 범위 (Scope)

포함:

- 오케스트레이션 규율(검증-수정, 증거팩, SSOT, 권한, 루프가드)
- Antigravity IDE에서의 “작업 회의실/작업실” 운영 방식

제외(현 시점):

- 모델 성능 튜닝(학습/파인튜닝)
- 무제한 자동 커밋/무승인 destructive 변경
- 워크스페이스 외부 시스템 제어

---

## 8. 문서 계층 및 도메인 위임 (Document Hierarchy)

### 8.1 계층(우선순위, 내림차순)

1. **본 문서(GOALS.md)** — 범용 헌법(Constitution)
2. **프로젝트별 운영 문서(예: TECH0)** — 도메인 운영 OS(Ops)
3. **프로젝트별 제품/데이터 계약(예: Spec/SSoT)** — 도메인 SSoT(Product/Data)
4. 기타 정책/스펙 문서

### 8.2 위임 규칙

- §2 역할의 **구체 에이전트/모델 배정**은 프로젝트 운영 문서에서 정의한다.
- §3~§4의 **SSOT 구현/경로/스키마**는 프로젝트 운영 문서에서 정의한다.
- §4 Evidence Pack의 **도메인 확장 필드**(예: log_hash, bundle_hash 등)는 도메인 SSoT에서 정의한다.
- 충돌 시 본 문서의 조항이 우선한다.
- 단, 본 문서가 도메인 문서의 “더 엄격한 안전/증거/검증 규칙”을 약화시키는 방식으로 해석되는 것을 금지한다.

---

## 9. 참고 사상/자료 (Evidence for the Constitution)

> 목적: 본 헌법(검증-수정 루프, 상태/증거 외부화, MCP 보안 통제 등)의 “근거”를 명확히 고정한다.
> 주의: 아래 자료는 ‘사상/근거’이며, Stage 구현 디테일(설치/명령/폴더)은 WORKFLOWS/OPS 문서로 분리한다.

### 9.1 Long-running Agents / Harness (컨텍스트 오염 방지, 역할 분리 근거)

- Anthropic Engineering — Effective harnesses for long-running agents (2025-11-26)
  - 장시간 에이전트 실행에서 발생하는 실패 양상(컨텍스트 오염/망각/드리프트)을 다루며,
    “역할 분리/초기화-코딩 분리/검증 루프” 같은 운영 전략의 근거로 사용한다.
    https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents

### 9.2 Contextual Retrieval / MCP (필요할 때만 가져오기, 도구 표준화 근거)

- Anthropic Research — Introducing Contextual Retrieval (2024-09-19)
  - ‘필요할 때만’ 관련 정보를 검색/회수하는 설계 철학(토큰·오염 최소화)의 근거로 사용한다.
    https://www.anthropic.com/research/contextual-retrieval

- Anthropic Docs — Model Context Protocol (MCP)
  - 모델이 외부 도구/데이터와 상호작용하는 표준 인터페이스로서,
    “도구 접속을 규약화하고, 안전하게 경계(승인/권한)를 세우는” 근거로 사용한다.
    https://docs.anthropic.com/en/docs/mcp

### 9.3 Verification-and-Refinement Pipeline (V&RP 루프의 학술적 모태)

- arXiv — Winning Gold at IMO 2025 with a Model-Agnostic Verification-and-Refinement Pipeline (arXiv:2507.15855)
  - ‘풀고(Generate) → 검증하고(Verify) → 수정하고(Refine) → 재검증(Re-verify)’의 반복 구조를
    “단일 루프 고정(Contract 4)”의 근거로 사용한다.
    https://arxiv.org/abs/2507.15855

### 9.4 Multi-model Council / Advisory Board (다중 모델 상호검증의 근거)

- Andrej Karpathy — llm-council (LLM-as-an-Advisory-Board 컨셉)
  - 여러 모델이 서로 토론/검증하며 결론을 강화하는 “council” 운영 개념의 근거로 사용한다.
    https://github.com/karpathy/llm-council

### 9.5 ARC Prize / ARC-AGI (추론 벤치마크, ‘오케스트레이션 가치’의 외부 근거)

- ARC Prize — Announcing ARC-AGI-2 and ARC Prize 2025
  - ARC Prize/ARC-AGI-2의 방향성과 대회 맥락을 참고 근거로 둔다.
    https://arcprize.org/blog/announcing-arc-agi-2-and-arc-prize-2025

- ARC Prize — ARC-AGI-2 Technical Report (leaderboard 운영 언급 포함)
  - ARC-AGI-2의 난이도/평가 관점 및 “지속 업데이트되는 리더보드 운영” 등 벤치마크 맥락을 참고한다.
    https://arcprize.org/blog/arc-agi-2-technical-report
