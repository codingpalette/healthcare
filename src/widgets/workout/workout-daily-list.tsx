"use client"

import Image from "next/image"
import { useState } from "react"
import Link from "next/link"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  MessagesSquare,
  Pencil,
  Plus,
  Timer,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import type { Workout } from "@/entities/workout"
import { useDeleteWorkout, useMyWorkouts } from "@/features/workout"
import { useMyProfile } from "@/features/profile"
import { useEnsureChatRoom, useSendChatMessage } from "@/features/chat"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
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
  Skeleton,
  buttonVariants,
} from "@/shared/ui"
import { cn } from "@/shared/lib/utils"
import { WorkoutForm } from "@/widgets/workout/workout-form"

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

function formatFullDate(dateStr: string) {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function formatWorkoutMeta(workout: Workout) {
  return [
    workout.sets != null && `${workout.sets}세트`,
    workout.reps != null && `${workout.reps}회`,
    workout.weight != null && `${workout.weight}kg`,
  ]
    .filter(Boolean)
    .join(" · ")
}

function WorkoutDetailDialog({
  workout,
  open,
  onOpenChange,
}: {
  workout: Workout | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [imageIndex, setImageIndex] = useState(0)

  if (!workout) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{workout.exerciseName}</DialogTitle>
          <DialogDescription>운동 상세 정보와 인증 사진을 확인하세요.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 이미지 갤러리 */}
          <div className="relative overflow-hidden rounded-2xl bg-muted">
            {workout.mediaUrls.length > 0 ? (
              <>
                <Image
                  src={workout.mediaUrls[imageIndex]}
                  alt={`${workout.exerciseName} ${imageIndex + 1}`}
                  width={960}
                  height={720}
                  className="aspect-video w-full object-cover"
                  unoptimized
                />
                {workout.mediaUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-opacity hover:bg-black/70 disabled:opacity-0"
                      onClick={() => setImageIndex((prev) => prev - 1)}
                      disabled={imageIndex === 0}
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white transition-opacity hover:bg-black/70 disabled:opacity-0"
                      onClick={() => setImageIndex((prev) => prev + 1)}
                      disabled={imageIndex === workout.mediaUrls.length - 1}
                    >
                      <ChevronRight className="size-5" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white">
                      {imageIndex + 1} / {workout.mediaUrls.length}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="flex aspect-video items-center justify-center bg-primary/5 text-muted-foreground">
                <div className="flex flex-col items-center gap-2">
                  <Dumbbell className="size-6 text-primary" />
                  <p className="text-sm">등록된 인증 미디어가 없습니다</p>
                </div>
              </div>
            )}
          </div>

          {/* 운동 메타 정보 카드 */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="size-3.5" />
                기록 시간
              </p>
              <p className="mt-1 font-semibold">
                {new Date(workout.createdAt).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Timer className="size-3.5" />
                운동 시간
              </p>
              <p className="mt-1 font-semibold">
                {workout.durationMinutes != null ? `${workout.durationMinutes}분` : "-"}
              </p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">세트/횟수/중량</p>
              <p className="mt-1 font-semibold">{formatWorkoutMeta(workout) || "-"}</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="size-3.5" />
                소모 칼로리
              </p>
              <p className="mt-1 font-semibold">
                {workout.caloriesBurned != null ? `${workout.caloriesBurned}kcal` : "-"}
              </p>
            </div>
          </div>

          {/* 운동일지 */}
          {workout.notes?.trim() && (
            <div className="rounded-xl bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">운동일지</p>
              <p className="mt-1 text-sm">{workout.notes}</p>
            </div>
          )}

          {/* 트레이너 피드백 */}
          {workout.trainerFeedback?.trim() && (
            <div className="rounded-xl bg-primary/5 p-3">
              <p className="text-xs text-primary">트레이너 피드백</p>
              <p className="mt-1 text-sm">{workout.trainerFeedback}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function WorkoutDailyList() {
  const today = formatLocalDateValue(new Date())
  const todayDate = new Date(`${today}T00:00:00`)
  const [selectedDate, setSelectedDate] = useState(today)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editWorkout, setEditWorkout] = useState<Workout | undefined>()
  const [workoutToDelete, setWorkoutToDelete] = useState<Workout | undefined>()
  const [detailWorkout, setDetailWorkout] = useState<Workout | undefined>()

  const { data: workouts, isLoading } = useMyWorkouts(selectedDate, selectedDate)
  const deleteWorkout = useDeleteWorkout()
  const { data: profile } = useMyProfile()
  const ensureChatRoom = useEnsureChatRoom()
  const sendChatMessage = useSendChatMessage()

  const totals = (workouts ?? []).reduce(
    (acc, workout) => ({
      duration: acc.duration + (workout.durationMinutes ?? 0),
      calories: acc.calories + (workout.caloriesBurned ?? 0),
      sets: acc.sets + (workout.sets ?? 0),
    }),
    { duration: 0, calories: 0, sets: 0 }
  )

  function handleAdd() {
    setEditWorkout(undefined)
    setFormOpen(true)
  }

  function handleEdit(workout: Workout) {
    setEditWorkout(workout)
    setFormOpen(true)
  }

  function handleConfirmDelete() {
    if (!workoutToDelete) return
    deleteWorkout.mutate(workoutToDelete.id)
    setWorkoutToDelete(undefined)
  }

  async function handleShareToChat(workout: Workout) {
    if (!profile?.trainerId) {
      toast.error("배정된 트레이너가 없어 관리톡으로 공유할 수 없습니다")
      return
    }

    try {
      const room = await ensureChatRoom.mutateAsync(profile.trainerId)
      await sendChatMessage.mutateAsync({
        roomId: room.id,
        type: "workout_share",
        workoutId: workout.id,
      })
      toast.success("운동 인증을 관리톡으로 공유했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "관리톡 공유에 실패했습니다")
    }
  }

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="text-base">일별 운동 기록</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                날짜별 운동일지와 인증 미디어를 관리하세요.
              </p>
            </div>
            <Button size="sm" onClick={handleAdd}>
              <Plus className="size-4" />
              운동 추가
            </Button>
          </div>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button
              aria-label="이전 운동 날짜"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const previous = addDays(new Date(`${selectedDate}T00:00:00`), -1)
                setSelectedDate(formatLocalDateValue(previous))
              }}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger
                render={
                  <Button type="button" variant="outline" className="min-w-52 justify-between font-normal" />
                }
              >
                <span>{formatFullDate(selectedDate)}</span>
                <CalendarDays data-icon="inline-end" />
              </PopoverTrigger>
              <PopoverContent align="center" className="w-auto p-3">
                <Calendar
                  defaultMonth={new Date(`${selectedDate}T00:00:00`)}
                  selected={new Date(`${selectedDate}T00:00:00`)}
                  onSelect={(nextDate) => {
                    if (nextDate > todayDate) return
                    setSelectedDate(formatLocalDateValue(nextDate))
                    setIsDatePickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              aria-label="다음 운동 날짜"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                const next = addDays(new Date(`${selectedDate}T00:00:00`), 1)
                setSelectedDate(formatLocalDateValue(next))
              }}
              disabled={selectedDate >= today}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {workouts && workouts.length > 0 && (
            <div className="grid gap-3 rounded-xl bg-muted p-3 text-center sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">운동 종목</p>
                <p className="text-sm font-semibold">{workouts.length}개</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">총 세트</p>
                <p className="text-sm font-semibold">{totals.sets}세트</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">운동 시간</p>
                <p className="text-sm font-semibold">{totals.duration}분</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">소모 칼로리</p>
                <p className="text-sm font-semibold">{totals.calories}kcal</p>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-28 w-full" />
              ))}
            </div>
          ) : !workouts?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              선택한 날짜에 기록된 운동이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {workouts.map((workout) => (
                <div
                  key={workout.id}
                  className="cursor-pointer rounded-2xl border bg-card p-4"
                  onClick={() => setDetailWorkout(workout)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    {workout.mediaUrls.length > 0 ? (
                      <div className="relative h-40 w-full shrink-0 sm:h-28 sm:w-32">
                        <Image
                          src={workout.mediaUrls[0]}
                          alt={workout.exerciseName}
                          width={192}
                          height={144}
                          className="h-full w-full rounded-xl object-cover"
                          unoptimized
                        />
                        {workout.mediaUrls.length > 1 && (
                          <div className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            +{workout.mediaUrls.length - 1}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex h-40 w-full shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-28 sm:w-32">
                        <Dumbbell className="size-6" />
                        <span className="mt-2 text-xs">미디어 없음</span>
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{workout.exerciseName}</h3>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {formatWorkoutMeta(workout) || "세트, 횟수, 중량 정보 없음"}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="운동 수정"
                            onClick={(e) => { e.stopPropagation(); handleEdit(workout) }}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="운동 삭제"
                            onClick={(e) => { e.stopPropagation(); setWorkoutToDelete(workout) }}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          <Timer className="mr-1 inline size-3" />
                          {workout.durationMinutes != null ? `${workout.durationMinutes}분` : "시간 미입력"}
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1">
                          {workout.caloriesBurned != null
                            ? `${workout.caloriesBurned}kcal`
                            : "칼로리 미입력"}
                        </span>
                      </div>

                      <div className="mt-3 rounded-xl bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">운동일지</p>
                        <p className="mt-1 text-sm">
                          {workout.notes?.trim() || "작성된 운동일지가 없습니다."}
                        </p>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); handleShareToChat(workout) }}
                          disabled={
                            !profile?.trainerId ||
                            ensureChatRoom.isPending ||
                            sendChatMessage.isPending
                          }
                        >
                          <MessagesSquare className="size-3.5" />
                          관리톡 공유
                        </Button>
                        <Link
                          href="/chat"
                          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                          onClick={(e) => e.stopPropagation()}
                        >
                          관리톡 보기
                        </Link>
                      </div>

                      {workout.trainerFeedback?.trim() && (
                        <div className="mt-3 rounded-xl bg-primary/5 p-3">
                          <p className="text-xs text-primary">트레이너 피드백</p>
                          <p className="mt-1 text-sm">{workout.trainerFeedback}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <WorkoutForm
        key={`${editWorkout?.id ?? "new"}-${selectedDate}-${formOpen ? "open" : "closed"}`}
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditWorkout(undefined)
        }}
        editWorkout={editWorkout}
        defaultDate={selectedDate}
      />

      <WorkoutDetailDialog
        key={detailWorkout?.id}
        workout={detailWorkout ?? null}
        open={!!detailWorkout}
        onOpenChange={(open) => {
          if (!open) setDetailWorkout(undefined)
        }}
      />

      <AlertDialog
        open={!!workoutToDelete}
        onOpenChange={(open) => {
          if (!open) setWorkoutToDelete(undefined)
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>운동 기록을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제한 운동 기록과 업로드한 미디어는 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
