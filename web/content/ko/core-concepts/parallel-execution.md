---
title: 병렬 실행
description: 여러 에이전트를 동시에 실행하는 CLI 오케스트레이션 패턴.
---

# 병렬 실행

## 기본 패턴

```bash
oh-my-ag agent:spawn backend "인증 API 구현" session-01 &
oh-my-ag agent:spawn frontend "로그인 폼 생성" session-01 &
wait
```

## 워크스페이스 지정 패턴

```bash
oh-my-ag agent:spawn backend "인증 + DB 마이그레이션" session-02 -w ./apps/api
oh-my-ag agent:spawn frontend "로그인 + 토큰 갱신" session-02 -w ./apps/web
```

## 모니터링 패턴

```bash
bunx oh-my-ag dashboard:web
# http://localhost:9847 접속
```

## CLI 벤더 선택 우선순위

1. `--vendor`
2. `agent_cli_mapping`
3. `default_cli`
4. `active_vendor` (legacy)
5. `gemini` fallback
