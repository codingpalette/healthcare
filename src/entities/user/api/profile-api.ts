import { supabase } from "@/shared/api/supabase"
import type { Profile } from "@/entities/user/model/types"

// snake_case -> camelCase 변환
function toProfile(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    role: row.role as Profile["role"],
    name: row.name as string,
    phone: (row.phone as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    deletedAt: (row.deleted_at as string) ?? null,
  }
}

export async function getMyProfile(): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .single()

  if (error) throw error
  return toProfile(data)
}

export async function getMembers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "member")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data ?? []).map(toProfile)
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
