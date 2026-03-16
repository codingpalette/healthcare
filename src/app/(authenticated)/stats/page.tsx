import { createSupabaseServerClient } from "@/shared/api/supabase-server"
import { StatsPage } from "@/views/stats"
import { redirect } from "next/navigation"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // 트레이너만 접근 가능
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "trainer") {
    redirect("/")
  }

  return <StatsPage />
}
