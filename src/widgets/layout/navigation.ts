"use client"

import type { LucideIcon } from "lucide-react"
import {
  CalendarCheck,
  Dumbbell,
  LayoutDashboard,
  MessageCircle,
  MessagesSquare,
  Scale,
  Users,
  UtensilsCrossed,
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
  { title: "인바디", href: "/inbody", icon: Scale },
  { title: "관리톡", href: "/chat", icon: MessagesSquare },
  { title: "Q&A", href: "/qna", icon: MessageCircle },
  { title: "기구 가이드", href: "/equipment", icon: Wrench },
]

const trainerNav: NavigationItem[] = [
  { title: "식단", href: "/diet", icon: UtensilsCrossed },
  { title: "운동", href: "/workout", icon: Dumbbell },
  { title: "회원 관리", href: "/members", icon: Users },
]

const memberNav: NavigationItem[] = [
  { title: "식단", href: "/diet", icon: UtensilsCrossed },
  { title: "운동", href: "/workout", icon: Dumbbell },
]

const memberPrimaryNav: NavigationItem[] = [
  { title: "홈", href: "/", icon: LayoutDashboard },
  { title: "출석", href: "/attendance", icon: CalendarCheck },
  { title: "식단", href: "/diet", icon: UtensilsCrossed },
  { title: "운동", href: "/workout", icon: Dumbbell },
  { title: "관리톡", href: "/chat", icon: MessagesSquare },
]

const trainerPrimaryNav: NavigationItem[] = [
  { title: "홈", href: "/", icon: LayoutDashboard },
  { title: "회원", href: "/members", icon: Users },
  { title: "식단", href: "/diet", icon: UtensilsCrossed },
  { title: "운동", href: "/workout", icon: Dumbbell },
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
