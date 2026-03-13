"use client"

import { usePathname } from "next/navigation"

import { SidebarTrigger } from "@/shared/ui/sidebar"
import { NotificationBell } from "@/widgets/layout/notification-bell"

// 경로별 페이지 제목 매핑
const pageTitles: Record<string, string> = {
  "/": "대시보드",
  "/chat": "1:1 관리톡",
  "/diet": "식단 관리",
  "/workout": "운동 관리",
  "/inbody": "인바디 관리",
  "/notifications": "알림",
  "/qna": "Q&A",
  "/equipment": "기구 가이드",
}

export function AppHeader() {
  const pathname = usePathname()
  const title = pageTitles[pathname] ?? "Healthcare"

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <div className="mx-1 h-4 w-px shrink-0 bg-border" />
      <h1 className="text-base font-semibold">{title}</h1>
      <div className="ml-auto">
        <NotificationBell />
      </div>
    </header>
  )
}
