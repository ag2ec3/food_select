---
name: 오늘 뭐 먹지? — 개발 계획
overview: spec.md와 api-spec.md를 기반으로 한 단계별 개발 계획. 0단계(초기 셋업) → 1단계(Mock UI) → 2단계(Supabase 실구현). 1단계 완료 전 2단계 진행 금지.
todos:
  - id: 0-1
    content: Next.js 프로젝트 생성
    status: completed
  - id: 0-2
    content: 프로젝트 구조 설정
    status: completed
  - id: 0-3
    content: 공통 타입 정의
    status: completed
  - id: 0-4
    content: 목업 데이터 작성
    status: completed
  - id: 0-5
    content: Supabase 패키지 설치 (2단계 대비)
    status: completed
  - id: 0-6
    content: 기본 레이아웃
    status: completed
  - id: 1-A
    content: 인증 화면 (Mock)
    status: completed
  - id: 1-B
    content: 팀 관리 화면
    status: completed
  - id: 1-C
    content: 세션 목록 + 세션 생성
    status: completed
  - id: 1-D
    content: 세션 상세 — 메뉴 제안 + 투표
    status: completed
  - id: 1-E
    content: 이력 조회
    status: completed
  - id: 1-F
    content: 전체 플로우 검증 + 마무리
    status: completed
  - id: 2-A
    content: Supabase 프로젝트 설정 + 테이블 생성
    status: completed
  - id: 2-B
    content: Supabase 클라이언트 설정 + 인증 구현
    status: completed
  - id: 2-C
    content: 팀 API 구현 + UI 연동
    status: completed
  - id: 2-D
    content: 세션 API 구현 + UI 연동
    status: completed
  - id: 2-E
    content: 후보 + 투표 API 구현 + UI 연동
    status: completed
  - id: 2-F
    content: 이력 API 구현 + UI 연동
    status: completed
  - id: 2-G
    content: 통합 테스트 + 마무리
    status: completed
isProject: true
---

# "오늘 뭐 먹지?" — 개발 계획

> 이 문서는 `spec.md`(제품·기능 명세)와 `api-spec.md`(API 명세)를 기반으로 작성된 **단계별 개발 계획**이다.
> 각 항목은 실행 가능한 최소 단위로 세분화되어 있다.

---

## ⚠️ 진행 규칙

1. **1단계가 완전히 끝나기 전에 2단계로 넘어가지 않는다.**
2. 각 섹션 완성 후 반드시 **멈추고 다음 진행 여부를 확인**한다.
3. 체크리스트는 완료 시 `[x]`로 표시한다.

---

## 0단계 — 프로젝트 초기 셋업

### 0-1. Next.js 프로젝트 생성

- `frontend/` 폴더에 Next.js App Router 프로젝트 생성 (`create-next-app`)
- TypeScript 활성화 확인
- Tailwind CSS 설정 확인
- App Router(`app/` 디렉터리) 사용 확인
- 불필요한 보일러플레이트 정리 (기본 페이지 내용 제거)

### 0-2. 프로젝트 구조 설정

- 폴더 구조 생성
  - `app/` — 라우트 페이지
  - `components/` — 공통 UI 컴포넌트
  - `lib/` — 유틸리티, 타입, 클라이언트 설정
  - `data/` — 목업 데이터 (`mockData.ts`)

### 0-3. 공통 타입 정의

- `lib/types.ts` 생성
  - `Team` 타입 (`id`, `name`, `created_at`)
  - `Membership` 타입 (`id`, `team_id`, `user_id`, `role`, `joined_at`)
  - `Session` 타입 (`id`, `team_id`, `status`, `created_at`, `closed_at`)
  - `Candidate` 타입 (`id`, `session_id`, `user_id`, `menu_name`, `created_at`)
  - `Vote` 타입 (`id`, `session_id`, `user_id`, `candidate_id`, `voted_at`)
  - `Decision` 타입 (`id`, `session_id`, `candidate_id`, `decided_at`)
  - `User` 타입 (`id`, `name`, `email`)

