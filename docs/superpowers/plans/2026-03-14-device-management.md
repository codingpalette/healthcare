# 기기 관리 (Device Management) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 시 기기 정보를 기록하고, 설정/회원관리에서 기기를 확인·관리할 수 있는 기능 구현

**Architecture:** `user_devices` 테이블로 기기 정보를 관리하고, Supabase session ID를 저장하여 원격 로그아웃 시 service role로 `auth.sessions`에서 직접 삭제한다. Hono 미들웨어에서 `X-Device-Id` 헤더를 읽어 활동 시간을 갱신하고, 계정당 최대 3대 기기로 제한한다.

**Tech Stack:** Supabase (DB/Auth/RLS), Hono (API), ua-parser-js (UA 파싱), TanStack Query (상태), shadcn/ui (UI)

**Spec:** `docs/superpowers/specs/2026-03-14-device-management-design.md`

---

## File Structure

### 신규 생성
- `supabase/migrations/20260314120000_create_user_devices.sql` — user_devices 테이블 + RLS
- `src/entities/device/model/types.ts` — Device 타입 정의
- `src/entities/device/api/device-api.ts` — 기기 API 함수
- `src/entities/device/index.ts` — barrel export
- `src/features/device-management/model/use-devices.ts` — TanStack Query hooks
- `src/features/device-management/ui/device-list.tsx` — 기기 목록 카드 컴포넌트
- `src/features/device-management/ui/device-limit-screen.tsx` — 3대 초과 시 기기 선택 화면
- `src/features/device-management/index.ts` — barrel export
- `src/app/api/routes/devices.ts` — Hono 기기 라우트
- `src/shared/lib/device-fingerprint.ts` — 기기 fingerprint 생성 유틸

### 수정
- `src/app/api/[[...route]]/route.ts` — devices 라우트 등록
- `src/shared/api/hono-auth-middleware.ts` — X-Device-Id 헤더로 활동 추적
- `src/features/auth/ui/login-form.tsx` — 로그인 후 기기 등록 플로우
- `src/features/auth/api/auth-api.ts` — 기기 등록 API 호출 추가
- `src/views/settings/ui/SettingsPage.tsx` — 기기 목록 섹션 추가
- `src/views/members/ui/MembersPage.tsx` — 회원 기기 조회 UI 추가
- `src/widgets/member/` — MemberListTable에 기기 확인 버튼 추가

---

## Chunk 1: DB 마이그레이션 + Entity 레이어

### Task 1: user_devices 테이블 마이그레이션

**Files:**
- Create: `supabase/migrations/20260314120000_create_user_devices.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- 기기 관리 테이블
CREATE TABLE IF NOT EXISTS user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(user_id, device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_user_devices_last_active ON user_devices(last_active_at);

-- RLS 활성화
ALTER TABLE user_devices ENABLE ROW LEVEL SECURITY;

-- 본인 기기 조회
CREATE POLICY "users_view_own_devices" ON user_devices
  FOR SELECT USING (auth.uid() = user_id);

-- 본인 기기 등록
CREATE POLICY "users_insert_own_devices" ON user_devices
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 기기 활동 시간 갱신
CREATE POLICY "users_update_own_devices" ON user_devices
  FOR UPDATE USING (auth.uid() = user_id);

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
```

- [ ] **Step 2: 타입 체크로 SQL 문법 확인**

Run: `cat supabase/migrations/20260314120000_create_user_devices.sql`
Expected: SQL 파일 내용 정상 출력

- [ ] **Step 3: 커밋**

```bash
git add supabase/migrations/20260314120000_create_user_devices.sql
git commit -m "feat(기기관리): user_devices 테이블 마이그레이션 추가"
```

---

### Task 1.5: 비활성 기기 자동 정리 마이그레이션

**Files:**
- Create: `supabase/migrations/20260314120100_cleanup_inactive_devices.sql`

- [ ] **Step 1: 정리 함수 + pg_cron 마이그레이션 작성**

```sql
-- 30일 이상 미활동 기기 자동 삭제 함수
CREATE OR REPLACE FUNCTION cleanup_inactive_devices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_devices
  WHERE last_active_at < now() - interval '30 days';
END;
$$;

-- pg_cron이 활성화되어 있으면 매일 자정에 실행
-- Supabase 대시보드에서 pg_cron 확장을 활성화한 뒤 아래 주석을 해제
-- SELECT cron.schedule(
--   'cleanup-inactive-devices',
--   '0 0 * * *',
--   'SELECT cleanup_inactive_devices()'
-- );
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260314120100_cleanup_inactive_devices.sql
git commit -m "feat(기기관리): 비활성 기기 자동 정리 함수 추가"
```

