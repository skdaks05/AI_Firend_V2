---
title: 유즈케이스: 멀티 에이전트 프로젝트
description: 복합 도메인 프로젝트의 엔드투엔드 실행 흐름.
---

# 유즈케이스: 멀티 에이전트 프로젝트

## 시나리오

백엔드, 프론트엔드, QA가 동시에 필요한 기능.

## 권장 순서

1. `/plan`
2. `/coordinate`
3. 병렬 `agent:spawn`
4. `/review`

## 예시

```bash
oh-my-ag agent:spawn backend "JWT 인증 API 구현" session-app-01 -w ./apps/api
oh-my-ag agent:spawn frontend "인증 UI 플로우 구현" session-app-01 -w ./apps/web
oh-my-ag agent:spawn qa "인증 리스크 리뷰" session-app-01
```

## 조율 규칙

- 기능 단위로 session ID 고정
- 도메인별 워크스페이스 분리
- QA 이슈 반영 후 머지
