# Next.js + Supabase 성능 감사 및 개선 기록

이 문서는 프로젝트에 대해 수행한 성능 감사 결과와, 이후 코드에 반영한 개선 사항을 정리한다. (Git 푸시·커밋 메타와는 별개의 기술 요약이다.)

---

## 감사 시점의 긍정적 관찰

- 팀 히스토리·세션 목록 API는 `session_id` 단위 배치 조회와 후보 메뉴명 일괄 조회로 **N+1을 피하는 구조**가 이미 있었다.
- 팀 목록 API는 `memberships(count)` 등 **집계를 DB에 맡기는** 선택이 있었다.
- 세션 상세 페이지는 `useCallback` / `useMemo`로 로더와 파생 데이터를 일부 정리해 두었다.

---

## 성능 감사 결과 (표)

| 일련번호 | 심각도 | 파일 | 위치 | 문제 | 권고사항 |
|---|---|---|---|---|---|
| 1 | High | `frontend/middleware.ts` + `frontend/lib/api/routeHelpers.ts` | `matcher`가 `/api` 포함 · 각 Route Handler의 `getSupabaseAndUser()` | 미들웨어에서 이미 `getUser()`로 세션을 갱신·검증한 뒤, API 라우트에서 다시 `getUser()`를 호출하면 **요청당 Supabase Auth 왕복이 이중**이 될 수 있음 | API 경로를 미들웨어에서 제외하거나, 라우트에서는 쿠키만 신뢰·한 번만 검증하는 식으로 역할을 나누는 방안 검토 |
| 2 | High | `frontend/app/teams/[teamId]/sessions/[sessionId]/page.tsx` | `loadDetail` 내 `Promise.all` — `GET /api/teams` | 세션 상세만 필요해도 **전체 팀 목록**을 매번 받아 이름만 찾음 | `GET /api/teams/:teamId` 같은 단건 엔드포인트, 또는 세션 상세 응답에 `team_name` 포함 등으로 페이로드·쿼리 축소 |
| 3 | High | `frontend/app/teams/[teamId]/page.tsx`, `frontend/app/teams/[teamId]/history/page.tsx` | 각 `loadData` | 팀 컨텍스트 확인에 **동일하게 전체 팀 목록**을 사용 | 위와 동일; 팀 단건 조회 또는 서버 컴포넌트에서 1회 로드 후 하위로 전달 검토 |
| 4 | High | `frontend/app/teams/[teamId]/sessions/[sessionId]/page.tsx` | 투표·메뉴 추가·마감 후 `loadDetail()` | 변동 후에도 다시 **`/api/teams` 전체 목록**을 함께 재요청 | 낙관적 UI 또는 세션 상세만 무효화·재조회; 팀명은 로컬 상태 캐시 |
| 5 | High | `frontend/app/api/teams/[teamId]/sessions/[sessionId]/route.ts` | `GET` — `sessions` / `candidates` / `votes` / `decisions` | **`.select('*')`** 로 스키마 확장 시 불필요 컬럼·페이로드까지 전달 | 클라이언트·타입에 맞춰 명시 컬럼만 선택 |
| 6 | High | `frontend/app/api/teams/[teamId]/sessions/route.ts` | `GET` — `sessions` | **`.select('*')`** | 목록 카드에 필요한 필드만 선택해 응답 크기·DB IO 감소 |
| 7 | Medium | `frontend/app/api/sessions/[sessionId]/candidates/route.ts` | `GET` 후보 목록, `POST` insert 반환 | **`.select('*')`** | `id`, `session_id`, `menu_name`, `created_at` 등 필요한 컬럼만 |
| 8 | Medium | `frontend/app/api/sessions/[sessionId]/votes/route.ts` | `POST` insert 반환 | **`.select('*')`** | 클라이언트가 쓰는 필드만 반환 |
| 9 | Medium | `frontend/app/teams/page.tsx` + `TeamCreateModal.tsx` / `TeamJoinModal.tsx` | `onClose={() => set…}` 전달 · 모달 내부 `useEffect(..., [open, onClose])` | 부모가 리렌더될 때마다 **`onClose` 참조 변경** → Escape 키 리스너 effect가 불필요하게 재실행 | `onClose`를 `useCallback`으로 안정화하거나, 모달에서 ref로 최신 콜백만 참조 |
| 10 | Medium | `frontend/app/layout.tsx` | `Geist` + `Geist_Mono` 동시 로드 | 모노스페이스는 초대 코드 입력 등 **일부 UI**에서만 쓰이는데도 **모든 페이지**에서 폰트 리소스 로드 가능성 | `next/font` 서브셋 유지 또는 모노를 해당 클라이언트 블록에서만 로드하는 방식 검토 |
| 11 | Medium | `frontend/app/teams/page.tsx` | 정적 import `TeamCreateModal`, `TeamJoinModal` | 모달은 저빈도인데 **초기 JS 번들**에 포함 | `next/dynamic` + `ssr: false` 등으로 열 때만 로드 검토 |
| 12 | Medium | 여러 `"use client"` 페이지 | `fetch('/api/...')` 직접 호출 | **브라우저 캐시 / SWR / 서버 재검증 없음** — 라우트 이동마다 전량 재페칭 | 짧은 `staleTime` 캐시, React Query/SWR, 또는 RSC에서 초기 데이터 전달 등으로 중복 완화 |
| 13 | Medium | `frontend/app/teams/[teamId]/page.tsx` | 렌더 본문 `new Map(sessions.map(...))` | 세션 수가 많으면 **렌더마다 Map 재생성** | `sessions`가 바뀔 때만 `useMemo`로 Map 생성 |
| 14 | Medium | `frontend/app/layout.tsx` · `frontend/lib/authContext.tsx` | 루트 `AuthProvider` | `user` / `ready` 변경 시 **헤더·main 전체가 리렌더**되는 구조 | 필요 시 컨텍스트 분리·구독 범위 축소 검토 |
| 15 | Medium | (당시 코드베이스) | UI에 `<img>` 없음 | 이미지가 추가될 때 **최적화·CLS 대비 없음** | 아바타 등 추가 시 `next/image`, `sizes`, 고정 비율·placeholder |