---

### Task 2: ua-parser-js 설치

**Files:**
- Modify: `package.json`

- [ ] **Step 1: ua-parser-js 설치**

Run: `pnpm add ua-parser-js && pnpm add -D @types/ua-parser-js`

- [ ] **Step 2: 설치 확인**

Run: `pnpm ls ua-parser-js`
Expected: `ua-parser-js` 버전 출력

- [ ] **Step 3: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "feat(기기관리): ua-parser-js 의존성 추가"
```

---

### Task 3: Device Fingerprint 유틸

**Files:**
- Create: `src/shared/lib/device-fingerprint.ts`
- Create: `src/shared/lib/device-fingerprint.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// src/shared/lib/device-fingerprint.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest"
import { generateDeviceFingerprint, getStoredDeviceId, storeDeviceId } from "./device-fingerprint"

describe("device-fingerprint", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("generateDeviceFingerprint", () => {
    it("동일한 환경에서 동일한 fingerprint를 생성한다", () => {
      const fp1 = generateDeviceFingerprint()
      const fp2 = generateDeviceFingerprint()
      expect(fp1).toBe(fp2)
    })

    it("빈 문자열이 아닌 fingerprint를 반환한다", () => {
      const fp = generateDeviceFingerprint()
      expect(fp).toBeTruthy()
      expect(typeof fp).toBe("string")
    })
  })

  describe("storeDeviceId / getStoredDeviceId", () => {
    it("device ID를 저장하고 조회할 수 있다", () => {
      storeDeviceId("test-device-id")
      expect(getStoredDeviceId()).toBe("test-device-id")
    })

    it("저장된 device ID가 없으면 null을 반환한다", () => {
      expect(getStoredDeviceId()).toBeNull()
    })
  })
})
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `pnpm test src/shared/lib/device-fingerprint.test.ts`
Expected: FAIL — 모듈 없음

- [ ] **Step 3: 구현**

```typescript
// src/shared/lib/device-fingerprint.ts
const DEVICE_ID_KEY = "healthcare_device_id"

/**
 * User-Agent + 화면 정보 기반 기기 fingerprint 생성
 * 같은 브라우저/기기에서는 동일한 값을 반환
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]

  return simpleHash(components.join("|"))
}

/** localStorage에 device ID 저장 */
export function storeDeviceId(deviceId: string): void {
  localStorage.setItem(DEVICE_ID_KEY, deviceId)
}

/** localStorage에서 device ID 조회 */
export function getStoredDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY)
}

/** localStorage에서 device ID 삭제 */
export function removeStoredDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY)
}

/** 간단한 해시 함수 (djb2) */
function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `pnpm test src/shared/lib/device-fingerprint.test.ts`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/shared/lib/device-fingerprint.ts src/shared/lib/device-fingerprint.test.ts
git commit -m "feat(기기관리): 기기 fingerprint 유틸 추가"
```

---

### Task 4: Device Entity — 타입 정의

**Files:**
- Create: `src/entities/device/model/types.ts`

- [ ] **Step 1: 타입 정의 작성**

```typescript
// src/entities/device/model/types.ts
export type DeviceType = "mobile" | "tablet" | "desktop"

export interface Device {
  id: string
  userId: string
  deviceFingerprint: string
  deviceName: string
  deviceType: DeviceType
  browser: string
  os: string
  lastActiveAt: string
  createdAt: string
}

export interface RegisterDeviceRequest {
  deviceFingerprint: string
  deviceName: string
  deviceType: DeviceType
  browser: string
  os: string
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/entities/device/model/types.ts
git commit -m "feat(기기관리): Device 엔티티 타입 정의"
```

---

### Task 5: Device Entity — API 함수

**Files:**
- Create: `src/entities/device/api/device-api.ts`
- Create: `src/entities/device/index.ts`

- [ ] **Step 1: API 함수 작성**