### 0-4. 목업 데이터 작성

- `data/mockData.ts` 생성
  - 사용자 목업 데이터 (3~5명)
  - 팀 목업 데이터 (1~2개 팀)
  - 멤버십 목업 데이터
  - 세션 목업 데이터 (open 1개, closed 2~3개)
  - 후보 목업 데이터 (세션당 3~5개 메뉴)
  - 투표 목업 데이터
  - 확정(Decision) 목업 데이터

### 0-5. Supabase 패키지 설치 (2단계 대비)

- `@supabase/supabase-js` 설치
- `@supabase/ssr` 설치
- `.env.local.example` 파일 생성 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 키 틀만 작성)

### 0-6. 기본 레이아웃

- `app/layout.tsx` — 루트 레이아웃 (폰트, 메타데이터, Tailwind 기본 설정)
- `app/page.tsx` — 랜딩/리다이렉트 페이지 (로그인 여부에 따라 분기 — 목업에서는 바로 팀 목록으로)
- 공통 컴포넌트 틀 생성
  - `components/Header.tsx` — 상단 네비게이션 바
  - `components/Button.tsx` — 공용 버튼 컴포넌트

---

## 1단계 — 목업 (Mock Data 기반 UI + 플로우)

> Supabase 연동 없이 `mockData.ts`의 하드코딩 데이터만 사용한다.
> 모든 화면을 클릭하여 전체 플로우를 확인할 수 있는 수준으로 구현한다.

---

### 섹션 1-A: 인증 화면 (Mock)

- `app/login/page.tsx` — 로그인 페이지
  - 이메일 + 비밀번호 입력 폼 UI
  - 로그인 버튼 클릭 시 목업 사용자로 로그인 처리 (상태 저장)
  - 회원가입 페이지 이동 링크
- `app/signup/page.tsx` — 회원가입 페이지
  - 이름, 이메일, 비밀번호 입력 폼 UI
  - 가입 버튼 클릭 시 팀 목록으로 이동 (목업)
- 인증 상태 관리
  - `lib/authContext.tsx` — 현재 로그인한 사용자 상태를 관리하는 Context
  - 로그인/로그아웃 함수 구현 (목업 — localStorage 또는 state 기반)
  - 미인증 시 `/login`으로 리다이렉트하는 가드 로직

> **🛑 섹션 1-A 완료 후 멈추고 진행 여부 확인**

---

### 섹션 1-B: 팀 관리 화면

- `app/teams/page.tsx` — 내 팀 목록 페이지
  - 팀 카드 목록 렌더링 (팀 이름, 생성일)
  - 팀 클릭 시 해당 팀 세션 목록(`/teams/[teamId]`)으로 이동
  - "새 팀 만들기" 버튼
  - "팀 참가하기" 버튼
- `components/TeamCard.tsx` — 팀 카드 컴포넌트
  - 팀 이름, 멤버 수, 생성일 표시
- 팀 생성 모달 또는 페이지
  - 팀 이름 입력 폼
  - 생성 버튼 클릭 시 목업 데이터에 추가 + 목록 갱신
- 팀 참가 모달 또는 페이지
  - 초대 코드 입력 폼
  - 참가 버튼 클릭 시 목업 처리

> **🛑 섹션 1-B 완료 후 멈추고 진행 여부 확인**

---

### 섹션 1-C: 세션 목록 + 세션 생성

- `app/teams/[teamId]/page.tsx` — 팀 메인 (세션 목록) 페이지
  - 팀 이름 헤더 표시
  - "새 세션 시작" 버튼
  - 진행 중(open) 세션 구분 표시
  - 종료된(closed) 세션 목록 표시 (확정 메뉴, 날짜)
  - 세션 클릭 시 세션 상세(`/teams/[teamId]/sessions/[sessionId]`)로 이동
- `components/SessionCard.tsx` — 세션 카드 컴포넌트
  - 상태(open/closed) 뱃지 표시
  - 생성 시각, 후보 수, 투표 수 표시
  - closed인 경우 확정 메뉴 표시
