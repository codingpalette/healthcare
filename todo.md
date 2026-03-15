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
- [x] 기기 관리 (로그인 기기 등록, 3대 제한, 원격 로그아웃, 설정 페이지 기기 목록)
- [ ] pg_cron 활성화 후 비활성 기기 30일 자동 정리 스케줄러 등록

## 출석 관리 (/attendance)
- [x] 출석 엔티티 DB 마이그레이션 (attendance 테이블: user_id, check_in_at, check_out_at)
- [x] 출석 기록 CRUD (Hono API 엔드포인트)
- [x] 출석 체크 UI (QR코드 또는 버튼 체크인)
- [x] 출석 현황 조회 (일별/주별/월별)
- [ ] 결석 알림 기능 (3일 연속 결석 시 문자/푸시 알림)
- [ ] 알림 발송 스케줄러 (Supabase Edge Function 또는 Cron)

## 인바디 관리 (/inbody)
- [x] 인바디 엔티티 DB 마이그레이션 (inbody_records 테이블: 체중, 골격근량, 체지방률 등)
- [x] 인바디 기록 CRUD (Hono API 엔드포인트)
- [x] 인바디 인증 사진 업로드 (R2)
- [x] 인바디 멀티 이미지 업로드 (최대 5장, 이미지 갤러리)
- [x] 인바디 기록 폼 UI
- [x] 인바디 변화 추이 차트 (월별 비교)
- [x] 인바디 측정 알림 DB 스키마 (inbody_reminder_settings 테이블, RLS)
- [x] 인바디 측정 알림 API (알림 설정 조회/수정 엔드포인트)
- [x] 인바디 측정 알림 생성 로직 (측정일 경과 시 알림 생성, 월별 중복 방지)
- [x] 알림 스케줄 설정 UI (트레이너가 회원별 측정일 지정)
- [ ] 인바디 측정 알림 자동 스케줄러 (Supabase Edge Function 또는 pg_cron)

## 식단 인증 (/diet)
- [x] 식단 페이지 라우트 생성 (`src/app/(authenticated)/diet/page.tsx`)
- [x] 식단 엔티티 DB 마이그레이션 (meals 테이블)
- [x] 식단 기록 CRUD (Hono API 엔드포인트)
- [x] 식단 인증 사진 업로드 (R2)
- [x] 식단 멀티 이미지 업로드 (최대 5장, 이미지 갤러리)
- [x] 식단 기록 폼 UI
- [x] 일별/주별 식단 조회 뷰
- [x] 영양소 요약 (칼로리, 탄단지)
- [x] 트레이너 식단 인증 조회 (회원별 상세 확인, 날짜별 조회)
- [x] 트레이너 식단 피드백 기능 (1:1 관리톡 내)
- [x] 음식 DB 연동: 음식명+중량 입력 시 칼로리/탄단지 자동 계산 (수동 입력 대체)

## 운동 관리 (/workout)
- [x] 운동 페이지 라우트 생성 (`src/app/(authenticated)/workout/page.tsx`)
- [x] 운동 엔티티 DB 마이그레이션 (workouts 테이블)
- [x] 운동 기록 CRUD (Hono API 엔드포인트)
- [x] 운동 기록 폼 UI (세트, 횟수, 무게)
- [x] 운동 인증 사진/영상 업로드 (R2)
- [x] 운동 멀티 이미지 업로드 (최대 5장, 이미지 갤러리)
- [x] 회원 운동 상세 모달 (이미지 갤러리 + 메타데이터)
- [x] 일별/주별 운동 조회 뷰
- [x] 운동 통계/차트
- [x] 운동일지 기능 (회원 작성, 트레이너 피드백)
- [x] 트레이너 운동 피드백 기능 (간단한 코멘트 작성)
- [x] 운동 기록 폼 개선: 한 페이지에서 여러 운동을 테이블 형태로 입력 (운동명 + 세트별 KG/횟수 + 의견)

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
- [x] 기구 가이드 페이지 라우트 생성 (`src/app/(authenticated)/equipment/page.tsx`)
- [x] 기구 엔티티 DB 마이그레이션 (equipment 테이블: 카테고리, 사용법, 주의사항, 유튜브 URL)
- [x] 기구 목록/상세 CRUD (Hono API 엔드포인트)
- [x] 기구 카테고리 분류 (상체, 하체, 코어, 유산소 등)
- [x] 유튜브 영상 연동 (URL 등록 및 임베드 재생)
- [x] 기구 목록 UI (카테고리별 그리드, 검색)
- [x] 기구 상세 페이지 (유튜브 영상 임베드, 주의사항, 이미지)

