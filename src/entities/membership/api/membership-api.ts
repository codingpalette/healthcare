import { supabase } from "@/shared/api/supabase"
import type { Membership } from "@/entities/membership/model/types"

function toMembership(row: Record<string, unknown>): Membership {
  return {
    id: row.id as string,
    memberId: row.member_id as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    memo: (row.memo as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증되지 않은 사용자입니다")
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  }
}

export async function getMyMembership(): Promise<Membership | null> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/memberships/me", { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 조회에 실패했습니다")
  }
  const data = await res.json()
  return data ? toMembership(data) : null
}

export async function getMemberships(): Promise<Membership[]> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/memberships", { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 목록 조회에 실패했습니다")
  }
  const data = await res.json()
  return (data as Record<string, unknown>[]).map(toMembership)
}

export async function getMemberMembership(memberId: string): Promise<Membership | null> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/memberships/members/${memberId}`, { headers })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 조회에 실패했습니다")
  }
  const data = await res.json()
  return data ? toMembership(data) : null
}

export async function createMembership(
  data: import("@/entities/membership/model/types").CreateMembershipRequest
): Promise<Membership> {
  const headers = await getAuthHeaders()
  const res = await fetch("/api/memberships", {
    method: "POST",
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 생성에 실패했습니다")
  }
  return toMembership(await res.json())
}

export async function updateMembership(
  id: string,
  data: import("@/entities/membership/model/types").UpdateMembershipRequest
): Promise<Membership> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/memberships/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 수정에 실패했습니다")
  }
  return toMembership(await res.json())
}

export async function deleteMembership(id: string): Promise<void> {
  const headers = await getAuthHeaders()
  const res = await fetch(`/api/memberships/${id}`, {
    method: "DELETE",
    headers,
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원권 삭제에 실패했습니다")
  }
}
