"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { Button } from "@/shared/ui/button"
import { SidebarTrigger } from "@/shared/ui/sidebar"
import { NotificationBell } from "@/widgets/layout/notification-bell"

// 경로별 페이지 제목 매핑
const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/attendance": "출석 관리",
  "/chat": "1:1 관리톡",
  "/diet": "식단 관리",
  "/workout": "운동 관리",
  "/inbody": "인바디 관리",
  "/members": "회원 관리",
  "/notifications": "알림",
  "/settings": "설정",
  "/qna": "Q&A",
  "/equipment": "기구 가이드",
  "/food-items": "음식 DB 관리",
}

export function AppHeader() {
  const pathname = usePathname()
  const title =
    Object.entries(pageTitles).find(([href]) => (href === "/" ? pathname === "/" : pathname.startsWith(href)))?.[1] ??
    "Healthcare"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
      <div className="mx-1 hidden h-4 w-px shrink-0 bg-border md:block" />
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
      </div>
    </header>
  )
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="sr-only">테마 전환</span>
    </Button>
  )
}
