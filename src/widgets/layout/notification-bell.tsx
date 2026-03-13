"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCheck } from "lucide-react"
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useSyncNotifications,
} from "@/features/notification"
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function NotificationBell() {
  const router = useRouter()
  const syncNotifications = useSyncNotifications()
  const hasSyncedRef = useRef(false)
  const { data } = useNotifications(6)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  useEffect(() => {
    if (hasSyncedRef.current) return
    hasSyncedRef.current = true
    syncNotifications.mutate()
  }, [syncNotifications])

  const unreadCount = data?.unreadCount ?? 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" size="icon" className="relative size-9" aria-label="알림 열기" />
        }
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute top-1.5 right-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <div className="flex items-center justify-between px-1.5 py-1">
            <DropdownMenuLabel className="p-0 text-sm text-foreground">알림</DropdownMenuLabel>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || unreadCount === 0}
            >
              <CheckCheck className="size-3.5" />
              모두 읽음
            </Button>
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {data?.notifications.length ? (
          <>
            {data.notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex-col items-start gap-1 rounded-lg p-3"
                onClick={async () => {
                  if (!notification.readAt) {
                    await markRead.mutateAsync(notification.id)
                  }
                  router.push(notification.link ?? "/notifications")
                }}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{notification.title}</span>
                  {!notification.readAt ? (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                      새 알림
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>
                <p className="text-[11px] text-muted-foreground">{formatDateTime(notification.createdAt)}</p>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-center text-sm font-medium text-primary"
              onClick={() => router.push("/notifications")}
            >
              전체 알림 보기
            </DropdownMenuItem>
          </>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            표시할 알림이 없습니다.
            <div className="mt-2">
              <Link href="/notifications" className="text-primary underline-offset-4 hover:underline">
                알림 페이지 열기
              </Link>
            </div>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
