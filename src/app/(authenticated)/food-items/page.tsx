import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/shared/api/supabase-server"
import type { Profile } from "@/entities/user"
import { FoodItemPage } from "@/views/food-item"

export default async function Page() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

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

  const role = dbProfile?.role ?? (user.user_metadata?.role as Profile["role"]) ?? "member"

  // 트레이너/관리자만 접근 가능
  if (role !== "trainer" && role !== "admin") {
    redirect("/")
  }

  return <FoodItemPage />
}
