"use client"

import { useState } from "react"
import { CalendarIcon, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useCreateWorkoutBatch } from "@/features/workout"
import type { WorkoutExerciseInput } from "@/entities/workout"
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

const MAX_ROWS = 8
const INITIAL_ROWS = 4
const SET_COUNT = 6

interface ExerciseRow {
  exerciseName: string
  sets: Array<{ kg: string; reps: string }>
}

function formatDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return new Date()
  return new Date(year, month - 1, day)
}

function formatDateLabel(value: string) {
  return parseDateValue(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
}

function createEmptyRow(): ExerciseRow {
  return {
    exerciseName: "",
    sets: Array.from({ length: SET_COUNT }, () => ({ kg: "", reps: "" })),
  }
}

interface WorkoutJournalFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: string
}

export function WorkoutJournalForm({ open, onOpenChange, defaultDate }: WorkoutJournalFormProps) {
  const today = formatDateValue(new Date())
  const [date, setDate] = useState(defaultDate ?? today)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const [memo, setMemo] = useState("")
  const [rows, setRows] = useState<ExerciseRow[]>(() =>
    Array.from({ length: INITIAL_ROWS }, createEmptyRow)
  )

  const createWorkoutBatch = useCreateWorkoutBatch()
  const isSubmitting = createWorkoutBatch.isPending

  function handleExerciseNameChange(rowIndex: number, value: string) {
    setRows((prev) =>
      prev.map((row, i) => (i === rowIndex ? { ...row, exerciseName: value } : row))
    )
  }

  function handleSetChange(rowIndex: number, setIndex: number, field: "kg" | "reps", value: string) {
    setRows((prev) =>
      prev.map((row, i) =>
        i === rowIndex
          ? {
              ...row,
              sets: row.sets.map((s, si) =>
                si === setIndex ? { ...s, [field]: value } : s
              ),
            }
          : row
      )
    )
  }

  function handleAddRow() {
    if (rows.length >= MAX_ROWS) {
      toast.error(`운동 종목은 최대 ${MAX_ROWS}개까지 추가할 수 있습니다`)
      return
    }
    setRows((prev) => [...prev, createEmptyRow()])
  }

  function handleRemoveRow(rowIndex: number) {
    if (rows.length <= 1) return
    setRows((prev) => prev.filter((_, i) => i !== rowIndex))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // 빈 행(운동명 없음) 제외
    const validExercises: WorkoutExerciseInput[] = rows
      .filter((row) => row.exerciseName.trim())
      .map((row) => ({
        exerciseName: row.exerciseName.trim(),
        sets: row.sets.map((s) => ({
          kg: s.kg ? Number(s.kg) : null,
          reps: s.reps ? Number(s.reps) : null,
        })),
        notes: memo.trim() || undefined,
      }))

    if (validExercises.length === 0) {
      toast.error("운동 종목을 하나 이상 입력해주세요")
      return
    }

    try {
      await createWorkoutBatch.mutateAsync({ exercises: validExercises, date })
      toast.success("운동 일지가 저장되었습니다")
      onOpenChange(false)
      // 폼 초기화
      setRows(Array.from({ length: INITIAL_ROWS }, createEmptyRow))
      setMemo("")
      setDate(today)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "운동 일지 저장에 실패했습니다")
    }
  }

  const selectedDate = parseDateValue(date)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>운동 일지 작성</DialogTitle>
          <DialogDescription>
            운동 종목과 세트별 중량/횟수를 입력하세요. 한번에 저장됩니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 날짜 선택 */}
          <div className="space-y-2">
            <Label htmlFor="journal-date">날짜</Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger
                id="journal-date"
                render={
                  <Button
                    className="w-full justify-between font-normal sm:w-48"
                    type="button"
                    variant="outline"
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
                    setDate(formatDateValue(nextDate))
                    setIsDatePickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* 운동 테이블 - 모바일에서 가로 스크롤 */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-[700px] w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="w-40 px-3 py-2 text-left font-medium text-muted-foreground">
                    운동 종목
                  </th>
                  {Array.from({ length: SET_COUNT }, (_, i) => (
                    <th key={i} className="px-2 py-2 text-center font-medium text-muted-foreground">
                      <span className="text-xs">{i + 1}세트</span>
                      <div className="flex gap-1 justify-center mt-0.5">
                        <span className="text-[10px] text-muted-foreground/70">KG</span>
                        <span className="text-[10px] text-muted-foreground/70">회</span>
                      </div>
                    </th>
                  ))}
                  <th className="w-10 px-2 py-2" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b last:border-0">
                    <td className="px-3 py-2">
                      <Input
                        placeholder="운동명"
                        value={row.exerciseName}
                        onChange={(e) => handleExerciseNameChange(rowIndex, e.target.value)}
                        className="h-8 text-sm"
                      />
                    </td>
                    {row.sets.map((set, setIndex) => (
                      <td key={setIndex} className="px-2 py-2">
                        <div className="flex gap-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.5"
                            placeholder="KG"
                            value={set.kg}
                            onChange={(e) => handleSetChange(rowIndex, setIndex, "kg", e.target.value)}
                            className="h-8 w-14 text-xs"
                          />
                          <Input
                            type="number"
                            min="0"
                            placeholder="회"
                            value={set.reps}
                            onChange={(e) => handleSetChange(rowIndex, setIndex, "reps", e.target.value)}
                            className="h-8 w-14 text-xs"
                          />
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="행 삭제"
                        disabled={rows.length <= 1}
                        onClick={() => handleRemoveRow(rowIndex)}
                      >
                        <Trash2 className="size-3.5 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 행 추가 버튼 */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddRow}
            disabled={rows.length >= MAX_ROWS}
          >
            <Plus className="size-4" />
            종목 추가
          </Button>

          {/* 메모/의견 */}
          <div className="space-y-2">
            <Label htmlFor="journal-memo">메모 / 의견</Label>
            <textarea
              id="journal-memo"
              className="flex min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="오늘 운동에 대한 메모나 의견을 남기세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "저장 중..." : "일지 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
