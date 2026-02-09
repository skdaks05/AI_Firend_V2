---
title: 소개
description: oh-my-ag와 멀티 에이전트 협업 동작 방식을 설명합니다.
---

# 소개

oh-my-ag는 Antigravity IDE용 멀티 에이전트 오케스트레이터입니다. 요청을 스킬에 라우팅하고 Serena 메모리로 조율 상태를 관리합니다.

## 핵심 기능

- 요청 기반 자동 스킬 라우팅
- 기획/리뷰/디버깅 워크플로우 실행
- CLI 기반 병렬 에이전트 오케스트레이션
- 실시간 대시보드 모니터링

## 에이전트 역할

| 에이전트 | 역할 |
|---|---|
| workflow-guide | 복잡한 멀티 도메인 프로젝트 조율 |
| pm-agent | 기획, 태스크 분해, 아키텍처 |
| frontend-agent | React/Next.js 구현 |
| backend-agent | API/DB/인증 구현 |
| mobile-agent | Flutter/모바일 구현 |
| qa-agent | 보안/성능/접근성 리뷰 |
| debug-agent | 원인 분석 및 회귀 방지 수정 |
| orchestrator | CLI 기반 서브에이전트 오케스트레이션 |
| commit | Conventional Commit 워크플로우 |

## 프로젝트 구조

- `.agent/skills/`: 스킬 정의와 리소스
- `.agent/workflows/`: 명시적 워크플로우 명령
- `.serena/memories/`: 런타임 조율 상태
- `cli/cli.ts`: 커맨드 인터페이스 기준 소스

## Progressive Disclosure

1. 요청 의도 식별
2. 필요한 리소스만 로드
3. 전문 에이전트 실행
4. QA/디버그 루프로 검증 및 반복