- 새 세션 생성 기능 (목업)
  - 버튼 클릭 시 목업 세션 생성
  - 생성 후 자동으로 세션 상세 페이지로 이동

> **🛑 섹션 1-C 완료 후 멈추고 진행 여부 확인**

---

### 섹션 1-D: 세션 상세 — 메뉴 제안 + 투표

- `app/teams/[teamId]/sessions/[sessionId]/page.tsx` — 세션 상세 페이지
  - 세션 상태(open/closed) 표시
  - open 상태일 때:
    - 메뉴 제안 입력 폼 (텍스트 입력 + 추가 버튼)
    - 후보 목록 렌더링
    - 각 후보 옆 투표 버튼
    - 현재 내 투표 항목 하이라이트
    - 투표 변경 가능 (다른 후보 클릭 시 이전 투표 해제)
    - 마감 버튼
  - closed 상태일 때:
    - 확정 메뉴 강조 표시
    - 최종 득표 결과 표시
    - 메뉴 제안, 투표, 마감 버튼 비활성화

#### 메뉴 제안 기능 (목업)

- 텍스트 입력 → "추가" 버튼 클릭
- 중복 메뉴명 입력 시 에러 메시지 표시
- 세션이 closed면 입력 폼 비활성화
- 후보가 0개일 때 "메뉴를 작성해주세요" 안내 문구

#### 투표 기능 (목업)

- 후보 카드 클릭 시 투표 처리
- 이미 투표한 상태에서 다른 후보 클릭 시 투표 변경
- 내 투표 항목 시각적으로 구분 (체크 아이콘 또는 색상)
- 각 후보의 현재 득표 수 실시간 표시

#### 마감 기능 (목업)

- "마감" 버튼 클릭 시 확인 다이얼로그
- 후보 0개 상태에서는 마감 버튼 비활성화 + "메뉴를 작성해주세요" 안내
- 마감 실행 시:
  - 최다 득표 후보를 확정 메뉴로 설정
  - 동점 시 랜덤 선택 로직 구현
  - 세션 상태를 closed로 변경
  - 확정 메뉴 강조 표시로 화면 전환

> **🛑 섹션 1-D 완료 후 멈추고 진행 여부 확인**

---

### 섹션 1-E: 이력 조회

- `app/teams/[teamId]/history/page.tsx` — 이력 페이지
  - 과거 확정 메뉴 목록 (날짜, 메뉴명, 득표 수)
  - 목록이 비어 있을 때 빈 상태 안내 문구
  - 이력 항목 클릭 시 해당 세션 상세로 이동
- `components/HistoryItem.tsx` — 이력 항목 컴포넌트
  - 날짜, 확정 메뉴명, 총 투표 수 표시
- 팀 메인 페이지에서 이력 페이지로 이동하는 네비게이션 링크 추가

> **🛑 섹션 1-E 완료 후 멈추고 진행 여부 확인**

---

### 섹션 1-F: 전체 플로우 검증 + 마무리

- 전체 플로우 점검
  - 로그인 → 팀 목록 → 팀 선택 → 세션 목록 → 새 세션 생성
  - 메뉴 제안 → 투표 → 마감 → 확정 메뉴 확인
  - 이력 조회 → 과거 세션 상세 확인
  - 로그아웃 → 로그인 페이지 이동
- UI/UX 점검
  - 빈 상태(empty state) 안내 문구 확인
  - 에러 상태 표시 확인 (중복 메뉴, 마감 불가 등)
  - 반응형 레이아웃 확인 (모바일 / 데스크탑)
  - 로딩 상태 표시 (필요 시 skeleton UI)
- 코드 정리
  - 사용하지 않는 import 제거
  - 타입 누락 확인 및 보완
  - 컴포넌트 파일 분리가 필요한 곳 리팩터링

> **🛑 섹션 1-F 완료 후 1단계 종료. 2단계 진행 여부 확인**