## 운동 가이드 (/exercise-guide)
- [ ] 운동 가이드 페이지 라우트 생성 (`src/app/(authenticated)/exercise-guide/page.tsx`)
- [ ] 운동 가이드 엔티티 DB 마이그레이션 (exercise_guides 테이블: 운동명, 부위, 설명, 유튜브 URL, 이미지)
- [ ] 운동 가이드 CRUD (Hono API 엔드포인트)
- [ ] 부위별 카테고리 분류 (가슴, 등, 어깨, 팔, 하체, 코어 등)
- [ ] 운동 가이드 목록 UI (카테고리별 필터링, 검색)
- [ ] 운동 가이드 상세 페이지 (유튜브 영상 임베드, 올바른 자세, 주의사항)
- [ ] 트레이너 운동 가이드 작성/편집 기능

## 공지사항 (/notices)
- [ ] 공지사항 엔티티 DB 마이그레이션 (notices 테이블: 제목, 내용, 작성자, 고정여부, 생성일)
- [ ] 공지사항 CRUD (Hono API 엔드포인트)
- [ ] 공지사항 목록 UI (최신순, 고정 공지 상단 표시)
- [ ] 공지사항 상세 페이지
- [ ] 트레이너/관리자 공지사항 작성/편집/삭제 기능
- [ ] 새 공지사항 알림 (푸시 알림 연동)

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
- [x] 알림 엔티티 DB 마이그레이션 (notifications 테이블)
- [x] 푸시 알림 연동 (Web Push API)
- [ ] SMS 알림 연동 (결석 알림, 인바디 알림) - 후순위, 추후 진행
- [x] 알림 설정 UI (알림 종류별 on/off)
- [x] 알림 목록 페이지 (읽음/안읽음)

## 트레이너 전용
- [x] 회원 관리 페이지 (담당 회원 목록)
- [x] 회원-트레이너 연결 기능 (DB 마이그레이션 + API)
- [x] 회원별 식단 기록 조회
- [x] 회원별 운동 기록 조회
- [x] 회원별 출석 현황 조회
- [x] 회원별 인바디 변화 조회
- [x] 피드백 작성 기능 (운동일지)
- [x] 피드백 작성 기능 (식단 인증)
- [x] 회원 기기 조회/강제 로그아웃 (회원관리 페이지)

## PWA (Progressive Web App)
- [ ] next-pwa 또는 @serwist/next 설정
- [ ] manifest.json 생성 (앱 이름, 아이콘, 테마 색상, display: standalone)
- [ ] 앱 아이콘 생성 (192x192, 512x512)
- [ ] Service Worker 설정 (오프라인 캐싱 전략)
- [ ] 오프라인 fallback 페이지
- [x] 푸시 알림 연동 (Supabase + Web Push API)
- [ ] 설치 유도 배너 (A2HS prompt)
- [ ] 스플래시 스크린 설정 (iOS/Android)
- [ ] iOS meta 태그 추가 (apple-mobile-web-app-capable 등)
- [ ] 오프라인 데이터 동기화 (식단/운동 기록 로컬 저장 후 sync)

## 설정 페이지 (/settings)
- [x] 설정 페이지 라우트 생성
- [x] 프로필 수정 폼 (이름, 전화번호 등)
- [x] 알림 설정 관리 (종류별 on/off)
- [x] 기기 목록 조회 및 로그아웃

## 회원권 관리
- [ ] 회원권 엔티티 DB 마이그레이션 (memberships 테이블: 회원ID, 시작일, 종료일, 상태)
- [ ] 회원권 CRUD (Hono API 엔드포인트)
- [ ] 트레이너가 회원별 회원권 기간 설정 UI
- [ ] 회원권 만료 시 접속 차단 (미들웨어 또는 레이아웃 가드)
- [ ] 회원권 만료 알림 (만료 N일 전 푸시 알림)

## 접속 통계
- [ ] 하루 접속 인원 수 집계 (로그인 기록 기반)
- [ ] 트레이너/관리자용 접속 통계 대시보드 UI

## 익명 단체 채팅 (/community)
- [ ] 단체 채팅방 DB 마이그레이션 (community_chat 테이블: 닉네임 기반)
- [ ] 단체 채팅 API (입장/퇴장/메시지 전송)
- [ ] 단일 채팅방 UI (입장하기/퇴장하기만 존재, 사적 채팅방 생성 불가)
- [ ] 닉네임 설정 (실명 대신 닉네임으로만 참여)
- [ ] 실시간 메시지 (Supabase Realtime)

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
