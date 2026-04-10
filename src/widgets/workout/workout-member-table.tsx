"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Dumbbell,
  Flame,
  MessageSquarePlus,
  MessageSquareText,
  Timer,
} from "lucide-react"
import { ImageGallery } from "@/shared/ui/image-gallery"
import { toast } from "sonner"
import type { Workout, WorkoutWithProfile } from "@/entities/workout"
import {
  useEnsureChatRoom,
  useSendChatMessage,
} from "@/features/chat"
import {
  useMemberWorkouts,
  useMarkWorkoutReviewed,
  useTodayWorkouts,
  useUpdateWorkoutFeedback,
} from "@/features/workout"
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

function formatFullDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  })
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatWorkoutMeta(workout: Workout | WorkoutWithProfile) {
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
  selectedDate,
}: {
  workout: WorkoutWithProfile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedDate: string
}) {
  const historyFrom = formatLocalDateValue(addDays(new Date(`${selectedDate}T00:00:00`), -6))
  const { data: memberWorkouts, isLoading } = useMemberWorkouts(
    workout?.userId ?? "",
    historyFrom,
    selectedDate
  )
  const markWorkoutReviewed = useMarkWorkoutReviewed()
  const updateWorkoutFeedback = useUpdateWorkoutFeedback()
  const ensureChatRoom = useEnsureChatRoom()
  const sendChatMessage = useSendChatMessage()
  const [feedback, setFeedback] = useState(workout?.trainerFeedback ?? "")
  const [hasMarkedReviewed, setHasMarkedReviewed] = useState(false)

  useEffect(() => {
    if (!open || !workout || workout.reviewedAt || hasMarkedReviewed || markWorkoutReviewed.isPending) return
    setHasMarkedReviewed(true)
    markWorkoutReviewed.mutate(workout.id)
  }, [hasMarkedReviewed, markWorkoutReviewed, open, workout])

  async function handleSaveFeedback() {
    if (!workout) return
    const trimmedFeedback = feedback.trim()
    if (!trimmedFeedback) return

    try {
      await updateWorkoutFeedback.mutateAsync({
        id: workout.id,
        trainerFeedback: trimmedFeedback,
      })
      const room = await ensureChatRoom.mutateAsync(workout.userId)
      await sendChatMessage.mutateAsync({
        roomId: room.id,
        type: "feedback",
        content: trimmedFeedback,
        workoutId: workout.id,
      })
      toast.success("운동 피드백을 관리톡으로 전송했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "운동 피드백 전송에 실패했습니다")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{workout?.userName ?? "회원"} 운동 인증 상세</DialogTitle>
          <DialogDescription>
            선택한 운동 기록과 최근 7일 운동 이력, 트레이너 피드백을 확인할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        {!workout ? null : (
          <div className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <ImageGallery
                urls={workout.mediaUrls}
                alt={`${workout.userName} 운동 인증 사진`}
                emptyIcon={<Dumbbell className="size-6 text-primary" />}
                emptyText="등록된 운동 인증 미디어가 없습니다"
              />

              <div className="space-y-3 rounded-2xl bg-muted/50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{workout.exerciseName}</h3>
                  {workout.mediaUrls.length > 0 && (
                    <Badge variant="secondary">
                      사진{workout.mediaUrls.length > 1 ? ` ${workout.mediaUrls.length}장` : ""}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-background p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      기록 시간
                    </p>
                    <p className="mt-1 font-semibold">{formatTime(workout.createdAt)}</p>
                  </div>
                  <div className="rounded-xl bg-background p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="size-3.5" />
                      운동 시간
                    </p>
                    <p className="mt-1 font-semibold">
                      {workout.durationMinutes != null ? `${workout.durationMinutes}분` : "-"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-background p-3">
                    <p className="text-xs text-muted-foreground">세트/횟수/중량</p>
                    <p className="mt-1 font-semibold">{formatWorkoutMeta(workout) || "-"}</p>
                  </div>
                  <div className="rounded-xl bg-background p-3">
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Flame className="size-3.5" />
                      소모 칼로리
                    </p>
                    <p className="mt-1 font-semibold">
                      {workout.caloriesBurned != null ? `${workout.caloriesBurned}kcal` : "-"}
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-background p-3">
                  <p className="text-xs text-muted-foreground">회원 운동일지</p>
                  <p className="mt-1 text-sm">
                    {workout.notes?.trim() || "작성된 운동일지가 없습니다."}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <MessageSquareText className="size-4 text-primary" />
                  <div>
                    <h3 className="font-medium">트레이너 피드백</h3>
                    <p className="text-sm text-muted-foreground">
                      회원이 다음 운동 때 참고할 코멘트를 남겨주세요.
                    </p>
                  </div>
                </div>
                <Link
                  href="/chat"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  관리톡 보기
                </Link>
              </div>
              <textarea
                className="mt-3 flex min-h-[110px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="예: 마지막 세트에서 상체가 살짝 흔들려서 다음엔 복압 유지에 더 집중해보세요."
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
              />
              <div className="mt-4 flex justify-end">
                <Button
                  onClick={handleSaveFeedback}
                  disabled={
                    !feedback.trim() ||
                    updateWorkoutFeedback.isPending ||
                    ensureChatRoom.isPending ||
                    sendChatMessage.isPending
                  }
                >
                  <MessageSquarePlus className="size-4" />
                  {updateWorkoutFeedback.isPending || ensureChatRoom.isPending || sendChatMessage.isPending
                    ? "전송 중..."
                    : "저장하고 관리톡 보내기"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div>
                <h3 className="font-medium">최근 7일 운동 기록</h3>
                <p className="text-sm text-muted-foreground">
                  같은 회원의 최근 운동 이력과 피드백 상태를 함께 확인할 수 있습니다.
                </p>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full" />
                  ))}
                </div>
              ) : !memberWorkouts?.length ? (
                <p className="rounded-xl bg-muted/50 px-4 py-6 text-center text-sm text-muted-foreground">
                  최근 7일 동안 등록된 운동 기록이 없습니다.
                </p>
              ) : (
                <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                  {memberWorkouts.map((memberWorkout) => (
                    <div key={memberWorkout.id} className="rounded-xl bg-muted/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{memberWorkout.exerciseName}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatFullDate(memberWorkout.date)} · {formatTime(memberWorkout.createdAt)}
                          </p>
                        </div>
                        {memberWorkout.trainerFeedback?.trim() ? (
                          <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                            피드백 완료
                          </Badge>
                        ) : (
                          <Badge variant="secondary">피드백 전</Badge>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatWorkoutMeta(memberWorkout) || "세트/횟수/중량 정보 없음"}
                        {memberWorkout.durationMinutes != null && ` · ${memberWorkout.durationMinutes}분`}
                        {memberWorkout.caloriesBurned != null && ` · ${memberWorkout.caloriesBurned}kcal`}
                      </p>
                      <p className="mt-2 text-sm">
                        {memberWorkout.notes?.trim() || "작성된 운동일지가 없습니다."}
                      </p>
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

export function WorkoutMemberTable() {
  const today = formatLocalDateValue(new Date())
  const todayDate = new Date(`${today}T00:00:00`)
  const [selectedDate, setSelectedDate] = useState(today)
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutWithProfile | null>(null)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const { data: workouts, isLoading } = useTodayWorkouts(selectedDate)

  return (
    <>
      <Card className="border-0 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Dumbbell className="size-4 text-primary" />
                </div>
                회원 운동 인증
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                회원 운동 행을 눌러 인증 미디어와 운동일지, 트레이너 피드백을 확인하세요.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                aria-label="이전 운동 인증 날짜"
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
                <PopoverContent align="end" className="w-auto p-3">
                  <Calendar
                    mode="single"
                    defaultMonth={new Date(`${selectedDate}T00:00:00`)}
                    selected={new Date(`${selectedDate}T00:00:00`)}
                    onSelect={(nextDate: Date | undefined) => {
                      if (!nextDate || nextDate > todayDate) return
                      setSelectedDate(formatLocalDateValue(nextDate))
                      setIsDatePickerOpen(false)
                    }}
                  />
                </PopoverContent>
              </Popover>
              <Button
                aria-label="다음 운동 인증 날짜"
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
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : !workouts?.length ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              선택한 날짜에 등록된 운동 인증이 없습니다
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>회원</TableHead>
                  <TableHead>운동명</TableHead>
                  <TableHead>세트/횟수</TableHead>
                  <TableHead>운동 시간</TableHead>
                  <TableHead>칼로리</TableHead>
                  <TableHead>기록 시간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workouts.map((workout) => (
                  <TableRow
                    key={workout.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedWorkout(workout)}
                  >
                    <TableCell className="font-medium">{workout.userName}</TableCell>
                    <TableCell>{workout.exerciseName}</TableCell>
                    <TableCell>{formatWorkoutMeta(workout) || "-"}</TableCell>
                    <TableCell>
                      {workout.durationMinutes != null ? `${workout.durationMinutes}분` : "-"}
                    </TableCell>
                    <TableCell>
                      {workout.caloriesBurned != null ? `${workout.caloriesBurned}kcal` : "-"}
                    </TableCell>
                    <TableCell>{formatTime(workout.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WorkoutDetailDialog
        key={selectedWorkout?.id}
        workout={selectedWorkout}
        open={!!selectedWorkout}
        onOpenChange={(open) => {
          if (!open) setSelectedWorkout(null)
        }}
        selectedDate={selectedDate}
      />
    </>
  )
}
