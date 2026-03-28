# OWASP 중심 보안 감사 보고서

**범위:** `frontend/app/api/**/*.ts`, `frontend/lib/api/routeHelpers.ts`, `frontend/app/teams/page.tsx`(팀 참가 흐름), `supabase/migrations/*.sql`(검토 구간 내 RPC·RLS)  
**기준:** OWASP Top 10 정렬 스킬 — SQLi, 세션, 정보 노출, bcrypt(해당 시)  
**비고:** 의존성 CVE 전수 스캔·전 제품 위협 모델은 범위 외.

---

## 요약

- **SQL 인젝션:** 검토 구간에서 동적 SQL 문자열 결합·비바인딩 raw 쿼리는 확인되지 않음. Supabase 클라이언트·RPC 인자는 파라미터화된 사용.
- **세션:** 커스텀 세션 저장소 없음. `@supabase/ssr` + 쿠키 기반 `getUser()` 패턴. 별도 토큰 회전/무효화 로직은 앱 코드에 없으며 Supabase Auth 동작에 의존.
- **Bcrypt/비밀번호:** 앱 라우트에 직접 비밀번호 해시·비교 코드 없음(Supabase Auth 위임). 해당 항목 심사 대상 없음.

---

## 발견 사항

| 일련번호 | 심각도 | 파일 | 위치 | 문제 | 권고사항 |
|---------|--------|------|------|------|----------|
| 1 | High | `supabase/migrations/20260327140000_teams_invite_and_team_rpcs.sql` / `frontend/app/teams/page.tsx` | `lookup_team_invite` 정의·GRANT; 클라이언트 `supabase.rpc("lookup_team_invite", …)` (약 85–88행) | `SECURITY DEFINER` RPC가 `authenticated`에 공개되어, 추측한 초대 문자열이 유효할 때 **팀 UUID를 즉시 반환**한다. 무차별 대입 시 “존재/불일치” 오라클이 되어 초대 코드 공간이 상대적으로 작을 때 가입 링크 노출 위험이 커진다. | 조회와 가입을 **단일 서버 경로 또는 단일 RPC**로 묶고 클라이언트 직접 lookup 제거; **속도 제한·실패 누적 제한**; 초대 토큰 **엔트로피·길이** 상향 및 **암호학적 난수** 사용(팀 생성 측과 일관). |
| 2 | Medium | `frontend/app/api/teams/route.ts` | `GET` 오류 처리(약 27–28행), `POST` 오류 처리(약 90–111행) | 500 응답 본문에 PostgREST/Supabase `error.message`를 그대로 넣어 **DB·스키마·내부 실패 단서**가 클라이언트에 노출될 수 있다. | `routeHelpers.ts`의 `jsonInternalError`와 같이 **서버 로그에만 상세**, 클라이언트에는 고정 문구만 반환. |
| 3 | Medium | `frontend/app/api/teams/[teamId]/members/route.ts` | 멤버십 조회 실패(약 27–28행), 목록 조회 실패(약 40–44행) | 위와 동일하게 `mErr.message` / `error.message`를 사용자 응답에 포함. | 동일. |
| 4 | Medium | `frontend/app/api/teams/[teamId]/join/route.ts` | 매핑되지 않은 RPC 오류(약 54행) | `jsonError(500, msg \|\| …)`로 **PostgreSQL/PostgREST 전체 메시지**가 클라이언트로 전달될 수 있다. | 알려진 비즈니스 오류만 메시지 매핑, 그 외는 **일반화된 500** + 서버 로그. |
| 5 | Medium | `frontend/app/api/teams/[teamId]/sessions/route.ts` | `GET`/`POST` 오류(약 38–39, 109–113행) | `sErr.message`, `error.message` 직접 반환. | 동일하게 `jsonInternalError` 패턴으로 통일. |
| 6 | Medium | `frontend/app/api/teams/[teamId]/history/route.ts` | 여러 분기(약 45–46, 65–69, 86–87행) | 동일. | 동일. |
| 7 | Medium | `frontend/app/api/teams/route.ts` | `randomInviteCode` (약 9–16행) | 초대 코드 접미사 생성에 `Math.random()` 사용. **암호학적이지 않은** 난수로, 이론적으로 예측·편향 이슈가 `crypto` 기반보다 불리하다. | Node `crypto` 모듈의 `randomInt` / 랜덤 바이트 기반 인코딩 등으로 교체. |

---

## 긍정적 관찰(참고)

- `frontend/lib/api/routeHelpers.ts`의 `jsonInternalError`는 원인을 `console.error`로 남기고 사용자에게는 고정 메시지를 주는 양호한 패턴이다. 다만 위 표의 일부 라우트에서는 이 패턴이 적용되지 않는다.
- `close_session_pick_winner` RPC는 `SECURITY DEFINER`이나 `search_path` 고정, `auth.uid()`·`is_team_member`·세션–팀 일치 검증 등으로 이중 마감·크로스 팀 혼입을 완화하는 구조가 보인다.
- RLS 정책이 `user_can_access_session` / `is_team_member`에 기대도록 설계되어 있어, 세션·후보·투표 접근이 DB 단에서 팀 멤버십과 연계된다.

---

*본 문서는 감사(보고) 목적이며, 수정은 별도 요청 시 진행하면 된다.*
