import { redirect } from "next/navigation"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { AdminSetupForm } from "@/features/auth/ui/admin-setup-form"

export default async function SetupAdminPage() {
  // 이미 관리자가 있으면 로그인 페이지로 리다이렉트
  const adminSupabase = createAdminSupabase()
  const { data } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .is("deleted_at", null)
    .limit(1)

  if (data?.length) {
    redirect("/login")
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-primary/5 p-8">
      <AdminSetupForm />
    </main>
  )
}
