import { supabase } from "@/shared/api/supabase"
import type { Notice, NoticeInput, NoticeListResponse } from "@/entities/notice/model/types"

function toNotice(row: Record<string, unknown>): Notice {
  const profiles = row.profiles as Record<string, unknown> | null
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as Record<string, unknown>,
    category: row.category as Notice["category"],
    isPinned: row.is_pinned as boolean,
    authorId: row.author_id as string,
    authorName: (profiles?.full_name as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return session.access_token
}

export async function getNoticeList(params?: {
  category?: string
  search?: string
  page?: number
  limit?: number
}): Promise<NoticeListResponse> {
  const accessToken = await getAccessToken()
  const urlParams = new URLSearchParams()
  if (params?.category) urlParams.set("category", params.category)
  if (params?.search) urlParams.set("search", params.search)
  if (params?.page !== undefined) urlParams.set("page", String(params.page))
  if (params?.limit !== undefined) urlParams.set("limit", String(params.limit))

  const query = urlParams.toString()
  const res = await fetch(`/api/notices${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "공지사항 목록 조회에 실패했습니다")
  }

  const json = await res.json() as { data: Record<string, unknown>[]; total: number }
  return {
    notices: json.data.map(toNotice),
    total: json.total,
  }
}

export async function getNotice(id: string): Promise<Notice> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/notices/${id}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "공지사항 조회에 실패했습니다")
  }

  const row = await res.json()
  return toNotice(row as Record<string, unknown>)
}

export async function createNotice(input: NoticeInput): Promise<Notice> {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/notices", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "공지사항 등록에 실패했습니다")
  }

  const row = await res.json()
  return toNotice(row as Record<string, unknown>)
}

export async function updateNotice(id: string, input: Partial<NoticeInput>): Promise<Notice> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/notices/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "공지사항 수정에 실패했습니다")
  }

  const row = await res.json()
  return toNotice(row as Record<string, unknown>)
}

export async function deleteNotice(id: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/notices/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "공지사항 삭제에 실패했습니다")
  }
}

export async function uploadNoticeImage(file: File): Promise<string> {
  const accessToken = await getAccessToken()
  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/notices/images", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "이미지 업로드에 실패했습니다")
  }

  const json = await res.json() as { url: string }
  return json.url
}
