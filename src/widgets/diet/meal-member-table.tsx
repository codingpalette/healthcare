"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import {
  Camera,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  MessageSquarePlus,
  UtensilsCrossed,
} from "lucide-react"
import { useMemberMeals, useTodayMeals, useUpdateMealFeedback } from "@/features/diet"
import { useEnsureChatRoom, useSendChatMessage } from "@/features/chat"
import type { MealType, MealWithProfile } from "@/entities/meal"
import { toast } from "sonner"
import {
  Badge,
  Button,
  buttonVariants,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Separator,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"

const MEAL_TYPE_LABEL: Record<MealType, string> = {
  breakfast: "아침",
  lunch: "점심",
  dinner: "저녁",
  snack: "간식",
}

function formatLocalDateValue(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function formatFullDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function MealImageGallery({ photoUrls, alt }: { photoUrls: string[]; alt: string }) {
  const [index, setIndex] = useState(0)

  if (photoUrls.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl bg-muted">
        <div className="flex aspect-video items-center justify-center bg-primary/5 text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <Camera className="size-6 text-primary" />
            <p className="text-sm">등록된 식단 사진이 없습니다</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
      <Image
        src={photoUrls[index]}
        alt={alt}
        fill
        className="object-contain"
        unoptimized
      />
      {photoUrls.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + photoUrls.length) % photoUrls.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % photoUrls.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-0.5 text-xs text-white">
            {index + 1} / {photoUrls.length}
          </div>
        </>
      )}
    </div>
  )
}

function formatMacros(meal: { carbs: number | null; protein: number | null; fat: number | null; fiber: number | null }) {
  return [
    meal.carbs != null && `탄 ${meal.carbs}g`,
    meal.protein != null && `단 ${meal.protein}g`,
    meal.fat != null && `지 ${meal.fat}g`,
    meal.fiber != null && `섬 ${meal.fiber}g`,
  ]
    .filter(Boolean)
    .join(" · ")
}

