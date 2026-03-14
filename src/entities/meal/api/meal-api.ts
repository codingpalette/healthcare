import { supabase } from "@/shared/api/supabase"
import type { Meal, MealWithProfile, MealInput } from "@/entities/meal/model/types"

// snake_case → camelCase 변환
function toMeal(row: Record<string, unknown>): Meal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    mealType: row.meal_type as Meal["mealType"],
    description: (row.description as string) ?? null,
    calories: (row.calories as number) ?? null,
    carbs: (row.carbs as number) ?? null,
    protein: (row.protein as number) ?? null,
    fat: (row.fat as number) ?? null,
    photoUrls: (row.photo_urls as string[]) ?? [],
    trainerFeedback: (row.trainer_feedback as string) ?? null,
    date: row.date as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toMealWithProfile(row: Record<string, unknown>): MealWithProfile {
  return {
    ...toMeal(row),
    userName: (row.user_name as string) ?? "",
  }
}

// 식단 생성
export async function createMeal(input: MealInput, photos?: File[]): Promise<Meal> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  let res: Response

  if (photos?.length) {
    const formData = new FormData()
    for (const file of photos) formData.append("files", file)
    formData.append("mealType", input.mealType)
    if (input.description) formData.append("description", input.description)
    if (input.calories != null) formData.append("calories", String(input.calories))
    if (input.carbs != null) formData.append("carbs", String(input.carbs))
    if (input.protein != null) formData.append("protein", String(input.protein))
    if (input.fat != null) formData.append("fat", String(input.fat))
    if (input.date) formData.append("date", input.date)

    res = await fetch("/api/diet", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })
  } else {
    res = await fetch("/api/diet", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "식단 생성에 실패했습니다")
  }

  const row = await res.json()
  return toMeal(row)
}

// 내 식단 조회
export async function getMyMeals(params?: { from?: string; to?: string }): Promise<Meal[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)

  const query = searchParams.toString()
  const res = await fetch(`/api/diet/me${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "식단 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toMeal)
}

// 날짜별 식단 조회 (트레이너용)
export async function getTodayMeals(date?: string): Promise<MealWithProfile[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const searchParams = new URLSearchParams()
  if (date) searchParams.set("date", date)

  const query = searchParams.toString()
  const res = await fetch(`/api/diet/today${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "오늘 식단 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toMealWithProfile)
}

// 특정 회원 식단 조회 (트레이너용)
export async function getMemberMeals(
  memberId: string,
  params?: { from?: string; to?: string }
): Promise<Meal[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)

  const query = searchParams.toString()
  const res = await fetch(`/api/diet/members/${memberId}${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 식단 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toMeal)
}

// 식단 수정
export async function updateMeal(
  id: string,
  input: Partial<MealInput>,
  photos?: File[],
  existingPhotoUrls?: string[]
): Promise<Meal> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const hasFiles = photos && photos.length > 0
  let res: Response

  if (hasFiles || existingPhotoUrls) {
    const formData = new FormData()
    if (photos) {
      for (const file of photos) formData.append("files", file)
    }
    if (existingPhotoUrls) {
      formData.append("existingUrls", JSON.stringify(existingPhotoUrls))
    }
    if (input.mealType) formData.append("mealType", input.mealType)
    if (input.description) formData.append("description", input.description)
    if (input.calories != null) formData.append("calories", String(input.calories))
    if (input.carbs != null) formData.append("carbs", String(input.carbs))
    if (input.protein != null) formData.append("protein", String(input.protein))
    if (input.fat != null) formData.append("fat", String(input.fat))
    if (input.date) formData.append("date", input.date)

    res = await fetch(`/api/diet/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: formData,
    })
  } else {
    res = await fetch(`/api/diet/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "식단 수정에 실패했습니다")
  }

  const row = await res.json()
  return toMeal(row)
}

export async function updateMealFeedback(id: string, trainerFeedback: string): Promise<Meal> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch(`/api/diet/${id}/feedback`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ trainerFeedback }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "식단 피드백 저장에 실패했습니다")
  }

  const row = await res.json()
  return toMeal(row)
}

// 식단 삭제
export async function deleteMeal(id: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch(`/api/diet/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "식단 삭제에 실패했습니다")
  }
}
