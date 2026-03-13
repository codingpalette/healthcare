# Healthcare Platform - TODO

## 완료
- [x] 프로젝트 초기 구성 (Next.js 16, Tailwind v4, shadcn, Supabase)
- [x] FSD 아키텍처 설정 (app/views/widgets/features/entities/shared)
- [x] 인증 기능 (로그인/회원가입 폼, Supabase Auth)
- [x] profiles 테이블 마이그레이션
- [x] 대시보드 (회원/트레이너 역할별 카드 레이아웃)
- [x] 노션 스타일 사이드바 + 헤더 앱 셸 레이아웃
- [x] (authenticated)/(public) 라우트 그룹 분리
- [x] 회원-트레이너 연결 기능 (trainer_id 1:N 관계, 배정/해제 API, 내 회원 필터)

## 인증/사용자
- [ ] 회원가입 페이지 UI 구현 (현재 /login으로 리다이렉트만 됨)
- [ ] 로그인 페이지 브랜딩 이미지 교체 (현재 placeholder.svg)
- [ ] 이메일 인증 플로우
- [ ] 비밀번호 재설정 기능
- [x] 프로필 수정 페이지 (이름, 전화번호 등)
- [x] 아바타 이미지 업로드 (Cloudflare R2)

## 출석 관리 (/attendance)
- [x] 출석 엔티티 DB 마이그레이션 (attendance 테이블: user_id, check_in_at, check_out_at)
- [x] 출석 기록 CRUD (Hono API 엔드포인트)
- [x] 출석 체크 UI (QR코드 또는 버튼 체크인)
- [x] 출석 현황 조회 (일별/주별/월별)
- [ ] 결석 알림 기능 (3일 연속 결석 시 문자/푸시 알림)
- [ ] 알림 발송 스케줄러 (Supabase Edge Function 또는 Cron)

## 인바디 관리 (/inbody)
- [ ] 인바디 엔티티 DB 마이그레이션 (inbody_records 테이블: 체중, 골격근량, 체지방률 등)
- [ ] 인바디 기록 CRUD (Hono API 엔드포인트)
- [ ] 인바디 인증 사진 업로드 (R2)
- [ ] 인바디 기록 폼 UI
- [ ] 인바디 변화 추이 차트 (월별 비교)
- [ ] 인바디 측정 알림 (지정 날짜 기준 월 1회 알림)
- [ ] 알림 스케줄 설정 UI (트레이너가 회원별 측정일 지정)

## 식단 인증 (/diet)
- [x] 식단 페이지 라우트 생성 (`src/app/(authenticated)/diet/page.tsx`)
- [x] 식단 엔티티 DB 마이그레이션 (meals 테이블)
- [x] 식단 기록 CRUD (Hono API 엔드포인트)
- [x] 식단 인증 사진 업로드 (R2)
- [x] 식단 기록 폼 UI
- [x] 일별/주별 식단 조회 뷰
- [x] 영양소 요약 (칼로리, 탄단지)
- [x] 트레이너 식단 인증 조회 (회원별 상세 확인, 날짜별 조회)
- [x] 트레이너 식단 피드백 기능 (1:1 관리톡 내)

## 운동 관리 (/workout)
- [x] 운동 페이지 라우트 생성 (`src/app/(authenticated)/workout/page.tsx`)
- [x] 운동 엔티티 DB 마이그레이션 (workouts 테이블)
- [x] 운동 기록 CRUD (Hono API 엔드포인트)
- [x] 운동 기록 폼 UI (세트, 횟수, 무게)
- [x] 운동 인증 사진/영상 업로드 (R2)
- [x] 일별/주별 운동 조회 뷰
- [x] 운동 통계/차트
- [x] 운동일지 기능 (회원 작성, 트레이너 피드백)
- [x] 트레이너 운동 피드백 기능 (간단한 코멘트 작성)

