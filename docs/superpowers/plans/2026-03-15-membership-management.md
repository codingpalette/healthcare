# 회원권 관리 구현 계획

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 트레이너가 회원별 이용 기간(회원권)을 관리하고, 만료 시 회원의 서비스 접근을 차단하는 기능 구현

**Architecture:** Supabase memberships 테이블 → Hono API 라우트 → 엔티티/피처 계층 → 레이아웃 가드 + API 미들웨어로 만료 차단. 기존 알림 시스템 확장으로 만료 알림 처리.

**Tech Stack:** Next.js 16, Hono, Supabase, TanStack Query, shadcn/ui, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-03-15-membership-management-design.md`

---

## Task 1: DB 마이그레이션 — memberships 테이블 생성

**Files:**
- Create: `supabase/migrations/20260315120000_create_memberships.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- memberships 테이블
CREATE TABLE IF NOT EXISTS public.memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON public.memberships(end_date);

CREATE TRIGGER on_memberships_updated
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;

-- RLS: 트레이너 - 자기 회원 대상 CRUD
CREATE POLICY "trainer_select_memberships" ON public.memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_insert_memberships" ON public.memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_update_memberships" ON public.memberships
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

CREATE POLICY "trainer_delete_memberships" ON public.memberships
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = memberships.member_id
        AND profiles.trainer_id = auth.uid()
    )
  );

-- RLS: 회원 - 자기 회원권 조회만
CREATE POLICY "member_select_own_membership" ON public.memberships
  FOR SELECT TO authenticated
  USING (member_id = auth.uid());
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260315120000_create_memberships.sql
git commit -m "feat(회원권): memberships 테이블 마이그레이션 생성"
```

---

## Task 2: DB 마이그레이션 — 알림 시스템 확장

**Files:**
- Create: `supabase/migrations/20260315120001_add_membership_notification.sql`

- [ ] **Step 1: 마이그레이션 SQL 작성**

```sql
-- notifications kind에 membership_expiry 추가
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_kind_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_kind_check
  CHECK (
    kind IN (
      'inbody_reminder',
      'attendance_absence',
      'chat_message',
      'meal_feedback',
      'workout_feedback',
      'membership_expiry',
      'system'
    )
  );

-- notification_preferences에 membership_enabled 컬럼 추가
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS membership_enabled BOOLEAN NOT NULL DEFAULT TRUE;
```

- [ ] **Step 2: 커밋**

```bash
git add supabase/migrations/20260315120001_add_membership_notification.sql
git commit -m "feat(회원권): 알림 시스템에 membership_expiry 타입 추가"
```

---

## Task 3: Entity 계층 — membership 타입 및 API

**Files:**
- Create: `src/entities/membership/model/types.ts`
- Create: `src/entities/membership/model/index.ts`
- Create: `src/entities/membership/api/membership-api.ts`
- Create: `src/entities/membership/api/index.ts`
- Create: `src/entities/membership/index.ts`

- [ ] **Step 1: 타입 정의**

`src/entities/membership/model/types.ts`:
```typescript
export interface Membership {
  id: string
  memberId: string
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  memo: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateMembershipRequest {
  memberId: string
  startDate: string
  endDate: string
  memo?: string
}

export interface UpdateMembershipRequest {
  startDate?: string
  endDate?: string
  memo?: string
}
```

`src/entities/membership/model/index.ts`:
```typescript
export type { Membership, CreateMembershipRequest, UpdateMembershipRequest } from "./types"
```

- [ ] **Step 2: API 함수 작성**

`src/entities/membership/api/membership-api.ts`:
```typescript
import { supabase } from "@/shared/api/supabase"
import type { Membership } from "@/entities/membership/model/types"

function toMembership(row: Record<string, unknown>): Membership {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    memo: (row.memo as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  }
}

export async function getMyMembership(): Promise<Membership | null> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/memberships/me", { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 조회에 실패했습니다")
  }
  const data = await res.json()
  return data ? toMembership(data) : null
}

export async function getMemberships(): Promise<Membership[]> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/memberships", { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 목록 조회에 실패했습니다")
  }
  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toMembership)
}

