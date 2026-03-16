import { createSupabaseServerClient } from "@/shared/api/supabase-server"
import { CommunityPage } from "@/views/community"

export default async function Page() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  return <CommunityPage userId={user.id} />
}
