# 기기 관리 (Device Management) 설계

## 개요

유저가 로그인 시 기기 정보를 기록하고, 설정 페이지에서 자신의 기기를 확인/관리할 수 있으며, 트레이너는 회원관리에서 회원의 접속 기기를 확인하고 강제 로그아웃할 수 있는 기능.

## 요구사항

- 로그인 시 기기 정보 기록 (기기명, 종류, 브라우저, OS)
- API 활동 시 마지막 활동 시간 갱신 (5분 throttle)
- 계정당 최대 3대 기기 제한
- 3대 초과 시 기기 선택 화면 표시하여 하나를 로그아웃한 뒤 기기 등록 진행
- 사용자: 설정 페이지에서 자신의 기기 확인 및 원격 로그아웃
- 트레이너: 회원관리에서 담당 회원의 기기 확인 및 강제 로그아웃
- Supabase Auth 세션과 연동하여 실제 세션 해제
- 30일 미활동 기기 자동 정리

## 데이터 모델

### `user_devices` 테이블

| 컬럼 | 타입 | 설명 |
|---|---|---|
| id | UUID PK | 기기 레코드 ID |
| user_id | UUID FK (profiles) | 사용자 ID |
| refresh_token | TEXT | Supabase refresh token (세션 해제용) |
| device_fingerprint | TEXT | 기기 식별용 fingerprint (중복 등록 방지) |
| device_name | TEXT | 기기명 (예: "iPhone 15", "Windows PC") |
| device_type | TEXT | mobile / tablet / desktop |
| browser | TEXT | Chrome, Safari 등 |
| os | TEXT | iOS, Android, Windows, macOS 등 |
| last_active_at | TIMESTAMPTZ | 마지막 활동 시간 |
| created_at | TIMESTAMPTZ | 최초 로그인 시간 |

### RLS 정책

```sql
-- 본인 기기 조회
CREATE POLICY "users_view_own_devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 기기 삭제 (원격 로그아웃)
CREATE POLICY "users_delete_own_devices" ON user_devices
  FOR DELETE USING (auth.uid() = user_id);

-- 담당 트레이너가 회원 기기 조회
CREATE POLICY "trainers_view_member_devices" ON user_devices
  FOR SELECT USING (
    user_id IN (SELECT id FROM profiles WHERE trainer_id = auth.uid())
  );

-- 담당 트레이너가 회원 기기 삭제 (강제 로그아웃)
CREATE POLICY "trainers_delete_member_devices" ON user_devices
  FOR DELETE USING (
    user_id IN (SELECT id FROM profiles WHERE trainer_id = auth.uid())
  );

-- 본인 기기 등록
CREATE POLICY "users_insert_own_devices" ON user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 기기 활동 시간 갱신
CREATE POLICY "users_update_own_devices" ON user_devices
  FOR UPDATE USING (auth.uid() = user_id);
```

## 핵심 로직

### 기기 식별 (Device Fingerprint)

- 로그인 성공 후 클라이언트에서 fingerprint 생성 (User-Agent + 화면 해상도 + 언어 해시)
- 생성된 fingerprint를 localStorage에 저장
- 같은 브라우저에서 재로그인 시 fingerprint로 기존 기기 레코드를 찾아 갱신 (중복 등록 방지)
- device ID도 localStorage에 저장하여 이후 "현재 기기" 식별 및 활동 추적에 사용

### 로그인 시

1. Supabase `signInWithPassword()` 호출 → **인증 자체는 항상 성공시킴**
2. User-Agent 파싱 → 기기명, 종류, 브라우저, OS 추출
3. localStorage의 fingerprint로 기존 기기 레코드 검색
   - 기존 기기 존재 → refresh token, last_active_at 갱신
   - 기존 기기 없음 → 등록된 기기 수 확인
     - 3대 미만 → `user_devices`에 새 기기 등록
     - 3대 이상 → **기기 선택 화면 표시** (인증 상태 유지, 기기 미등록 상태)
       - 사용자가 기존 기기 하나를 선택하여 로그아웃
       - 해당 기기 삭제 후 새 기기 등록 진행
4. Supabase refresh token을 기기 레코드에 저장

### 활동 추적

- Hono 미들웨어에서 API 요청 시 `last_active_at` 갱신
- 클라이언트가 요청 헤더 `X-Device-Id`에 localStorage의 device ID를 포함
- 미들웨어는 해당 device ID의 `last_active_at`을 갱신
- 매 요청마다 갱신하면 부하가 크므로 5분 간격으로 throttle (마지막 갱신 시간을 메모리에 캐시)

### 원격 로그아웃

1. `user_devices`에서 해당 기기의 refresh_token 조회
2. Supabase Admin API로 해당 세션 무효화 (서버 사이드에서 `supabase.auth.admin.signOut(userId, 'others')` 또는 refresh token revoke)
3. `user_devices`에서 해당 기기 레코드 삭제
4. 해당 기기에서 다음 요청 시 인증 실패 → 로그인 화면으로 이동

### 트레이너 강제 로그아웃

- 동일한 로직이지만 RLS 정책에서 `trainer_id` 확인하여 담당 회원의 기기만 접근 가능

### 비활성 기기 자동 정리

- `last_active_at`이 30일 이상 지난 기기 레코드 자동 삭제
- Supabase Database Function + pg_cron 또는 Edge Function 스케줄러로 구현

## API 엔드포인트

| 메서드 | 경로 | 설명 | 권한 |
|---|---|---|---|
| GET | `/api/devices` | 내 기기 목록 조회 | 본인 |
| POST | `/api/devices` | 기기 등록 (로그인 후) | 본인 |
| DELETE | `/api/devices/:id` | 내 기기 원격 로그아웃 | 본인 |
| GET | `/api/devices/members/:userId` | 회원 기기 목록 조회 | 담당 트레이너 |
| DELETE | `/api/devices/members/:userId/:deviceId` | 회원 기기 강제 로그아웃 | 담당 트레이너 |

### 활동 추적

- 별도 엔드포인트 없이 Hono 미들웨어에서 `X-Device-Id` 헤더 기반으로 `last_active_at` 자동 갱신 (5분 throttle)

## UI 구성

### 설정 페이지 (회원 & 트레이너 공통)

- 기존 설정 페이지에 "로그인된 기기" 섹션 추가
- 기기 목록 카드 형태:
  - 기기명 + OS / 브라우저
  - 마지막 활동 시간 (예: "5분 전", "어제")
  - 현재 사용 중인 기기에는 "현재 기기" 뱃지 (localStorage의 device ID로 판별)
  - "로그아웃" 버튼 (현재 기기 제외)

### 회원관리 페이지 (트레이너 전용)

- 회원 상세 정보에 "접속 기기" 섹션 추가
- 해당 회원의 기기 목록 표시 (동일한 카드 형태)
- "강제 로그아웃" 버튼으로 회원 기기 세션 해제

### 로그인 후 기기 초과 화면

- 3대 초과 시 메인 화면 대신 기기 선택 화면 표시 (인증된 상태)
- 기존 기기 목록을 카드로 표시
- "이 기기에서 로그아웃" 버튼으로 하나를 해제
- 해제 완료 후 자동으로 현재 기기 등록 → 메인 화면으로 이동

## 기술 스택

- User-Agent 파싱: `ua-parser-js` 라이브러리
- 세션 해제: Supabase Admin API (서버 사이드, refresh token 기반)
- 상태 관리: TanStack Query (기기 목록 캐싱)
- 미들웨어: Hono 미들웨어 (활동 추적, `X-Device-Id` 헤더)
- 비활성 정리: Supabase pg_cron 또는 Edge Function 스케줄러
