import { supabase } from "@/shared/api/supabase"
import type { Workout, WorkoutBatchInput, WorkoutInput, WorkoutWithProfile } from "@/entities/workout/model/types"

function toWorkout(row: Record<string, unknown>): Workout {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    exerciseName: row.exercise_name as string,
    sets: (row.sets as number) ?? null,
    reps: (row.reps as number) ?? null,
    weight: row.weight != null ? Number(row.weight) : null,
    durationMinutes: (row.duration_minutes as number) ?? null,
    caloriesBurned: (row.calories_burned as number) ?? null,
    notes: (row.notes as string) ?? null,
    mediaUrls: (row.media_urls as string[]) ?? [],
    trainerFeedback: (row.trainer_feedback as string) ?? null,
    date: row.date as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toWorkoutWithProfile(row: Record<string, unknown>): WorkoutWithProfile {
  return {
    ...toWorkout(row),
    userName: (row.user_name as string) ?? "",
  }
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function createWorkout(input: WorkoutInput, photos?: File[]): Promise<Workout> {
  const accessToken = await getAccessToken()
  let res: Response

  if (photos?.length) {
    const formData = new FormData()
    for (const file of photos) formData.append("files", file)
    formData.append("exerciseName", input.exerciseName)
    if (input.sets != null) formData.append("sets", String(input.sets))
    if (input.reps != null) formData.append("reps", String(input.reps))
    if (input.weight != null) formData.append("weight", String(input.weight))
    if (input.durationMinutes != null) formData.append("durationMinutes", String(input.durationMinutes))
    if (input.caloriesBurned != null) formData.append("caloriesBurned", String(input.caloriesBurned))
    if (input.notes) formData.append("notes", input.notes)
    if (input.date) formData.append("date", input.date)

    res = await fetch("/api/workout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })
  } else {
    res = await fetch("/api/workout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 기록 생성에 실패했습니다")
  }

  const row = await res.json()
  return toWorkout(row)
}

export async function getMyWorkouts(params?: { from?: string; to?: string }): Promise<Workout[]> {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)

  const query = searchParams.toString()
  const res = await fetch(`/api/workout/me${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 기록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toWorkout)
}

export async function getTodayWorkouts(date?: string): Promise<WorkoutWithProfile[]> {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (date) searchParams.set("date", date)

  const query = searchParams.toString()
  const res = await fetch(`/api/workout/today${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 기록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toWorkoutWithProfile)
}

export async function getMemberWorkouts(
  memberId: string,
  params?: { from?: string; to?: string }
): Promise<Workout[]> {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)

  const query = searchParams.toString()
  const res = await fetch(`/api/workout/members/${memberId}${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 운동 기록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toWorkout)
}

export async function updateWorkout(
  id: string,
  input: Partial<WorkoutInput>,
  photos?: File[],
  existingMediaUrls?: string[]
): Promise<Workout> {
  const accessToken = await getAccessToken()
  const hasFiles = photos && photos.length > 0
  let res: Response

  if (hasFiles || existingMediaUrls) {
    const formData = new FormData()
    if (photos) {
      for (const file of photos) formData.append("files", file)
    }
    if (existingMediaUrls) {
      formData.append("existingUrls", JSON.stringify(existingMediaUrls))
    }
    if (input.exerciseName) formData.append("exerciseName", input.exerciseName)
    if (input.sets !== undefined) formData.append("sets", input.sets === null ? "" : String(input.sets))
    if (input.reps !== undefined) formData.append("reps", input.reps === null ? "" : String(input.reps))
    if (input.weight !== undefined) formData.append("weight", input.weight === null ? "" : String(input.weight))
    if (input.durationMinutes !== undefined) {
      formData.append("durationMinutes", input.durationMinutes === null ? "" : String(input.durationMinutes))
    }
    if (input.caloriesBurned !== undefined) {
      formData.append("caloriesBurned", input.caloriesBurned === null ? "" : String(input.caloriesBurned))
    }
    if (input.notes !== undefined) formData.append("notes", input.notes ?? "")
    if (input.date) formData.append("date", input.date)

    res = await fetch(`/api/workout/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    })
  } else {
    res = await fetch(`/api/workout/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 기록 수정에 실패했습니다")
  }

  const row = await res.json()
  return toWorkout(row)
}

export async function updateWorkoutFeedback(id: string, trainerFeedback: string): Promise<Workout> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/workout/${id}/feedback`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trainerFeedback }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 피드백 저장에 실패했습니다")
  }

  const row = await res.json()
  return toWorkout(row)
}

export async function deleteWorkout(id: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/workout/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 기록 삭제에 실패했습니다")
  }
}

export async function createWorkoutBatch(input: WorkoutBatchInput): Promise<Workout[]> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/workout/batch", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 일지 저장에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toWorkout)
}
