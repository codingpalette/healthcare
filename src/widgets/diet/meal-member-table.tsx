"use client"

import { UtensilsCrossed } from "lucide-react"
import { useTodayMeals } from "@/features/diet"
import type { MealType } from "@/entities/meal"
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Skeleton,
  Badge,
} from "@/shared/ui"

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function MealMemberTable() {
  const { data: meals, isLoading } = useTodayMeals()

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <UtensilsCrossed className="size-4 text-primary" />
          </div>
          오늘 회원 식단
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !meals?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            오늘 기록된 식단이 없습니다
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회원</TableHead>
                <TableHead>식사</TableHead>
                <TableHead>칼로리</TableHead>
                <TableHead>기록 시간</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meals.map((meal) => (
                <TableRow key={meal.id}>
                  <TableCell className="font-medium">{meal.userName}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {MEAL_TYPE_LABEL[meal.mealType]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {meal.calories != null ? `${meal.calories}kcal` : "-"}
                  </TableCell>
                  <TableCell>{formatTime(meal.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
