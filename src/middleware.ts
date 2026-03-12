import { type NextRequest, NextResponse } from "next/server"
import { createSupabaseMiddlewareClient } from "@/shared/api/supabase-middleware"

const PUBLIC_ROUTES = ["/login", "/signup", "/api/health"]

export async function middleware(request: NextRequest) {
  const { supabase, response } = createSupabaseMiddlewareClient(request)
  const { pathname } = request.nextUrl

  // API 라우트는 /api/health 외에는 미들웨어에서 세션 갱신만
  if (pathname.startsWith("/api") && pathname !== "/api/health") {
    await supabase.auth.getUser()
    return response
  }

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublicRoute = PUBLIC_ROUTES.includes(pathname)

  // 미인증 사용자 → 로그인 페이지로
  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // 인증된 사용자가 로그인/회원가입 접근 → 홈으로
  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectUrl = new URL("/", request.url)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
