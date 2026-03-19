"use client"

import { useCallback, useRef, useState } from "react"
import Image from "next/image"
import { QRCodeCanvas } from "qrcode.react"
import { Dumbbell, Search, Plus, Play, Trash2, Pencil, QrCode, Download } from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Badge,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Skeleton,
} from "@/shared/ui"
import { useExerciseItemList, useDeleteExerciseItem } from "@/features/exercise-item"
import { EXERCISE_CATEGORY_LABELS } from "@/entities/exercise-item"
import type { ExerciseItem, ExerciseCategory } from "@/entities/exercise-item"
import { extractYoutubeId, getYoutubeThumbnailUrl } from "@/shared/lib/youtube"

interface ExerciseItemListProps {
  isTrainer: boolean
  onAdd?: () => void
  onEdit?: (exerciseItem: ExerciseItem) => void
  onSelect?: (exerciseItem: ExerciseItem) => void
}

const ALL_CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "전체" },
  ...Object.entries(EXERCISE_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
]

export function ExerciseItemList({ isTrainer, onAdd, onEdit, onSelect }: ExerciseItemListProps) {
  const [category, setCategory] = useState("all")
  const [search, setSearch] = useState("")
  const { data: exerciseItems, isLoading } = useExerciseItemList(
    category === "all" ? undefined : category
  )
  const deleteExerciseItem = useDeleteExerciseItem()

  const filtered = (exerciseItems ?? []).filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (id: string) => {
    try {
      await deleteExerciseItem.mutateAsync(id)
      toast.success("운동 항목이 삭제되었습니다")
    } catch {
      toast.error("운동 항목 삭제에 실패했습니다")
    }
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="rounded-lg bg-primary/10 p-2">
              <Dumbbell className="size-4 text-primary" />
            </div>
            운동 가이드
          </CardTitle>
          {isTrainer && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="size-4" />
              운동 추가
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 검색 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="운동명 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* 카테고리 탭 */}
        <Tabs value={category} onValueChange={setCategory}>
          <TabsList className="w-full">
            {ALL_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value} className="flex-1">
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {ALL_CATEGORIES.map((cat) => (
            <TabsContent key={cat.value} value={cat.value}>
              {isLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Dumbbell className="mb-2 size-8" />
                  <p>등록된 운동 항목이 없습니다</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((item) => (
                    <ExerciseItemCard
                      key={item.id}
                      exerciseItem={item}
                      isTrainer={isTrainer}
                      onSelect={() => onSelect?.(item)}
                      onEdit={() => onEdit?.(item)}
                      onDelete={() => handleDelete(item.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}

function ExerciseItemCard({
  exerciseItem,
  isTrainer,
  onSelect,
  onEdit,
  onDelete,
}: {
  exerciseItem: ExerciseItem
  isTrainer: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const [qrOpen, setQrOpen] = useState(false)
  const youtubeId = exerciseItem.youtubeUrl ? extractYoutubeId(exerciseItem.youtubeUrl) : null
  const thumbnailUrl = youtubeId
    ? getYoutubeThumbnailUrl(youtubeId)
    : exerciseItem.imageUrls[0] ?? null

  return (
    <Card
      className="cursor-pointer overflow-hidden transition-shadow hover:shadow-lg"
      onClick={onSelect}
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-muted">
        {thumbnailUrl ? (
          <>
            <Image
              src={thumbnailUrl}
              alt={exerciseItem.name}
              fill
              className="object-cover"
              unoptimized
            />
            {youtubeId && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <div className="rounded-full bg-red-600 p-3">
                  <Play className="size-5 fill-white text-white" />
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center">
            <Dumbbell className="size-8 text-muted-foreground/50" />
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-medium">{exerciseItem.name}</h3>
            <Badge variant="secondary" className="mt-1">
              {EXERCISE_CATEGORY_LABELS[exerciseItem.category as ExerciseCategory]}
            </Badge>
          </div>
          {isTrainer && (
            <div
              className="flex shrink-0 gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              <Button variant="ghost" size="icon-sm" onClick={() => setQrOpen(true)}>
                <QrCode className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={onEdit}>
                <Pencil className="size-3.5" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <Trash2 className="size-3.5 text-destructive" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>운동 항목 삭제</AlertDialogTitle>
                    <AlertDialogDescription>
                      &quot;{exerciseItem.name}&quot;을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>취소</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>삭제</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
        {exerciseItem.description && (
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {exerciseItem.description}
          </p>
        )}
      </div>

      {isTrainer && (
        <ExerciseItemQrDialog
          exerciseItem={exerciseItem}
          open={qrOpen}
          onOpenChange={setQrOpen}
        />
      )}
    </Card>
  )
}

function ExerciseItemQrDialog({
  exerciseItem,
  open,
  onOpenChange,
}: {
  exerciseItem: ExerciseItem
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const qrUrl = typeof window !== "undefined"
    ? `${window.location.origin}/exercise-guide?id=${exerciseItem.id}`
    : ""

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current?.querySelector("canvas")
    if (!canvas) return
    const link = document.createElement("a")
    link.download = `qr-${exerciseItem.name}.png`
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [exerciseItem.name])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm" showCloseButton>
        <DialogHeader>
          <DialogTitle>QR 코드</DialogTitle>
          <DialogDescription>
            {exerciseItem.name}의 QR 코드를 운동 기구에 부착하세요.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4">
          <div ref={canvasRef} className="rounded-xl bg-white p-4">
            <QRCodeCanvas
              value={qrUrl}
              size={200}
              level="H"
              marginSize={1}
            />
          </div>
          <p className="text-center text-xs text-muted-foreground break-all">
            {qrUrl}
          </p>
          <Button onClick={handleDownload} className="w-full">
            <Download className="size-4" />
            QR 코드 다운로드
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
