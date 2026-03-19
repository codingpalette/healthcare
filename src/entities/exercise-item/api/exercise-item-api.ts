import { supabase } from "@/shared/api/supabase"
import type { ExerciseItem, ExerciseItemInput } from "@/entities/exercise-item/model/types"

function toExerciseItem(row: Record<string, unknown>): ExerciseItem {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as ExerciseItem["category"],
    description: (row.description as string) ?? null,
    precautions: (row.precautions as string) ?? null,
    youtubeUrl: (row.youtube_url as string) ?? null,
    imageUrls: (row.image_urls as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function getExerciseItemList(category?: string): Promise<ExerciseItem[]> {
  const accessToken = await getAccessToken()
  const params = new URLSearchParams()
  if (category) params.set("category", category)

  const query = params.toString()
  const res = await fetch(`/api/exercises${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 항목 목록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toExerciseItem)
}

export async function searchExerciseItems(search: string): Promise<ExerciseItem[]> {
  const accessToken = await getAccessToken()
  const params = new URLSearchParams()
  params.set("search", search)

  const res = await fetch(`/api/exercises?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 항목 검색에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toExerciseItem)
}

export async function getExerciseItemDetail(id: string): Promise<ExerciseItem> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/exercises/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 항목 조회에 실패했습니다")
  }

  const row = await res.json()
  return toExerciseItem(row as Record<string, unknown>)
}

export async function createExerciseItem(input: ExerciseItemInput, photos?: File[]): Promise<ExerciseItem> {
  const accessToken = await getAccessToken()
  let res: Response

  if (photos?.length) {
    const formData = new FormData()
    for (const file of photos) formData.append("files", file)
    formData.append("name", input.name)
    formData.append("category", input.category)
    if (input.description) formData.append("description", input.description)
    if (input.precautions) formData.append("precautions", input.precautions)
    if (input.youtubeUrl) formData.append("youtubeUrl", input.youtubeUrl)

    res = await fetch("/api/exercises", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
  } else {
    res = await fetch("/api/exercises", {
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
    throw new Error(err.error ?? "운동 항목 등록에 실패했습니다")
  }

  const row = await res.json()
  return toExerciseItem(row as Record<string, unknown>)
}

export async function updateExerciseItem(
  id: string,
  input: Partial<ExerciseItemInput>,
  photos?: File[],
  existingImageUrls?: string[]
): Promise<ExerciseItem> {
  const accessToken = await getAccessToken()
  const hasFiles = photos && photos.length > 0
  let res: Response

  if (hasFiles || existingImageUrls) {
    const formData = new FormData()
    if (photos) {
      for (const file of photos) formData.append("files", file)
    }
    if (existingImageUrls) {
      formData.append("existingUrls", JSON.stringify(existingImageUrls))
    }
    if (input.name) formData.append("name", input.name)
    if (input.category) formData.append("category", input.category)
    if (input.description !== undefined) formData.append("description", input.description ?? "")
    if (input.precautions !== undefined) formData.append("precautions", input.precautions ?? "")
    if (input.youtubeUrl !== undefined) formData.append("youtubeUrl", input.youtubeUrl ?? "")

    res = await fetch(`/api/exercises/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
  } else {
    res = await fetch(`/api/exercises/${id}`, {
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
    throw new Error(err.error ?? "운동 항목 수정에 실패했습니다")
  }

  const row = await res.json()
  return toExerciseItem(row as Record<string, unknown>)
}

export async function deleteExerciseItem(id: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/exercises/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "운동 항목 삭제에 실패했습니다")
  }
}