function MealDetailDialog({
  meal,
  open,
  onOpenChange,
  selectedDate,
}: {
  meal: MealWithProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
}) {
  const historyFrom = formatLocalDateValue(addDays(new Date(`${selectedDate}T00:00:00`), -6))
  const { data: memberMeals, isLoading } = useMemberMeals(
    meal?.userId ?? "",
    historyFrom,
    selectedDate
  )
  const ensureChatRoom = useEnsureChatRoom()
  const sendChatMessage = useSendChatMessage()
  const updateMealFeedback = useUpdateMealFeedback()
  const [feedbackDraft, setFeedbackDraft] = useState(meal?.trainerFeedback ?? "")

  async function handleSendFeedback() {
    if (!meal || !feedbackDraft.trim()) return
    const trimmedFeedback = feedbackDraft.trim()

    try {
      await updateMealFeedback.mutateAsync({
        id: meal.id,
        trainerFeedback: trimmedFeedback,
      })
      const room = await ensureChatRoom.mutateAsync(meal.userId)
      await sendChatMessage.mutateAsync({
        roomId: room.id,
        type: "feedback",
        content: trimmedFeedback,
        mealId: meal.id,
      })
      setFeedbackDraft(trimmedFeedback)
      toast.success("식단 피드백을 관리톡으로 전송했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "식단 피드백 전송에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{meal?.userName ?? "회원"} 식단 인증 상세</DialogTitle>
          <DialogDescription>
            선택한 날짜의 식단 인증과 최근 7일 식단 기록을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {!meal ? null : (
          <div className="flex flex-col gap-5">
            <div className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
              <MealImageGallery photoUrls={meal.photoUrls} alt={`${meal.userName} 식단 사진`} />

              <div className="flex flex-col gap-3 rounded-xl bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">{MEAL_TYPE_LABEL[meal.mealType]}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDate(meal.date)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-background p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      기록 시간
                    </p>
                    <p className="mt-1 font-semibold">{formatTime(meal.createdAt)}</p>
                  </div>
                  <div className="rounded-lg bg-background p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="size-3.5" />
                      칼로리
                    </p>
                    <p className="mt-1 font-semibold">
                      {meal.calories != null ? `${meal.calories}kcal` : "-"}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted-foreground">메모</p>
                  <p className="mt-1 text-sm text-foreground">
                    {meal.description?.trim() ? meal.description : "작성된 식단 메모가 없습니다."}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <p className="text-xs text-muted-foreground">영양 정보</p>
                  <p className="mt-1 text-sm text-foreground">
                    {formatMacros(meal) || "등록된 영양 정보가 없습니다."}
                  </p>
                </div>
                <div className="rounded-lg bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">관리톡 식단 피드백</p>
                      <p className="mt-1 text-sm text-foreground">
                        회원에게 바로 식단 코멘트를 전송할 수 있습니다.
                      </p>
                    </div>
                    <Link
                      href="/chat"
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      관리톡 보기
                    </Link>
                  </div>
                  <textarea
                    className="mt-3 flex min-h-[96px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    placeholder="예: 단백질 구성이 좋아요. 저녁에는 채소를 조금 더 추가해보세요."
                    value={feedbackDraft}
                    onChange={(event) => setFeedbackDraft(event.target.value)}
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleSendFeedback}
                      disabled={
                        !feedbackDraft.trim() ||
                        updateMealFeedback.isPending ||
                        ensureChatRoom.isPending ||
                        sendChatMessage.isPending
                      }
                    >
                      <MessageSquarePlus className="size-4" />
                      {updateMealFeedback.isPending || ensureChatRoom.isPending || sendChatMessage.isPending
                        ? "전송 중..."
                        : "관리톡으로 피드백 보내기"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex flex-col gap-3">
              <div>
                <h3 className="font-medium">최근 7일 식단 기록</h3>
                <p className="text-sm text-muted-foreground">
                  같은 회원의 최근 식단 인증 내역입니다.
                </p>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-20 w-full" />
                  ))}
                </div>
              ) : !memberMeals?.length ? (
                <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  최근 7일 동안 등록된 식단이 없습니다.
                </p>
              ) : (
                <div className="flex max-h-[320px] flex-col gap-2 overflow-y-auto pr-1">
                  {memberMeals.map((memberMeal) => (
                    <div
                      key={memberMeal.id}
                      className="flex items-start gap-3 rounded-xl bg-muted/40 p-3"
                    >
                      {memberMeal.photoUrls.length > 0 ? (
                        <Image
                          src={memberMeal.photoUrls[0]}
                          alt={`${meal.userName} 식단 썸네일`}
                          width={72}
                          height={72}
                          className="size-[72px] rounded-lg object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex size-[72px] items-center justify-center rounded-lg bg-background text-primary">
                          <UtensilsCrossed className="size-5" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{MEAL_TYPE_LABEL[memberMeal.mealType]}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(memberMeal.date)} · {formatTime(memberMeal.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-foreground">
                          {memberMeal.description?.trim() || "작성된 식단 메모가 없습니다."}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {memberMeal.calories != null ? `${memberMeal.calories}kcal` : "칼로리 미입력"}
                          {formatMacros(memberMeal) ? ` · ${formatMacros(memberMeal)}` : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function MealMemberTable() {
  const today = formatLocalDateValue(new Date())
  const todayDate = new Date(`${today}T00:00:00`)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedMeal, setSelectedMeal] = useState<MealWithProfile | null>(null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const { data: meals, isLoading } = useTodayMeals(selectedDate)

  const goToPreviousDate = () => {
    setSelectedMeal(null)
    setSelectedDate(formatLocalDateValue(addDays(new Date(`${selectedDate}T00:00:00`), -1)))
  }

  const goToNextDate = () => {
    setSelectedMeal(null)
    setSelectedDate(formatLocalDateValue(addDays(new Date(`${selectedDate}T00:00:00`), 1)))
  }

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-primary/10 p-2">
                  <UtensilsCrossed className="size-4 text-primary" />
                </div>
                회원 식단 기록
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                날짜를 바꿔 회원 식단 인증을 확인하고 행을 눌러 상세 정보를 볼 수 있습니다.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                aria-label="이전 식단 날짜"
                variant="ghost"
                size="icon-sm"
                onClick={goToPreviousDate}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="min-w-48 justify-between font-normal"
                    />
                  }
                >
                  <span>{formatFullDate(selectedDate)}</span>
                  <CalendarDays data-icon="inline-end" />
                </PopoverTrigger>
                <PopoverContent align="end" className="w-auto p-3">
                  <Calendar
                    mode="single"
                    defaultMonth={new Date(`${selectedDate}T00:00:00`)}
                    selected={new Date(`${selectedDate}T00:00:00`)}
                    onSelect={(nextDate: Date | undefined) => {
                      if (!nextDate || nextDate > todayDate) return
                      setSelectedMeal(null)
                      setSelectedDate(formatLocalDateValue(nextDate))
                      setIsDatePickerOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                aria-label="다음 식단 날짜"
                variant="ghost"
                size="icon-sm"
                onClick={goToNextDate}
                disabled={selectedDate >= today}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !meals?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              선택한 날짜에 기록된 식단이 없습니다
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
                  <TableRow
                    key={meal.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedMeal(meal)}
                  >
                    <TableCell className="font-medium">{meal.userName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{MEAL_TYPE_LABEL[meal.mealType]}</Badge>
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

      <MealDetailDialog
        key={selectedMeal?.id ?? "empty"}
        meal={selectedMeal}
        open={!!selectedMeal}
        onOpenChange={(open) => {
          if (!open) setSelectedMeal(null)
        }}
        selectedDate={selectedDate}
      />
    </>
  )
}
