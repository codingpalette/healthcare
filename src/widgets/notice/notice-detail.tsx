"use client"

import { ArrowLeft, Pin } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { EditorRoot, EditorContent } from "novel"
import type { JSONContent } from "novel"
import {
  Button,
  Badge,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui"
import { useDeleteNotice } from "@/features/notice"
import { NOTICE_CATEGORY_LABELS } from "@/entities/notice"
import type { Notice, NoticeCategory } from "@/entities/notice"

interface NoticeDetailProps {
  notice: Notice
  isTrainer: boolean
  onEdit: () => void
}

function getCategoryVariant(
  category: NoticeCategory,
): "destructive" | "default" | "secondary" {
  if (category === "important") return "destructive"
  if (category === "event") return "default"
  return "secondary"
}

export function NoticeDetail({ notice, isTrainer, onEdit }: NoticeDetailProps) {
  const router = useRouter()
  const deleteNotice = useDeleteNotice()

  const handleDelete = async () => {
    try {
      await deleteNotice.mutateAsync(notice.id)
      toast.success("공지사항이 삭제되었습니다")
      router.push("/notices")
    } catch {
      toast.error("공지사항 삭제에 실패했습니다")
    }
  }

  return (
    <div className="space-y-6">
      {/* 뒤로가기 */}
      <div>
        <Link href="/notices" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          목록으로
        </Link>
      </div>

      {/* 헤더 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {notice.isPinned && (
            <>
              <Pin className="size-4 text-muted-foreground" />
              <Badge variant="outline">고정</Badge>
            </>
          )}
          <Badge variant={getCategoryVariant(notice.category)}>
            {NOTICE_CATEGORY_LABELS[notice.category]}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold">{notice.title}</h1>
        <p className="text-sm text-muted-foreground">
          {notice.authorName ?? "관리자"} ·{" "}
          {new Date(notice.createdAt).toLocaleDateString("ko-KR")}
        </p>
      </div>

      <hr />

      {/* 본문 (읽기 전용) */}
      <EditorRoot>
        <EditorContent
          initialContent={notice.content as JSONContent}
          editable={false}
          className="prose prose-sm max-w-none dark:prose-invert"
        />
      </EditorRoot>

      {/* 트레이너 액션 */}
      {isTrainer && (
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onEdit}>
            수정
          </Button>
          <AlertDialog>
            <AlertDialogTrigger
              render={<Button variant="destructive">삭제</Button>}
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
                <AlertDialogDescription>
                  이 공지사항을 삭제하시겠습니까? 삭제된 공지사항은 복구할 수
                  없습니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleteNotice.isPending}
                  variant="destructive"
                >
                  {deleteNotice.isPending ? "삭제 중..." : "삭제"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
