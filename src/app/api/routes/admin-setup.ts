import { Hono } from "hono"
import { resolveEmail } from "@/shared/lib/resolve-email"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

export const adminSetupRoutes = new Hono()

// 관리자 존재 여부 확인 (인증 불필요)
adminSetupRoutes.get("/check", async (c) => {
  const adminSupabase = createAdminSupabase()
  const { data } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .is("deleted_at", null)
    .limit(1)

  return c.json({ adminExists: Boolean(data?.length) })
})

// 최초 관리자 계정 생성 (관리자가 없을 때만 동작)
adminSetupRoutes.post("/init", async (c) => {
  const adminSupabase = createAdminSupabase()

  // 관리자가 이미 존재하는지 확인
  const { data: existingAdmin } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .is("deleted_at", null)
    .limit(1)

  if (existingAdmin?.length) {
    return c.json({ error: "이미 관리자 계정이 존재합니다" }, 400)
  }

  const body = await c.req.json<{
    email?: string
    password?: string
    name?: string
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

  // Supabase auth 유저 생성
  const { data: authData, error: authError } =
    await adminSupabase.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      user_metadata: { name: body.name, role: "admin" },
    })

  if (authError) {
    if (authError.message.includes("already been registered")) {
      return c.json({ error: "이미 등록된 이메일입니다" }, 409)
    }
    return c.json({ error: authError.message }, 400)
  }

  // 프로필 role을 admin으로 변경
  await adminSupabase
    .from("profiles")
    .update({ role: "admin", name: body.name.trim() })
    .eq("id", authData.user.id)

  return c.json({ success: true }, 201)
})
