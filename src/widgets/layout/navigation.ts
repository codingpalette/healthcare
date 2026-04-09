"use client"

import type { LucideIcon } from "lucide-react"
import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  LayoutDashboard,
  Megaphone,
  MessageCircleHeart,
  MessagesSquare,
  Utensils,
  Users,
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
  { title: "운동 DB", href: "/guide", icon: BookOpen },
  { title: "커뮤니티", href: "/community", icon: MessageCircleHeart },
  { title: "공지사항", href: "/notices", icon: Megaphone },
]

const trainerNav: NavigationItem[] = [
  { title: "회원 관리", href: "/members", icon: Users },
  { title: "음식 DB 관리", href: "/food-items", icon: Utensils },
  { title: "통계", href: "/stats", icon: BarChart3 },
]

// admin은 트레이너 메뉴 + 관리자 전용 메뉴 모두 포함
const adminNav: NavigationItem[] = [
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

const adminPrimaryNav: NavigationItem[] = [
  { title: "홈", href: "/", icon: LayoutDashboard },
  { title: "회원", href: "/members", icon: Users },
  { title: "기록", href: "/records", icon: ClipboardList },
  { title: "관리톡", href: "/chat", icon: MessagesSquare },
]

export function getSidebarNavItems(role: Profile["role"]) {
  if (role === "admin") return [...commonNav, ...adminNav]
  if (role === "trainer") return [...commonNav, ...trainerNav]
  return [...commonNav, ...memberNav]
}

export function getMobilePrimaryNavItems(role: Profile["role"]) {
  if (role === "admin") return adminPrimaryNav
  if (role === "trainer") return trainerPrimaryNav
  return memberPrimaryNav
}

export function isNavItemActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/"
  return pathname === href || pathname.startsWith(`${href}/`)
}
