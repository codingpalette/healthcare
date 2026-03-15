"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { CalendarIcon, Camera, ChevronDown, ChevronUp, Plus, X } from "lucide-react"
import { toast } from "sonner"
import type { Workout, WorkoutExerciseInput, WorkoutInput } from "@/entities/workout"
import { useCreateWorkout, useCreateWorkoutBatch, useUpdateWorkout } from "@/features/workout"
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

// 이미지 최대 개수
const MAX_IMAGES = 5
// 세트 기본 개수
const DEFAULT_SET_COUNT = 5
// 세트 최대 개수
const MAX_SET_COUNT = 6
// 운동 카드 최대 개수
const MAX_CARDS = 10

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface SetRow {
  kg: string
  reps: string
}

interface ExerciseCard {
  id: string
  exerciseName: string
  sets: SetRow[]
  durationMinutes: string
  caloriesBurned: string
  notes: string
  // 새로 추가한 파일 (blob)
  photos: File[]
  // 미리보기 URL (blob: 또는 서버 URL)
  photoPreviews: string[]
  // 카드 접기/펼치기
  collapsed: boolean
}

// ─── 유틸 ────────────────────────────────────────────────────────────────────

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

function createEmptySets(count: number): SetRow[] {
  return Array.from({ length: count }, () => ({ kg: "", reps: "" }))
}

function createEmptyCard(): ExerciseCard {
  return {
    id: crypto.randomUUID(),
    exerciseName: "",
    sets: createEmptySets(DEFAULT_SET_COUNT),
    durationMinutes: "",
    caloriesBurned: "",
    notes: "",
    photos: [],
    photoPreviews: [],
    collapsed: false,
  }
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface WorkoutFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editWorkout?: Workout
  defaultDate?: string
}

// ─── 카드 내 사진 섹션 ────────────────────────────────────────────────────────

interface CardPhotoSectionProps {
  photoPreviews: string[]
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}

