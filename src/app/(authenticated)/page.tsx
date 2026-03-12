import { createSupabaseServerClient } from "@/shared/api/supabase-server"
import type { Profile } from "@/entities/user"
import { MemberDashboard, TrainerDashboard } from "@/views/dashboard"

// 메인 페이지: 인증된 사용자의 역할에 따라 대시보드를 렌더링
// 인증/프로필 로직은 (authenticated)/layout.tsx에서 처리
export default async function Page() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // layout에서 이미 인증 확인하지만 타입 안전을 위해
  if (!user) return null

  const { data: dbProfile } = await supabase
    .from("profiles")
    .select("id, role, name, phone, avatar_url, trainer_id, created_at, updated_at, deleted_at")
    .eq("id", user.id)
    .single<{
      id: string
      role: Profile["role"]
      name: string
      phone: string | null
      avatar_url: string | null
      trainer_id: string | null
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>()

  const profile: Profile = dbProfile
    ? {
      id: dbProfile.id,
      role: dbProfile.role,
      name: dbProfile.name,
      email: user.email ?? null,
      phone: dbProfile.phone,
      avatarUrl: dbProfile.avatar_url ?? null,
      trainerId: dbProfile.trainer_id,
      createdAt: dbProfile.created_at,
      updatedAt: dbProfile.updated_at,
      deletedAt: dbProfile.deleted_at,
    }
    : {
      id: user.id,
      role: (user.user_metadata?.role as Profile["role"]) ?? "member",
      name: user.user_metadata?.name ?? "사용자",
      email: user.email ?? null,
      phone: null,
      avatarUrl: null,
      trainerId: null,
      createdAt: user.created_at,
      updatedAt: user.updated_at ?? user.created_at,
      deletedAt: null,
    }

  if (profile.role === "member") {
    return <MemberDashboard profile={profile} />
  }

  return <TrainerDashboard profile={profile} />
}
