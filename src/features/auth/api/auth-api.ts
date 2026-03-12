import { supabase } from "@/shared/api/supabase"
import type { UserRole } from "@/entities/user"

interface SignUpParams {
  email: string
  password: string
  name: string
  role: UserRole
}

interface SignInParams {
  email: string
  password: string
}

export async function signUp({ email, password, name, role }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  })

  if (error) throw error
  return data
}

export async function signIn({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
