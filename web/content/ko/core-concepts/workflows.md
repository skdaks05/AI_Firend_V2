---
title: Workflows
description: 슬래시 커맨드 기반 명시적 워크플로우와 사용 시점.
---

# Workflows

## 워크플로우 명령

- `/coordinate`
- `/orchestrate`
- `/plan`
- `/review`
- `/debug`

## Skills와 Workflows 차이

- Skills: 요청 의도 기반 자동 활성화
- Workflows: 사용자가 트리거하는 다단계 파이프라인

## 일반적인 멀티 에이전트 순서

1. `/plan`으로 태스크 분해
2. `/coordinate`로 단계별 실행
3. `agent:spawn`으로 병렬 서브에이전트 실행
4. `/review`로 QA 게이트 수행
