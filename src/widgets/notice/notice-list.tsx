"use client"

import { useState } from "react"
import Link from "next/link"
import { Pin, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
} from "@/shared/ui"
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui"
import { useNoticeList } from "@/features/notice"
import { NOTICE_CATEGORY_LABELS } from "@/entities/notice"
import type { Notice, NoticeCategory } from "@/entities/notice"

interface NoticeListProps {
  isTrainer: boolean
  onAdd: () => void
  onEdit: (notice: Notice) => void
}

const CATEGORY_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "전체" },
  { value: "general", label: NOTICE_CATEGORY_LABELS.general },
  { value: "important", label: NOTICE_CATEGORY_LABELS.important },
  { value: "event", label: NOTICE_CATEGORY_LABELS.event },
]

const LIMIT = 20

function getCategoryVariant(
  category: NoticeCategory,
): "destructive" | "default" | "secondary" {
  if (category === "important") return "destructive"
  if (category === "event") return "default"
  return "secondary"
}

export function NoticeList({ isTrainer, onAdd, onEdit }: NoticeListProps) {
  const [categoryTab, setCategoryTab] = useState("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  const category = categoryTab === "all" ? undefined : categoryTab
  const searchParam = search.length >= 2 ? search : undefined

  const { data, isLoading } = useNoticeList({
    category,
    search: searchParam,
    page,
    limit: LIMIT,
  })

  const notices = data?.notices ?? []
  const total = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / LIMIT))

  const handleTabChange = (value: string) => {
    setCategoryTab(value)
    setPage(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle>공지사항</CardTitle>
        {isTrainer && (
          <Button size="sm" onClick={onAdd}>
            공지 작성
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 카테고리 탭 */}
        <Tabs value={categoryTab} onValueChange={handleTabChange}>
          <TabsList>
            {CATEGORY_TABS.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* 검색 */}
        <Input
          placeholder="공지 검색 (2자 이상)"
          value={search}
          onChange={handleSearchChange}
        />

        {/* 목록 */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-md bg-muted"
              />
            ))}
          </div>
        ) : notices.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            공지사항이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {notices.map((notice) => (
              <li key={notice.id} className="flex items-start gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.isPinned && (
                      <>
                        <Pin className="size-3.5 text-muted-foreground" />
                        <Badge variant="outline" className="text-xs">
                          고정
                        </Badge>
                      </>
                    )}
                    <Badge variant={getCategoryVariant(notice.category)} className="text-xs">
                      {NOTICE_CATEGORY_LABELS[notice.category]}
                    </Badge>
                    <Link
                      href={`/notices/${notice.id}`}
                      className="truncate font-medium hover:underline"
                    >
                      {notice.title}
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {notice.authorName ?? "관리자"} ·{" "}
                    {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>
                {isTrainer && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => onEdit(notice)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {/* 페이지네이션 */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-muted-foreground">
            총 {total}건
          </p>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="min-w-[3rem] text-center text-sm">
              {page} / {totalPages}
            </span>
            <Button
              size="icon"
              variant="ghost"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
