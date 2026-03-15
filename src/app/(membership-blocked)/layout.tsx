import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/shared/api/supabase-server"

export default async function MembershipBlockedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background p-4">
      {children}
    </div>
  )
}
