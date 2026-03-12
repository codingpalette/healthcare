"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  UtensilsCrossed,
  Dumbbell,
  MessageCircle,
  Wrench,
  Users,
  LogOut,
} from "lucide-react"

import type { Profile } from "@/entities/user"
import { signOut } from "@/features/auth"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/shared/ui/sidebar"
import { Avatar, AvatarFallback } from "@/shared/ui"

// 공통 네비게이션 항목
const commonNav = [
  { title: "대시보드", href: "/", icon: LayoutDashboard },
  { title: "Q&A", href: "/qna", icon: MessageCircle },
  { title: "기구 가이드", href: "/equipment", icon: Wrench },
]

// 트레이너 전용 네비게이션
const trainerNav = [
  { title: "회원 관리", href: "/members", icon: Users },
]

// 회원 전용 네비게이션
const memberNav = [
  { title: "식단", href: "/diet", icon: UtensilsCrossed },
  { title: "운동", href: "/workout", icon: Dumbbell },
]

interface AppSidebarProps {
  profile: Profile
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const roleLabel = profile.role === "trainer" ? "트레이너" : "회원"
  const initials = profile.name.slice(0, 1)

  // 역할에 따른 네비게이션 메뉴 구성
  const navItems =
    profile.role === "member"
      ? [...commonNav, ...memberNav]
      : [...commonNav, ...trainerNav]

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            H
          </div>
          <span className="text-lg font-bold">Healthcare</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>메뉴</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon className="size-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-9">
            <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 truncate">
            <p className="truncate text-sm font-medium">{profile.name}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="로그아웃"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
