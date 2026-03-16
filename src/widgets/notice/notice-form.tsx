"use client"

import { useState, useEffect } from "react"
import { toast } from "sonner"
import {
  EditorRoot,
  EditorContent,
  createImageUpload,
  handleImagePaste,
  handleImageDrop,
} from "novel"
import type { JSONContent } from "novel"
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Input,
  Label,
} from "@/shared/ui"
import { useCreateNotice, useUpdateNotice, useUploadNoticeImage } from "@/features/notice"
import { NOTICE_CATEGORY_LABELS } from "@/entities/notice"
import type { Notice, NoticeCategory, NoticeInput } from "@/entities/notice"

interface NoticeFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget: Notice | null
}

const CATEGORY_OPTIONS: Array<{ value: NoticeCategory; label: string }> = [
  { value: "general", label: NOTICE_CATEGORY_LABELS.general },
  { value: "important", label: NOTICE_CATEGORY_LABELS.important },
  { value: "event", label: NOTICE_CATEGORY_LABELS.event },
]

const EMPTY_CONTENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
}

export function NoticeForm({ open, onOpenChange, editTarget }: NoticeFormProps) {
  const isEdit = !!editTarget
  const createNotice = useCreateNotice()
  const updateNotice = useUpdateNotice()
  const uploadImage = useUploadNoticeImage()

  const [title, setTitle] = useState(editTarget?.title ?? "")
  const [category, setCategory] = useState<NoticeCategory>(editTarget?.category ?? "general")
  const [isPinned, setIsPinned] = useState(editTarget?.isPinned ?? false)
  const [content, setContent] = useState<JSONContent>(
    (editTarget?.content as JSONContent | null) ?? EMPTY_CONTENT,
  )

  // editTarget이 바뀌면 폼 초기화
  useEffect(() => {
    setTitle(editTarget?.title ?? "")
    setCategory(editTarget?.category ?? "general")
    setIsPinned(editTarget?.isPinned ?? false)
    setContent((editTarget?.content as JSONContent | null) ?? EMPTY_CONTENT)
  }, [editTarget])

  const isPending = createNotice.isPending || updateNotice.isPending

  // Novel 이미지 업로드 함수
  const uploadFn = createImageUpload({
    onUpload: async (file: File) => {
      const url = await uploadImage.mutateAsync(file)
      return url
    },
    validateFn: (file: File) => {
      if (!file.type.startsWith("image/")) {
        toast.error("이미지 파일만 업로드할 수 있습니다")
        return false
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("이미지 크기는 10MB 이하여야 합니다")
        return false
      }
      return true
    },
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("제목을 입력해주세요")
      return
    }

    const input: NoticeInput = {
      title: title.trim(),
      content: content as Record<string, unknown>,
      category,
      isPinned,
    }

    try {
      if (isEdit && editTarget) {
        await updateNotice.mutateAsync({ id: editTarget.id, input })
        toast.success("공지사항이 수정되었습니다")
      } else {
        await createNotice.mutateAsync(input)
        toast.success("공지사항이 등록되었습니다")
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? "공지사항 수정에 실패했습니다" : "공지사항 등록에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "공지사항 수정" : "공지사항 작성"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "공지사항 내용을 수정합니다." : "새로운 공지사항을 작성합니다."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="notice-title">제목 *</Label>
            <Input
              id="notice-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="공지사항 제목을 입력하세요"
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label htmlFor="notice-category">카테고리 *</Label>
            <select
              id="notice-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as NoticeCategory)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* 고정 여부 */}
          <div className="flex items-center gap-3">
            <input
              id="notice-pinned"
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="size-4 rounded border-input"
            />
            <Label htmlFor="notice-pinned">상단 고정</Label>
          </div>

          {/* 내용 (Novel 에디터) */}
          <div className="space-y-2">
            <Label>내용 *</Label>
            <div className="min-h-[200px] rounded-md border border-input">
              <EditorRoot>
                <EditorContent
                  key={editTarget?.id ?? "new"}
                  initialContent={content}
                  editorProps={{
                    handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
                    handleDrop: (view, event, _slice, moved) =>
                      handleImageDrop(view, event, moved, uploadFn),
                    attributes: {
                      class:
                        "prose prose-sm max-w-none p-4 dark:prose-invert focus:outline-none min-h-[200px]",
                    },
                  }}
                  onUpdate={({ editor }) => {
                    setContent(editor.getJSON())
                  }}
                />
              </EditorRoot>
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "저장 중..." : isEdit ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
