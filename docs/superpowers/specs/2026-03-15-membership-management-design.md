# 회원권 관리 설계 문서

## 개요

헬스장 회원의 이용 기간(회원권)을 관리하는 기능. 트레이너가 회원별 시작일/종료일을 설정하고, 만료 시 회원의 서비스 접근을 차단한다.

## 요구사항

- 회원당 단일 회원권 (1:1 관계)
- 트레이너만 회원권 CRUD 가능, 회원은 조회만
- 만료 시 완전 접근 차단 (만료 안내 페이지만 표시)
- 만료 7일 전, 3일 전, 1일 전 단계별 알림

## 1. DB 스키마

### memberships 테이블

```sql
CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE INDEX idx_memberships_end_date ON memberships(end_date);

CREATE TRIGGER on_memberships_updated
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

- `member_id` UNIQUE 제약으로 회원당 하나의 회원권 보장
- `status` 컬럼 없음 — `end_date`와 현재 날짜 비교로 상태를 도출 (데이터 정합성 보장)
  - `end_date >= today` → 활성
  - `end_date < today` → 만료
  - 회원권 행이 없음 → 미설정
- `end_date >= start_date` CHECK 제약으로 잘못된 기간 입력 방지
- `updated_at` 트리거로 자동 갱신 (기존 테이블과 동일 패턴)

### RLS 정책

```sql
-- 트레이너: 자기 회원 대상 CRUD (profiles.trainer_id JOIN으로 소유권 확인)
CREATE POLICY memberships_trainer_select ON memberships FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = memberships.member_id AND profiles.trainer_id = auth.uid()));
CREATE POLICY memberships_trainer_insert ON memberships FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = memberships.member_id AND profiles.trainer_id = auth.uid()));
CREATE POLICY memberships_trainer_update ON memberships FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = memberships.member_id AND profiles.trainer_id = auth.uid()));
CREATE POLICY memberships_trainer_delete ON memberships FOR DELETE
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = memberships.member_id AND profiles.trainer_id = auth.uid()));

-- 회원: 자기 회원권 조회만
CREATE POLICY memberships_member_select ON memberships FOR SELECT
  USING (member_id = auth.uid());
