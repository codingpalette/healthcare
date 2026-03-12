import { supabase } from "@/shared/api/supabase"
import type { Profile } from "@/entities/user/model/types"

// snake_case -> camelCase 변환
function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    role: row.role as Profile["role"],
    name: row.name as string,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    avatarUrl: (row.avatar_url as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) ?? null,
  }
}

export async function getMyProfile(): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("인증되지 않은 사용자입니다")

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (error) throw error
  return toProfile(data)
}

export async function getMembers(): Promise<Profile[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch("/api/profiles/members", {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 목록 조회에 실패했습니다")
  }

  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toProfile)
}

export async function updateProfile(
  data: Partial<Pick<Profile, "name" | "phone">>
): Promise<Profile> {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error("인증되지 않은 사용자입니다")

  const { data: updated, error } = await supabase
    .from("profiles")
    .update(data)
    .eq("id", user.id)
    .select()
    .single()

  if (error) throw error
  return toProfile(updated)
}

export async function softDeleteMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", memberId)

  if (error) throw error
}

export async function createMember(data: import("@/entities/user/model/types").CreateMemberRequest): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch("/api/profiles/members", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 생성에 실패했습니다")
  }

  const row = await res.json()
  return toProfile(row)
}

export async function updateMemberProfile(
  memberId: string,
  data: import("@/entities/user/model/types").UpdateMemberRequest
): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch(`/api/profiles/${memberId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 수정에 실패했습니다")
  }

  const row = await res.json()
  return toProfile(row)
}

export async function updateMyProfile(
  data: Partial<Pick<Profile, "name" | "phone">>
): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch("/api/profiles/me", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "프로필 수정에 실패했습니다")
  }

  const row = await res.json()
  return toProfile(row)
}

export async function uploadAvatar(file: File): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const formData = new FormData()
  formData.append("file", file)

  const res = await fetch("/api/profiles/me/avatar", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "아바타 업로드에 실패했습니다")
  }

  const data = await res.json()
  return data.avatarUrl
}

export async function updateRole(
  memberId: string,
  data: import("@/entities/user/model/types").UpdateRoleRequest
): Promise<Profile> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")

  const res = await fetch(`/api/profiles/${memberId}/role`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "권한 변경에 실패했습니다")
  }

  const row = await res.json()
  return toProfile(row)
}
