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
