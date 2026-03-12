import { createClient } from "@supabase/supabase-js"

function getSupabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!
}

export function createAdminSupabase() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export function createAuthorizedSupabase(authorization: string) {
  return createClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!,
    {
      global: {
        headers: { Authorization: authorization },
      },
    }
  )
}
