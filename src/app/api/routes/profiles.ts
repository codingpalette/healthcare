import { Hono } from "hono"
import { resolveEmail } from "@/shared/lib/resolve-email"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { createAdminSupabase, createAuthorizedSupabase } from "@/app/api/_lib/supabase"
import { deletePublicFile, uploadPublicFile } from "@/app/api/_lib/r2-storage"

export const profilesRoutes = new Hono<AuthEnv>().use(authMiddleware)

async function loadEmailMap(adminSupabase: ReturnType<typeof createAdminSupabase>) {
  const { data: authData } = await adminSupabase.auth.admin.listUsers()

  return new Map(
    (authData?.users ?? []).map((user) => [user.id, user.email ?? null])
  )
}

profilesRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

profilesRoutes.post("/members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너 또는 관리자만 회원을 생성할 수 있습니다" }, 403)
  }

  const body = await c.req.json<{
    email?: string
    password?: string
    name?: string
    phone?: string
  }>()

  const email = body.email ? resolveEmail(body.email) : ""
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json({ error: "올바른 이메일 형식이 필요합니다" }, 400)
  }
  if (!body.password || body.password.length < 6) {
    return c.json({ error: "비밀번호는 6자 이상이어야 합니다" }, 400)
  }
  if (!body.name || body.name.trim().length === 0) {
    return c.json({ error: "이름은 필수입니다" }, 400)
  }

  const adminSupabase = createAdminSupabase()
  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, role: "member" },
    })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return c.json({ error: "이미 등록된 이메일입니다" }, 409)
    }
    return c.json({ error: authError.message }, 400)
  }

  const userId = c.get("userId")
  const profileUpdate: Record<string, unknown> = { trainer_id: userId }
  if (body.phone) profileUpdate.phone = body.phone

  await adminSupabase
    .from("profiles")
    .update(profileUpdate)
    .eq("id", authData.user.id)

  const { data: profile, error: profileError } = await adminSupabase
    .from("profiles")
    .select("*")
    .eq("id", authData.user.id)
    .single()

  if (profileError) return c.json({ error: profileError.message }, 400)
  return c.json(profile, 201)
})

profilesRoutes.get("/members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너 또는 관리자만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createAdminSupabase()
  const { data, error } = await adminSupabase
    .from("profiles")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  const emailMap = await loadEmailMap(adminSupabase)
  const merged = (data ?? []).map((row) => ({
    ...row,
    email: emailMap.get(row.id) ?? null,
  }))

  return c.json(merged)
})

profilesRoutes.patch("/me", async (c) => {
  const userId = c.get("userId")
  const body = await c.req.json<{ name?: string; phone?: string }>()
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  const { data, error } = await supabase
    .from("profiles")
    .update(body)
    .eq("id", userId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

profilesRoutes.post("/me/avatar", async (c) => {
  const userId = c.get("userId")
  const formData = await c.req.formData()
  const file = formData.get("file")

  if (!file || !(file instanceof File)) {
    return c.json({ error: "파일이 필요합니다" }, 400)
  }
  if (!file.type.startsWith("image/")) {
    return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
  }
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "파일 크기는 5MB 이하여야 합니다" }, 400)
  }

  const adminSupabase = createAdminSupabase()
  const { data: existing } = await adminSupabase
    .from("profiles")
    .select("avatar_url")
    .eq("id", userId)
    .single()

  const { publicUrl } = await uploadPublicFile({
    file,
    folder: "avatars",
    ownerId: userId,
  })

  await deletePublicFile(existing?.avatar_url)

  const { error } = await adminSupabase
    .from("profiles")
    .update({ avatar_url: publicUrl })
    .eq("id", userId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ avatarUrl: publicUrl })
})

profilesRoutes.get("/my-members", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너 또는 관리자만 조회할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  // admin은 모든 회원 조회, trainer는 자신에게 배정된 회원만 조회
  let query = adminSupabase
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (userRole !== "admin") {
    query = query.eq("trainer_id", userId)
  }

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)

  const emailMap = await loadEmailMap(adminSupabase)
  const merged = (data ?? []).map((row) => ({
    ...row,
    email: emailMap.get(row.id) ?? null,
  }))

  return c.json(merged)
})

profilesRoutes.patch("/:id/assign-trainer", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너 또는 관리자만 배정할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const targetId = c.req.param("id")
  const body = await c.req.json<{ trainerId?: string }>()

  // admin은 어떤 트레이너든 배정 가능, trainer는 본인만 배정 가능
  if (userRole !== "admin" && body.trainerId !== userId) {
    return c.json({ error: "본인만 트레이너로 배정할 수 있습니다" }, 403)
  }

  const adminSupabase = createAdminSupabase()
  const { data: target, error: targetError } = await adminSupabase
    .from("profiles")
    .select("role, deleted_at")
    .eq("id", targetId)
    .single()

  if (targetError || !target) {
    return c.json({ error: "대상 회원을 찾을 수 없습니다" }, 404)
  }
  if (target.role !== "member") {
    return c.json({ error: "회원만 트레이너에 배정할 수 있습니다" }, 400)
  }
  if (target.deleted_at) {
    return c.json({ error: "삭제된 회원은 배정할 수 없습니다" }, 400)
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ trainer_id: userId })
    .eq("id", targetId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

profilesRoutes.patch("/:id/unassign-trainer", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너 또는 관리자만 해제할 수 있습니다" }, 403)
  }

  const userId = c.get("userId")
  const targetId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: target, error: targetError } = await adminSupabase
    .from("profiles")
    .select("trainer_id")
    .eq("id", targetId)
    .single()

  if (targetError || !target) {
    return c.json({ error: "대상 회원을 찾을 수 없습니다" }, 404)
  }
  // admin은 누구든 해제 가능, trainer는 본인 배정 회원만
  if (userRole !== "admin" && target.trainer_id !== userId) {
    return c.json({ error: "본인에게 배정된 회원만 해제할 수 있습니다" }, 403)
  }

  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ trainer_id: null })
    .eq("id", targetId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

profilesRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const targetId = c.req.param("id")
  const userRole = c.get("userRole")

  if (userId !== targetId && userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "본인의 프로필만 수정할 수 있습니다" }, 403)
  }

  const body = await c.req.json<{ name?: string; phone?: string }>()
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  const { data, error } = await supabase
    .from("profiles")
    .update(body)
    .eq("id", targetId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

profilesRoutes.patch("/:id/role", async (c) => {
  const userId = c.get("userId")
  const targetId = c.req.param("id")

  if (userId === targetId) {
    return c.json({ error: "본인의 권한은 변경할 수 없습니다" }, 403)
  }

  const body = await c.req.json<{ role?: string }>()
  if (!body.role || !["member", "trainer", "admin"].includes(body.role)) {
    return c.json({ error: "올바른 권한을 지정해주세요 (member, trainer 또는 admin)" }, 400)
  }

  const adminSupabase = createAdminSupabase()
  const { data, error } = await adminSupabase
    .from("profiles")
    .update({ role: body.role })
    .eq("id", targetId)
    .is("deleted_at", null)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

profilesRoutes.patch("/:id/soft-delete", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너 또는 관리자만 삭제할 수 있습니다" }, 403)
  }

  const targetId = c.req.param("id")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", targetId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
