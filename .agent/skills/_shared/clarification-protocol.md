# Clarification Protocol

요구사항이 모호할 때 "가정하고 진행"하면 대부분 잘못된 방향으로 간다.
이 프로토콜을 따라 명확한 요구사항을 확보한 후 실행한다.

---

## 필수 확인 항목

아래 항목 중 하나라도 불명확하면 **가정하지 말고** 명시적으로 기록한다.

### 모든 에이전트 공통
| 항목 | 확인 질문 | 기본값 (가정 시) |
|------|----------|-----------------|
| 대상 사용자 | 누가 쓰는 서비스인가? | 일반 웹 사용자 |
| 핵심 기능 | 반드시 포함해야 할 기능 3가지는? | 태스크 설명에서 추론 |
| 기술 스택 | 특정 프레임워크 제약이 있는가? | 프로젝트 기본 스택 |
| 인증 | 로그인이 필요한가? | JWT 인증 포함 |
| 범위 | MVP인가 완전한 기능인가? | MVP |

### Backend Agent 추가 확인
| 항목 | 확인 질문 | 기본값 |
|------|----------|--------|
| DB 선택 | PostgreSQL? MongoDB? SQLite? | PostgreSQL |
| API 스타일 | REST? GraphQL? | REST |
| 인증 방식 | JWT? Session? OAuth? | JWT (access + refresh) |
| 파일 업로드 | 필요한가? 크기 제한은? | 불필요 |

### Frontend Agent 추가 확인
| 항목 | 확인 질문 | 기본값 |
|------|----------|--------|
| SSR/CSR | Server-side rendering 필요? | Next.js App Router (SSR) |
| 다크모드 | 지원 필요? | 지원 |
| 국제화 | 다국어 지원? | 불필요 |
| 기존 디자인 시스템 | 사용할 UI 라이브러리? | shadcn/ui |

### Mobile Agent 추가 확인
| 항목 | 확인 질문 | 기본값 |
|------|----------|--------|
| 플랫폼 | iOS만? Android만? 둘 다? | 둘 다 |
| 오프라인 | 오프라인 지원 필요? | 불필요 |
| 푸시 알림 | 필요한가? | 불필요 |
| 최소 OS | iOS/Android 최소 버전? | iOS 14+, Android API 24+ |

---

## 모호함 수준별 대응

### Level 1: 약간 모호 (핵심은 명확, 세부사항 부족)
예: "TODO 앱 만들어줘"

**대응**: 기본값을 적용하고, 가정 목록을 result에 기록
```
⚠️ Assumptions:
- JWT authentication included
- PostgreSQL database
- REST API
- MVP scope (CRUD only)
```

### Level 2: 상당히 모호 (핵심 기능이 불명확)
예: "사용자 관리 시스템 만들어줘"

**대응**: 핵심 기능을 3가지로 좁혀서 명시하고 진행
```
⚠️ Interpreted scope (3 core features):
1. User registration + login (JWT)
2. Profile management (view/edit)
3. Admin user list (admin role only)

NOT included (would need separate task):
- Role-based access control (beyond admin/user)
- Social login (OAuth)
- Email verification
```

### Level 3: 매우 모호 (방향 자체가 불명확)
예: "좋은 앱 만들어줘", "이거 개선해줘"

**대응**: 진행하지 말고 구체화 요청을 result에 기록
```
❌ Cannot proceed: Requirements too ambiguous

Questions needed:
1. What is the app's primary purpose?
2. Who are the target users?
3. What are the 3 must-have features?
4. Are there existing designs or wireframes?

Status: blocked (awaiting clarification)
```

---

## PM Agent 전용: 요구사항 구체화 프레임워크

PM Agent는 모호한 요청을 받으면 아래 프레임워크로 구체화한다:

```
=== 요구사항 구체화 ===

원본 요청: "{사용자 원문}"

1. 핵심 목표: {한 문장으로 정의}
2. 사용자 스토리:
   - "As a {user}, I want to {action} so that {benefit}"
   - (최소 3개)
3. 기능 범위:
   - Must-have: {목록}
   - Nice-to-have: {목록}
   - Out-of-scope: {목록}
4. 기술 제약:
   - {기존 코드 / 스택 / 호환성}
5. 성공 기준:
   - {측정 가능한 조건}
```

---

## 서브에이전트 모드에서의 적용

CLI 서브에이전트는 사용자에게 직접 질문할 수 없다.
따라서:

1. **Level 1**: 기본값 적용 + 가정 기록 → 진행
2. **Level 2**: 범위를 좁혀서 해석 + 명시 → 진행
3. **Level 3**: `Status: blocked` + 질문 목록 → 진행하지 않음

Orchestrator는 Level 3 결과를 받으면 사용자에게 질문을 전달하고,
답변을 받은 후 해당 에이전트를 재실행한다.