```typescript
// src/entities/device/api/device-api.ts
import { supabase } from "@/shared/api/supabase"
import type { Device, RegisterDeviceRequest } from "../model/types"

function toDevice(row: Record<string, unknown>): Device {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    deviceFingerprint: row.device_fingerprint as string,
    deviceName: row.device_name as string,
    deviceType: row.device_type as Device["deviceType"],
    browser: row.browser as string,
    os: row.os as string,
    lastActiveAt: row.last_active_at as string,
    createdAt: row.created_at as string,
  }
}

/** 내 기기 목록 조회 */
export async function getMyDevices(): Promise<Device[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch("/api/devices", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "기기 목록 조회 실패")
  }

  const rows = await res.json()
  return rows.map(toDevice)
}

/** 기기 등록 */
export async function registerDevice(input: RegisterDeviceRequest): Promise<Device> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch("/api/devices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      ...input,
      sessionId: session.user?.app_metadata?.session_id ?? null,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "기기 등록 실패")
  }

  const row = await res.json()
  return toDevice(row)
}

/** 내 기기 원격 로그아웃 */
export async function removeMyDevice(deviceId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch(`/api/devices/${deviceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "기기 로그아웃 실패")
  }
}

/** 회원 기기 목록 조회 (트레이너) */
export async function getMemberDevices(userId: string): Promise<Device[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch(`/api/devices/members/${userId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 기기 조회 실패")
  }

  const rows = await res.json()
  return rows.map(toDevice)
}

/** 회원 기기 강제 로그아웃 (트레이너) */
export async function removeMemberDevice(userId: string, deviceId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch(`/api/devices/members/${userId}/${deviceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 기기 강제 로그아웃 실패")
  }
}
```

- [ ] **Step 2: barrel export 작성**

```typescript
// src/entities/device/index.ts
export {
  getMyDevices,
  registerDevice,
  removeMyDevice,
  getMemberDevices,
  removeMemberDevice,
} from "./api/device-api"
export type { Device, DeviceType, RegisterDeviceRequest } from "./model/types"
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/entities/device/
git commit -m "feat(기기관리): Device 엔티티 API 함수 추가"
```

---

## Chunk 2: Hono API 라우트

### Task 6: Devices Hono 라우트

**Files:**
- Create: `src/app/api/routes/devices.ts`
- Modify: `src/app/api/[[...route]]/route.ts`

- [ ] **Step 1: Hono 기기 라우트 작성**

```typescript
// src/app/api/routes/devices.ts
import { Hono } from "hono"
import UAParser from "ua-parser-js"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { createAdminSupabase, createAuthorizedSupabase } from "@/app/api/_lib/supabase"

export const devicesRoutes = new Hono<AuthEnv>().use(authMiddleware)

/** 내 기기 목록 조회 */
devicesRoutes.get("/", async (c) => {
  const userId = c.get("userId")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  const { data, error } = await supabase
    .from("user_devices")
    .select("id, user_id, device_fingerprint, device_name, device_type, browser, os, last_active_at, created_at")
    .eq("user_id", userId)
    .order("last_active_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

/** 기기 등록 */
devicesRoutes.post("/", async (c) => {
  const userId = c.get("userId")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)
  const body = await c.req.json<{
    deviceFingerprint: string
    deviceName: string
    deviceType: string
    browser: string
    os: string
    sessionId?: string
  }>()

  // 같은 fingerprint의 기존 기기가 있으면 갱신
  const { data: existing } = await supabase
    .from("user_devices")
    .select("id")
    .eq("user_id", userId)
    .eq("device_fingerprint", body.deviceFingerprint)
    .maybeSingle()

  if (existing) {
    const { data, error } = await supabase
      .from("user_devices")
      .update({
        session_id: body.sessionId ?? null,
        device_name: body.deviceName,
        device_type: body.deviceType,
        browser: body.browser,
        os: body.os,
        last_active_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single()

    if (error) return c.json({ error: error.message }, 400)
    return c.json(data)
  }

  // 기기 수 확인 (3대 제한)
  const { count, error: countError } = await supabase
    .from("user_devices")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  if (countError) return c.json({ error: countError.message }, 400)

  if ((count ?? 0) >= 3) {
    // 기존 기기 목록 반환
    const { data: devices } = await supabase
      .from("user_devices")
      .select("id, device_name, device_type, browser, os, last_active_at, created_at")
      .eq("user_id", userId)
      .order("last_active_at", { ascending: false })

    return c.json({
      error: "기기 등록 한도 초과",
      code: "DEVICE_LIMIT_EXCEEDED",
      devices,
    }, 409)
  }

  // 새 기기 등록
  const { data, error } = await supabase
    .from("user_devices")
    .insert({
      user_id: userId,
      session_id: body.sessionId ?? null,
      device_fingerprint: body.deviceFingerprint,
      device_name: body.deviceName,
      device_type: body.deviceType,
      browser: body.browser,
      os: body.os,
    })
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

/** 내 기기 원격 로그아웃 */
devicesRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const deviceId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  // 기기 정보 조회 (session_id 포함)
  const { data: device, error: fetchError } = await supabase
    .from("user_devices")
    .select("id, session_id")
    .eq("id", deviceId)
    .eq("user_id", userId)
    .single()

  if (fetchError || !device) {
    return c.json({ error: "기기를 찾을 수 없습니다" }, 404)
  }

  // Supabase Admin으로 세션 무효화 (auth.sessions에서 직접 삭제)
  if (device.session_id) {
    await adminSupabase
      .schema("auth")
      .from("sessions")
      .delete()
      .eq("id", device.session_id)
  }

  // 기기 레코드 삭제
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("id", deviceId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

/** 회원 기기 목록 조회 (트레이너) */
devicesRoutes.get("/members/:userId", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 접근 가능합니다" }, 403)
  }

  const targetUserId = c.req.param("userId")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  // RLS가 trainer_id 확인을 처리
  const { data, error } = await supabase
    .from("user_devices")
    .select("id, user_id, device_name, device_type, browser, os, last_active_at, created_at")
    .eq("user_id", targetUserId)
    .order("last_active_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

/** 회원 기기 강제 로그아웃 (트레이너) */
devicesRoutes.delete("/members/:userId/:deviceId", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 접근 가능합니다" }, 403)
  }

  const targetUserId = c.req.param("userId")
  const deviceId = c.req.param("deviceId")
  const adminSupabase = createAdminSupabase()
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  // 기기 정보 조회 (RLS가 trainer_id 확인)
  const { data: device, error: fetchError } = await supabase
    .from("user_devices")
    .select("id, session_id")
    .eq("id", deviceId)
    .eq("user_id", targetUserId)
    .single()

  if (fetchError || !device) {
    return c.json({ error: "기기를 찾을 수 없습니다" }, 404)
  }

  // Supabase Admin으로 세션 무효화 (auth.sessions에서 직접 삭제)
  if (device.session_id) {
    await adminSupabase
      .schema("auth")
      .from("sessions")
      .delete()
      .eq("id", device.session_id)
  }

  // 기기 레코드 삭제 (RLS가 trainer_id 확인)
  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("id", deviceId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
```

- [ ] **Step 2: 라우트 등록**

`src/app/api/[[...route]]/route.ts`에 추가:

```typescript
import { devicesRoutes } from "@/app/api/routes/devices"
// app.route() 목록에 추가:
app.route("/devices", devicesRoutes)
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/routes/devices.ts src/app/api/[[...route]]/route.ts
git commit -m "feat(기기관리): Hono 기기 API 라우트 추가"
```

---

### Task 7: 활동 추적 미들웨어

**Files:**
- Modify: `src/shared/api/hono-auth-middleware.ts`

- [ ] **Step 1: 미들웨어에 활동 추적 추가**

`src/shared/api/hono-auth-middleware.ts`를 수정하여 `X-Device-Id` 헤더 기반 활동 추적을 추가한다.

```typescript
// AuthEnv에 deviceId 추가
export type AuthEnv = {
  Variables: {
    userId: string
    userRole: string
  }
}

// 활동 추적 throttle (5분)
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000
const lastActivityUpdate = new Map<string, number>()

// 기존 authMiddleware의 await next() 직전에 추가:
// 활동 추적 (X-Device-Id 헤더가 있을 때만)
const deviceId = c.req.header("X-Device-Id")
if (deviceId) {
  const cacheKey = `${user.id}:${deviceId}`
  const now = Date.now()
  const lastUpdate = lastActivityUpdate.get(cacheKey) ?? 0

  if (now - lastUpdate > ACTIVITY_THROTTLE_MS) {
    lastActivityUpdate.set(cacheKey, now)
    // 비동기로 갱신 (응답 지연 방지)
    supabase
      .from("user_devices")
      .update({ last_active_at: new Date().toISOString() })
      .eq("id", deviceId)
      .eq("user_id", user.id)
      .then(() => {})
  }
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/shared/api/hono-auth-middleware.ts
git commit -m "feat(기기관리): 활동 추적 미들웨어 추가 (5분 throttle)"
```

---

## Chunk 3: Feature 레이어 (Hooks + UI 컴포넌트)

### Task 8: TanStack Query Hooks

**Files:**
- Create: `src/features/device-management/model/use-devices.ts`

- [ ] **Step 1: Query/Mutation hooks 작성**

```typescript
// src/features/device-management/model/use-devices.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMyDevices,
  registerDevice,
  removeMyDevice,
  getMemberDevices,
  removeMemberDevice,
  type RegisterDeviceRequest,
} from "@/entities/device"

/** 내 기기 목록 */
export function useMyDevices() {
  return useQuery({
    queryKey: ["devices", "me"],
    queryFn: getMyDevices,
  })
}

/** 기기 등록 */
export function useRegisterDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RegisterDeviceRequest) => registerDevice(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}

/** 내 기기 원격 로그아웃 */
export function useRemoveMyDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (deviceId: string) => removeMyDevice(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}

/** 회원 기기 목록 (트레이너) */
export function useMemberDevices(userId: string) {
  return useQuery({
    queryKey: ["devices", "member", userId],
    queryFn: () => getMemberDevices(userId),
    enabled: !!userId,
  })
}

/** 회원 기기 강제 로그아웃 (트레이너) */
export function useRemoveMemberDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, deviceId }: { userId: string; deviceId: string }) =>
      removeMemberDevice(userId, deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["devices"] })
    },
  })
}
```

- [ ] **Step 2: 커밋**

```bash
git add src/features/device-management/model/use-devices.ts
git commit -m "feat(기기관리): TanStack Query hooks 추가"
```

---

### Task 9: 기기 목록 카드 컴포넌트

**Files:**
- Create: `src/features/device-management/ui/device-list.tsx`

- [ ] **Step 1: 기기 목록 컴포넌트 작성**

```typescript
// src/features/device-management/ui/device-list.tsx
"use client"

import { Monitor, Smartphone, Tablet, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { getStoredDeviceId } from "@/shared/lib/device-fingerprint"
import { useMyDevices, useRemoveMyDevice } from "../model/use-devices"
import type { Device } from "@/entities/device"

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

function DeviceIcon({ type }: { type: Device["deviceType"] }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="h-8 w-8 text-muted-foreground" />
    case "tablet":
      return <Tablet className="h-8 w-8 text-muted-foreground" />
    default:
      return <Monitor className="h-8 w-8 text-muted-foreground" />
  }
}

interface DeviceCardProps {
  device: Device
  isCurrentDevice: boolean
  onRemove: (deviceId: string) => void
  isRemoving: boolean
  /** 트레이너 강제 로그아웃 모드 */
  forceLogoutMode?: boolean
}

function DeviceCard({ device, isCurrentDevice, onRemove, isRemoving, forceLogoutMode }: DeviceCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <DeviceIcon type={device.deviceType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{device.deviceName}</span>
          {isCurrentDevice && (
            <Badge variant="secondary">현재 기기</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {device.os} · {device.browser}
        </p>
        <p className="text-xs text-muted-foreground">
          마지막 활동: {formatRelativeTime(device.lastActiveAt)}
        </p>
      </div>
      {!isCurrentDevice && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(device.id)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            forceLogoutMode ? "강제 로그아웃" : "로그아웃"
          )}
        </Button>
      )}
    </div>
  )
}

/** 내 기기 목록 (설정 페이지용) */
export function MyDeviceList() {
  const { data: devices, isLoading } = useMyDevices()
  const removeDevice = useRemoveMyDevice()
  const currentDeviceId = getStoredDeviceId()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>로그인된 기기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인된 기기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices?.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isCurrentDevice={device.id === currentDeviceId}
            onRemove={(id) => removeDevice.mutate(id)}
            isRemoving={removeDevice.isPending}
          />
        ))}
        {(!devices || devices.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            등록된 기기가 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** 회원 기기 목록 (트레이너 회원관리용) */
export interface MemberDeviceListProps {
  userId: string
  devices: Device[]
  isLoading: boolean
  onRemove: (deviceId: string) => void
  isRemoving: boolean
}

export function MemberDeviceList({
  devices,
  isLoading,
  onRemove,
  isRemoving,
}: MemberDeviceListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {devices?.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          isCurrentDevice={false}
          onRemove={onRemove}
          isRemoving={isRemoving}
          forceLogoutMode
        />
      ))}
      {(!devices || devices.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          등록된 기기가 없습니다
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/features/device-management/ui/device-list.tsx
git commit -m "feat(기기관리): 기기 목록 카드 컴포넌트 추가"
```

---

### Task 10: 기기 제한 초과 화면

**Files:**
- Create: `src/features/device-management/ui/device-limit-screen.tsx`

- [ ] **Step 1: 기기 제한 초과 화면 작성**

```typescript
// src/features/device-management/ui/device-limit-screen.tsx
"use client"

import { useState } from "react"
import { Monitor, Smartphone, Tablet, Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import type { Device } from "@/entities/device"
import { removeMyDevice } from "@/entities/device"

function DeviceIcon({ type }: { type: Device["deviceType"] }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="h-8 w-8 text-muted-foreground" />
    case "tablet":
      return <Tablet className="h-8 w-8 text-muted-foreground" />
    default:
      return <Monitor className="h-8 w-8 text-muted-foreground" />
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

interface DeviceLimitScreenProps {
  devices: Device[]
  onDeviceRemoved: () => void
}

export function DeviceLimitScreen({ devices, onDeviceRemoved }: DeviceLimitScreenProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRemove = async (deviceId: string) => {
    setRemovingId(deviceId)
    setError(null)
    try {
      await removeMyDevice(deviceId)
      onDeviceRemoved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그아웃에 실패했습니다")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>기기 등록 한도 초과</CardTitle>
          <CardDescription>
            최대 3대까지 로그인할 수 있습니다.
            아래 기기 중 하나를 로그아웃한 뒤 다시 시도해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          {devices.map((device) => (
            <div key={device.id} className="flex items-center gap-4 rounded-lg border p-4">
              <DeviceIcon type={device.deviceType} />
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{device.deviceName}</span>
                <p className="text-sm text-muted-foreground">
                  {device.os} · {device.browser}
                </p>
                <p className="text-xs text-muted-foreground">
                  마지막 활동: {formatRelativeTime(device.lastActiveAt)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(device.id)}
                disabled={removingId !== null}
              >
                {removingId === device.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "로그아웃"
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 2: barrel export 작성**

```typescript
// src/features/device-management/index.ts
export { MyDeviceList, MemberDeviceList } from "./ui/device-list"
export type { MemberDeviceListProps } from "./ui/device-list"
export { DeviceLimitScreen } from "./ui/device-limit-screen"
export {
  useMyDevices,
  useRegisterDevice,
  useRemoveMyDevice,
  useMemberDevices,
  useRemoveMemberDevice,
} from "./model/use-devices"
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/features/device-management/
git commit -m "feat(기기관리): 기기 제한 초과 화면 및 feature barrel export 추가"
```

---

## Chunk 4: 로그인 플로우 수정 + 설정/회원관리 UI 통합

### Task 11: 로그인 플로우에 기기 등록 연동

**Files:**
- Modify: `src/features/auth/api/auth-api.ts`
- Modify: `src/features/auth/ui/login-form.tsx`

- [ ] **Step 1: auth-api.ts에 기기 파싱 헬퍼 추가**

`src/features/auth/api/auth-api.ts`에 추가:

```typescript
import UAParser from "ua-parser-js"
import type { RegisterDeviceRequest } from "@/entities/device"

/** User-Agent에서 기기 정보 파싱 */
export function parseDeviceInfo(): Omit<RegisterDeviceRequest, "deviceFingerprint"> {
  const parser = new UAParser()
  const result = parser.getResult()

  const os = result.os.name ?? "Unknown OS"
  const browser = result.browser.name ?? "Unknown Browser"
  const deviceType = result.device.type === "mobile"
    ? "mobile" as const
    : result.device.type === "tablet"
      ? "tablet" as const
      : "desktop" as const

  const deviceName = result.device.model
    ? `${result.device.vendor ?? ""} ${result.device.model}`.trim()
    : `${os} ${browser}`

  return { deviceName, deviceType, browser, os }
}
```

- [ ] **Step 2: device-api.ts에 DeviceLimitError 추가**

`src/entities/device/api/device-api.ts`의 `registerDevice` 함수 에러 처리를 수정한다. 파일 상단에 클래스를 추가하고, `registerDevice` 내 `if (!res.ok)` 블록을 교체:

```typescript
// device-api.ts 파일 상단 (import 아래)에 추가:
export class DeviceLimitError extends Error {
  devices: Device[]
  constructor(devices: Device[]) {
    super("기기 등록 한도 초과")
    this.name = "DeviceLimitError"
    this.devices = devices
  }
}

// registerDevice 함수 내 기존 에러 처리를 다음으로 교체:
  if (!res.ok) {
    const err = await res.json()
    if (err.code === "DEVICE_LIMIT_EXCEEDED") {
      throw new DeviceLimitError(err.devices ?? [])
    }
    throw new Error(err.error ?? "기기 등록 실패")
  }
```

barrel export에도 추가:
```typescript
// src/entities/device/index.ts에 추가:
export { DeviceLimitError } from "./api/device-api"
```

- [ ] **Step 3: login-form.tsx에 기기 등록 플로우 추가**

`src/features/auth/ui/login-form.tsx`를 수정하여 로그인 성공 후 기기 등록을 시도한다. 아래는 수정할 전체 핸들러와 렌더링 로직:

```typescript
// login-form.tsx 상단에 import 추가:
import { useState } from "react"
import { generateDeviceFingerprint, storeDeviceId } from "@/shared/lib/device-fingerprint"
import { registerDevice, DeviceLimitError, type Device } from "@/entities/device"
import { DeviceLimitScreen } from "@/features/device-management"
import { parseDeviceInfo } from "../api/auth-api"

// 컴포넌트 내부에 상태 추가:
const [limitDevices, setLimitDevices] = useState<Device[] | null>(null)

// 기기 등록 시도 함수 (handleSubmit과 onDeviceRemoved 양쪽에서 사용):
const attemptDeviceRegistration = async () => {
  const fingerprint = generateDeviceFingerprint()
  const deviceInfo = parseDeviceInfo()
  const device = await registerDevice({ ...deviceInfo, deviceFingerprint: fingerprint })
  storeDeviceId(device.id)
  router.push("/")
  router.refresh()
}

// 기존 handleSubmit의 signIn 성공 후 부분을 다음으로 교체:
// (기존: router.push("/"); router.refresh())
try {
  await attemptDeviceRegistration()
} catch (e: unknown) {
  if (e instanceof DeviceLimitError) {
    setLimitDevices(e.devices)
  } else {
    setError(e instanceof Error ? e.message : "기기 등록에 실패했습니다")
  }
}

// 컴포넌트 return 문 최상단에 추가 (기존 JSX 앞):
if (limitDevices) {
  return (
    <DeviceLimitScreen
      devices={limitDevices}
      onDeviceRemoved={async () => {
        try {
          await attemptDeviceRegistration()
        } catch (e: unknown) {
          if (e instanceof DeviceLimitError) {
            setLimitDevices(e.devices)
          }
        }
      }}
    />
  )
}
```

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/features/auth/ src/entities/device/api/device-api.ts
git commit -m "feat(기기관리): 로그인 플로우에 기기 등록 연동"
```

---

### Task 12: 설정 페이지에 기기 목록 추가

**Files:**
- Modify: `src/views/settings/ui/SettingsPage.tsx`

- [ ] **Step 1: SettingsPage에 MyDeviceList 추가**

`src/views/settings/ui/SettingsPage.tsx`에 `MyDeviceList` 컴포넌트를 import하여 알림 설정 아래에 추가:

```typescript
import { MyDeviceList } from "@/features/device-management"

// 기존 NotificationSettingsForm 아래에 추가:
<MyDeviceList />
```

- [ ] **Step 2: 개발 서버에서 설정 페이지 확인**

Run: `pnpm dev`
브라우저에서 `/settings` 접속하여 "로그인된 기기" 섹션이 표시되는지 확인

- [ ] **Step 3: 커밋**

```bash
git add src/views/settings/ui/SettingsPage.tsx
git commit -m "feat(기기관리): 설정 페이지에 기기 목록 섹션 추가"
```

---

### Task 13: 회원관리에 회원 기기 조회 추가

**Files:**
- Modify: `src/views/members/ui/MembersPage.tsx`

- [ ] **Step 1: 회원 상세에 기기 목록 추가**

회원 편집 Dialog 또는 별도 Dialog에 회원의 기기 목록을 표시한다.

`src/views/members/ui/MembersPage.tsx`를 수정:

```typescript
import { MemberDeviceList } from "@/features/device-management"
import { useMemberDevices, useRemoveMemberDevice } from "@/features/device-management"

// 회원 기기 조회 상태 추가:
const [deviceMember, setDeviceMember] = useState<Profile | null>(null)

// MemberListTable에 onViewDevices 콜백 추가 (또는 편집 dialog 내부에 탭/섹션 추가)

// Dialog 추가:
<Dialog open={!!deviceMember} onOpenChange={(open) => !open && setDeviceMember(null)}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>{deviceMember?.name}님의 접속 기기</DialogTitle>
    </DialogHeader>
    {deviceMember && (
      <MemberDeviceListWrapper userId={deviceMember.id} />
    )}
  </DialogContent>
</Dialog>
```

`MemberDeviceListWrapper`는 내부에서 `useMemberDevices`와 `useRemoveMemberDevice` hooks를 사용:

```typescript
function MemberDeviceListWrapper({ userId }: { userId: string }) {
  const { data: devices, isLoading } = useMemberDevices(userId)
  const removeDevice = useRemoveMemberDevice()

  return (
    <MemberDeviceList
      userId={userId}
      devices={devices ?? []}
      isLoading={isLoading}
      onRemove={(deviceId) => removeDevice.mutate({ userId, deviceId })}
      isRemoving={removeDevice.isPending}
    />
  )
}
```

- [ ] **Step 2: MemberListTable에 기기 확인 버튼 추가**

`src/widgets/member/` 내 `MemberListTable` 컴포넌트를 수정하여 각 행에 기기 확인 버튼(Smartphone 아이콘)을 추가한다. props에 `onViewDevices?: (member: Profile) => void` 콜백을 추가하고, 버튼 클릭 시 해당 콜백을 호출한다.

- [ ] **Step 3: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add src/views/members/
git commit -m "feat(기기관리): 회원관리에 회원 기기 조회/강제 로그아웃 추가"
```

---

### Task 14: API 클라이언트에 X-Device-Id 헤더 추가

**Files:**
- Modify: `src/entities/device/api/device-api.ts` (또는 공통 fetch wrapper)

- [ ] **Step 1: API 호출에 X-Device-Id 헤더 포함**

기존 entity API 함수들 (`src/entities/*/api/`) 에서 fetch 호출 시 `X-Device-Id` 헤더를 자동으로 포함하도록 공통 헬퍼를 만들거나, 기존 fetch 호출에 헤더를 추가한다.

가장 간단한 방법: `src/shared/api/fetch-with-device.ts` 생성

```typescript
// src/shared/api/fetch-with-device.ts
import { getStoredDeviceId } from "@/shared/lib/device-fingerprint"

/**
 * X-Device-Id 헤더를 자동 포함하는 fetch wrapper
 * 기존 headers에 추가하므로 기존 코드와 호환
 */
export function fetchWithDevice(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const deviceId = getStoredDeviceId()
  const headers = new Headers(init?.headers)

  if (deviceId) {
    headers.set("X-Device-Id", deviceId)
  }

  return fetch(input, { ...init, headers })
}
```

이후 entity API 함수들에서 `fetch` 대신 `fetchWithDevice`를 사용하도록 점진적으로 교체한다. 우선 device-api.ts와 profile-api.ts에만 적용.

- [ ] **Step 2: 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add src/shared/api/fetch-with-device.ts src/entities/
git commit -m "feat(기기관리): X-Device-Id 헤더 자동 포함 fetch wrapper 추가"
```

---

### Task 15: 빌드 확인 및 최종 정리

- [ ] **Step 1: 전체 타입 체크**

Run: `pnpm typecheck`
Expected: 에러 없음

- [ ] **Step 2: 전체 빌드**

Run: `pnpm build`
Expected: 빌드 성공

- [ ] **Step 3: 단위 테스트**

Run: `pnpm test`
Expected: 모든 테스트 통과

- [ ] **Step 4: 최종 커밋 (필요 시)**

남은 수정사항이 있으면 커밋
