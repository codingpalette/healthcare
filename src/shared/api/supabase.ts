import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

// 클라이언트 컴포넌트용 Supabase 클라이언트 (쿠키 기반 세션 관리)
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)