function CardPhotoSection({ photoPreviews, onAdd, onRemove }: CardPhotoSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const totalCount = photoPreviews.length
  const canAddMore = totalCount < MAX_IMAGES

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_IMAGES - totalCount
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
      const newFiles: File[] = []
      for (const file of filesToProcess) {
        if (!file.type.startsWith("image/")) {
          toast.error("운동 인증은 사진만 업로드할 수 있습니다")
          continue
        }
        const compressed = await compressImageToWebP(file)
        newFiles.push(compressed)
      }
      onAdd(newFiles)
    } catch {
      toast.error("미디어를 처리하지 못했습니다")
    }

    event.target.value = ""
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">인증 사진 (선택)</Label>
        {totalCount > 0 && (
          <span className="text-xs text-muted-foreground">
            {totalCount}/{MAX_IMAGES}
          </span>
        )}
      </div>

      {totalCount > 0 ? (
        <div className="grid grid-cols-4 gap-1.5">
          {photoPreviews.map((preview, index) => (
            <div key={preview} className="relative overflow-hidden rounded-lg border bg-muted">
              <Image
                src={preview}
                alt={`운동 인증 사진 ${index + 1}`}
                width={120}
                height={120}
                className="aspect-square w-full object-cover"
                unoptimized
              />
              <Button
                type="button"
                variant="secondary"
                size="icon-sm"
                className="absolute top-0.5 right-0.5"
                onClick={() => onRemove(index)}
                aria-label={`사진 ${index + 1} 삭제`}
              >
                <X className="size-3" />
              </Button>
            </div>
          ))}
          {canAddMore && (
            <button
              type="button"
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-muted/40 text-xs text-muted-foreground"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="size-4 text-primary" />
              <span className="text-[10px]">추가</span>
            </button>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="flex h-20 w-full flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-input bg-muted/40 text-xs text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="size-4 text-primary" />
          <span>사진 추가</span>
        </button>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

// ─── 운동 카드 ────────────────────────────────────────────────────────────────

interface ExerciseCardViewProps {
  card: ExerciseCard
  index: number
  canDelete: boolean
  onUpdate: (id: string, updates: Partial<ExerciseCard>) => void
  onDelete: (id: string) => void
  onPhotoAdd: (id: string, files: File[]) => void
  onPhotoRemove: (id: string, photoIndex: number) => void
}

function ExerciseCardView({
  card,
  index,
  canDelete,
  onUpdate,
  onDelete,
  onPhotoAdd,
  onPhotoRemove,
}: ExerciseCardViewProps) {
  function handleSetChange(setIndex: number, field: "kg" | "reps", value: string) {
    const newSets = card.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s))
    onUpdate(card.id, { sets: newSets })
  }

  function handleAddSet() {
    if (card.sets.length >= MAX_SET_COUNT) {
      toast.error(`세트는 최대 ${MAX_SET_COUNT}개까지 추가할 수 있습니다`)
      return
    }
    onUpdate(card.id, { sets: [...card.sets, { kg: "", reps: "" }] })
  }

  function handleRemoveSet(setIndex: number) {
    if (card.sets.length <= 1) return
    onUpdate(card.id, { sets: card.sets.filter((_, i) => i !== setIndex) })
  }

  return (
    <div className="rounded-xl border bg-card">
      {/* 카드 헤더 */}
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
          {index + 1}
        </span>
        <Input
          placeholder="운동명 (예: 바벨 스쿼트)"
          value={card.exerciseName}
          onChange={(e) => onUpdate(card.id, { exerciseName: e.target.value })}
          className="h-8 flex-1 border-0 bg-transparent p-0 text-sm font-medium shadow-none focus-visible:ring-0"
        />
        <div className="flex items-center gap-1">
          {/* 접기/펼치기 */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={card.collapsed ? "카드 펼치기" : "카드 접기"}
            onClick={() => onUpdate(card.id, { collapsed: !card.collapsed })}
          >
            {card.collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
          </Button>
          {/* 카드 삭제 */}
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="종목 삭제"
              onClick={() => onDelete(card.id)}
            >
              <X className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      </div>

      {/* 카드 본문 (접기 시 숨김) */}
      {!card.collapsed && (
        <div className="space-y-4 p-4">
          {/* 세트 테이블 */}
          <div className="space-y-2">
            <div className="grid grid-cols-[2rem_1fr_1fr_2rem] gap-x-2 text-xs text-muted-foreground">
              <span className="text-center">세트</span>
              <span className="text-center">KG</span>
              <span className="text-center">횟수</span>
              <span />
            </div>
            {card.sets.map((set, setIndex) => (
              <div key={setIndex} className="grid grid-cols-[2rem_1fr_1fr_2rem] items-center gap-x-2">
                <span className="text-center text-xs text-muted-foreground">{setIndex + 1}</span>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={set.kg}
                  onChange={(e) => handleSetChange(setIndex, "kg", e.target.value)}
                  className="h-8 text-center text-sm"
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={set.reps}
                  onChange={(e) => handleSetChange(setIndex, "reps", e.target.value)}
                  className="h-8 text-center text-sm"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${setIndex + 1}세트 삭제`}
                  disabled={card.sets.length <= 1}
                  onClick={() => handleRemoveSet(setIndex)}
                >
                  <X className="size-3 text-muted-foreground" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              disabled={card.sets.length >= MAX_SET_COUNT}
              onClick={handleAddSet}
            >
              <Plus className="size-3" />
              세트 추가
            </Button>
          </div>

          {/* 운동 시간 / 소모 칼로리 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`duration-${card.id}`} className="text-xs">
                운동 시간 (분)
              </Label>
              <Input
                id={`duration-${card.id}`}
                type="number"
                min="0"
                placeholder="60"
                value={card.durationMinutes}
                onChange={(e) => onUpdate(card.id, { durationMinutes: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`calories-${card.id}`} className="text-xs">
                소모 칼로리 (kcal)
              </Label>
              <Input
                id={`calories-${card.id}`}
                type="number"
                min="0"
                placeholder="350"
                value={card.caloriesBurned}
                onChange={(e) => onUpdate(card.id, { caloriesBurned: e.target.value })}
                className="h-8 text-sm"
              />
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor={`notes-${card.id}`} className="text-xs">
              메모 (선택)
            </Label>
            <textarea
              id={`notes-${card.id}`}
              className="flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="오늘의 컨디션, 수행 느낌 등을 기록하세요"
              value={card.notes}
              onChange={(e) => onUpdate(card.id, { notes: e.target.value })}
            />
          </div>

          {/* 사진 */}
          <CardPhotoSection
            photoPreviews={card.photoPreviews}
            onAdd={(files) => onPhotoAdd(card.id, files)}
            onRemove={(photoIndex) => onPhotoRemove(card.id, photoIndex)}
          />
        </div>
      )}
    </div>
  )
}

// ─── 수정 모드 폼 (단일 운동) ─────────────────────────────────────────────────

interface EditFormBodyProps {
  editWorkout: Workout
  onOpenChange: (open: boolean) => void
}

function EditFormBody({ editWorkout, onOpenChange }: EditFormBodyProps) {
  const updateWorkout = useUpdateWorkout()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [exerciseName, setExerciseName] = useState(editWorkout.exerciseName)
  const [sets, setSets] = useState(editWorkout.sets?.toString() ?? "")
  const [reps, setReps] = useState(editWorkout.reps?.toString() ?? "")
  const [weight, setWeight] = useState(editWorkout.weight?.toString() ?? "")
  const [durationMinutes, setDurationMinutes] = useState(editWorkout.durationMinutes?.toString() ?? "")
  const [caloriesBurned, setCaloriesBurned] = useState(editWorkout.caloriesBurned?.toString() ?? "")
  const [notes, setNotes] = useState(editWorkout.notes ?? "")
  const [date, setDate] = useState(editWorkout.date)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(editWorkout.mediaUrls ?? [])

  const isSubmitting = updateWorkout.isPending
  const selectedDate = parseDateValue(date)
  const totalCount = photoPreviews.length
  const canAddMore = totalCount < MAX_IMAGES

  // blob URL 정리
  useEffect(() => {
    return () => {
      for (const url of photoPreviews) {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url)
      }
    }
  }, [photoPreviews])

  async function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (!files.length) return

    const remaining = MAX_IMAGES - totalCount
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
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url)

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
      sets: parseNumberField(sets, true),
      reps: parseNumberField(reps, true),
      weight: parseNumberField(weight, true),
      durationMinutes: parseNumberField(durationMinutes, true),
      caloriesBurned: parseNumberField(caloriesBurned, true),
      notes,
      date,
    }

    const existingMediaUrls = photoPreviews.filter((url) => !url.startsWith("blob:"))
    await updateWorkout.mutateAsync({
      id: editWorkout.id,
      input,
      photos: photos.length ? photos : undefined,
      existingMediaUrls,
    })

    onOpenChange(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="edit-exerciseName">운동명</Label>
          <Input
            id="edit-exerciseName"
            placeholder="예: 바벨 스쿼트"
            value={exerciseName}
            onChange={(e) => setExerciseName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-workout-date">날짜</Label>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger
              id="edit-workout-date"
              render={
                <Button type="button" variant="outline" className="w-full justify-between font-normal" />
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
          <Label htmlFor="edit-durationMinutes">운동 시간 (분)</Label>
          <Input
            id="edit-durationMinutes"
            type="number"
            min="0"
            placeholder="60"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-sets">세트</Label>
          <Input
            id="edit-sets"
            type="number"
            min="0"
            placeholder="4"
            value={sets}
            onChange={(e) => setSets(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-reps">횟수</Label>
          <Input
            id="edit-reps"
            type="number"
            min="0"
            placeholder="10"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-weight">중량 (kg)</Label>
          <Input
            id="edit-weight"
            type="number"
            min="0"
            step="0.5"
            placeholder="80"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-caloriesBurned">소모 칼로리 (kcal)</Label>
          <Input
            id="edit-caloriesBurned"
            type="number"
            min="0"
            placeholder="350"
            value={caloriesBurned}
            onChange={(e) => setCaloriesBurned(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="edit-notes">메모</Label>
        <textarea
          id="edit-notes"
          className="flex min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="오늘의 컨디션, 수행 느낌, 다음 목표를 기록하세요"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* 사진 섹션 */}
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
            <Camera className="size-4 text-primary" />
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
          {isSubmitting ? "저장 중..." : "운동 수정"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── 행별 사진 팝업 ──────────────────────────────────────────────────────────

function RowPhotoButton({
  card,
  onAdd,
  onRemove,
}: {
  card: ExerciseCard
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showPopup, setShowPopup] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)
  const count = card.photoPreviews.length

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false)
      }
    }
    if (showPopup) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [showPopup])

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const remaining = MAX_IMAGES - count
    if (remaining <= 0) {
      toast.error(`사진은 최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다`)
      e.target.value = ""
      return
    }
    const compressed: File[] = []
    for (const file of files.slice(0, remaining)) {
      if (!file.type.startsWith("image/")) continue
      compressed.push(await compressImageToWebP(file))
    }
    onAdd(compressed)
    e.target.value = ""
  }

  return (
    <div className="relative" ref={popupRef}>
      <Button
        type="button"
        variant={count > 0 ? "default" : "ghost"}
        size="icon-sm"
        onClick={() => (count > 0 ? setShowPopup(!showPopup) : fileInputRef.current?.click())}
        aria-label="사진 첨부"
      >
        <Camera className="size-3.5" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white">
            {count}
          </span>
        )}
      </Button>

      {/* 사진 미리보기 팝업 */}
      {showPopup && count > 0 && (
        <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border bg-popover p-2 shadow-md">
          <div className="grid grid-cols-3 gap-1">
            {card.photoPreviews.map((url, i) => (
              <div key={url} className="relative">
                <Image src={url} alt="" width={60} height={60} className="aspect-square rounded object-cover" unoptimized />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-white"
                >
                  <X className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
          {count < MAX_IMAGES && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1 w-full text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Plus className="size-3" /> 추가
            </Button>
          )}
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
    </div>
  )
}

// ─── 추가 모드 폼 (테이블) ───────────────────────────────────────────────────

interface AddFormBodyProps {
  defaultDate: string
  onOpenChange: (open: boolean) => void
}

function AddFormBody({ defaultDate, onOpenChange }: AddFormBodyProps) {
  const createWorkout = useCreateWorkout()
  const createWorkoutBatch = useCreateWorkoutBatch()

  const [date, setDate] = useState(defaultDate)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [cards, setCards] = useState<ExerciseCard[]>(() =>
    Array.from({ length: 4 }, () => createEmptyCard())
  )
  const [memo, setMemo] = useState("")

  const isSubmitting = createWorkout.isPending || createWorkoutBatch.isPending
  const selectedDate = parseDateValue(date)

  // blob URL 정리 (언마운트 시)
  useEffect(() => {
    return () => {
      for (const card of cards) {
        for (const url of card.photoPreviews) {
          if (url.startsWith("blob:")) URL.revokeObjectURL(url)
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function updateCard(id: string, updates: Partial<ExerciseCard>) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)))
  }

  function handleSetChange(cardId: string, setIndex: number, field: "kg" | "reps", value: string) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c
        const newSets = c.sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s))
        return { ...c, sets: newSets }
      })
    )
  }

  function addRow() {
    if (cards.length >= MAX_CARDS) {
      toast.error(`종목은 최대 ${MAX_CARDS}개까지 추가할 수 있습니다`)
      return
    }
    setCards((prev) => [...prev, createEmptyCard()])
  }

  function removeRow(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id))
  }

  function handlePhotoAdd(cardId: string, files: File[]) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c
        const newPreviews = files.map((f) => URL.createObjectURL(f))
        return {
          ...c,
          photos: [...c.photos, ...files],
          photoPreviews: [...c.photoPreviews, ...newPreviews],
        }
      })
    )
  }

  function handlePhotoRemove(cardId: string, photoIndex: number) {
    setCards((prev) =>
      prev.map((c) => {
        if (c.id !== cardId) return c
        const url = c.photoPreviews[photoIndex]
        if (url?.startsWith("blob:")) URL.revokeObjectURL(url)
        const blobPreviews = c.photoPreviews.filter((u) => u.startsWith("blob:"))
        const blobIndex = blobPreviews.indexOf(url ?? "")
        const newPhotos = blobIndex !== -1 ? c.photos.filter((_, i) => i !== blobIndex) : c.photos
        return {
          ...c,
          photos: newPhotos,
          photoPreviews: c.photoPreviews.filter((_, i) => i !== photoIndex),
        }
      })
    )
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const validCards = cards.filter((c) => c.exerciseName.trim())
    if (validCards.length === 0) {
      toast.error("운동 종목을 하나 이상 입력해주세요")
      return
    }

    // 공통 메모를 각 카드 notes에 추가
    const cardsWithMemo = validCards.map((c) => ({
      ...c,
      notes: [c.notes, memo].filter(Boolean).join("\n"),
    }))

    const cardsWithPhotos = cardsWithMemo.filter((c) => c.photos.length > 0)
    const cardsWithoutPhotos = cardsWithMemo.filter((c) => c.photos.length === 0)

    const batchExercises: WorkoutExerciseInput[] = cardsWithoutPhotos.map((c) => ({
      exerciseName: c.exerciseName.trim(),
      sets: c.sets.map((s) => ({
        kg: s.kg ? Number(s.kg) : null,
        reps: s.reps ? Number(s.reps) : null,
      })),
      notes: c.notes.trim() || undefined,
    }))

    function cardToInput(c: ExerciseCard & { notes: string }): WorkoutInput {
      return {
        exerciseName: c.exerciseName.trim(),
        sets: c.sets.length,
        reps: c.sets[0]?.reps ? Number(c.sets[0].reps) : undefined,
        weight: c.sets[0]?.kg ? Number(c.sets[0].kg) : undefined,
        notes: c.notes.trim() || undefined,
        date,
      }
    }

    try {
      const promises: Promise<unknown>[] = []

      for (const c of cardsWithPhotos) {
        promises.push(createWorkout.mutateAsync({ input: cardToInput(c), photos: c.photos }))
      }

      if (batchExercises.length === 1 && cardsWithPhotos.length === 0) {
        const c = cardsWithoutPhotos[0]!
        promises.push(createWorkout.mutateAsync({ input: cardToInput(c) }))
      } else if (batchExercises.length > 0) {
        promises.push(createWorkoutBatch.mutateAsync({ exercises: batchExercises, date }))
      }

      await Promise.all(promises)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "운동 기록 저장에 실패했습니다")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 날짜 선택 */}
      <div className="space-y-2">
        <Label htmlFor="add-workout-date">날짜</Label>
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger
            id="add-workout-date"
            render={
              <Button type="button" variant="outline" className="w-full justify-between font-normal sm:w-48" />
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

      {/* 운동 테이블 */}
      <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-[750px] w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-28 px-2 py-2 text-left text-xs font-medium text-muted-foreground">운동 종목</th>
                {Array.from({ length: DEFAULT_SET_COUNT }, (_, i) => (
                  <th key={i} className="px-1 py-2 text-center text-xs font-medium text-muted-foreground">
                    {i + 1}세트
                    <div className="flex justify-center gap-1 mt-0.5">
                      <span className="text-[10px] text-muted-foreground/60">KG</span>
                      <span className="text-[10px] text-muted-foreground/60">회</span>
                    </div>
                  </th>
                ))}
                <th className="w-9 px-1 py-2 text-center text-xs font-medium text-muted-foreground">
                  <Camera className="mx-auto size-3.5" />
                </th>
                <th className="w-9 px-1 py-2" />
              </tr>
            </thead>
            <tbody>
              {cards.map((card) => (
                <tr key={card.id} className="border-b last:border-0">
                  <td className="px-2 py-1.5">
                    <Input
                      placeholder="운동명"
                      value={card.exerciseName}
                      onChange={(e) => updateCard(card.id, { exerciseName: e.target.value })}
                      className="h-8 text-xs"
                    />
                  </td>
                  {card.sets.slice(0, DEFAULT_SET_COUNT).map((set, si) => (
                    <td key={si} className="px-1 py-1.5">
                      <div className="flex gap-0.5">
                        <Input
                          type="number"
                          min="0"
                          step="0.5"
                          placeholder="KG"
                          value={set.kg}
                          onChange={(e) => handleSetChange(card.id, si, "kg", e.target.value)}
                          className="h-8 w-14 px-1 text-center text-xs"
                        />
                        <Input
                          type="number"
                          min="0"
                          placeholder="회"
                          value={set.reps}
                          onChange={(e) => handleSetChange(card.id, si, "reps", e.target.value)}
                          className="h-8 w-14 px-1 text-center text-xs"
                        />
                      </div>
                    </td>
                  ))}
                  <td className="px-1 py-1.5 text-center">
                    <RowPhotoButton
                      card={card}
                      onAdd={(files) => handlePhotoAdd(card.id, files)}
                      onRemove={(i) => handlePhotoRemove(card.id, i)}
                    />
                  </td>
                  <td className="px-1 py-1.5 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="행 삭제"
                      disabled={cards.length <= 1}
                      onClick={() => removeRow(card.id)}
                    >
                      <X className="size-3.5 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
      </div>

      {/* 종목 추가 */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addRow}
        disabled={cards.length >= MAX_CARDS}
      >
        <Plus className="size-4" />
        종목 추가
      </Button>

      {/* 메모 / 의견 */}
      <div className="space-y-2">
        <Label htmlFor="add-workout-memo">메모 / 의견</Label>
        <textarea
          id="add-workout-memo"
          className="flex min-h-[72px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="오늘 운동에 대한 메모나 의견을 남기세요"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
        />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "저장 중..." : "기록"}
        </Button>
      </DialogFooter>
    </form>
  )
}

// ─── 메인 Dialog ─────────────────────────────────────────────────────────────

export function WorkoutForm({
  open,
  onOpenChange,
  editWorkout,
  defaultDate,
}: WorkoutFormProps) {
  const resolvedDefaultDate = defaultDate ?? formatLocalDateValue(new Date())

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[90vw] lg:max-w-4xl !overflow-hidden p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{editWorkout ? "운동 수정" : "운동 기록"}</DialogTitle>
            <DialogDescription>
              {editWorkout
                ? "운동 정보를 수정하세요."
                : "날짜와 운동 종목을 입력하고 한번에 기록하세요."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {editWorkout ? (
            <EditFormBody editWorkout={editWorkout} onOpenChange={onOpenChange} />
          ) : (
            <AddFormBody defaultDate={resolvedDefaultDate} onOpenChange={onOpenChange} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
