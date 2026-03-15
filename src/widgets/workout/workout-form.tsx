"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { CalendarIcon, Camera, X } from "lucide-react"
import { toast } from "sonner"
import type { Workout, WorkoutInput } from "@/entities/workout"
import { useCreateWorkout, useUpdateWorkout } from "@/features/workout"
import { compressImageToWebP } from "@/shared/lib/media"
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui"

const MAX_IMAGES = 5

interface WorkoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editWorkout?: Workout
  defaultDate?: string
}

function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

function formatDateLabel(value: string) {
  return parseDateValue(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function parseNumberField(value: string, isEdit: boolean) {
  if (!value.trim()) {
    return isEdit ? null : undefined
  }

  return Number(value)
}

export function WorkoutForm({
  open,
  onOpenChange,
  editWorkout,
  defaultDate,
}: WorkoutFormProps) {
  const createWorkout = useCreateWorkout()
  const updateWorkout = useUpdateWorkout()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogContentRef = useRef<HTMLDivElement>(null)

  const [exerciseName, setExerciseName] = useState(editWorkout?.exerciseName ?? "")
  const [sets, setSets] = useState(editWorkout?.sets?.toString() ?? "")
  const [reps, setReps] = useState(editWorkout?.reps?.toString() ?? "")
  const [weight, setWeight] = useState(editWorkout?.weight?.toString() ?? "")
  const [durationMinutes, setDurationMinutes] = useState(editWorkout?.durationMinutes?.toString() ?? "")
  const [caloriesBurned, setCaloriesBurned] = useState(editWorkout?.caloriesBurned?.toString() ?? "")
  const [notes, setNotes] = useState(editWorkout?.notes ?? "")
  const [date, setDate] = useState(editWorkout?.date ?? defaultDate ?? formatLocalDateValue(new Date()))
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(editWorkout?.mediaUrls ?? [])

  const isSubmitting = createWorkout.isPending || updateWorkout.isPending
  const selectedDate = parseDateValue(date)

  // blob URL 정리
  useEffect(() => {
    return () => {
      for (const url of photoPreviews) {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      }
    }
  }, [photoPreviews])

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const currentCount = photoPreviews.length
    const remaining = MAX_IMAGES - currentCount

    if (remaining <= 0) {
      toast.error(`사진은 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다`)
      event.target.value = ""
      return
    }

    const filesToProcess = files.slice(0, remaining)

    if (files.length > remaining) {
      toast.error(`사진은 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다. ${remaining}장만 추가됩니다`)
    }

    try {
      const newPhotos: File[] = []
      const newPreviews: string[] = []

      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) {
          toast.error("운동 인증은 사진만 업로드할 수 있습니다")
          continue
        }
        const compressed = await compressImageToWebP(file)
        newPhotos.push(compressed)
        newPreviews.push(URL.createObjectURL(compressed))
      }

      setPhotos((prev) => [...prev, ...newPhotos])
      setPhotoPreviews((prev) => [...prev, ...newPreviews])
    } catch {
      toast.error("미디어를 처리하지 못했습니다")
    }

    event.target.value = ""
  }

  function removePhoto(index: number) {
    const url = photoPreviews[index]
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url)
    }

    // blob URL인 경우 photos 배열에서도 제거
    // photos는 새로 추가된 파일만 담고 있으므로 index 매핑 필요
    const blobPreviews = photoPreviews.filter((u) => u.startsWith("blob:"))
    const blobIndex = blobPreviews.indexOf(url ?? "")
    if (blobIndex !== -1) {
      setPhotos((prev) => prev.filter((_, i) => i !== blobIndex))
    }

    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const input: WorkoutInput = {
      exerciseName,
      sets: parseNumberField(sets, !!editWorkout),
      reps: parseNumberField(reps, !!editWorkout),
      weight: parseNumberField(weight, !!editWorkout),
      durationMinutes: parseNumberField(durationMinutes, !!editWorkout),
      caloriesBurned: parseNumberField(caloriesBurned, !!editWorkout),
      notes: editWorkout ? notes : notes || undefined,
      date,
    }

    if (editWorkout) {
      // blob URL이 아닌 것 = 기존 서버 URL
      const existingMediaUrls = photoPreviews.filter((url) => !url.startsWith("blob:"))
      await updateWorkout.mutateAsync({
        id: editWorkout.id,
        input,
        photos: photos.length ? photos : undefined,
        existingMediaUrls,
      })
    } else {
      await createWorkout.mutateAsync({
        input,
        photos: photos.length ? photos : undefined,
      })
    }

    onOpenChange(false)
  }

  const totalCount = photoPreviews.length
  const canAddMore = totalCount < MAX_IMAGES

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editWorkout ? "운동 기록 수정" : "운동 기록 추가"}</DialogTitle>
          <DialogDescription>
            세트, 반복 횟수, 중량과 운동 인증 미디어를 함께 기록하세요.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="exerciseName">운동명</Label>
              <Input
                id="exerciseName"
                placeholder="예: 바벨 스쿼트"
                value={exerciseName}
                onChange={(event) => setExerciseName(event.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="workout-date">날짜</Label>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger
                  id="workout-date"
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between font-normal"
                    />
                  }
                >
                  <span>{formatDateLabel(date)}</span>
                  <CalendarIcon data-icon="inline-end" />
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-3">
                  <Calendar
                    mode="single"
                    defaultMonth={selectedDate}
                    selected={selectedDate}
                    onSelect={(nextDate: Date | undefined) => {
                      if (!nextDate) return
                      setDate(formatLocalDateValue(nextDate))
                      setIsDatePickerOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="durationMinutes">운동 시간 (분)</Label>
              <Input
                id="durationMinutes"
                type="number"
                min="0"
                placeholder="60"
                value={durationMinutes}
                onChange={(event) => setDurationMinutes(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sets">세트</Label>
              <Input
                id="sets"
                type="number"
                min="0"
                placeholder="4"
                value={sets}
                onChange={(event) => setSets(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reps">횟수</Label>
              <Input
                id="reps"
                type="number"
                min="0"
                placeholder="10"
                value={reps}
                onChange={(event) => setReps(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">중량 (kg)</Label>
              <Input
                id="weight"
                type="number"
                min="0"
                step="0.5"
                placeholder="80"
                value={weight}
                onChange={(event) => setWeight(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caloriesBurned">소모 칼로리 (kcal)</Label>
              <Input
                id="caloriesBurned"
                type="number"
                min="0"
                placeholder="350"
                value={caloriesBurned}
                onChange={(event) => setCaloriesBurned(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">운동일지</Label>
            <textarea
              id="notes"
              className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="오늘의 컨디션, 수행 느낌, 다음 목표를 기록하세요"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>운동 인증 사진</Label>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalCount}/{MAX_IMAGES}
                </span>
              )}
            </div>

            {totalCount > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={preview} className="relative overflow-hidden rounded-xl border bg-muted">
                    <Image
                      src={preview}
                      alt={`운동 인증 사진 ${index + 1}`}
                      width={300}
                      height={300}
                      className="aspect-square w-full object-cover"
                      unoptimized
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-sm"
                      className="absolute top-1 right-1"
                      onClick={() => removePhoto(index)}
                      aria-label={`사진 ${index + 1} 삭제`}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                {canAddMore && (
                  <button
                    type="button"
                    className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-input bg-muted/40 text-sm text-muted-foreground"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="size-5 text-primary" />
                    <span className="text-xs">추가</span>
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-input bg-muted/40 text-sm text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="flex items-center gap-2 text-primary">
                  <Camera className="size-4" />
                </div>
                <span>운동 사진을 업로드하세요</span>
                <span className="text-xs">업로드한 이미지는 WebP로 압축됩니다</span>
              </button>
            )}

            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoChange}
            />
            {totalCount === 0 && (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                파일 선택
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "저장 중..." : editWorkout ? "운동 수정" : "운동 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
