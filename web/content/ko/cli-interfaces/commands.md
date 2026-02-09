---
title: Commands
description: cli/cli.ts 기준 전체 커맨드 인터페이스.
---

# Commands

아래 명령 목록은 `cli/cli.ts` 구현을 기준으로 정리되었습니다.

## 기본 명령

```bash
oh-my-ag                         # 대화형 설치
oh-my-ag dashboard               # 터미널 대시보드
oh-my-ag dashboard:web           # 웹 대시보드 (:9847)
oh-my-ag usage                   # 모델 사용량 조회
oh-my-ag update                  # 레지스트리 최신 스킬 업데이트
oh-my-ag doctor                  # 환경/스킬 진단
oh-my-ag stats                   # 생산성 지표
oh-my-ag retro                   # 회고 리포트
oh-my-ag cleanup                 # orphan 리소스 정리
oh-my-ag bridge [url]            # MCP stdio -> streamable HTTP
```

## 에이전트 명령

```bash
oh-my-ag agent:spawn <agent-id> <prompt> <session-id>
oh-my-ag agent:status <session-id> [agent-ids...]
```

## 메모리/검증 명령

```bash
oh-my-ag memory:init
oh-my-ag verify <agent-type>
```
