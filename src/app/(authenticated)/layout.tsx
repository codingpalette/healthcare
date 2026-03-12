import { redirect } from "next/navigation"

import { createSupabaseServerClient } from "@/shared/api/supabase-server"
import type { Profile } from "@/entities/user"
import { SidebarInset, SidebarProvider } from "@/shared/ui/sidebar"
import { AppSidebar, AppHeader } from "@/widgets/layout"

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // 프로필 조회
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

  // 프로필이 없는 경우 user_metadata에서 fallback
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

  return (
    <SidebarProvider>
      <AppSidebar profile={profile} />
      <SidebarInset>
        <AppHeader />
        <main className="flex-1 overflow-auto bg-primary/5 p-6 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
