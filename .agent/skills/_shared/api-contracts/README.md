# API Contracts

이 디렉토리는 PM Agent가 생성하고, backend/frontend/mobile 에이전트가 참조하는 API 계약서를 담습니다.

## 사용법

### PM Agent (작성자)
계획 단계에서 API 계약서를 여기에 생성:
```
write_memory("api-contracts/{domain}.md", contract content)
```

또는 Serena가 없을 경우 이 디렉토리에 직접 파일 생성.

### Backend Agent (구현자)
계약서를 읽고 그대로 구현:
```
read_memory("api-contracts/{domain}.md")
```

### Frontend / Mobile Agent (소비자)
계약서를 읽고 API 클라이언트를 그대로 연동:
```
read_memory("api-contracts/{domain}.md")
```

## 계약서 형식

```markdown
# {Domain} API Contract

## POST /api/{resource}
- **Auth**: Required (JWT Bearer)
- **Request Body**:
  ```json
  { "field": "type", "field2": "type" }
  ```
- **Response 200**:
  ```json
  { "id": "uuid", "field": "value", "created_at": "ISO8601" }
  ```
- **Response 401**: `{ "detail": "Not authenticated" }`
- **Response 422**: `{ "detail": [{ "field": "error message" }] }`
```

## 규칙
1. PM Agent가 계획 시 반드시 생성
2. Backend Agent는 계약서와 다르게 구현하면 안 됨
3. Frontend/Mobile Agent는 계약서 기준으로 타입 정의
4. 변경이 필요하면 PM Agent에게 재계획 요청
