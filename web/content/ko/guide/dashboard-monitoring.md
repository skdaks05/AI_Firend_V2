---
title: 유즈케이스: 대시보드 모니터링
description: 터미널/웹 대시보드로 오케스트레이터 세션을 운영하고 이상 신호에 대응하는 런북.
---

# 유즈케이스: 대시보드 모니터링

## 시작 명령

```bash
bunx oh-my-ag dashboard
bunx oh-my-ag dashboard:web
```

웹 대시보드 기본 주소: `http://localhost:9847`

## 권장 터미널 구성

최소 3개 터미널을 권장합니다:

1. 대시보드 전용 (`oh-my-ag dashboard`)
2. 에이전트 spawn 실행
3. 테스트/빌드 로그 확인

팀 세션이라면 웹 대시보드를 함께 띄워 상태를 공유하세요.

## 대시보드가 보는 데이터

데이터 소스: `.serena/memories/`

핵심 시그널:

- 세션 상태 (`running`, `completed`, `failed`)
- task board 할당/상태 변경
- 에이전트별 progress turn
- result 발행 이벤트

대시보드는 변경 파일 이벤트 기반으로 갱신되며, 전체 디렉토리 폴링 루프에 의존하지 않습니다.

## 런북: 신호 → 대응

- `No agents detected`
  - 동일 `session-id`로 spawn 했는지 확인
  - `.serena/memories/`에 쓰기가 발생하는지 확인
- `Session stuck in running`
  - 최신 `progress-*` 타임스탬프 확인
  - 멈춘 에이전트를 더 명확한 프롬프트로 재실행
- `웹 대시보드 재연결 반복`
  - 로컬 방화벽/프록시 확인
  - `dashboard:web` 재시작 후 페이지 새로고침
- `에이전트 실행 중인데 활동 로그 없음`
  - orchestrator 출력 경로가 다른 워크스페이스로 빠지지 않았는지 확인

## 머지 전 모니터링 체크리스트

- 필수 에이전트가 모두 완료 상태
- high 이상 QA 이슈 미해결 항목 없음
- 에이전트별 result 파일이 최신 상태로 존재
- 최종 산출물 기준 통합 테스트 수행 완료

## 완료 기준

모니터링 단계는 다음을 만족하면 완료입니다:

- 세션이 종료 상태(`completed` 또는 의도된 중지)에 도달
- 활동 히스토리로 최종 산출물 출처 추적 가능
- 전체 상태를 바탕으로 릴리즈/머지 판단 완료