## 1:1 관리톡 (/chat)
- [x] 채팅 엔티티 DB 마이그레이션 (chat_rooms, chat_messages 테이블)
- [x] 채팅 CRUD (Hono API 엔드포인트)
- [x] 실시간 메시지 (Supabase Realtime)
- [x] 1:1 채팅 UI (트레이너-회원 간)
- [x] 식단인증/운동인증 사진 채팅 내 공유
- [x] 트레이너 피드백 메시지 기능
- [x] 읽음/안읽음 표시
- [x] 채팅 목록 UI (최근 메시지 미리보기)

## 1:1 Q&A톡 (/qna)
- [ ] Q&A 페이지 라우트 생성 (`src/app/(authenticated)/qna/page.tsx`)
- [ ] Q&A 엔티티 DB 마이그레이션 (qna_threads, qna_messages 테이블)
- [ ] Q&A CRUD (Hono API 엔드포인트)
- [ ] 1:1 Q&A 톡 UI (트레이너-회원 간 질문/답변)
- [ ] 질문 카테고리 분류 (운동, 식단, 기타)
- [ ] 트레이너 답변 알림

## 센터 기구 사용법 (/equipment)
- [ ] 기구 가이드 페이지 라우트 생성 (`src/app/(authenticated)/equipment/page.tsx`)
- [ ] 기구 엔티티 DB 마이그레이션 (equipment 테이블: 카테고리, 사용법, 주의사항)
- [ ] 기구 목록/상세 CRUD (Hono API 엔드포인트)
- [ ] 기구 카테고리 분류 (상체, 하체, 코어, 유산소 등)
- [ ] 기구 사용법 영상 업로드/재생 (R2)
- [ ] 기구 목록 UI (카테고리별 그리드, 검색)
- [ ] 기구 상세 페이지 (사용법 영상, 주의사항, 이미지)

## 운동 루틴 (/routine)
- [ ] 운동 루틴 엔티티 DB 마이그레이션 (routines, routine_exercises 테이블)
- [ ] 운동 루틴 CRUD (Hono API 엔드포인트)
- [ ] 루틴 카테고리 필터 (성별, 나이대, 초보자/중급자)
- [ ] 루틴 목록 UI (카테고리별 필터링)
- [ ] 루틴 상세 페이지 (운동 순서, 세트/횟수 가이드)
- [ ] 트레이너 루틴 작성/편집 기능
- [ ] 회원에게 루틴 배정 기능

## 건의사항 (/suggestions)
- [ ] 건의사항 엔티티 DB 마이그레이션 (suggestions 테이블: 제목, 내용, 상태)
- [ ] 건의사항 CRUD (Hono API 엔드포인트)
- [ ] 건의사항 작성 폼 UI (회원)
- [ ] 건의사항 목록/상세 조회
- [ ] 건의사항 답변 기능 (트레이너/관리자)
- [ ] 건의사항 상태 관리 (접수/처리중/완료)
- [ ] 익명 건의 옵션

## 알림 시스템
- [ ] 알림 엔티티 DB 마이그레이션 (notifications 테이블)
- [ ] 푸시 알림 연동 (Web Push API)
- [ ] SMS 알림 연동 (결석 알림, 인바디 알림)
- [ ] 알림 설정 UI (알림 종류별 on/off)
- [ ] 알림 목록 페이지 (읽음/안읽음)

## 트레이너 전용
- [x] 회원 관리 페이지 (담당 회원 목록)
- [x] 회원-트레이너 연결 기능 (DB 마이그레이션 + API)
- [x] 회원별 식단 기록 조회
- [x] 회원별 운동 기록 조회
- [x] 회원별 출석 현황 조회
- [ ] 회원별 인바디 변화 조회
- [x] 피드백 작성 기능 (운동일지)
- [x] 피드백 작성 기능 (식단 인증)

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
- [x] Cloudflare R2 파일 스토리지 연동 (이미지/동영상 업로드)
- [ ] Zustand 글로벌 스토어 구조 정리
- [x] 반응형 디자인 점검 (유저 관리 페이지 모바일 최적화)
- [ ] 테스트 작성 (단위/통합/E2E)
