"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { toast } from "sonner"
import {
  EditorRoot,
  EditorContent,
  createImageUpload,
  handleImagePaste,
  handleImageDrop,
  StarterKit,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
  Youtube,
  Placeholder,
} from "novel"
import type { EditorInstance, JSONContent } from "novel"
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ImagePlus,
  Youtube as YoutubeIcon,
} from "lucide-react"
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

const defaultExtensions = [
  StarterKit,
  TiptapImage,
  TiptapLink.configure({ openOnClick: false }),
  TiptapUnderline,
  Youtube.configure({ controls: true, nocookie: true }),
  Placeholder.configure({ placeholder: "내용을 입력하세요..." }),
]

// 고정 툴바 - 에디터 인스턴스를 prop으로 받음
function EditorToolbar({ editor, onImageUpload, onYoutubeInsert }: { editor: EditorInstance; onImageUpload: () => void; onYoutubeInsert: () => void }) {
  // 에디터 상태 변경 시 툴바 활성 상태 업데이트를 위한 강제 리렌더
  const [, setTick] = useState(0)
  useEffect(() => {
    const handler = () => setTick((t) => t + 1)
    editor.on("selectionUpdate", handler)
    editor.on("transaction", handler)
    return () => {
      editor.off("selectionUpdate", handler)
      editor.off("transaction", handler)
    }
  }, [editor])

  const tools = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold"), label: "굵게" },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic"), label: "기울임" },
    { icon: Underline, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive("underline"), label: "밑줄" },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive("strike"), label: "취소선" },
    { icon: Code, action: () => editor.chain().focus().toggleCode().run(), active: editor.isActive("code"), label: "코드" },
    null,
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive("heading", { level: 1 }), label: "제목 1" },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive("heading", { level: 2 }), label: "제목 2" },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive("heading", { level: 3 }), label: "제목 3" },
    null,
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList"), label: "목록" },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList"), label: "번호 목록" },
    null,
    { icon: ImagePlus, action: onImageUpload, active: false, label: "이미지 추가" },
    { icon: YoutubeIcon, action: onYoutubeInsert, active: false, label: "유튜브 영상" },
  ]

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input px-2 py-1">
      {tools.map((tool, i) => {
        if (!tool) return <div key={i} className="mx-1 h-5 w-px bg-border" />
        const Icon = tool.icon
        return (
          <button
            key={i}
            type="button"
            title={tool.label}
            onMouseDown={(e) => {
              e.preventDefault()
              tool.action()
            }}
            className={`inline-flex size-8 items-center justify-center rounded-md text-sm transition-colors hover:bg-accent ${
              tool.active ? "bg-accent text-accent-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </div>
  )
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
  const [editorInstance, setEditorInstance] = useState<EditorInstance | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const handleImageButtonClick = useCallback(() => {
    imageInputRef.current?.click()
  }, [])

  const handleYoutubeInsert = useCallback(() => {
    if (!editorInstance) return
    const url = window.prompt("유튜브 영상 URL을 입력하세요")
    if (!url?.trim()) return
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      toast.error("유효한 유튜브 URL을 입력해주세요")
      return
    }
    editorInstance.chain().focus().setYoutubeVideo({ src: url.trim() }).run()
  }, [editorInstance])

  const handleImageFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !editorInstance) return

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다")
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("이미지 크기는 10MB 이하여야 합니다")
      return
    }

    try {
      const url = await uploadImage.mutateAsync(file)
      editorInstance.chain().focus().setImage({ src: url }).run()
    } catch {
      toast.error("이미지 업로드에 실패했습니다")
    }

    // input 초기화 (같은 파일 재선택 가능)
    e.target.value = ""
  }, [editorInstance, uploadImage])

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
            <div className="rounded-md border border-input">
              <EditorRoot>
                {editorInstance && <EditorToolbar editor={editorInstance} onImageUpload={handleImageButtonClick} onYoutubeInsert={handleYoutubeInsert} />}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageFileChange}
                />
                <EditorContent
                  key={editTarget?.id ?? "new"}
                  extensions={defaultExtensions}
                  initialContent={content}
                  onCreate={({ editor }) => setEditorInstance(editor)}
                  editorProps={{
                    handlePaste: (view, event) => handleImagePaste(view, event, uploadFn),
                    handleDrop: (view, event, _slice, moved) =>
                      handleImageDrop(view, event, moved, uploadFn),
                    attributes: {
                      class:
                        "prose prose-sm max-w-none p-4 dark:prose-invert focus:outline-none min-h-[200px] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1",
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