export async function getMemberMembership(memberId: string): Promise<Membership | null> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/memberships/members/${memberId}`, { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 조회에 실패했습니다")
  }
  const data = await res.json()
  return data ? toMembership(data) : null
}

export async function createMembership(
  data: import("@/entities/membership/model/types").CreateMembershipRequest
): Promise<Membership> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/memberships", {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 생성에 실패했습니다")
  }
  return toMembership(await res.json())
}

export async function updateMembership(
  id: string,
  data: import("@/entities/membership/model/types").UpdateMembershipRequest
): Promise<Membership> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/memberships/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 수정에 실패했습니다")
  }
  return toMembership(await res.json())
}

export async function deleteMembership(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/memberships/${id}`, {
    method: "DELETE",
    headers,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 삭제에 실패했습니다")
  }
}
```

`src/entities/membership/api/index.ts`:
```typescript
export {
  getMyMembership,
  getMemberships,
  getMemberMembership,
  createMembership,
  updateMembership,
  deleteMembership,
} from "./membership-api"
```

- [ ] **Step 3: barrel export 작성**

`src/entities/membership/index.ts`:
```typescript
export {
  getMyMembership,
  getMemberships,
  getMemberMembership,
  createMembership,
  updateMembership,
  deleteMembership,
} from "./api"
export type { Membership, CreateMembershipRequest, UpdateMembershipRequest } from "./model"
```

- [ ] **Step 4: 커밋**

```bash
git add src/entities/membership/
git commit -m "feat(회원권): membership 엔티티 타입 및 API 함수 구현"
```

---

## Task 4: Hono API 라우트 — memberships

**Files:**
- Create: `src/app/api/routes/memberships.ts`
- Modify: `src/app/api/[[...route]]/route.ts`

- [ ] **Step 1: memberships 라우트 작성**

`src/app/api/routes/memberships.ts`:
```typescript
import { Hono } from "hono"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"

export const membershipsRoutes = new Hono<AuthEnv>().use(authMiddleware)

// 헬퍼: 트레이너가 해당 회원을 소유하는지 확인
async function verifyTrainerOwnership(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  trainerId: string,
  memberId: string
) {
  const { data } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("id", memberId)
    .eq("trainer_id", trainerId)
    .eq("role", "member")
    .is("deleted_at", null)
    .maybeSingle()
  return !!data
}

// GET /memberships/me - 회원 자기 회원권 조회
membershipsRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  const { data, error } = await adminSupabase
    .from("memberships")
    .select("*")
    .eq("member_id", userId)
    .maybeSingle()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// GET /memberships - 트레이너 전체 회원 회원권 목록
membershipsRoutes.get("/", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole")
  const adminSupabase = createAdminSupabase()

  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  // 자기 회원 ID 목록
  const { data: members } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("trainer_id", userId)
    .eq("role", "member")
    .is("deleted_at", null)

  if (!members?.length) return c.json([])

  const memberIds = members.map((m) => m.id as string)

  const { data, error } = await adminSupabase
    .from("memberships")
    .select("*")
    .in("member_id", memberIds)

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data ?? [])
})

// GET /memberships/members/:id - 특정 회원 회원권 조회
membershipsRoutes.get("/members/:id", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole")
  const memberId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const isOwner = await verifyTrainerOwnership(adminSupabase, userId, memberId)
  if (!isOwner) {
    return c.json({ error: "해당 회원에 대한 권한이 없습니다" }, 403)
  }

  const { data, error } = await adminSupabase
    .from("memberships")
    .select("*")
    .eq("member_id", memberId)
    .maybeSingle()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// POST /memberships - 회원권 생성
membershipsRoutes.post("/", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole")
  const adminSupabase = createAdminSupabase()

  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 회원권을 생성할 수 있습니다" }, 403)
  }

  const body = await c.req.json<{
    memberId?: string
    startDate?: string
    endDate?: string
    memo?: string
  }>()

  if (!body.memberId || !body.startDate || !body.endDate) {
    return c.json({ error: "memberId, startDate, endDate는 필수입니다" }, 400)
  }

  const isOwner = await verifyTrainerOwnership(adminSupabase, userId, body.memberId)
  if (!isOwner) {
    return c.json({ error: "해당 회원에 대한 권한이 없습니다" }, 403)
  }

  const { data, error } = await adminSupabase
    .from("memberships")
    .insert({
      member_id: body.memberId,
      start_date: body.startDate,
      end_date: body.endDate,
      memo: body.memo ?? null,
    })
    .select()
    .single()

  if (error) {
    if (error.code === "23505") {
      return c.json({ error: "이미 회원권이 등록된 회원입니다" }, 409)
    }
    return c.json({ error: error.message }, 400)
  }
  return c.json(data, 201)
})

