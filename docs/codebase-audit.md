# 코드베이스 점검 리포트 (Next.js · TypeScript)

점검 일자: 2026-03-28  
범위: 저장소 TypeScript/TSX (주로 `frontend/`)  
참고: 전역 검색에서 `any` / `as any` 미발견, `frontend`에서 `npm run lint` 경고 없음.

---

## 점검 항목

- 코드 중복 (동일·유사 로직이 여러 파일에 산재)
- 함수·컴포넌트 크기 (50줄 이상, 단일 책임 원칙 위반)
- 타입 정의 (`any` 사용, 느슨한 타입, 누락된 인터페이스)
- 네이밍 일관성 (함수명·변수명·파일명 컨벤션 불일치)
- 불필요한 의존성 (사용하지 않는 import, 과도한 props drilling)

---

## 결과 표

| 일련번호 | 우선순위 | 파일 | 위치 | 문제 | 권고사항 |
| --- | --- | --- | --- | --- | --- |
| 1 | High | `frontend/app/api/teams/[teamId]/sessions/route.ts` vs `frontend/app/api/teams/[teamId]/history/route.ts` | 각 파일 상단 `countBySessionId` 함수 | 동일한 `countBySessionId` 구현이 두 라우트에 복제됨 | 공용 유틸(예: `lib/api/aggregates.ts`)로 한 곳에 두고 import |
| 2 | High | `frontend/app/api/teams/join/route.ts` vs `frontend/app/api/teams/[teamId]/join/route.ts` | `mapJoinRpcError`(약 9–22행) vs POST 내 `if (msg.includes(...))` 블록(약 44–58행) | 팀 참가 RPC 오류 → HTTP 응답 매핑 로직이 한쪽은 함수화, 다른 쪽은 인라인으로 중복 | 동일 `mapJoinRpcError`를 공유하거나 공통 `joinRpc` 헬퍼로 통합 |
| 3 | High | `frontend/app/teams/[teamId]/sessions/[sessionId]/page.tsx` | 컴포넌트 전체(약 27–477행, 단일 `default export`) | 데이터 로딩·에러·폼(메뉴 추가)·투표·마감·목록 UI가 한 컴포넌트에 집중되어 50줄 기준을 크게 초과, SRP 위반 | `useSessionDetail` 훅, `SessionHeader` / `MenuProposalForm` / `CandidateList` / `CloseSessionSection` 등으로 분리 |
| 4 | High | `frontend/app/teams/[teamId]/page.tsx` | `TeamSessionsPage` 본문(약 53–368행) | 팀·세션·멤버 병렬 fetch, 파생 상태, 세션 생성, 멤버/세션 UI가 한 페이지에 집합 | 데이터 로딩 훅 + `MemberSection` + `SessionSections` 컴포넌트로 책임 분할 |
| 5 | Medium | 다수 `frontend/app/api/**/route.ts` | 예: `teams/route.ts` POST, `join`·`candidates`·`votes`의 `request.json()` 및 필드 추출 | `try { body = await request.json() }` + `unknown`에서 문자열 필드 꺼내는 패턴이 반복 | `parseJsonBody(request)` + `getStringField(body, "name")` 같은 소형 파서/가드 유틸로 통일 |
| 6 | Medium | `frontend/app/api/**/route.ts` | 각 파일의 `type RouteContext = { params: Promise<...> }` | 동일한 App Router 컨텍스트 타입이 라우트마다 재선언 | 공통 `RouteContext` 제네릭 타입을 `lib/api/routeTypes.ts` 등에 두고 재사용 |
| 7 | Medium | `frontend/components/SessionCard.tsx`, `frontend/app/teams/[teamId]/page.tsx`, `frontend/components/HistoryItem.tsx` | `formatDateTime` / `formatJoinedAt` / `formatDecidedDate` | `toLocaleString("ko-KR", { year, month, day, hour, minute })` 패턴이 세 곳에 거의 동일하게 존재 | `lib/formatDate.ts` 등 단일 `formatShortDateTime(iso: string)`로 통합 |
| 8 | Medium | `frontend/components/TeamCreateModal.tsx` vs `frontend/components/TeamJoinModal.tsx` | 오버레이·닫기·Escape·다이얼로그 래퍼·폼/에러/버튼 레이아웃 | 구조와 이펙트(오픈 시 초기화, Escape)가 거의 동일한 중복 | 베이스 `ModalShell` + 필드만 다른 자식, 또는 공통 `useModalKeyboard(open, onClose)` |
| 9 | Medium | `frontend/app/login/page.tsx` vs `frontend/app/signup/page.tsx` | 레이아웃·`useEffect` 리다이렉트·폼 래퍼·인풋 클래스 | 인증 페이지 골격과 스타일이 유사하게 반복 | 공유 `AuthFormLayout` / `FormField` 컴포넌트로 마크업·클래스 중복 축소 |
| 10 | Medium | `frontend/app/teams/[teamId]/sessions/[sessionId]/page.tsx` 등 | `useParams()`에서 `teamId`/`sessionId` 정규화(약 31–42행 등) | 문자열·배열 분기 로직이 팀 상세·히스토리·세션 상세에 반복 | `useRouteParam("teamId")` 훅으로 일원화 |
| 11 | Medium | `frontend/app/teams/page.tsx`, `[teamId]/page.tsx`, `[teamId]/history/page.tsx`, `sessions/[sessionId]/page.tsx` | 각 `load*` / `useEffect` + `fetch` + `json().catch(() => ({}))` | 클라이언트 API 호출·에러 문자열·취소 플래그 패턴이 페이지마다 유사 | `fetchApiJson<T>(url, init)` 또는 SWR/React Query 도입 시 한 패턴으로 수렴 |
| 12 | Medium | `frontend/lib/types.ts` | `Membership.role: string` | 역할이 도메인상 제한적일 가능성이 있는데 문자열로만 표현 | `"owner" \| "member"` 등 유니온 또는 DB 생성 타입과 정렬 |
| 13 | Medium | 여러 `route.ts` 및 클라이언트 페이지 | `as Team`, `as Candidate[]`, `as Session`, 중첩 관계 `teams`/`memberships` 수동 캐스팅 | Supabase 행 타입과 응답 타입이 컴파일 타임에 강하게 연결되지 않음 | Supabase CLI 생성 `Database` 타입과 `select` 문자열을 맞추거나, 응답용 Zod/스키마로 파싱 후 타입 확정 |
| 14 | Medium | `frontend/app/teams/[teamId]/sessions/[sessionId]/page.tsx` | `detailRes.json()` 후 `as { error?: string } & Partial<SessionDetailJson>` | 응답이 부분적으로만 타입되어 런타임과 불일치 위험 | 서버 응답 스키마 검증 또는 생성된 API 클라이언트 타입으로 좁히기 |
| 15 | Low | `frontend/app/teams/[teamId]/sessions/[sessionId]/page.tsx` vs `frontend/components/SessionCard.tsx` | 상태 뱃지 `className`(진행 중/종료) | Tailwind 조합이 카드와 상세 헤더에 유사 반복 | 공유 `SessionStatusBadge` 컴포넌트로 시각적 일관성·중복 제거 |
| 16 | Low | `frontend/app/api/sessions/[sessionId]/candidates/route.ts` vs `.../votes/route.ts` | POST 초반 세션 조회·404·closed 검사 | 동일한 “세션 존재·오픈 여부” 선검사가 두 파일에 반복 | `assertSessionOpenForMutation(supabase, sessionId)` 같은 내부 헬퍼 |
| 17 | Low | `frontend/components/TeamJoinModal.tsx` | `Geist_Mono` `next/font` 임포트 | 모달 한 곳에서만 폰트 로드; 기능상 문제는 아니나 번들/패턴 측면에서 이질적 | 레이아웃 또는 공통 컴포넌트에서 한 번 로드하거나, 유틸 클래스로 통일 여부 검토 |
| 18 | Low | 클라이언트 페이지 전반 | `loadData` / `loadDetail` / `loadTeams` 등 명명 | 역할은 비슷한데 이름만 파일마다 다름 | `loadPageData` 또는 리소스 단위 `loadTeam`, `loadSessionDetail`로 팀 컨벤션 문서화 |

---

## 요약

- **중복**: API 라우트(집계 함수·JSON 파싱·참가 오류 매핑)·날짜 포맷·모달/인증 폼·클라이언트 fetch 패턴에서 두드러짐.
- **크기·SRP**: 세션 상세 페이지와 팀 대시보드 페이지가 가장 큼.
- **타입**: `any`는 없으나 `as` 단언과 `role: string`, 클라이언트 `Partial<>` 조합에 완화 여지가 있음.
- **Props**: `SessionCard` 등은 props가 얕아 prop drilling 이슈는 낮음.
- **의존성**: `package.json`은 Next·Supabase·React 중심으로 과도하지 않음.
