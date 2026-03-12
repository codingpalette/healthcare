"use client"

import { useMemo, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { cn } from "@/shared/lib/utils"
import { Button } from "@/shared/ui/button"

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  )
}

function getMonthDays(month: Date) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()
  const firstDay = new Date(year, monthIndex, 1).getDay()
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - firstDay + 1
    return new Date(year, monthIndex, dayNumber)
  })
}

interface CalendarProps {
  className?: string
  defaultMonth?: Date
  month?: Date
  onMonthChange?: (month: Date) => void
  onSelect?: (date: Date) => void
  selected?: Date
}

export function Calendar({
  className,
  defaultMonth,
  month,
  onMonthChange,
  onSelect,
  selected,
}: CalendarProps) {
  const [internalMonth, setInternalMonth] = useState(() =>
    startOfMonth(defaultMonth ?? selected ?? new Date())
  )

  const currentMonth = month ? startOfMonth(month) : internalMonth
  const today = useMemo(() => new Date(), [])
  const days = useMemo(() => getMonthDays(currentMonth), [currentMonth])

  function changeMonth(offset: number) {
    const nextMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + offset,
      1
    )

    if (!month) {
      setInternalMonth(nextMonth)
    }

    onMonthChange?.(nextMonth)
  }

  return (
    <div className={cn("flex w-[280px] flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <Button
          aria-label="이전 달"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft />
        </Button>
        <p className="text-sm font-medium">
          {currentMonth.toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "long",
          })}
        </p>
        <Button
          aria-label="다음 달"
          size="icon-sm"
          type="button"
          variant="ghost"
          onClick={() => changeMonth(1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((weekday) => (
          <div
            key={weekday}
            className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {weekday}
          </div>
        ))}

        {days.map((day) => {
          const isOutsideMonth = day.getMonth() !== currentMonth.getMonth()
          const isSelected = selected ? isSameDate(day, selected) : false
          const isToday = isSameDate(day, today)

          return (
            <button
              key={`${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`}
              aria-pressed={isSelected}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-sm transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isOutsideMonth && "text-muted-foreground/40",
                isToday && !isSelected && "border border-primary/30",
                isSelected &&
                  "bg-primary font-medium text-primary-foreground hover:bg-primary/90"
              )}
              type="button"
              onClick={() => onSelect?.(day)}
            >
              {day.getDate()}
            </button>
          )
        })}
      </div>
    </div>
  )
}
