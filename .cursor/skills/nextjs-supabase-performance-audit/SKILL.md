---
name: nextjs-supabase-performance-audit
description: >-
  Audits Next.js App Router and Supabase-backed code for client re-renders,
  data fetching (N+1, duplication, caching), bundle size, next/image and fonts,
  and API/PostgREST column selection. Produces a severity table only unless the
  user requests fixes. Use when the user asks for a performance audit, 성능 감사,
  Lighthouse-style review of API routes, or optimization review of this stack.
---

# Next.js + Supabase 성능 감사

## 역할

시니어 성능 엔지니어 관점에서 **코드를 수정하지 않고** 이슈와 권고만 정리한다. 사용자가 명시적으로 수정을 요청할 때만 구현한다.

## 심각도

| 등급 | 기준 |
|------|------|
| **Critical** | 누적 지연이나 비용이 사용자 체감·운영에 직접적이고 크게 영향 (예: 요청당 다중 외부 인증 왕복이 필수 경로 전체에 깔림) |
| **High** | 눈에 띄는 중복 작업·과대 페이로드·불안정 훅 의존성으로 인한 낭비 |
| **Medium** | 규모가 커지면 문제가 되는 패턴, 마이크로 최적화, 구성/캐시 미활용 |

## 감사 체크리스트

1. **리렌더링**: `"use client"` 페이지·모달·컨텍스트; `useEffect` 의존성 배열; 부모가 매 렌더 새 함수를 넘기는지; `useMemo`/`useCallback`/`React.memo` 필요 여부(과도 적용은 지양).
2. **데이터 페칭**: 클라이언트 `fetch` 중복(같은 엔드포인트를 한 화면에서 여러 번); N+1(루프 안 DB/API 호출); `Promise.all` 배치 여부; Next `fetch` 캐시/`revalidate`/RSC 이전 가능성.
3. **번들**: 큰 라이브러리 전역 import; 모달·에디터 등 저빈도 UI에 `next/dynamic` 적합성; 레이아웃이 불필요한 클라이언트 트리를 끌고 오는지.
4. **이미지·폰트**: `next/image`·`sizes`·고정 높이(CLS); `next/font` 다중 패밀리가 실제 사용 대비 과한지.
5. **API·Supabase**: `.select('*')` vs 필요 컬럼; 응답에 클라이언트가 쓰지 않는 행/필드; INSERT 후 `.select()` 범위.

## 미들웨어·인증 (이 스택에서 자주 나오는 항목)

- `middleware` matcher가 `/api`를 포함하면 **요청마다** 세션 갱신·`getUser` 류가 실행될 수 있고, Route Handler에서 다시 `getSupabaseAndUser()`를 호출하면 **동일 요청에서 인증 확인이 이중**일 수 있다. 증상·완화(예: API 경로 제외, 역할 분리)를 근거와 함께 표에 적는다.

## 출력 형식 (필수)

마크다운 표 한 개:

```markdown
| 일련번호 | 심각도 | 파일 | 위치 | 문제 | 권고사항 |
|---|---|---|---|---|---|
```

- **파일**: 리포지토리 기준 경로(예: `frontend/app/...`).
- **위치**: 대략적 식별(함수명, 라인 대역, 또는 `GET`/`POST` 등).
- 한 행에 한 이슈; 동일 코드에 복수 이슈면 행을 나눈다.

## 진행 순서

1. 사용자가 지정한 경로(또는 `frontend/app`, `frontend/app/api`, `frontend/components`, `frontend/lib`)를 검색·열람한다.
2. 체크리스트에 맞춰 근거가 있는 항목만 표에 넣는다; 추측은 "가정"이라고 표시하거나 생략한다.
3. 긍정적 관찰(이미 배치 쿼리 등)은 짧은 요약 문단으로 표 앞뒤에 선택적으로 적어도 된다.

## 금지

- 스킬 적용만으로 **임의 리팩터**나 의존성 추가를 하지 않는다.
- 사용자가 감사만 요청한 경우 **코드 수정 제안을 구현하지 않는다**.
