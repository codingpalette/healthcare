"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { Bell, CheckCheck } from "lucide-react"
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, useSyncNotifications } from "@/features/notification"
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton, buttonVariants } from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const syncNotifications = useSyncNotifications()
  const hasSyncedRef = useRef(false)
  const { data, isLoading } = useNotifications(50, unreadOnly)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  useEffect(() => {
    if (hasSyncedRef.current) return
    hasSyncedRef.current = true
    syncNotifications.mutate()
  }, [syncNotifications])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">알림</h1>
          <p className="text-sm text-muted-foreground">
            인바디 측정일과 출석 상태 알림을 확인하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={unreadOnly ? "outline" : "default"} size="sm" onClick={() => setUnreadOnly(false)}>
            전체
          </Button>
          <Button variant={unreadOnly ? "default" : "outline"} size="sm" onClick={() => setUnreadOnly(true)}>
            읽지 않음
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="size-4" />
            모두 읽음
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-primary/10 p-2">
              <Bell className="size-4 text-primary" />
            </div>
            알림 목록
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-24 w-full" />
              ))}
            </div>
          ) : !data?.notifications.length ? (
            <div className="rounded-2xl border border-dashed bg-muted/20 px-6 py-14 text-center">
              <Bell className="mx-auto size-8 text-primary" />
              <p className="mt-3 font-medium">표시할 알림이 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                측정일이나 출석 조건이 충족되면 이곳에 알림이 쌓입니다.
              </p>
            </div>
          ) : (
            data.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`rounded-2xl border p-4 ${
                  notification.readAt ? "bg-card" : "border-primary/30 bg-primary/5"
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{notification.title}</span>
                      {!notification.readAt ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                          새 알림
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDateTime(notification.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {notification.link ? (
                      <Link
                        href={notification.link}
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        관련 페이지
                      </Link>
                    ) : null}
                    {!notification.readAt ? (
                      <Button size="sm" onClick={() => markRead.mutate(notification.id)}>
                        읽음 처리
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
