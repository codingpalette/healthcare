# Healthcare Platform - Claude Code Rules

## 프로젝트 개요
헬스장 맞춤형 헬스케어 플랫폼. 회원-트레이너 연결 웹 서비스.

## 기술 스택
- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-nova)
- **State:** Zustand (클라이언트), TanStack Query (서버)
- **API:** Hono (Next.js API Route 내장, `/api` basePath)
- **DB/Auth:** Supabase
- **Test:** Vitest + React Testing Library + MSW + Playwright

## 아키텍처: FSD (Feature-Sliced Design)

```
src/
├── app/          # Next.js App Router (라우팅 전용)
├── views/        # FSD 페이지 컴포지션 (Next.js pages 충돌 방지를 위해 views로 명명)
├── widgets/      # 복합 UI 블록
├── features/     # 비즈니스 기능 (diet, workout, qna, equipment)
├── entities/     # 도메인 엔티티 (user, meal, workout, question, equipment)
└── shared/       # 공유 유틸, UI, API, hooks, types, config
```

### FSD 의존성 규칙 (반드시 준수)
- **상위 레이어는 하위 레이어만 import 가능** (단방향 의존)
- `app` → `views` → `widgets` → `features` → `entities` → `shared`
- 같은 레이어 내 cross-import 금지 (예: `features/diet`에서 `features/workout` import 불가)
- `shared`는 어디서든 import 가능하지만, `shared`는 다른 레이어를 import 불가

### FSD 슬라이스 구조
각 feature/entity 슬라이스는 다음 구조를 따른다:
```
feature-name/
├── index.ts      # Public API (barrel export만 허용)
├── model/        # 상태, 스토어, 비즈니스 로직
├── ui/           # React 컴포넌트
└── api/          # API 호출, 데이터 페칭
```
- 외부에서는 반드시 `index.ts`를 통해서만 접근
- 슬라이스 내부 파일 직접 import 금지

## 경로 별칭
- `@/*` → `./src/*` (tsconfig paths)

## 주요 명령어
```bash
pnpm dev          # 개발 서버 (turbopack)
pnpm build        # 프로덕션 빌드
pnpm typecheck    # TypeScript 타입 검사
pnpm lint         # ESLint
pnpm test         # Vitest 단위/통합 테스트
pnpm test:watch   # Vitest watch 모드
pnpm test:e2e     # Playwright E2E 테스트
```

## 코딩 컨벤션

### 일반
- 한국어 주석 사용
- `"use client"` 디렉티브는 클라이언트 컴포넌트에만 명시
- Import 경로는 항상 `@/` 별칭 사용 (상대경로 지양)
- shadcn/ui 컴포넌트 추가 시 `pnpm dlx shadcn@latest add <component>` 사용

### API 라우트
- Hono 앱: `src/app/api/[[...route]]/route.ts`
- 새 엔드포인트는 Hono 라우터에 추가

### Supabase
- 클라이언트: `@/shared/api/supabase`
- 환경변수: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`

### Supabase 마이그레이션 (반드시 준수)
- 테이블 생성/수정, RLS 정책, 함수, 트리거 등 DB 스키마 변경 시 **반드시 SQL 마이그레이션 파일 작성**
- 경로: `supabase/migrations/<timestamp>_<설명>.sql`
- 파일명 예시: `20260312120000_create_users_table.sql`
- 타임스탬프 형식: `YYYYMMDDHHMMSS`
- 코드에서 직접 DB 스키마를 변경하지 않고, 마이그레이션 SQL을 통해서만 관리
- 마이그레이션은 **멱등성(idempotent)** 을 고려하여 작성 (예: `CREATE TABLE IF NOT EXISTS`)
- 사용자가 `supabase db push` 또는 `supabase migration up`으로 적용할 수 있도록 작성

### 테스트 전략
- `shared` & `entities`: 단위 테스트 (Vitest) - TDD 권장
- `features` & `widgets`: 통합 테스트 (RTL + MSW) - Test-After
- `views` & `app`: E2E 테스트 (Playwright) - 주요 시나리오만
- 테스트 파일: `*.test.ts` 또는 `*.test.tsx` (소스 파일 옆 배치)
- E2E 테스트: `e2e/` 디렉토리

## Git 커밋 컨벤션
```
feat(모듈명): 한글 요약
fix(모듈명): 한글 요약
refactor(모듈명): 한글 요약
test(모듈명): 한글 요약
style(모듈명): 한글 요약
```

## 파일 생성 시 주의사항
- `src/pages/` 디렉토리 생성 금지 (Next.js Pages Router 충돌) → `src/views/` 사용
- `.env.local` 파일 커밋 금지 (`.env.local.example` 참고)
