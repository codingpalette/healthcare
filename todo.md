# Healthcare Platform - TODO

## 완료
- [x] 프로젝트 초기 구성 (Next.js 16, Tailwind v4, shadcn, Supabase)
- [x] FSD 아키텍처 설정 (app/views/widgets/features/entities/shared)
- [x] 인증 기능 (로그인/회원가입 폼, Supabase Auth)
- [x] profiles 테이블 마이그레이션
- [x] 대시보드 (회원/트레이너 역할별 카드 레이아웃)
- [x] 노션 스타일 사이드바 + 헤더 앱 셸 레이아웃
- [x] (authenticated)/(public) 라우트 그룹 분리

## 인증/사용자
- [ ] 회원가입 페이지 UI 구현 (현재 /login으로 리다이렉트만 됨)
- [ ] 로그인 페이지 브랜딩 이미지 교체 (현재 placeholder.svg)
- [ ] 이메일 인증 플로우
- [ ] 비밀번호 재설정 기능
- [ ] 프로필 수정 페이지 (이름, 전화번호 등)
- [ ] 아바타 이미지 업로드 (Cloudflare R2)

## 식단 관리 (/diet)
- [ ] 식단 페이지 라우트 생성 (`src/app/(authenticated)/diet/page.tsx`)
- [ ] 식단 엔티티 DB 마이그레이션 (meals 테이블)
- [ ] 식단 기록 CRUD (Hono API 엔드포인트)
- [ ] 식단 기록 폼 UI
- [ ] 일별/주별 식단 조회 뷰
- [ ] 영양소 요약 (칼로리, 탄단지)
- [ ] 트레이너 식단 피드백 기능

## 운동 관리 (/workout)
- [ ] 운동 페이지 라우트 생성 (`src/app/(authenticated)/workout/page.tsx`)
- [ ] 운동 엔티티 DB 마이그레이션 (workouts 테이블)
- [ ] 운동 기록 CRUD (Hono API 엔드포인트)
- [ ] 운동 기록 폼 UI (세트, 횟수, 무게)
- [ ] 일별/주별 운동 조회 뷰
- [ ] 운동 통계/차트
- [ ] 트레이너 운동 피드백 기능

## Q&A (/qna)
- [ ] Q&A 페이지 라우트 생성 (`src/app/(authenticated)/qna/page.tsx`)
- [ ] 질문 엔티티 DB 마이그레이션 (questions, answers 테이블)
- [ ] 질문/답변 CRUD (Hono API 엔드포인트)
- [ ] 질문 목록 UI (필터, 검색)
- [ ] 질문 상세 + 답변 UI
- [ ] 트레이너 답변 기능

## 기구 가이드 (/equipment)
- [ ] 기구 가이드 페이지 라우트 생성 (`src/app/(authenticated)/equipment/page.tsx`)
- [ ] 기구 엔티티 DB 마이그레이션 (equipment 테이블)
- [ ] 기구 목록/상세 CRUD (Hono API 엔드포인트)
- [ ] 기구 목록 UI (카드 그리드, 검색)
- [ ] 기구 상세 페이지 (사용법, 주의사항, 이미지)

## 트레이너 전용
- [ ] 회원 관리 페이지 (담당 회원 목록)
- [ ] 회원-트레이너 연결 기능 (DB 마이그레이션 + API)
- [ ] 회원별 식단/운동 기록 조회
- [ ] 피드백 작성 기능

## PWA (Progressive Web App)
- [ ] next-pwa 또는 @serwist/next 설정
- [ ] manifest.json 생성 (앱 이름, 아이콘, 테마 색상, display: standalone)
- [ ] 앱 아이콘 생성 (192x192, 512x512)
- [ ] Service Worker 설정 (오프라인 캐싱 전략)
- [ ] 오프라인 fallback 페이지
- [ ] 푸시 알림 연동 (Supabase + Web Push API)
- [ ] 설치 유도 배너 (A2HS prompt)
- [ ] 스플래시 스크린 설정 (iOS/Android)
- [ ] iOS meta 태그 추가 (apple-mobile-web-app-capable 등)
- [ ] 오프라인 데이터 동기화 (식단/운동 기록 로컬 저장 후 sync)

## 인프라/공통
- [x] TanStack Query 설정 (QueryClientProvider + DevTools)
- [x] API 에러 핸들링 공통화 (ApiError 클래스 + handleApiError)
- [x] 로딩/에러 상태 UI (Skeleton loading, Error Boundary, Global Error)
- [x] 토스트 알림 (sonner 설치 + Toaster 연동)
- [x] 다크 모드 지원 확인 (ThemeProvider attribute="class")
- [x] middleware.ts → proxy.ts 마이그레이션 (Next.js 16)
- [ ] Cloudflare R2 파일 스토리지 연동 (이미지/동영상 업로드)
- [ ] Zustand 글로벌 스토어 구조 정리
- [ ] 반응형 디자인 점검 (모바일 사이드바 동작 확인)
- [ ] 테스트 작성 (단위/통합/E2E)
