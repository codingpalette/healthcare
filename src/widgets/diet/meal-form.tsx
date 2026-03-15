"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { CalendarIcon, Camera, Plus, Search, X } from "lucide-react"
import { toast } from "sonner"
import type { Meal, MealInput, MealType } from "@/entities/meal"
import type { FoodItem } from "@/entities/food-item"
import { useCreateMeal, useUpdateMeal } from "@/features/diet"
import { useFoodItems } from "@/features/food-item"
import { compressImageToWebP } from "@/shared/lib/media"
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

const MAX_IMAGES = 5

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
  const [photos, setPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>(editMeal?.photoUrls ?? [])

  // 음식 검색 상태
  const [foodSearch, setFoodSearch] = useState("")
  const [foodWeight, setFoodWeight] = useState("")
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [showFoodDropdown, setShowFoodDropdown] = useState(false)
  const foodSearchRef = useRef<HTMLDivElement>(null)

  const { data: foodItems } = useFoodItems(foodSearch.trim() || undefined)

  const isSubmitting = createMeal.isPending || updateMeal.isPending
  const selectedDate = parseDateValue(date)

  // 음식 검색 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (foodSearchRef.current && !foodSearchRef.current.contains(e.target as Node)) {
        setShowFoodDropdown(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    // 컴포넌트 언마운트 시 blob URL 해제
    return () => {
      photoPreviews.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 음식 선택 후 중량 변경 시 영양소 자동 계산
  useEffect(() => {
    if (!selectedFood) return
    const weight = parseFloat(foodWeight)
    if (!weight || weight <= 0) return

    const ratio = weight / selectedFood.servingSize
    if (selectedFood.calories != null) setCalories((selectedFood.calories * ratio).toFixed(1))
    if (selectedFood.carbs != null) setCarbs((selectedFood.carbs * ratio).toFixed(1))
    if (selectedFood.protein != null) setProtein((selectedFood.protein * ratio).toFixed(1))
    if (selectedFood.fat != null) setFat((selectedFood.fat * ratio).toFixed(1))
  }, [foodWeight, selectedFood])

  function handleSelectFood(food: FoodItem) {
    setSelectedFood(food)
    setFoodSearch(food.name)
    setShowFoodDropdown(false)
    // 기본 중량은 servingSize로 설정
    setFoodWeight(String(food.servingSize))
    // 기본 중량 기준으로 영양소 자동 계산
    if (food.calories != null) setCalories(food.calories.toFixed(1))
    if (food.carbs != null) setCarbs(food.carbs.toFixed(1))
    if (food.protein != null) setProtein(food.protein.toFixed(1))
    if (food.fat != null) setFat(food.fat.toFixed(1))
  }

  function handleClearFood() {
    setSelectedFood(null)
    setFoodSearch("")
    setFoodWeight("")
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return

    const currentCount = photoPreviews.length
    if (currentCount + files.length > MAX_IMAGES) {
      toast.error(`최대 ${MAX_IMAGES}장까지 업로드할 수 있습니다`)
      e.target.value = ""
      return
    }

    const invalidFile = files.find((f) => !f.type.startsWith("image/"))
    if (invalidFile) {
      toast.error("이미지 파일만 업로드할 수 있습니다")
      e.target.value = ""
      return
    }

    try {
      const compressed = await Promise.all(files.map((f) => compressImageToWebP(f)))
      const newPreviews = compressed.map((f) => URL.createObjectURL(f))

      setPhotos((prev) => [...prev, ...compressed])
      setPhotoPreviews((prev) => [...prev, ...newPreviews])
      e.target.value = ""
    } catch {
      toast.error("사진 압축에 실패했습니다")
      e.target.value = ""
    }
  }

  function removePhoto(index: number) {
    const url = photoPreviews[index]
    if (url?.startsWith("blob:")) {
      URL.revokeObjectURL(url)
    }

    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index))

    // blob URL인 경우에만 photos 배열에서 제거 (기존 URL은 photos에 없음)
    if (url?.startsWith("blob:")) {
      // photos 배열에서 해당 blob URL에 대응하는 파일 제거
      // blob URL 순서대로 photos에 매핑됨
      const existingUrlCount = photoPreviews.filter((p, i) => i < index && !p.startsWith("blob:")).length
      const blobIndexBefore = photoPreviews.filter((p, i) => i < index && p.startsWith("blob:")).length
      setPhotos((prev) => prev.filter((_, i) => i !== blobIndexBefore))
      void existingUrlCount // suppress unused warning
    }

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
      const existingPhotoUrls = photoPreviews.filter((url) => !url.startsWith("blob:"))
      await updateMeal.mutateAsync({
        id: editMeal.id,
        input,
        photos: photos.length ? photos : undefined,
        existingPhotoUrls,
      })
    } else {
      await createMeal.mutateAsync({ input, photos: photos.length ? photos : undefined })
    }

    onOpenChange(false)
  }

  const totalCount = photoPreviews.length
  const canAddMore = totalCount < MAX_IMAGES

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
              >
                <Calendar
                  mode="single"
                  defaultMonth={selectedDate}
                  selected={selectedDate}
                  onSelect={(nextDate: Date | undefined) => {
                    if (!nextDate) return
                    setDate(formatDateValue(nextDate))
                    setIsDatePickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 음식 검색 */}
          <div className="space-y-2">
            <Label>음식 검색 (선택)</Label>
            <div ref={foodSearchRef} className="relative">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="음식명으로 검색..."
                    value={foodSearch}
                    onChange={(e) => {
                      setFoodSearch(e.target.value)
                      setShowFoodDropdown(true)
                      if (!e.target.value) {
                        setSelectedFood(null)
                        setFoodWeight("")
                      }
                    }}
                    onFocus={() => setShowFoodDropdown(true)}
                    className="pl-8"
                  />
                </div>
                {selectedFood && (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="중량(g)"
                      value={foodWeight}
                      onChange={(e) => setFoodWeight(e.target.value)}
                      className="w-24"
                    />
                    <span className="text-xs text-muted-foreground">{selectedFood.unit}</span>
                  </div>
                )}
                {selectedFood && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={handleClearFood}
                    aria-label="음식 선택 초기화"
                  >
                    <X className="size-3.5" />
                  </Button>
                )}
              </div>

              {/* 검색 결과 드롭다운 */}
              {showFoodDropdown && foodItems && foodItems.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border bg-popover shadow-md">
                  {foodItems.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => handleSelectFood(food)}
                    >
                      <span className="font-medium">{food.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {food.servingSize}{food.unit}
                        {food.calories != null && ` · ${food.calories}kcal`}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedFood && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {selectedFood.name} 선택됨 — 중량을 변경하면 영양소가 자동으로 계산됩니다
                </p>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <Label>사진</Label>
              {totalCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {totalCount}/{MAX_IMAGES}
                </span>
              )}
            </div>

            {totalCount === 0 ? (
              // 빈 상태: 카메라 업로드 영역 표시
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-full items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
              >
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Camera className="size-6" />
                  <span className="text-xs">사진 추가</span>
                  <span className="text-[11px]">업로드 전 WebP로 압축됩니다</span>
                </div>
              </button>
            ) : (
              // 사진 그리드
              <div className="grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={preview} className="relative aspect-square overflow-hidden rounded-lg">
                    <Image
                      fill
                      src={preview}
                      alt={`식단 사진 ${index + 1}`}
                      className="object-cover"
                      sizes="(max-width: 640px) 33vw, 148px"
                      unoptimized
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white hover:bg-black/70"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}

                {/* 추가 버튼 */}
                {canAddMore && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-muted-foreground/50"
                  >
                    <div className="flex flex-col items-center gap-1 text-muted-foreground">
                      <Plus className="size-5" />
                      <span className="text-[11px]">추가</span>
                    </div>
                  </button>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
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
