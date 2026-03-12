"use client"

import Image from "next/image"
import { useState } from "react"
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, Coffee, Sun, Moon, Apple } from "lucide-react"
import type { Meal, MealType } from "@/entities/meal"
import { useMyMeals, useDeleteMeal } from "@/features/diet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
  Skeleton,
} from "@/shared/ui"
import { MealForm } from "@/widgets/diet/meal-form"

const MEAL_TYPE_CONFIG: Record<MealType, { label: string; icon: typeof Coffee }> = {
  breakfast: { label: "아침", icon: Coffee },
  lunch: { label: "점심", icon: Sun },
  dinner: { label: "저녁", icon: Moon },
  snack: { label: "간식", icon: Apple },
}

function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00")
  date.setDate(date.getDate() + days)
  return formatLocalDateValue(date)
}

export function MealDailyList() {
  const today = formatLocalDateValue(new Date())
  const [selectedDate, setSelectedDate] = useState(today)
  const [formOpen, setFormOpen] = useState(false)
  const [editMeal, setEditMeal] = useState<Meal | undefined>()
  const [mealToDelete, setMealToDelete] = useState<Meal | undefined>()

  const { data: meals, isLoading } = useMyMeals(selectedDate, selectedDate)
  const deleteMeal = useDeleteMeal()

  // 일일 영양소 합계
  const totals = (meals ?? []).reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.calories ?? 0),
      carbs: acc.carbs + (meal.carbs ?? 0),
      protein: acc.protein + (meal.protein ?? 0),
      fat: acc.fat + (meal.fat ?? 0),
    }),
    { calories: 0, carbs: 0, protein: 0, fat: 0 }
  )

  function handleEdit(meal: Meal) {
    setEditMeal(meal)
    setFormOpen(true)
  }

  function handleAdd() {
    setEditMeal(undefined)
    setFormOpen(true)
  }

  function handleDelete(meal: Meal) {
    setMealToDelete(meal)
  }

  function handleConfirmDelete() {
    if (!mealToDelete) return
    deleteMeal.mutate(mealToDelete.id)
    setMealToDelete(undefined)
  }

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">일별 식단</CardTitle>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="size-4" />
              기록 추가
            </Button>
          </div>
          {/* 날짜 네비게이션 */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <Button
              aria-label="이전 날짜"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm font-medium">{formatDate(selectedDate)}</span>
            <Button
              aria-label="다음 날짜"
              variant="ghost"
              size="icon-sm"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              disabled={selectedDate >= today}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* 일일 영양소 합계 */}
          {meals && meals.length > 0 && (
            <div className="grid grid-cols-4 gap-2 rounded-xl bg-muted p-3 text-center text-sm">
              <div>
                <p className="text-muted-foreground">칼로리</p>
                <p className="font-semibold">{totals.calories}kcal</p>
              </div>
              <div>
                <p className="text-muted-foreground">탄수화물</p>
                <p className="font-semibold">{totals.carbs.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-muted-foreground">단백질</p>
                <p className="font-semibold">{totals.protein.toFixed(1)}g</p>
              </div>
              <div>
                <p className="text-muted-foreground">지방</p>
                <p className="font-semibold">{totals.fat.toFixed(1)}g</p>
              </div>
            </div>
          )}

          {/* 식단 리스트 */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : !meals?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              기록된 식단이 없습니다
            </p>
          ) : (
            <div className="space-y-2">
              {meals.map((meal) => {
                const config = MEAL_TYPE_CONFIG[meal.mealType]
                const Icon = config.icon
                return (
                  <div
                    key={meal.id}
                    className="flex items-start gap-3 rounded-xl bg-muted/50 p-3"
                  >
                    {meal.photoUrl ? (
                      <Image
                        width={64}
                        height={64}
                        src={meal.photoUrl}
                        alt={config.label}
                        className="size-16 shrink-0 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="size-6 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {config.label}
                        </Badge>
                        {meal.calories != null && (
                          <span className="text-xs text-muted-foreground">
                            {meal.calories}kcal
                          </span>
                        )}
                      </div>
                      {meal.description && (
                        <p className="mt-1 text-sm text-foreground line-clamp-2">
                          {meal.description}
                        </p>
                      )}
                      {(meal.carbs != null || meal.protein != null || meal.fat != null) && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {[
                            meal.carbs != null && `탄 ${meal.carbs}g`,
                            meal.protein != null && `단 ${meal.protein}g`,
                            meal.fat != null && `지 ${meal.fat}g`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEdit(meal)}
                        aria-label="식단 수정"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDelete(meal)}
                        aria-label="식단 삭제"
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <MealForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditMeal(undefined)
        }}
        editMeal={editMeal}
        defaultDate={selectedDate}
      />

      <AlertDialog
        open={!!mealToDelete}
        onOpenChange={(open) => {
          if (!open) setMealToDelete(undefined)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>식단을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 식단 기록은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMeal.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMeal.isPending}
              onClick={handleConfirmDelete}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
