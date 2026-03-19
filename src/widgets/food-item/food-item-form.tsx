"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Input,
  Label,
} from "@/shared/ui"
import { useCreateFoodItem, useUpdateFoodItem } from "@/features/food-item"
import type { FoodItem, FoodItemInput } from "@/entities/food-item"

interface FoodItemFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editTarget?: FoodItem | null
}

export function FoodItemForm({ open, onOpenChange, editTarget }: FoodItemFormProps) {
  const isEdit = !!editTarget
  const createFoodItem = useCreateFoodItem()
  const updateFoodItem = useUpdateFoodItem()

  const [name, setName] = useState(editTarget?.name ?? "")
  const [servingSize, setServingSize] = useState(String(editTarget?.servingSize ?? 100))
  const [unit, setUnit] = useState(editTarget?.unit ?? "g")
  const [calories, setCalories] = useState(editTarget?.calories != null ? String(editTarget.calories) : "")
  const [carbs, setCarbs] = useState(editTarget?.carbs != null ? String(editTarget.carbs) : "")
  const [protein, setProtein] = useState(editTarget?.protein != null ? String(editTarget.protein) : "")
  const [fat, setFat] = useState(editTarget?.fat != null ? String(editTarget.fat) : "")
  const [fiber, setFiber] = useState(editTarget?.fiber != null ? String(editTarget.fiber) : "")

  const isPending = createFoodItem.isPending || updateFoodItem.isPending

  const parseNum = (val: string): number | null => {
    const n = parseFloat(val)
    return isNaN(n) ? null : n
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("음식명을 입력해주세요")
      return
    }

    const input: FoodItemInput = {
      name: name.trim(),
      servingSize: parseNum(servingSize) ?? 100,
      unit: unit.trim() || "g",
      calories: parseNum(calories),
      carbs: parseNum(carbs),
      protein: parseNum(protein),
      fat: parseNum(fat),
      fiber: parseNum(fiber),
    }

    try {
      if (isEdit && editTarget) {
        await updateFoodItem.mutateAsync({ id: editTarget.id, input })
        toast.success("음식 정보가 수정되었습니다")
      } else {
        await createFoodItem.mutateAsync(input)
        toast.success("음식이 등록되었습니다")
      }
      onOpenChange(false)
    } catch {
      toast.error(isEdit ? "음식 수정에 실패했습니다" : "음식 등록에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "음식 수정" : "음식 추가"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "음식 정보를 수정합니다." : "새로운 음식을 등록합니다."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 음식명 */}
          <div className="space-y-2">
            <Label htmlFor="food-name">음식명 *</Label>
            <Input
              id="food-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 닭가슴살"
            />
          </div>

          {/* 기준량 + 단위 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="serving-size">기준량</Label>
              <Input
                id="serving-size"
                type="number"
                min="0"
                step="any"
                value={servingSize}
                onChange={(e) => setServingSize(e.target.value)}
                placeholder="100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">단위</Label>
              <Input
                id="unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="g"
              />
            </div>
          </div>

          {/* 칼로리 */}
          <div className="space-y-2">
            <Label htmlFor="calories">칼로리 (kcal)</Label>
            <Input
              id="calories"
              type="number"
              min="0"
              step="any"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              placeholder="0"
            />
          </div>

          {/* 탄수화물 / 단백질 / 지방 / 섬유질 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="carbs">탄수화물 (g)</Label>
              <Input
                id="carbs"
                type="number"
                min="0"
                step="any"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">단백질 (g)</Label>
              <Input
                id="protein"
                type="number"
                min="0"
                step="any"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fat">지방 (g)</Label>
              <Input
                id="fat"
                type="number"
                min="0"
                step="any"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fiber">섬유질 (g)</Label>
              <Input
                id="fiber"
                type="number"
                min="0"
                step="any"
                value={fiber}
                onChange={(e) => setFiber(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {/* 제출 버튼 */}
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
