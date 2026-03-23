"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LogOut,
  Settings,
  ChevronsUpDown,
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
  useSidebar,
} from "@/shared/ui/sidebar"
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/shared/ui"
import { getSidebarNavItems, isNavItemActive } from "@/widgets/layout/navigation"

interface AppSidebarProps {
  profile: Profile
}

export function AppSidebar({ profile }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpenMobile } = useSidebar()

  const roleLabel = profile.role === "admin" ? "관리자" : profile.role === "trainer" ? "트레이너" : "회원"
  const initials = profile.name.slice(0, 1)

  // 역할에 따른 네비게이션 메뉴 구성
  const navItems = getSidebarNavItems(profile.role)

  const handleLogout = async () => {
    await signOut()
    router.push("/login")
  }

  return (
    <Sidebar>
      <SidebarHeader className="pt-[env(safe-area-inset-top)]">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                H
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Healthcare</span>
                <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
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
                    isActive={isNavItemActive(pathname, item.href)}
                    onClick={() => setOpenMobile(false)}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<SidebarMenuButton size="lg" />}
              >
                <Avatar className="size-8">
                  {profile.avatarUrl && (
                    <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                  )}
                  <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{profile.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                </div>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                sideOffset={4}
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="size-8">
                        {profile.avatarUrl && (
                          <AvatarImage src={profile.avatarUrl} alt={profile.name} />
                        )}
                        <AvatarFallback className="bg-blue-100 text-blue-700 text-sm">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium">{profile.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{roleLabel}</span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem
                    onClick={() => {
                      setOpenMobile(false)
                      router.push("/settings")
                    }}
                  >
                    <Settings className="size-4" />
                    설정
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => {
                      setOpenMobile(false)
                      handleLogout()
                    }}>
                    <LogOut className="size-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
