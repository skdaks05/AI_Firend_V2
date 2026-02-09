---
title: 유즈케이스: 대시보드 모니터링
description: 터미널/웹 대시보드에서 오케스트레이터 실행을 관찰.
---

# 유즈케이스: 대시보드 모니터링

## 대시보드 시작

```bash
bunx oh-my-ag dashboard
bunx oh-my-ag dashboard:web
```

## 모니터링 항목

- 세션 상태
- 태스크 보드 변경
- progress/result 파일 기반 활동 로그

## 데이터 소스

대시보드는 `.serena/memories/`를 감시하고 변경 파일만 다시 읽습니다.

## 운영 팁

대시보드 터미널과 에이전트 실행 터미널을 분리하세요.
