"use client"

import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  MessageCircle,
  Megaphone,
  MessageCircleHeart,
  MessagesSquare,
  Utensils,
  Users,
  Wrench,
} from "lucide-react"
import type { Profile } from "@/entities/user"

export type NavigationItem = {
  title: string
  href: string
  icon: LucideIcon
}

const commonNav: NavigationItem[] = [
  { title: "대시보드", href: "/", icon: LayoutDashboard },
  { title: "출석", href: "/attendance", icon: CalendarCheck },
  { title: "기록", href: "/records", icon: ClipboardList },
  { title: "관리톡", href: "/chat", icon: MessagesSquare },
  // { title: "Q&A", href: "/qna", icon: MessageCircle },
  { title: "기구 가이드", href: "/equipment", icon: Wrench },
  { title: "커뮤니티", href: "/community", icon: MessageCircleHeart },
  { title: "공지사항", href: "/notices", icon: Megaphone },
]

const trainerNav: NavigationItem[] = [
  { title: "회원 관리", href: "/members", icon: Users },
  { title: "음식 DB 관리", href: "/food-items", icon: Utensils },
  { title: "통계", href: "/stats", icon: BarChart3 },
]

const memberNav: NavigationItem[] = []

const memberPrimaryNav: NavigationItem[] = [
  { title: "홈", href: "/", icon: LayoutDashboard },
  { title: "출석", href: "/attendance", icon: CalendarCheck },
  { title: "기록", href: "/records", icon: ClipboardList },
  { title: "관리톡", href: "/chat", icon: MessagesSquare },
]

const trainerPrimaryNav: NavigationItem[] = [
  { title: "홈", href: "/", icon: LayoutDashboard },
  { title: "회원", href: "/members", icon: Users },
  { title: "기록", href: "/records", icon: ClipboardList },
  { title: "관리톡", href: "/chat", icon: MessagesSquare },
]

export function getSidebarNavItems(role: Profile["role"]) {
  return role === "member" ? [...commonNav, ...memberNav] : [...commonNav, ...trainerNav]
}

export function getMobilePrimaryNavItems(role: Profile["role"]) {
  return role === "member" ? memberPrimaryNav : trainerPrimaryNav
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
