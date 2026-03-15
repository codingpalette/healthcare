import { supabase } from "@/shared/api/supabase"
import type { FoodItem, FoodItemInput } from "@/entities/food-item/model/types"

function toFoodItem(row: Record<string, unknown>): FoodItem {
  return {
    id: row.id as string,
    name: row.name as string,
    servingSize: Number(row.serving_size),
    unit: row.unit as string,
    calories: row.calories != null ? Number(row.calories) : null,
    carbs: row.carbs != null ? Number(row.carbs) : null,
    protein: row.protein != null ? Number(row.protein) : null,
    fat: row.fat != null ? Number(row.fat) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function getFoodItems(search?: string): Promise<FoodItem[]> {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (search) searchParams.set("search", search)

  const query = searchParams.toString()
  const res = await fetch(`/api/food-items${query ? `?${query}` : ""}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "음식 목록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toFoodItem)
}

export async function createFoodItem(input: FoodItemInput): Promise<FoodItem> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/food-items", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "음식 등록에 실패했습니다")
  }

  const row = await res.json()
  return toFoodItem(row)
}

export async function updateFoodItem(id: string, input: Partial<FoodItemInput>): Promise<FoodItem> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/food-items/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "음식 수정에 실패했습니다")
  }

  const row = await res.json()
  return toFoodItem(row)
}

export async function deleteFoodItem(id: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/food-items/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "음식 삭제에 실패했습니다")
  }
}
