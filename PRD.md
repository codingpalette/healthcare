# 🏋️‍♂️ 헬스장 맞춤형 헬스케어 플랫폼 PRD (Product Requirements Document)

## 1. 프로젝트 개요 (Project Overview)
본 프로젝트는 헬스장 회원과 트레이너를 긴밀하게 연결하여, 회원들의 성공적인 목표 달성을 돕는 웹 기반 헬스케어 서비스입니다. 회원들은 매일의 식단과 운동을 기록하고 올바른 기구 사용법을 숙지할 수 있으며, 트레이너는 이를 모니터링하고 맞춤형 피드백을 제공하여 퀄리티 높은 PT(Personal Training) 및 회원 관리 경험을 제공합니다.

## 2. 타겟 유저 및 권한 (Target Audience & Roles)
앱은 크게 두 가지 사용자 권한으로 나뉘어 작동합니다.

### 🧑‍💼 일반 회원 (Member)
* **식단 및 운동 기록:** 자신의 오늘의 식단(사진/텍스트)을 업로드하고, 배정된 운동 루틴을 확인 및 완료 인증.
* **정보 습득:** 헬스장 내 기구 사용법 및 튜토리얼 확인.
* **Q&A:** 운동 자극점, 대체 식단, 통증 등 궁금한 점을 트레이너에게 질문.

### 🏋️‍♂️ 트레이너 / 관리자 (Trainer / Admin)
* **모니터링 및 피드백:** 담당 회원의 매일 식단 및 운동 인증 기록을 확인하고, 칭찬 및 개선점 피드백(댓글/평가) 작성.
* **Q&A 답변:** 회원이 남긴 질문에 전문적인 답변 제공.

## 3. 핵심 기능 요구사항 (Core Features)

### 3.1. 식단 및 운동 인증 & 피드백 시스템
* **[회원] 식단 업로드:** 아침/점심/저녁/간식 등 식단 사진과 간단한 코멘트 업로드.
* **[회원] 운동 인증:** 오늘 수행한 운동 루틴 체크 및 오운완(오늘 운동 완료) 사진 업로드.
* **[트레이너] 피드백 대시보드:** 담당 회원의 미확인 인증글 목록을 모아보는 대시보드 제공.
* **[트레이너] 코멘트 작성:** 회원의 게시물에 직접 피드백 코멘트 작성 가능.

### 3.2. Q&A 커뮤니티 (Member Q&A)
* **질문하기:** 회원이 궁금한 점(식단, 운동법 등)을 자유롭게 질문글로 작성.
* **답변하기:** 트레이너가 해당 질문에 답변을 달아주는 기능.

### 3.3. 헬스장 기구 사용법 가이드 (Equipment Guide)
* 헬스장에 비치된 주요 기구들의 목록 및 사용법 제공.
* 텍스트 설명 및 이미지/짧은 영상 첨부 기능.
* 부위별(가슴, 등, 하체 등) 카테고리 필터링 기능.

## 4. 기술 스택 (Tech Stack)

### 🎨 Frontend
* **Framework:** Next.js (App Router)
* **Styling:** Tailwind CSS
* **UI Component:** shadcn/ui
* **State Management:** Zustand (전역 클라이언트 상태 관리)
* **Data Fetching / Server State:** TanStack Query (비동기 데이터 캐싱 및 동기화)

### ⚙️ Backend & Database
* **API Framework:** Hono (Next.js 내장 API 라우트로 통합)
* **Database & Auth:** Supabase (PostgreSQL DB, 인증, 스토리지 이미지 업로드)

### 🏗️ 아키텍처 (Architecture)

* **FSD (Feature-Sliced Design):** 프로젝트의 확장성과 유지보수성을 위해 비즈니스 도메인(Feature) 중심으로 폴더 구조를 분리하는 방법론 적용. 
  *(app, pages, widgets, features, entities, shared 계층 준수)*

## 5. 테스트 전략 (Testing Strategy)
본 프로젝트는 비용 대비 효과가 높은 곳에 테스트 리소스를 집중하는 실용적인 테스트 전략을 취합니다.

### 5.1. 테스트 방법론
* **Test-First (TDD):** 로직이 복잡한 `shared/lib`, `entities`의 도메인 로직 작성 시 권장.
* **Test-After:** UI 중심의 `features`, `widgets` 및 `pages` 작성 시 권장.

### 5.2. 레이어별 테스트 도구 및 대상
* **`shared` & `entities`:** 적극적인 단위 테스트 (**Vitest** 권장)
* **`features` & `widgets`:** 핵심 로직 위주의 통합 테스트 (**React Testing Library** + **MSW**)
* **`pages` & `app`:** 주요 유저 시나리오 중심의 E2E 테스트 (**Playwright**)

## 6. 추후 확장 가능성 (Future Scope)
* **AI 식단 분석:** 회원 업로드 사진 기반 칼로리 및 영양소 AI 자동 분석 (MCP 연동 고려)
* **푸시 알림:** 피드백이 등록되거나, 식단 업로드 시간이 되었을 때 웹 푸시/알림 기능.
