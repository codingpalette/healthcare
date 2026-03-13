"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Grid2x2 } from "lucide-react"
import type { Profile } from "@/entities/user"
import { cn } from "@/shared/lib/utils"
import { Button, useSidebar } from "@/shared/ui"
import { getMobilePrimaryNavItems, isNavItemActive } from "@/widgets/layout/navigation"

interface MobileBottomNavProps {
  profile: Profile
}

export function MobileBottomNav({ profile }: MobileBottomNavProps) {
  const pathname = usePathname()
  const { toggleSidebar } = useSidebar()
  const navItems = getMobilePrimaryNavItems(profile.role)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/96 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 backdrop-blur md:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
        {navItems.map((item) => {
          const isActive = isNavItemActive(pathname, item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </Link>
          )
        })}

        <Button
          type="button"
          variant="ghost"
          onClick={toggleSidebar}
          className="flex min-h-16 h-auto flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Grid2x2 className="size-4" />
          <span>더보기</span>
        </Button>
      </div>
    </nav>
  )
}
