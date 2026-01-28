# Difficulty Assessment & Protocol Branching

모든 에이전트는 태스크 시작 시 난이도를 판단하고, 그에 맞는 프로토콜 깊이를 적용한다.

## 난이도 판단 기준

### Simple (단순)
- 단일 파일 변경
- 명확한 요구사항 (예: "버튼 색상 변경", "필드 추가")
- 기존 패턴 반복
- **예상 턴**: 3-5

### Medium (보통)
- 2-3 파일 변경
- 약간의 설계 판단 필요
- 기존 패턴을 새 도메인에 적용
- **예상 턴**: 8-15

### Complex (복잡)
- 4개 이상 파일 변경
- 아키텍처 결정 필요
- 새로운 패턴 도입
- 다른 에이전트 결과물에 의존
- **예상 턴**: 15-25

---

## 프로토콜 분기

### Simple → Fast Track
1. ~~Step 1 (Analyze)~~: 스킵 — 바로 구현
2. Step 3 (Implement): 구현
3. Step 4 (Verify): 체크리스트 최소 항목만

### Medium → Standard Protocol
1. Step 1 (Analyze): 간략히
2. Step 2 (Plan): 간략히
3. Step 3 (Implement): 전체
4. Step 4 (Verify): 전체

### Complex → Extended Protocol
1. Step 1 (Analyze): 전체 + Serena로 기존 코드 탐색
2. Step 2 (Plan): 전체 + progress에 계획 기록
3. **Step 2.5 (Checkpoint)**: 계획을 `progress-{agent-id}.md`에 기록
4. Step 3 (Implement): 전체
5. **Step 3.5 (Mid-check)**: 구현 50% 시점에서 progress 업데이트 + 방향 점검
6. Step 4 (Verify): 전체 + `../_shared/common-checklist.md`도 실행

---

## 난이도 오판 복구

- Simple로 시작했는데 예상보다 복잡 → Medium 프로토콜로 전환, progress에 기록
- Medium으로 시작했는데 아키텍처 결정 필요 → Complex로 업그레이드
- Complex로 시작했는데 실제로 간단 → 그냥 빠르게 끝내면 됨 (오버헤드 최소)
