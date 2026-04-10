import { Hono } from "hono"
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
  const userRole = c.get("userRole")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)
  const body = await c.req.json<{
    deviceFingerprint: string
    deviceName: string
    deviceType: string
    browser: string
    os: string
    sessionId?: string
  }>()

  // 요청 유효성 검사
  const validTypes = ["mobile", "tablet", "desktop"]
  if (!body.deviceFingerprint || !body.deviceName || !body.browser || !body.os || !validTypes.includes(body.deviceType)) {
    return c.json({ error: "잘못된 요청입니다" }, 400)
  }

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

  // 관리자는 기기 등록 제한 없이 사용 가능
  if (userRole !== "admin") {
    const { count, error: countError } = await supabase
      .from("user_devices")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)

    if (countError) return c.json({ error: countError.message }, 400)

    if ((count ?? 0) >= 3) {
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
    const { error: sessionError } = await adminSupabase
      .schema("auth")
      .from("sessions")
      .delete()
      .eq("id", device.session_id)
    if (sessionError) {
      console.error("세션 무효화 실패:", sessionError.message)
    }
  }

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
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 접근 가능합니다" }, 403)
  }

  const targetUserId = c.req.param("userId")
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

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
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 접근 가능합니다" }, 403)
  }

  const targetUserId = c.req.param("userId")
  const deviceId = c.req.param("deviceId")
  const adminSupabase = createAdminSupabase()
  const supabase = createAuthorizedSupabase(c.req.header("Authorization")!)

  const { data: device, error: fetchError } = await supabase
    .from("user_devices")
    .select("id, session_id")
    .eq("id", deviceId)
    .eq("user_id", targetUserId)
    .single()

  if (fetchError || !device) {
    return c.json({ error: "기기를 찾을 수 없습니다" }, 404)
  }

  if (device.session_id) {
    const { error: sessionError } = await adminSupabase
      .schema("auth")
      .from("sessions")
      .delete()
      .eq("id", device.session_id)
    if (sessionError) {
      console.error("세션 무효화 실패:", sessionError.message)
    }
  }

  const { error } = await supabase
    .from("user_devices")
    .delete()
    .eq("id", deviceId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
