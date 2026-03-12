"use client"

import { useRouter } from "next/navigation"
import { LogOut, Bell } from "lucide-react"

import type { Profile } from "@/entities/user"
import { signOut } from "@/features/auth"
import { Avatar, AvatarFallback, Badge, Button } from "@/shared/ui"

interface GreetingHeaderProps {
  profile: Profile
}

// 대시보드 인사말 헤더 컴포넌트
export function GreetingHeader({ profile }: GreetingHeaderProps) {
  const router = useRouter()

  // 현재 날짜를 한국어 형식으로 포맷
  const today = new Date()
  const formattedDate = today.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  })

  // 시간대별 인사말
  const hour = today.getHours()
  const greeting =
    hour < 12 ? "좋은 아침이에요" : hour < 18 ? "좋은 오후예요" : "좋은 저녁이에요"

  // 이름의 첫 글자를 아바타 이니셜로 사용
  const initials = profile.name.slice(0, 1)

  const roleLabel = profile.role === "trainer" ? "트레이너" : "회원"

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14 border-2 border-white/30 text-lg">
            <AvatarFallback className="bg-white/20 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm text-blue-100">{formattedDate}</p>
            <h1 className="text-2xl font-bold">
              {greeting}, {profile.name}님
            </h1>
            <Badge className="mt-1 border-white/30 bg-white/20 text-white hover:bg-white/30">
              {roleLabel}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
          >
            <Bell className="size-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-white hover:bg-white/20"
          >
            <LogOut className="size-4" />
            로그아웃
          </Button>
        </div>
      </div>
    </div>
  )
}
