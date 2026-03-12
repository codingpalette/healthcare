import { Hono } from "hono"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { deletePublicFile, uploadPublicFile } from "@/app/api/_lib/r2-storage"

export const dietRoutes = new Hono<AuthEnv>().use(authMiddleware)

function getTodayDateString() {
  return new Date().toISOString().split("T")[0]
}

function parseTargetDate(dateParam: string | undefined) {
  return dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : getTodayDateString()
}

dietRoutes.post("/", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const contentType = c.req.header("Content-Type") ?? ""
  let mealType: string | undefined
  let description: string | undefined
  let calories: string | undefined
  let carbs: string | undefined
  let protein: string | undefined
  let fat: string | undefined
  let date: string | undefined
  let photoUrl: string | undefined

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const file = formData.get("file")

    if (file && file instanceof File) {
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > 10 * 1024 * 1024) {
        return c.json({ error: "파일 크기는 10MB 이하여야 합니다" }, 400)
      }

      const uploaded = await uploadPublicFile({
        file,
        folder: "meals",
        ownerId: userId,
      })
      photoUrl = uploaded.publicUrl
    }

    mealType = formData.get("mealType") as string | undefined
    description = formData.get("description") as string | undefined
    calories = formData.get("calories") as string | undefined
    carbs = formData.get("carbs") as string | undefined
    protein = formData.get("protein") as string | undefined
    fat = formData.get("fat") as string | undefined
    date = formData.get("date") as string | undefined
  } else {
    const body = await c.req.json<{
      mealType?: string
      description?: string
      calories?: number
      carbs?: number
      protein?: number
      fat?: number
      date?: string
    }>()
    mealType = body.mealType
    description = body.description
    calories = body.calories != null ? String(body.calories) : undefined
    carbs = body.carbs != null ? String(body.carbs) : undefined
    protein = body.protein != null ? String(body.protein) : undefined
    fat = body.fat != null ? String(body.fat) : undefined
    date = body.date
  }

  if (!mealType || !["breakfast", "lunch", "dinner", "snack"].includes(mealType)) {
    return c.json({ error: "올바른 식사 유형을 선택해주세요" }, 400)
  }

  const insertData: Record<string, unknown> = {
    user_id: userId,
    meal_type: mealType,
  }
  if (description) insertData.description = description
  if (calories) insertData.calories = Number(calories)
  if (carbs) insertData.carbs = Number(carbs)
  if (protein) insertData.protein = Number(protein)
  if (fat) insertData.fat = Number(fat)
  if (photoUrl) insertData.photo_url = photoUrl
  if (date) insertData.date = date

  const { data, error } = await adminSupabase
    .from("meals")
    .insert(insertData)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data, 201)
})

dietRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")

  let query = adminSupabase
    .from("meals")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (fromParam) query = query.gte("date", fromParam)
  if (toParam) query = query.lte("date", toParam)

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

dietRoutes.get("/today", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createAdminSupabase()
  const targetDate = parseTargetDate(c.req.query("date"))

  const { data, error } = await adminSupabase
    .from("meals")
    .select("*, profiles!inner(name)")
    .eq("date", targetDate)
    .order("created_at", { ascending: false })

  if (error) return c.json({ error: error.message }, 400)

  const result = (data ?? []).map((row: Record<string, unknown>) => {
    const profiles = row.profiles as Record<string, unknown> | null
    return {
      ...row,
      profiles: undefined,
      user_name: profiles?.name ?? "",
    }
  })

  return c.json(result)
})

dietRoutes.get("/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const memberId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")

  let query = adminSupabase
    .from("meals")
    .select("*")
    .eq("user_id", memberId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  if (fromParam) query = query.gte("date", fromParam)
  if (toParam) query = query.lte("date", toParam)

  const { data, error } = await query

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

dietRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const mealId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: existing } = await adminSupabase
    .from("meals")
    .select("id, user_id, photo_url")
    .eq("id", mealId)
    .single()

  if (!existing) return c.json({ error: "식단을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: "본인의 식단만 수정할 수 있습니다" }, 403)
  }

  const contentType = c.req.header("Content-Type") ?? ""
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const file = formData.get("file")

    if (file && file instanceof File) {
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > 10 * 1024 * 1024) {
        return c.json({ error: "파일 크기는 10MB 이하여야 합니다" }, 400)
      }

      await deletePublicFile(existing.photo_url as string | null)
      const uploaded = await uploadPublicFile({
        file,
        folder: "meals",
        ownerId: userId,
      })
      updateData.photo_url = uploaded.publicUrl
    }

    const mealType = formData.get("mealType") as string | null
    const description = formData.get("description") as string | null
    const calories = formData.get("calories") as string | null
    const carbs = formData.get("carbs") as string | null
    const protein = formData.get("protein") as string | null
    const fat = formData.get("fat") as string | null
    const date = formData.get("date") as string | null

    if (mealType) updateData.meal_type = mealType
    if (description) updateData.description = description
    if (calories) updateData.calories = Number(calories)
    if (carbs) updateData.carbs = Number(carbs)
    if (protein) updateData.protein = Number(protein)
    if (fat) updateData.fat = Number(fat)
    if (date) updateData.date = date
  } else {
    const body = await c.req.json<Record<string, unknown>>()
    if (body.mealType) updateData.meal_type = body.mealType
    if (body.description !== undefined) updateData.description = body.description
    if (body.calories !== undefined) updateData.calories = body.calories
    if (body.carbs !== undefined) updateData.carbs = body.carbs
    if (body.protein !== undefined) updateData.protein = body.protein
    if (body.fat !== undefined) updateData.fat = body.fat
    if (body.date) updateData.date = body.date
  }

  const { data, error } = await adminSupabase
    .from("meals")
    .update(updateData)
    .eq("id", mealId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

dietRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const mealId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: existing } = await adminSupabase
    .from("meals")
    .select("id, user_id, photo_url")
    .eq("id", mealId)
    .single()

  if (!existing) return c.json({ error: "식단을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: "본인의 식단만 삭제할 수 있습니다" }, 403)
  }

  await deletePublicFile(existing.photo_url as string | null)

  const { error } = await adminSupabase
    .from("meals")
    .delete()
    .eq("id", mealId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