```

### notification_preferences 확장

- `membership_enabled BOOLEAN NOT NULL DEFAULT true` 컬럼 추가
- `getDefaultNotificationPreferences()` 함수에 `membership_enabled: true` 추가 필요

### notifications.kind 확장

- `membership_expiry` 추가
- 기존 CHECK 제약 DROP 후 새 제약 추가 (기존 `20260313121000_expand_notification_types.sql` 패턴 따름)

## 2. API 엔드포인트 (Hono)

| 메서드 | 경로 | 권한 | 설명 |
|---|---|---|---|
| GET | `/memberships/me` | 회원 | 내 회원권 조회 |
| GET | `/memberships` | 트레이너 | 내 회원 전체 회원권 목록 조회 |
| GET | `/memberships/members/:id` | 트레이너 | 특정 회원 회원권 조회 |
| POST | `/memberships` | 트레이너 | 회원권 생성 (member_id, start_date, end_date, memo) |
| PATCH | `/memberships/:id` | 트레이너 | 회원권 수정 (start_date, end_date, memo만 수정 가능) |
| DELETE | `/memberships/:id` | 트레이너 | 회원권 삭제 |

### 소유권 검증

모든 트레이너 엔드포인트에서 대상 회원의 `profiles.trainer_id === auth.uid()` 확인:
- POST: 요청 body의 `member_id`로 profiles 조회하여 소유권 확인
- PATCH/DELETE: membership의 `member_id`로 profiles 조회하여 소유권 확인
- 소유권 불일치 시 403 반환

## 3. 만료 차단

### 레이아웃 가드 (`(authenticated)/layout.tsx`)

로그인한 회원(role === "member")에 대해:
1. `memberships` 테이블에서 해당 회원의 회원권 조회
2. 회원권이 없거나 `end_date < today` → `/membership-expired`로 리다이렉트
3. 트레이너는 체크 없이 통과

**차단 제외 경로:**
- `/membership-expired` (만료 안내 페이지)
- `/settings` (설정 — 프로필 조회/수정만 가능)
- `/login` (로그인)

### API 미들웨어 (Hono)

레이아웃 가드만으로는 직접 API 호출을 차단할 수 없으므로, **Hono 미들웨어에서도 회원권 만료 체크**:
- `role === "member"`인 요청에 대해 `memberships` 테이블 조회
- 회원권 없거나 만료 시 `403 { error: "membership_expired" }` 반환
- 제외 경로: `/memberships/me` (자기 회원권 조회는 허용), `/profiles/me`

### 신규 회원 처리

회원권이 없는 신규 회원도 만료 페이지로 리다이렉트됨. 이는 의도된 동작:
- 트레이너가 회원 등록 후 회원권을 설정해야 서비스 이용 가능
- 만료 안내 페이지에서 "아직 회원권이 설정되지 않았습니다. 트레이너에게 문의하세요." 메시지 분기

### 만료 안내 페이지 (`/membership-expired`)

- 회원권 없음: "아직 회원권이 설정되지 않았습니다. 트레이너에게 문의하세요."
- 회원권 만료: "회원권이 만료되었습니다" + 시작일/종료일 표시
- 트레이너 연락 안내

## 4. 만료 알림

기존 `notifications` 시스템 활용:

- kind: `membership_expiry`
- 알림 시점: 만료 7일 전, 3일 전, 1일 전
- deduplication: `dedupe_key = membership_expiry:{member_id}:{end_date}:{days_before}`
  - `end_date` 포함으로 갱신 후 재알림 가능

### 알림 생성 방식

레이아웃 가드에서 로그인 시 만료일 체크:
- 현재 날짜와 `end_date` 비교
- 남은 일수가 7, 3, 1일 이하인 경우 해당 알림 생성 (dedupe_key로 중복 방지)
- 알림 대상: 해당 회원 + 담당 트레이너

> **한계:** 사용자가 해당 기간에 접속하지 않으면 알림이 생성되지 않음. 추후 Supabase Edge Function cron으로 개선 가능하지만, 현재는 요청 시점 체크로 충분.

## 5. UI

### 트레이너 측

**회원 목록 테이블 확장:**
- 회원권 상태 배지 컬럼 추가 (활성/만료/미설정 — `end_date` 기반 도출)
- 남은 일수 표시

**회원권 설정 다이얼로그:**
- 회원 선택 → 시작일/종료일 DatePicker
- 메모 입력 (선택)
- 생성/수정/삭제 액션

### 회원 측

**대시보드 회원권 카드:**
- 시작일, 종료일, 남은 일수 표시
- 만료 임박 시 경고 스타일

**만료 안내 페이지:**
- 만료/미설정 분기 메시지 + 트레이너 연락 안내

## 6. FSD 구조

```
src/
├── entities/membership/
│   ├── index.ts
│   ├── model/
│   │   ├── index.ts
│   │   └── types.ts
│   └── api/
│       ├── index.ts
│       └── membership-api.ts
├── features/membership-management/
│   ├── index.ts
│   ├── model/use-memberships.ts    (React Query hooks)
│   └── ui/membership-form.tsx      (설정 다이얼로그)
├── widgets/membership/
│   └── membership-status-card.tsx  (회원 대시보드용)
├── views/membership-expired/
│   └── ui/MembershipExpiredPage.tsx
├── app/(authenticated)/membership-expired/
│   └── page.tsx
└── app/api/routes/memberships.ts   (Hono 라우트)
```

## 7. 마이그레이션 파일

- `supabase/migrations/20260315120000_create_memberships.sql` — 테이블, 인덱스, RLS, 트리거
- `supabase/migrations/20260315120001_add_membership_notification.sql` — notification_preferences 컬럼 추가, kind CHECK 제약 갱신