---

## 2단계 — 실제 구현 (Supabase 연동)

> 1단계 플로우 검증이 **완전히 완료된 후에만** 시작한다.
> `mockData.ts`를 Supabase API 호출로 교체한다.
> Supabase 작업은 **Supabase MCP**를 사용한다. (프로젝트: `vibe-tutorial`)
> `api-spec.md`의 자료구조를 기준으로 테이블 및 API를 구현한다.

---

### 섹션 2-A: Supabase 프로젝트 설정 + 테이블 생성

- Supabase MCP로 프로젝트 연결 확인 (`vibe-tutorial`)
- 테이블 생성
  - `teams` 테이블 (`id uuid PK`, `name text`, `created_at timestamptz`)
  - `memberships` 테이블 (`id uuid PK`, `team_id uuid FK`, `user_id uuid FK`, `role text`, `joined_at timestamptz`)
  - `sessions` 테이블 (`id uuid PK`, `team_id uuid FK`, `status text`, `created_at timestamptz`, `closed_at timestamptz`)
  - `candidates` 테이블 (`id uuid PK`, `session_id uuid FK`, `user_id uuid FK`, `menu_name text`, `created_at timestamptz`)
  - `votes` 테이블 (`id uuid PK`, `session_id uuid FK`, `user_id uuid FK`, `candidate_id uuid FK`, `voted_at timestamptz`)
  - `decisions` 테이블 (`id uuid PK`, `session_id uuid FK`, `candidate_id uuid FK`, `decided_at timestamptz`)
- 유니크 제약조건 설정
  - `votes` — (`session_id`, `user_id`) 유니크
  - `candidates` — (`session_id`, `menu_name`) 유니크
  - `memberships` — (`team_id`, `user_id`) 유니크
  - `decisions` — (`session_id`) 유니크
- 외래 키 관계 설정
- RLS(Row Level Security) 정책 설정
  - `teams` — 멤버만 조회 가능
  - `memberships` — 본인 팀만 조회, 가입 가능
  - `sessions` — 팀 멤버만 CRUD
  - `candidates` — 팀 멤버만 추가/조회
  - `votes` — 팀 멤버만 투표/조회
  - `decisions` — 팀 멤버만 조회

> **🛑 섹션 2-A 완료 후 멈추고 진행 여부 확인**

---

### 섹션 2-B: Supabase 클라이언트 설정 + 인증 구현

- `.env.local`에 Supabase URL, Anon Key 설정
- `lib/supabase/client.ts` — 브라우저용 Supabase 클라이언트 생성
- `lib/supabase/server.ts` — 서버용 Supabase 클라이언트 생성
- `lib/supabase/middleware.ts` — 세션 갱신 미들웨어
- `middleware.ts` (루트) — 인증 미들웨어 적용
- 인증 페이지 Supabase Auth로 교체
  - 로그인 페이지 — `supabase.auth.signInWithPassword` 연동
  - 회원가입 페이지 — `supabase.auth.signUp` 연동
  - 로그아웃 — `supabase.auth.signOut` 연동
- `lib/authContext.tsx` 제거 또는 Supabase Auth 기반으로 교체
- 인증 상태에 따른 리다이렉트 동작 확인

> **🛑 섹션 2-B 완료 후 멈추고 진행 여부 확인**

---

### 섹션 2-C: 팀 API 구현 + UI 연동

- Route Handler 작성
  - `app/api/teams/route.ts`
    - `POST` — 팀 생성 + 생성자 멤버십 자동 추가
    - `GET` — 내가 속한 팀 목록 조회
  - `app/api/teams/[teamId]/join/route.ts`
    - `POST` — 팀 참가 (초대 코드 검증)
- 팀 목록 페이지 연동
  - 목업 데이터 → `GET /api/teams` 호출로 교체
  - 팀 생성 → `POST /api/teams` 호출로 교체
  - 팀 참가 → `POST /api/teams/[teamId]/join` 호출로 교체
- 에러 처리 (401, 409 등) 및 사용자 피드백 UI

