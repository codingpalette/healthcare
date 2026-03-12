"use client"

import { useState, useRef } from "react"
import { CalendarIcon, Camera, X } from "lucide-react"
import type { Meal, MealInput, MealType } from "@/entities/meal"
import { useCreateMeal, useUpdateMeal } from "@/features/diet"
import {
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
  Badge,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

const MEAL_TYPES: { value: MealType; label: string }[] = [
  { value: "breakfast", label: "아침" },
  { value: "lunch", label: "점심" },
  { value: "dinner", label: "저녁" },
  { value: "snack", label: "간식" },
]

interface MealFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editMeal?: Meal
  defaultDate?: string
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return new Date()
  }

  return new Date(year, month - 1, day)
}

function formatDateLabel(value: string) {
  return parseDateValue(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

export function MealForm({ open, onOpenChange, editMeal, defaultDate }: MealFormProps) {
  const createMeal = useCreateMeal()
  const updateMeal = useUpdateMeal()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialogContentRef = useRef<HTMLDivElement>(null)

  const [mealType, setMealType] = useState<MealType>(editMeal?.mealType ?? "lunch")
  const [description, setDescription] = useState(editMeal?.description ?? "")
  const [calories, setCalories] = useState(editMeal?.calories?.toString() ?? "")
  const [carbs, setCarbs] = useState(editMeal?.carbs?.toString() ?? "")
  const [protein, setProtein] = useState(editMeal?.protein?.toString() ?? "")
  const [fat, setFat] = useState(editMeal?.fat?.toString() ?? "")
  const [date, setDate] = useState(editMeal?.date ?? defaultDate ?? formatDateValue(new Date()))
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(editMeal?.photoUrl ?? null)

  const isSubmitting = createMeal.isPending || updateMeal.isPending
  const selectedDate = parseDateValue(date)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function removePhoto() {
    setPhoto(null)
    setPhotoPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const input: MealInput = {
      mealType,
      description: description || undefined,
      calories: calories ? Number(calories) : undefined,
      carbs: carbs ? Number(carbs) : undefined,
      protein: protein ? Number(protein) : undefined,
      fat: fat ? Number(fat) : undefined,
      date,
    }

    if (editMeal) {
      await updateMeal.mutateAsync({ id: editMeal.id, input, photo: photo ?? undefined })
    } else {
      await createMeal.mutateAsync({ input, photo: photo ?? undefined })
    }

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent ref={dialogContentRef} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editMeal ? "식단 수정" : "식단 기록"}</DialogTitle>
          <DialogDescription>
            {editMeal ? "식단 정보를 수정하세요" : "오늘의 식단을 기록하세요"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 식사 유형 선택 */}
          <div className="space-y-2">
            <Label>식사 유형</Label>
            <div className="flex gap-2">
              {MEAL_TYPES.map((type) => (
                <Badge
                  key={type.value}
                  variant={mealType === type.value ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer px-3 py-1.5 text-sm",
                    mealType === type.value && "bg-primary text-primary-foreground"
                  )}
                  onClick={() => setMealType(type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* 날짜 */}
          <div className="space-y-2">
            <Label htmlFor="meal-date">날짜</Label>
            <Popover open={isDatePickerOpen} onOpenChange={(nextOpen) => setIsDatePickerOpen(nextOpen)}>
              <PopoverTrigger
                id="meal-date"
                render={
                  <Button
                    className="w-full justify-between font-normal"
                    type="button"
                    variant="outline"
                  />
                }
              >
                <span>{formatDateLabel(date)}</span>
                <CalendarIcon data-icon="inline-end" />
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-auto p-3"
                container={dialogContentRef}
              >
                <Calendar
                  defaultMonth={selectedDate}
                  selected={selectedDate}
                  onSelect={(nextDate) => {
                    setDate(formatDateValue(nextDate))
                    setIsDatePickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <textarea
              id="description"
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="식단 내용을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 영양소 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="calories">칼로리 (kcal)</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                placeholder="0"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carbs">탄수화물 (g)</Label>
              <Input
                id="carbs"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">단백질 (g)</Label>
              <Input
                id="protein"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">지방 (g)</Label>
              <Input
                id="fat"
                type="number"
                min="0"
                step="0.1"
                placeholder="0"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
              />
            </div>
          </div>

          {/* 사진 업로드 */}
          <div className="space-y-2">
            <Label>사진</Label>
            {photoPreview ? (
              <div className="relative">
                <img
                  src={photoPreview}
                  alt="식단 사진 미리보기"
                  className="h-40 w-full rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-2 right-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Camera className="size-6" />
                  <span className="text-xs">사진 추가</span>
                </div>
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "저장 중..." : editMeal ? "수정" : "기록"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