`frontend/app/api/teams/[teamId]/members/route.ts`는 `memberships`에 대해 필요한 컬럼만 조회해 **`select *` 과다 패턴은 보이지 않았다.**

---

## 이후 코드에 반영한 개선 (요약)

| 감사 항목 | 적용 내용 |
|-----------|-----------|
| 미들웨어 + API 이중 `getUser` | `middleware.ts` matcher에서 `api/` 경로 제외 |
| 팀 목록 전량 페칭 | `GET /api/teams/[teamId]` 추가. 팀 홈·이력 페이지는 단건 API 사용 |
| 세션 상세 + 팀명 | 세션 상세 API에 `teams(name)` embed → 응답 필드 `team_name`. 클라이언트는 상세 단일 요청 |
| `select('*')` | 세션 목록/상세, 후보, 투표, 결정 등 필요 컬럼만 지정 |
| 모달 `onClose` / 핸들러 | `teams/page.tsx`에서 `useCallback`으로 안정화 |
| 모달 번들 | `next/dynamic` + `ssr: false`로 생성/참가 모달 지연 로드 |
| `sessionMeta` Map | `teams/[teamId]/page.tsx`에서 `useMemo` |
| Geist Mono | 루트 레이아웃에서 제거, `TeamJoinModal`에서만 로드 |
| 명세 | `api-spec.md`에 단건 팀 GET 및 세션 상세 `team_name` 반영 |

### 의도적으로 두지 않은 것

- 클라이언트 fetch 캐시(SWR 등): 새 의존성 없이 유지.
- `AuthProvider` 분리: 변경 범위가 커서 미적용.
- `next/image` / `next.config` 패키지 최적화: 당시 이미지 미사용 등으로 생략.

---

## 관련 스킬

- `.cursor/skills/nextjs-supabase-performance-audit/SKILL.md` — 동일 형식의 감사를 반복할 때 사용한다.