> **🛑 섹션 2-C 완료 후 멈추고 진행 여부 확인**

---

### 섹션 2-D: 세션 API 구현 + UI 연동

- Route Handler 작성
  - `app/api/teams/[teamId]/sessions/route.ts`
    - `POST` — 새 세션 생성 (status: open)
    - `GET` — 팀의 세션 목록 조회 (최신순)
  - `app/api/teams/[teamId]/sessions/[sessionId]/route.ts`
    - `GET` — 세션 상세 조회 (후보, 투표, 확정 결과 포함)
  - `app/api/teams/[teamId]/sessions/[sessionId]/close/route.ts`
    - `PATCH` — 세션 마감 + 확정 로직 실행
      - 후보 0개 → `400` 에러
      - 최다 득표 후보 확정
      - 동점 시 랜덤 선택
      - Decision 레코드 생성
      - 세션 status → `closed` 변경
- 세션 목록 페이지 연동
  - 목업 데이터 → API 호출로 교체
- 세션 생성 → API 호출로 교체
- 세션 상세 페이지 → API 호출로 교체

> **🛑 섹션 2-D 완료 후 멈추고 진행 여부 확인**

---

### 섹션 2-E: 후보 + 투표 API 구현 + UI 연동

- Route Handler 작성
  - `app/api/sessions/[sessionId]/candidates/route.ts`
    - `POST` — 후보 메뉴 추가
      - 중복 메뉴명 → `409`
      - 세션 마감 상태 → `400`
    - `GET` — 후보 목록 조회 (득표 수 포함)
  - `app/api/sessions/[sessionId]/votes/route.ts`
    - `POST` — 투표 (1인 1표, 기존 투표 시 변경)
      - 세션 마감 상태 → `400`
      - 존재하지 않는 후보 → `404`
- 세션 상세 페이지 연동
  - 메뉴 제안 → `POST /api/sessions/[sessionId]/candidates` 호출
  - 후보 목록 → `GET /api/sessions/[sessionId]/candidates` 호출
  - 투표 → `POST /api/sessions/[sessionId]/votes` 호출
  - 마감 → `PATCH /api/teams/[teamId]/sessions/[sessionId]/close` 호출
- 에러 처리 및 사용자 피드백 UI
  - 중복 메뉴 에러 메시지
  - 마감 후 액션 차단 안내

> **🛑 섹션 2-E 완료 후 멈추고 진행 여부 확인**

---

### 섹션 2-F: 이력 API 구현 + UI 연동

- Route Handler 작성
  - `app/api/teams/[teamId]/history/route.ts`
    - `GET` — 확정 메뉴 이력 목록 (날짜, 메뉴명, 득표 수)
- 이력 페이지 연동
  - 목업 데이터 → `GET /api/teams/[teamId]/history` 호출로 교체
- 이력 항목 클릭 → 세션 상세 페이지 이동 확인

> **🛑 섹션 2-F 완료 후 멈추고 진행 여부 확인**

---

### 섹션 2-G: 통합 테스트 + 마무리

- 전체 플로우 재검증 (Supabase 실데이터 기반)
  - 회원가입 → 로그인
  - 팀 생성 → 팀 목록 확인
  - 세션 생성 → 메뉴 제안 → 투표 → 마감 → 확정
  - 이력 조회
  - 로그아웃 → 재로그인
- RLS 동작 확인
  - 타 팀 데이터 접근 불가 확인
  - 비로그인 상태 API 접근 차단 확인
- 에러 처리 점검
  - 네트워크 오류 시 사용자 안내
  - 잘못된 요청 시 에러 메시지 표시
- `mockData.ts` 관련 코드 정리 (미사용 목업 데이터 제거)
- `data/` 폴더 정리 (더 이상 필요 없으면 제거)
- 코드 최종 정리
  - 사용하지 않는 import 제거
  - 타입 누락 확인
  - console.log 제거

> **🛑 섹션 2-G 완료 → 2단계 종료**

