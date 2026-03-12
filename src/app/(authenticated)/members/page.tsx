import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/shared/api/supabase-server"
import { MembersPage } from "@/views/members"

export default async function MembersRoute() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()

  if (profile?.role !== "trainer") redirect("/")

  return <MembersPage currentUserId={user.id} />
}
