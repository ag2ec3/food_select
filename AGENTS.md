# AGENTS.md — AI 코딩 가이드

이 문서는 이 프로젝트에서 AI에게 코드 생성·수정을 요청할 때 **반복 설명 없이** 일관된 결과를 받기 위한 규칙이다.

---

## 기술 스택 (고정)

| 영역 | 선택 |
|------|------|
| 프레임워크 | **Next.js** — **App Router** (`app/` 디렉터리)만 사용 |
| 언어 | **TypeScript** (`.ts`, `.tsx`) — JavaScript 단일 파일로 새 기능을 만들지 않는다 |
| 스타일 | **Tailwind CSS** — 유틸리티 클래스 기반 |
| 데이터베이스 / 백엔드 | **Supabase** (Auth, DB, Storage 등 프로젝트에 맞게) |

---

## 반드시 지켜야 할 것 (DO)

### Next.js / 구조

- **`app/` 라우팅**: `pages/` Router 패턴, `getServerSideProps` 등 Pages 전용 API는 사용하지 않는다.
- **서버/클라이언트 구분**: `"use client"`는 클라이언트 전용 훅·이벤트·브라우저 API가 필요한 최소 범위 컴포넌트에만 붙인다. 그 외는 기본적으로 Server Component로 둔다.
- **파일 규칙**: App Router 관례를 따른다 (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts` 등).
- **메타데이터**: `metadata` / `generateMetadata` 등 App Router 방식으로 처리한다.

### TypeScript

- **명시적 타입**: props, API 응답, Supabase 행(row) 등 공개 경계에는 타입을 둔다.
- **`any` 남용 금지 대신**: unknown + 타입 가드, 또는 Supabase 생성 타입(`Database` 등)을 사용한다.
- **strict 유지**: 프로젝트 `tsconfig`의 strict 설정을 깨지 않는다.

### Tailwind CSS

- **스타일링**: 새 UI는 Tailwind 유틸리티로 작성한다. 인라인 `style`은 접근성·동적 값 등 필요한 경우만.
- **일관성**: spacing, typography, color는 디자인 토큰/테마(`tailwind.config`)와 맞춘다.
- **반응형**: `sm:`, `md:` 등 브레이크포인트를 프로젝트 기본에 맞게 사용한다.

### Supabase

- **환경 변수**: URL·Anon Key 등은 코드에 하드코딩하지 않고 `process.env` / Next.js 환경 변수 규칙을 따른다.
- **보안**: Service Role 키는 클라이언트 번들에 넣지 않는다. 서버 전용 API Route / Server Action / 서버 컴포넌트에서만 사용한다.
- **쿼리**: RLS(행 수준 보안)를 전제로 하고, 클라이언트에서 불필요한 광범위 쿼리를 피한다.
- **타입**: 가능하면 Supabase CLI 등으로 스키마 기반 타입을 생성해 사용한다.

### 공통

- **기존 코드 스타일**: import 순서, naming, 폴더 구조를 파일마다 다르게 만들지 않고 기존 패턴에 맞춘다.
- **에러 처리**: 사용자에게 보이는 실패와 로그/모니터링을 고려한 처리를 한다.
- **접근성**: 시맨틱 HTML, 적절한 레이블, 키보드 조작 가능성을 기본으로 고려한다.

---

## 하면 안 되는 것 (DON'T)

### Next.js

- **`pages/` 디렉터리**로 새 라우트를 추가하지 않는다. (App Router만)
- **구버전 권장 패턴**으로 새 코드를 작성하지 않는다 (`pages/api`만으로 API를 새로 깔지 않는다 — 필요 시 `app/**/route.ts` 또는 프로젝트가 정한 방식).
- **`"use client"`를 루트 `layout.tsx`나 큰 트리 전체**에 무분별하게 붙이지 않는다.

### TypeScript

- **`.js` / `.jsx`로 새 페이지·컴포넌트**를 추가하지 않는다.
- **`any`로 타입 에러를 덮어쓰기**만 하고 넘어가지 않는다.

### 스타일

- **CSS Modules, styled-components, vanilla CSS 파일**로 새 UI를 주로 만들지 않는다. (프로젝트가 이미 혼용 중이면 기존만 유지하고, 신규는 Tailwind 우선)
- **인라인 스타일로 레이아웃 전체를 구성**하지 않는다.

### Supabase

- **Anon 키를 쓰는 클라이언트에서 RLS 우회**를 가정한 위험한 패턴을 쓰지 않는다.
- **민감한 키를 `NEXT_PUBLIC_`에 두지 않는다.**

### 일반

- 사용하지 않는 **대규모 의존성**을 임의로 추가하지 않는다. 추가 시 이유를 짧게라도 남긴다.
- **보안·성능을 악화시키는 단축코드**(예: dangerouslySetInnerHTML에 비신뢰 데이터)를 기본으로 제안하지 않는다.

---

## AI에게 요청할 때 문장 예시

- "이 프로젝트는 `AGENTS.md` 스택과 DO/DON'T를 따라줘."
- "App Router + TS + Tailwind + Supabase 기준으로만 작성해줘."

---

## 변경 시

스택이나 팀 규칙이 바뀌면 이 파일을 먼저 수정한 뒤 AI에게 작업을 요청한다.
