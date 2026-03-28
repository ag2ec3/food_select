# "오늘 뭐 먹지?" — API 명세

> spec.md의 기능 목록·데이터 엔티티를 기반으로 정리한 API 엔드포인트 초안이다.
> Next.js App Router의 Route Handler(`app/**/route.ts`) 기준으로 작성한다.

---

## 인증

Supabase Auth를 사용한다. 모든 API는 인증된 사용자만 호출할 수 있다.

---

## 팀 (Team)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/teams` | 새 팀 생성. 생성자는 자동으로 멤버에 추가된다. |
| GET | `/api/teams` | 내가 속한 팀 목록 조회 |
| POST | `/api/teams/[teamId]/join` | 팀 참가 (초대 코드 등) |

### 요청·응답 예시

**POST `/api/teams`**

- Body: `{ "name": "개발팀" }`
- 응답: `{ "id": "...", "name": "개발팀", "created_at": "..." }`

---

## 세션 (Session)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/teams/[teamId]/sessions` | 새 세션 생성 (status: open) |
| GET | `/api/teams/[teamId]/sessions` | 팀의 세션 목록 조회 (최신순) |
| GET | `/api/teams/[teamId]/sessions/[sessionId]` | 세션 상세 조회 (후보·투표·확정 결과 포함) |
| PATCH | `/api/teams/[teamId]/sessions/[sessionId]/close` | 세션 마감 → 확정 로직 실행 |

### 마감(close) 로직

1. 후보가 0개이면 `400` 에러 — `"메뉴를 작성해주세요"`
2. 득표를 집계하여 최다 득표 후보를 확정
3. 동점이면 동점 후보 중 랜덤 1개 선택
4. Decision 레코드 생성, 세션 status를 `closed`로 변경

---

## 후보 (Candidate)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/sessions/[sessionId]/candidates` | 후보 메뉴 추가 |
| GET | `/api/sessions/[sessionId]/candidates` | 세션의 후보 목록 조회 (득표 수 포함) |

### 제약

- 같은 세션 내 중복 메뉴명 불가 → `409`
- 세션이 이미 마감된 상태면 추가 불가 → `400`

**POST 요청 예시**

- Body: `{ "menu_name": "짬뽕" }`
- 응답: `{ "id": "...", "session_id": "...", "menu_name": "짬뽕", "created_at": "..." }`

---

## 투표 (Vote)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/sessions/[sessionId]/votes` | 투표 (1인 1표). 이미 투표한 경우 대상 후보를 변경한다. |

### 제약

- 세션이 마감된 상태면 투표 불가 → `400`
- 존재하지 않는 후보에 투표 → `404`

**POST 요청 예시**

- Body: `{ "candidate_id": "..." }`
- 응답: `{ "id": "...", "session_id": "...", "candidate_id": "...", "voted_at": "..." }`

---

## 이력 (History)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/teams/[teamId]/history` | 팀의 최근 확정 메뉴 이력 목록 (날짜, 메뉴명, 득표 수) |

---

## 공통 에러 형식

```json
{
  "error": "에러 메시지"
}
```

| 상태 코드 | 의미 |
|-----------|------|
| 400 | 잘못된 요청 (마감 불가, 세션 이미 종료 등) |
| 401 | 인증 필요 |
| 404 | 리소스 없음 |
| 409 | 중복 (같은 메뉴명 등) |
