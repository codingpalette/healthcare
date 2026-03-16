"use client"

import Link from "next/link"
import { Megaphone, Pin, ArrowRight } from "lucide-react"

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/shared/ui"
import { NOTICE_CATEGORY_LABELS } from "@/entities/notice"
import type { NoticeCategory } from "@/entities/notice"
import { useNoticeList } from "@/features/notice"
import { cn } from "@/shared/lib/utils"
import { buttonVariants } from "@/shared/ui"

// 카테고리별 배지 variant 매핑
const CATEGORY_BADGE_VARIANT: Record<
  NoticeCategory,
  "destructive" | "default" | "secondary"
> = {
  important: "destructive",
  event: "default",
  general: "secondary",
}

// 최근 공지사항 카드 위젯
export function RecentNoticesCard() {
  const { data, isLoading } = useNoticeList({ limit: 3 })
  const notices = data?.notices ?? []

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <Megaphone className="size-4 text-primary" />
          </div>
          최근 공지사항
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))}
          </div>
        ) : notices.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl bg-muted py-8">
            <Megaphone className="size-10 text-muted-foreground/50" />
            <p className="mt-2 text-sm font-medium text-muted-foreground">
              등록된 공지사항이 없습니다
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {notices.map((notice) => (
              <li key={notice.id}>
                <Link
                  href={`/notices/${notice.id}`}
                  className="flex flex-col gap-1 rounded-lg p-2 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <Badge variant={CATEGORY_BADGE_VARIANT[notice.category]} className="text-xs">
                      {NOTICE_CATEGORY_LABELS[notice.category]}
                    </Badge>
                    {notice.isPinned && (
                      <Pin className="size-3 text-muted-foreground" />
                    )}
                  </div>
                  <span className="truncate text-sm font-medium">
                    {notice.title}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link
          href="/notices"
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "w-full"
          )}
        >
          전체보기
          <ArrowRight className="size-4" />
        </Link>
      </CardContent>
    </Card>
  )
}