// PATCH /memberships/:id - 회원권 수정
membershipsRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole")
  const membershipId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 회원권을 수정할 수 있습니다" }, 403)
  }

  // 기존 회원권 조회로 소유권 확인
  const { data: existing } = await adminSupabase
    .from("memberships")
    .select("member_id")
    .eq("id", membershipId)
    .maybeSingle()

  if (!existing) {
    return c.json({ error: "회원권을 찾을 수 없습니다" }, 404)
  }

  const isOwner = await verifyTrainerOwnership(adminSupabase, userId, existing.member_id as string)
  if (!isOwner) {
    return c.json({ error: "해당 회원에 대한 권한이 없습니다" }, 403)
  }

  const body = await c.req.json<{
    startDate?: string
    endDate?: string
    memo?: string
  }>()

  const updateData: Record<string, unknown> = {}
  if (body.startDate !== undefined) updateData.start_date = body.startDate
  if (body.endDate !== undefined) updateData.end_date = body.endDate
  if (body.memo !== undefined) updateData.memo = body.memo

  if (Object.keys(updateData).length === 0) {
    return c.json({ error: "수정할 필드가 없습니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("memberships")
    .update(updateData)
    .eq("id", membershipId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// DELETE /memberships/:id - 회원권 삭제
membershipsRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole")
  const membershipId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 회원권을 삭제할 수 있습니다" }, 403)
  }

  const { data: existing } = await adminSupabase
    .from("memberships")
    .select("member_id")
    .eq("id", membershipId)
    .maybeSingle()

  if (!existing) {
    return c.json({ error: "회원권을 찾을 수 없습니다" }, 404)
  }

  const isOwner = await verifyTrainerOwnership(adminSupabase, userId, existing.member_id as string)
  if (!isOwner) {
    return c.json({ error: "해당 회원에 대한 권한이 없습니다" }, 403)
  }

  const { error } = await adminSupabase
    .from("memberships")
    .delete()
    .eq("id", membershipId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
```

- [ ] **Step 2: 라우트 등록**

`src/app/api/[[...route]]/route.ts`에 추가:
```typescript
import { membershipsRoutes } from "@/app/api/routes/memberships"
// ... 기존 route 등록 아래에
app.route("/memberships", membershipsRoutes)
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/routes/memberships.ts src/app/api/\[\[...route\]\]/route.ts
git commit -m "feat(회원권): 회원권 CRUD API 라우트 구현"
```

---

## Task 5: 알림 시스템 확장

**Files:**
- Modify: `src/app/api/_lib/notifications.ts` (kind 타입에 `membership_expiry` 추가, `getDefaultNotificationPreferences`에 `membership_enabled` 추가)

- [ ] **Step 1: notifications.ts 수정**

`src/app/api/_lib/notifications.ts`에서:

1. `getDefaultNotificationPreferences`에 `membership_enabled: true` 추가
2. `createNotificationIfNeeded`의 `kind` union에 `"membership_expiry"` 추가

- [ ] **Step 2: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/api/_lib/notifications.ts
git commit -m "feat(회원권): 알림 시스템에 membership_expiry 타입 추가"
```

---

## Task 6: API 미들웨어 — 회원권 만료 차단

**Files:**
- Create: `src/shared/api/membership-guard-middleware.ts`
- Modify: `src/app/api/[[...route]]/route.ts` (미들웨어 적용)

- [ ] **Step 1: 회원권 만료 체크 미들웨어 작성**

`src/shared/api/membership-guard-middleware.ts`:
```typescript
import { createMiddleware } from "hono/factory"
import { createClient } from "@supabase/supabase-js"
import type { AuthEnv } from "@/shared/api/hono-auth-middleware"

// 회원권 만료 체크에서 제외할 경로 패턴
const EXEMPT_PATHS = [
  "/api/memberships/me",
  "/api/profiles/me",
  "/api/notifications",
]

function isExemptPath(path: string): boolean {
  return EXEMPT_PATHS.some((p) => path.startsWith(p))
}

export const membershipGuardMiddleware = createMiddleware<AuthEnv>(async (c, next) => {
  const userRole = c.get("userRole")

  // 트레이너는 체크 없이 통과
  if (userRole !== "member") {
    return next()
  }

  // 제외 경로 체크
  if (isExemptPath(c.req.path)) {
    return next()
  }

  const userId = c.get("userId")

  const adminSupabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: membership } = await adminSupabase
    .from("memberships")
    .select("end_date")
    .eq("member_id", userId)
    .maybeSingle()

  const today = new Date().toISOString().split("T")[0]

  if (!membership || membership.end_date < today) {
    return c.json({ error: "membership_expired" }, 403)
  }

  return next()
})
```

- [ ] **Step 2: route.ts에 미들웨어 적용**

`src/app/api/[[...route]]/route.ts`에서 authMiddleware 이후, 각 라우트 등록 전에 `membershipGuardMiddleware` 적용. 단, `memberships`, `profiles`, `notifications` 라우트는 미들웨어 내부에서 제외 처리됨.

실제로는 미들웨어를 개별 라우트에 적용하기보다, `route.ts`에서 app 레벨 미들웨어로 추가:

```typescript
import { membershipGuardMiddleware } from "@/shared/api/membership-guard-middleware"

// authMiddleware가 각 라우트 내부에 적용되므로,
// 별도로 app.use로 적용하기 어려움
// → 각 보호 대상 라우트에 .use(membershipGuardMiddleware) 추가하는 대신
// → route.ts에서 app 레벨 미들웨어로 등록 (authMiddleware 후 실행)
```

> **참고:** 기존 구조에서 authMiddleware는 각 라우트 파일 내에서 `.use(authMiddleware)`로 적용됨. membershipGuardMiddleware도 동일 패턴으로 보호 대상 라우트(`diet`, `workout`, `attendance`, `inbody`, `chat`, `equipment`, `food-items`)에 추가. `profiles`, `memberships`, `notifications`, `devices` 라우트에는 추가하지 않음.

보호 대상 라우트 파일들에 추가:
```typescript
// 예: src/app/api/routes/diet.ts
import { membershipGuardMiddleware } from "@/shared/api/membership-guard-middleware"
export const dietRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)
```

적용 대상 파일:
- `src/app/api/routes/diet.ts`
- `src/app/api/routes/workout.ts`
- `src/app/api/routes/attendance.ts`
- `src/app/api/routes/inbody.ts`
- `src/app/api/routes/chat.ts`
- `src/app/api/routes/equipment.ts`
- `src/app/api/routes/food-item.ts`

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/shared/api/membership-guard-middleware.ts src/app/api/routes/diet.ts src/app/api/routes/workout.ts src/app/api/routes/attendance.ts src/app/api/routes/inbody.ts src/app/api/routes/chat.ts src/app/api/routes/equipment.ts src/app/api/routes/food-item.ts
git commit -m "feat(회원권): API 레벨 회원권 만료 차단 미들웨어 구현"
```

---

## Task 7: 레이아웃 가드 — 회원권 만료 리다이렉트

**Files:**
- Modify: `src/app/(authenticated)/layout.tsx`

- [ ] **Step 1: 레이아웃 가드에 회원권 체크 추가**

`src/app/(authenticated)/layout.tsx`에서 프로필 조회 후, 회원(role === "member")인 경우:

```typescript
// 프로필 조회 코드 아래에 추가
// 회원권 만료 체크 (회원만)
if (profile.role === "member") {
  const allowedPaths = ["/membership-expired", "/settings", "/login"]
  const { headers } = await import("next/headers")
  const headersList = await headers()
  const pathname = headersList.get("x-pathname") ?? ""

  // Next.js에서는 서버 컴포넌트에서 pathname 접근이 제한적이므로
  // middleware.ts에서 처리하는 것이 더 적합
}
```

> **수정:** Next.js App Router에서 서버 컴포넌트의 pathname 접근 제약 때문에, `middleware.ts`에서 회원권 체크를 수행하는 것이 더 자연스러움. 하지만 Supabase 조회가 필요하므로 layout.tsx에서 처리:

```typescript
// layout.tsx 프로필 조회 후 추가 (children 렌더링 전)
if (profile.role === "member") {
  const { data: membership } = await supabase
    .from("memberships")
    .select("end_date")
    .eq("member_id", user.id)
    .maybeSingle()

  const today = new Date().toISOString().split("T")[0]
  const isExpired = !membership || (membership.end_date as string) < today

  if (isExpired) {
    // membership-expired 페이지 자체에서는 리다이렉트하지 않도록
    // children에 membership 상태를 전달하거나, 별도 레이아웃 사용
    redirect("/membership-expired")
  }
}
```

**주의:** `/membership-expired` 경로 자체에서 무한 리다이렉트 방지를 위해, 이 페이지는 `(authenticated)` 그룹 밖에 별도 레이아웃으로 구성하거나, 레이아웃 내에서 pathname 기반 예외 처리 필요.

→ 가장 깔끔한 방법: `/membership-expired` 페이지를 `(authenticated)` 그룹 밖 별도 `(membership-blocked)` 그룹으로 구성.

- [ ] **Step 2: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 3: 커밋**

```bash
git add src/app/\(authenticated\)/layout.tsx
git commit -m "feat(회원권): 레이아웃 가드에 회원권 만료 리다이렉트 추가"
```

---

## Task 8: 만료 안내 페이지

**Files:**
- Create: `src/app/(membership-blocked)/membership-expired/page.tsx`
- Create: `src/app/(membership-blocked)/layout.tsx`
- Create: `src/views/membership-expired/ui/MembershipExpiredPage.tsx`
- Create: `src/views/membership-expired/index.ts`

- [ ] **Step 1: (membership-blocked) 레이아웃**

`src/app/(membership-blocked)/layout.tsx`:
```typescript
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/shared/api/supabase-server"

export default async function MembershipBlockedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      {children}
    </div>
  )
}
```

- [ ] **Step 2: 만료 안내 페이지 뷰 컴포넌트**

`src/views/membership-expired/ui/MembershipExpiredPage.tsx`:
```typescript
"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { signOut } from "@/features/auth"
import type { Membership } from "@/entities/membership"
import { getMyMembership } from "@/entities/membership"

export function MembershipExpiredPage() {
  const router = useRouter()
  const [membership, setMembership] = useState<Membership | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getMyMembership()
      .then(setMembership)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  if (loading) return null

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          {membership ? "회원권이 만료되었습니다" : "회원권이 설정되지 않았습니다"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        {membership ? (
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>시작일: {membership.startDate}</p>
            <p>종료일: {membership.endDate}</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            아직 회원권이 설정되지 않았습니다.
          </p>
        )}
        <p className="text-sm text-muted-foreground">
          서비스를 이용하려면 트레이너에게 문의하세요.
        </p>
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="outline" onClick={handleLogout}>
            로그아웃
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

`src/views/membership-expired/index.ts`:
```typescript
export { MembershipExpiredPage } from "./ui/MembershipExpiredPage"
```

- [ ] **Step 3: 페이지 라우트**

`src/app/(membership-blocked)/membership-expired/page.tsx`:
```typescript
import { MembershipExpiredPage } from "@/views/membership-expired"

export default function Page() {
  return <MembershipExpiredPage />
}
```

- [ ] **Step 4: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 5: 커밋**

```bash
git add src/app/\(membership-blocked\)/ src/views/membership-expired/
git commit -m "feat(회원권): 회원권 만료/미설정 안내 페이지 구현"
```

---

## Task 9: Feature 계층 — React Query hooks

**Files:**
- Create: `src/features/membership-management/model/use-memberships.ts`
- Create: `src/features/membership-management/index.ts`

- [ ] **Step 1: React Query hooks 작성**

`src/features/membership-management/model/use-memberships.ts`:
```typescript
"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  getMyMembership,
  getMemberships,
  getMemberMembership,
  createMembership,
  updateMembership,
  deleteMembership,
} from "@/entities/membership"
import type { CreateMembershipRequest, UpdateMembershipRequest } from "@/entities/membership"

export function useMyMembership() {
  return useQuery({
    queryKey: ["membership", "me"],
    queryFn: getMyMembership,
  })
}

export function useMemberships() {
  return useQuery({
    queryKey: ["memberships"],
    queryFn: getMemberships,
  })
}

export function useMemberMembership(memberId: string) {
  return useQuery({
    queryKey: ["membership", memberId],
    queryFn: () => getMemberMembership(memberId),
    enabled: !!memberId,
  })
}

export function useCreateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMembershipRequest) => createMembership(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
      queryClient.invalidateQueries({ queryKey: ["membership"] })
    },
  })
}

export function useUpdateMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMembershipRequest }) =>
      updateMembership(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
      queryClient.invalidateQueries({ queryKey: ["membership"] })
    },
  })
}

export function useDeleteMembership() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMembership(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["memberships"] })
      queryClient.invalidateQueries({ queryKey: ["membership"] })
    },
  })
}
```

- [ ] **Step 2: barrel export**

`src/features/membership-management/index.ts`:
```typescript
export {
  useMyMembership,
  useMemberships,
  useMemberMembership,
  useCreateMembership,
  useUpdateMembership,
  useDeleteMembership,
} from "./model/use-memberships"
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/features/membership-management/
git commit -m "feat(회원권): 회원권 관리 React Query hooks 구현"
```

---

## Task 10: 트레이너 UI — 회원권 설정 다이얼로그

**Files:**
- Create: `src/features/membership-management/ui/membership-form.tsx`
- Modify: `src/features/membership-management/index.ts` (export 추가)

- [ ] **Step 1: 회원권 설정 다이얼로그 컴포넌트**

`src/features/membership-management/ui/membership-form.tsx`:

회원 선택 → 시작일/종료일 DatePicker → 메모 → 생성/수정/삭제.
기존 `edit-member-form.tsx` 패턴을 따라 Dialog + Form 구조.

주요 기능:
- `memberId` props로 받아서 기존 회원권 조회
- 없으면 생성 모드, 있으면 수정 모드
- 시작일/종료일 input type="date" 사용
- 메모 textarea
- 삭제 버튼 (수정 모드에서만)
- `useCreateMembership`, `useUpdateMembership`, `useDeleteMembership` hooks 사용
- 성공 시 toast (sonner)

- [ ] **Step 2: barrel export 업데이트**

`src/features/membership-management/index.ts`에 `MembershipForm` export 추가.

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/features/membership-management/
git commit -m "feat(회원권): 트레이너용 회원권 설정 다이얼로그 구현"
```

---

## Task 11: 트레이너 UI — 회원 목록 테이블에 회원권 컬럼 추가

**Files:**
- Modify: `src/widgets/member/member-list-table.tsx`
- Modify: `src/views/members/ui/MembersPage.tsx`

- [ ] **Step 1: 회원 목록 테이블에 회원권 상태 추가**

`src/widgets/member/member-list-table.tsx`에:
- `useMemberships()` hook으로 전체 회원권 목록 조회
- `memberId`로 매핑하여 각 회원 행에 회원권 상태 배지 표시
  - 활성: 녹색 배지 + 남은 일수
  - 만료: 빨간색 배지
  - 미설정: 회색 배지
- "회원권 설정" 액션 버튼 추가 → `MembershipForm` 다이얼로그 열기

- [ ] **Step 2: MembersPage에 다이얼로그 통합**

기존 Dialog 패턴 참고하여 MembershipForm을 다이얼로그로 연결.

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/widgets/member/member-list-table.tsx src/views/members/ui/MembersPage.tsx
git commit -m "feat(회원권): 회원 목록에 회원권 상태 배지 및 설정 액션 추가"
```

---

## Task 12: 회원 UI — 대시보드 회원권 카드

**Files:**
- Create: `src/widgets/membership/membership-status-card.tsx`
- Create: `src/widgets/membership/index.ts`
- Modify: 대시보드 페이지 (회원 역할일 때 카드 표시)

- [ ] **Step 1: 회원권 상태 카드 컴포넌트**

`src/widgets/membership/membership-status-card.tsx`:
- `useMyMembership()` hook 사용
- 시작일, 종료일, 남은 일수 표시
- 남은 일수 ≤ 7일: 경고 스타일 (주황/빨간 텍스트)
- 로딩/에러 상태 처리

`src/widgets/membership/index.ts`:
```typescript
export { MembershipStatusCard } from "./membership-status-card"
```

- [ ] **Step 2: 대시보드에 카드 추가**

회원 역할 사용자의 대시보드 페이지에 `MembershipStatusCard` 추가.

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/widgets/membership/
git commit -m "feat(회원권): 회원 대시보드 회원권 상태 카드 구현"
```

---

## Task 13: 만료 알림 생성 로직

**Files:**
- Modify: `src/app/api/routes/notifications.ts` (sync 함수에 회원권 만료 알림 추가)

- [ ] **Step 1: syncMembershipExpiryNotifications 함수 추가**

`src/app/api/routes/notifications.ts`에 새 함수 추가:

```typescript
async function syncMembershipExpiryNotifications(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  userId: string,
  userRole: string,
  pushEnabled: boolean
) {
  if (userRole === "member") {
    // 회원 자기 회원권 만료 알림
    const { data: membership } = await adminSupabase
      .from("memberships")
      .select("id, member_id, end_date")
      .eq("member_id", userId)
      .maybeSingle()

    if (!membership) return

    const today = new Date()
    const endDate = new Date(membership.end_date as string)
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    for (const threshold of [7, 3, 1]) {
      if (diffDays <= threshold && diffDays > 0) {
        await createNotificationIfNeeded(
          adminSupabase,
          {
            recipientId: userId,
            kind: "membership_expiry",
            title: `회원권이 ${diffDays}일 후 만료됩니다`,
            message: `회원권 종료일: ${membership.end_date}. 연장이 필요하면 트레이너에게 문의하세요.`,
            link: "/settings",
            metadata: { endDate: membership.end_date, daysRemaining: diffDays },
            dedupeKey: `membership_expiry:${userId}:${membership.end_date}:${threshold}`,
          },
          pushEnabled
        )
      }
    }
  }

  if (userRole === "trainer") {
    // 트레이너에게 회원 만료 알림
    const { data: members } = await adminSupabase
      .from("profiles")
      .select("id, name")
      .eq("trainer_id", userId)
      .eq("role", "member")
      .is("deleted_at", null)

    if (!members?.length) return

    const memberIds = members.map((m) => m.id as string)
    const memberNameMap = new Map(members.map((m) => [m.id as string, m.name as string]))

    const { data: memberships } = await adminSupabase
      .from("memberships")
      .select("member_id, end_date")
      .in("member_id", memberIds)

    if (!memberships?.length) return

    const today = new Date()
    for (const ms of memberships) {
      const endDate = new Date(ms.end_date as string)
      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const memberId = ms.member_id as string

      for (const threshold of [7, 3, 1]) {
        if (diffDays <= threshold && diffDays > 0) {
          await createNotificationIfNeeded(
            adminSupabase,
            {
              recipientId: userId,
              actorId: memberId,
              kind: "membership_expiry",
              title: `${memberNameMap.get(memberId) ?? "회원"}님의 회원권이 ${diffDays}일 후 만료됩니다`,
              message: `회원권 종료일: ${ms.end_date}. 연장이 필요합니다.`,
              link: "/members",
              metadata: { memberId, endDate: ms.end_date, daysRemaining: diffDays },
              dedupeKey: `membership_expiry:trainer:${memberId}:${ms.end_date}:${threshold}`,
            },
            pushEnabled
          )
        }
      }
    }
  }
}
```

- [ ] **Step 2: sync 엔드포인트에서 호출**

`/sync` POST 핸들러 내에서 기존 알림 동기화 코드 아래에 추가:

```typescript
if (preferences.membership_enabled) {
  await syncMembershipExpiryNotifications(adminSupabase, userId, userRole, Boolean(preferences.push_enabled))
}
```

- [ ] **Step 3: 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 4: 커밋**

```bash
git add src/app/api/routes/notifications.ts
git commit -m "feat(회원권): 회원권 만료 7일/3일/1일 전 알림 생성 로직 구현"
```

---

## Task 14: 최종 검증

- [ ] **Step 1: 전체 타입 체크**

```bash
pnpm typecheck
```

- [ ] **Step 2: 빌드 확인**

```bash
pnpm build
```

- [ ] **Step 3: 문제 수정 후 최종 커밋**

빌드 에러가 있으면 수정 후 커밋.
