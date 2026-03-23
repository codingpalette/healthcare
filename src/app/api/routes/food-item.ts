import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { membershipGuardMiddleware } from "@/shared/api/membership-guard-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

export const foodItemRoutes = new Hono<AuthEnv>().use(authMiddleware).use(membershipGuardMiddleware)

// GET / - 음식 목록 조회 (search 쿼리 파라미터로 이름 검색)
foodItemRoutes.get("/", async (c) => {
  const search = c.req.query("search")
  const adminSupabase = createAdminSupabase()

  let query = adminSupabase
    .from("food_items")
    .select("*")
    .order("name", { ascending: true })

  if (search) {
    query = query.ilike("name", `%${search}%`)
  }

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// POST / - 음식 등록 (트레이너 전용)
foodItemRoutes.post("/", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 음식을 등록할 수 있습니다" }, 403)
  }

  const body = await c.req.json<{
    name?: string
    servingSize?: number
    unit?: string
    calories?: number | null
    carbs?: number | null
    protein?: number | null
    fat?: number | null
    fiber?: number | null
  }>()

  if (!body.name?.trim()) {
    return c.json({ error: "음식명을 입력해주세요" }, 400)
  }

  const adminSupabase = createAdminSupabase()
  const insertData: Record<string, unknown> = {
    name: body.name.trim(),
  }
  if (body.servingSize != null) insertData.serving_size = body.servingSize
  if (body.unit != null) insertData.unit = body.unit
  if (body.calories !== undefined) insertData.calories = body.calories
  if (body.carbs !== undefined) insertData.carbs = body.carbs
  if (body.protein !== undefined) insertData.protein = body.protein
  if (body.fat !== undefined) insertData.fat = body.fat
  if (body.fiber !== undefined) insertData.fiber = body.fiber

  const { data, error } = await adminSupabase
    .from("food_items")
    .insert(insertData)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

// PATCH /:id - 음식 수정 (트레이너 전용)
foodItemRoutes.patch("/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 음식을 수정할 수 있습니다" }, 403)
  }

  const id = c.req.param("id")
  const body = await c.req.json<{
    name?: string
    servingSize?: number
    unit?: string
    calories?: number | null
    carbs?: number | null
    protein?: number | null
    fat?: number | null
    fiber?: number | null
  }>()

  const adminSupabase = createAdminSupabase()
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.name != null) updateData.name = body.name.trim()
  if (body.servingSize != null) updateData.serving_size = body.servingSize
  if (body.unit != null) updateData.unit = body.unit
  if (body.calories !== undefined) updateData.calories = body.calories
  if (body.carbs !== undefined) updateData.carbs = body.carbs
  if (body.protein !== undefined) updateData.protein = body.protein
  if (body.fat !== undefined) updateData.fat = body.fat
  if (body.fiber !== undefined) updateData.fiber = body.fiber

  const { data, error } = await adminSupabase
    .from("food_items")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

// DELETE /:id - 음식 삭제 (트레이너 전용)
foodItemRoutes.delete("/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer" && userRole !== "admin") {
    return c.json({ error: "트레이너만 음식을 삭제할 수 있습니다" }, 403)
  }

  const id = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { error } = await adminSupabase
    .from("food_items")
    .delete()
    .eq("id", id)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
