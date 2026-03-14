import { Hono } from "hono"
import {
  createNotificationIfNeeded,
  getNotificationPreferencesRow,
} from "@/app/api/_lib/notifications"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { deletePublicFile, deletePublicFiles, uploadPublicFile } from "@/app/api/_lib/r2-storage"

export const workoutRoutes = new Hono<AuthEnv>().use(authMiddleware)
const MAX_WORKOUT_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_IMAGES = 5

function getTodayDateString() {
  return new Date().toISOString().split("T")[0]
}

function parseTargetDate(dateParam: string | undefined) {
  return dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : getTodayDateString()
}

function applyWorkoutFilters<T extends {
  gte: (column: string, value: string) => T
  lte: (column: string, value: string) => T
}>(query: T, from?: string, to?: string) {
  let nextQuery = query
  if (from) nextQuery = nextQuery.gte("date", from)
  if (to) nextQuery = nextQuery.lte("date", to)
  return nextQuery
}

workoutRoutes.post("/", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const contentType = c.req.header("Content-Type") ?? ""
  let exerciseName: string | undefined
  let sets: string | undefined
  let reps: string | undefined
  let weight: string | undefined
  let durationMinutes: string | undefined
  let caloriesBurned: string | undefined
  let notes: string | undefined
  let date: string | undefined
  let mediaUrls: string[] = []

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const files = formData.getAll("files")

    if (files.length > MAX_IMAGES) {
      return c.json({ error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` }, 400)
    }

    for (const file of files) {
      if (!(file instanceof File)) continue
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "운동 인증은 이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > MAX_WORKOUT_IMAGE_BYTES) {
        return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
      }
      const uploaded = await uploadPublicFile({
        file,
        folder: "workouts",
        ownerId: userId,
      })
      mediaUrls.push(uploaded.publicUrl)
    }

    exerciseName = formData.get("exerciseName") as string | undefined
    sets = formData.get("sets") as string | undefined
    reps = formData.get("reps") as string | undefined
    weight = formData.get("weight") as string | undefined
    durationMinutes = formData.get("durationMinutes") as string | undefined
    caloriesBurned = formData.get("caloriesBurned") as string | undefined
    notes = formData.get("notes") as string | undefined
    date = formData.get("date") as string | undefined
  } else {
    const body = await c.req.json<{
      exerciseName?: string
      sets?: number
      reps?: number
      weight?: number
      durationMinutes?: number
      caloriesBurned?: number
      notes?: string
      date?: string
    }>()
    exerciseName = body.exerciseName
    sets = body.sets != null ? String(body.sets) : undefined
    reps = body.reps != null ? String(body.reps) : undefined
    weight = body.weight != null ? String(body.weight) : undefined
    durationMinutes = body.durationMinutes != null ? String(body.durationMinutes) : undefined
    caloriesBurned = body.caloriesBurned != null ? String(body.caloriesBurned) : undefined
    notes = body.notes
    date = body.date
  }

  if (!exerciseName?.trim()) {
    return c.json({ error: "운동명을 입력해주세요" }, 400)
  }

  const insertData: Record<string, unknown> = {
    user_id: userId,
    exercise_name: exerciseName.trim(),
  }
  if (sets) insertData.sets = Number(sets)
  if (reps) insertData.reps = Number(reps)
  if (weight) insertData.weight = Number(weight)
  if (durationMinutes) insertData.duration_minutes = Number(durationMinutes)
  if (caloriesBurned) insertData.calories_burned = Number(caloriesBurned)
  if (notes) insertData.notes = notes
  if (date) insertData.date = date
  if (mediaUrls.length) insertData.media_urls = mediaUrls

  const { data, error } = await adminSupabase
    .from("workouts")
    .insert(insertData)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)

  try {
    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("name, trainer_id, role")
      .eq("id", userId)
      .maybeSingle<{ name: string | null; trainer_id: string | null; role: string | null }>()

    if (profile?.role === "member" && profile.trainer_id) {
      const trainerPreferences = await getNotificationPreferencesRow(adminSupabase, profile.trainer_id)

      await createNotificationIfNeeded(
        adminSupabase,
        {
          recipientId: profile.trainer_id,
          actorId: userId,
          kind: "system",
          title: `${profile.name ?? "회원"}님이 운동 인증을 등록했습니다`,
          message:
            typeof data?.notes === "string" && data.notes.trim().length > 0
              ? data.notes.trim()
              : `${String(data?.exercise_name ?? exerciseName).trim()} 운동이 새로 등록되었습니다.`,
          link: "/workout",
          metadata: {
            workoutId: data?.id,
            exerciseName: data?.exercise_name ?? exerciseName,
            source: "workout_recorded",
          },
          dedupeKey: `workout_recorded:${String(data?.id ?? "")}`,
        },
        Boolean(trainerPreferences.push_enabled)
      )
    }
  } catch (notificationError) {
    console.error("workout notification create failed", notificationError)
  }

  return c.json(data, 201)
})

workoutRoutes.get("/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")

  let query = adminSupabase
    .from("workouts")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  query = applyWorkoutFilters(query, fromParam, toParam)

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

workoutRoutes.get("/today", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const adminSupabase = createAdminSupabase()
  const targetDate = parseTargetDate(c.req.query("date"))
  const { data, error } = await adminSupabase
    .from("workouts")
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

workoutRoutes.get("/members/:id", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 조회할 수 있습니다" }, 403)
  }

  const memberId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const fromParam = c.req.query("from")
  const toParam = c.req.query("to")

  let query = adminSupabase
    .from("workouts")
    .select("*")
    .eq("user_id", memberId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  query = applyWorkoutFilters(query, fromParam, toParam)

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

workoutRoutes.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const workoutId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: existing } = await adminSupabase
    .from("workouts")
    .select("id, user_id, media_urls")
    .eq("id", workoutId)
    .single()

  if (!existing) return c.json({ error: "운동 기록을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: "본인의 운동 기록만 수정할 수 있습니다" }, 403)
  }

  const contentType = c.req.header("Content-Type") ?? ""
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await c.req.formData()
    const files = formData.getAll("files")
    const existingUrlsRaw = formData.get("existingUrls")
    const keptUrls: string[] = existingUrlsRaw
      ? (JSON.parse(existingUrlsRaw as string) as string[])
      : []

    if (files.length + keptUrls.length > MAX_IMAGES) {
      return c.json({ error: `이미지는 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다` }, 400)
    }

    const newlyUploaded: string[] = []
    for (const file of files) {
      if (!(file instanceof File)) continue
      if (!file.type.startsWith("image/")) {
        return c.json({ error: "운동 인증은 이미지 파일만 업로드할 수 있습니다" }, 400)
      }
      if (file.size > MAX_WORKOUT_IMAGE_BYTES) {
        return c.json({ error: "이미지 파일 크기는 10MB 이하여야 합니다" }, 400)
      }
      const uploaded = await uploadPublicFile({
        file,
        folder: "workouts",
        ownerId: userId,
      })
      newlyUploaded.push(uploaded.publicUrl)
    }

    // 기존 URL 중 유지하지 않는 것들 삭제
    const existingUrls = (existing.media_urls as string[] | null) ?? []
    const urlsToDelete = existingUrls.filter((url) => !keptUrls.includes(url))
    if (urlsToDelete.length > 0) {
      await deletePublicFiles(urlsToDelete)
    }

    updateData.media_urls = [...keptUrls, ...newlyUploaded]

    const exerciseName = formData.get("exerciseName") as string | null
    const sets = formData.get("sets") as string | null
    const reps = formData.get("reps") as string | null
    const weight = formData.get("weight") as string | null
    const durationMinutes = formData.get("durationMinutes") as string | null
    const caloriesBurned = formData.get("caloriesBurned") as string | null
    const notes = formData.get("notes") as string | null
    const date = formData.get("date") as string | null

    if (exerciseName) updateData.exercise_name = exerciseName
    if (sets !== null) updateData.sets = sets ? Number(sets) : null
    if (reps !== null) updateData.reps = reps ? Number(reps) : null
    if (weight !== null) updateData.weight = weight ? Number(weight) : null
    if (durationMinutes !== null) updateData.duration_minutes = durationMinutes ? Number(durationMinutes) : null
    if (caloriesBurned !== null) updateData.calories_burned = caloriesBurned ? Number(caloriesBurned) : null
    if (notes !== null) updateData.notes = notes || null
    if (date) updateData.date = date
  } else {
    const body = await c.req.json<Record<string, unknown>>()
    if (body.existingUrls !== undefined) {
      const keptUrls = Array.isArray(body.existingUrls) ? (body.existingUrls as string[]) : []
      const existingUrls = (existing.media_urls as string[] | null) ?? []
      const urlsToDelete = existingUrls.filter((url) => !keptUrls.includes(url))
      if (urlsToDelete.length > 0) {
        await deletePublicFiles(urlsToDelete)
      }
      updateData.media_urls = keptUrls
    }
    if (body.exerciseName) updateData.exercise_name = body.exerciseName
    if (body.sets !== undefined) updateData.sets = body.sets
    if (body.reps !== undefined) updateData.reps = body.reps
    if (body.weight !== undefined) updateData.weight = body.weight
    if (body.durationMinutes !== undefined) updateData.duration_minutes = body.durationMinutes
    if (body.caloriesBurned !== undefined) updateData.calories_burned = body.caloriesBurned
    if (body.notes !== undefined) updateData.notes = body.notes || null
    if (body.date) updateData.date = body.date
  }

  const { data, error } = await adminSupabase
    .from("workouts")
    .update(updateData)
    .eq("id", workoutId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

workoutRoutes.patch("/:id/feedback", async (c) => {
  const userRole = c.get("userRole")
  if (userRole !== "trainer") {
    return c.json({ error: "트레이너만 피드백을 작성할 수 있습니다" }, 403)
  }

  const workoutId = c.req.param("id")
  const body = await c.req.json<{ trainerFeedback?: string }>()
  const adminSupabase = createAdminSupabase()

  const { data, error } = await adminSupabase
    .from("workouts")
    .update({
      trainer_feedback: body.trainerFeedback?.trim() ? body.trainerFeedback.trim() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)

  if (data?.user_id && body.trainerFeedback?.trim()) {
    const preferences = await getNotificationPreferencesRow(adminSupabase, data.user_id as string)

    if (preferences.feedback_enabled) {
      await createNotificationIfNeeded(
        adminSupabase,
        {
          recipientId: data.user_id as string,
          kind: "workout_feedback",
          title: "운동 피드백이 도착했습니다",
          message: body.trainerFeedback.trim(),
          link: "/workout",
          metadata: { workoutId },
          dedupeKey: `workout_feedback:${workoutId}:${String(data.updated_at)}`,
        },
        Boolean(preferences.push_enabled)
      )
    }
  }

  return c.json(data)
})

workoutRoutes.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const workoutId = c.req.param("id")
  const adminSupabase = createAdminSupabase()

  const { data: existing } = await adminSupabase
    .from("workouts")
    .select("id, user_id, media_urls")
    .eq("id", workoutId)
    .single()

  if (!existing) return c.json({ error: "운동 기록을 찾을 수 없습니다" }, 404)
  if (existing.user_id !== userId) {
    return c.json({ error: "본인의 운동 기록만 삭제할 수 있습니다" }, 403)
  }

  const urlsToDelete = (existing.media_urls as string[] | null) ?? []
  if (urlsToDelete.length > 0) {
    await deletePublicFiles(urlsToDelete)
  }

  const { error } = await adminSupabase
    .from("workouts")
    .delete()
    .eq("id", workoutId)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
