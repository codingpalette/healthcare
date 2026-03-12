import Image from "next/image"

import { LoginForm } from "@/features/auth"

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* 왼쪽: 브랜딩 영역 (모바일에서 숨김) */}
      <div className="relative hidden lg:block">
        <Image
          src="/placeholder.svg"
          alt="헬스케어 플랫폼"
          fill
          className="object-cover"
          priority
        />
      </div>

      {/* 오른쪽: 로그인 폼 */}
      <div className="flex items-center justify-center p-8">
        <LoginForm />
      </div>
    </main>
  )
}
