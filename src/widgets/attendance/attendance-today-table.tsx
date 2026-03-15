"use client"

import { useState } from "react"
import { CalendarCheck, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"

import {
  Badge,
  Button,
  Calendar,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui"
import { useTodayAttendance } from "@/features/attendance"

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

function formatDuration(start: string, end?: string | null): string {
  if (!end) return "운동 중"
  const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
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

export function AttendanceTodayTable() {
  const today = formatLocalDateValue(new Date())
  const todayDate = new Date(`${today}T00:00:00`)
  const [selectedDate, setSelectedDate] = useState(today)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)
  const { data: attendance, isLoading } = useTodayAttendance(selectedDate)

  const goToPreviousDate = () => {
    setSelectedDate(formatLocalDateValue(addDays(new Date(`${selectedDate}T00:00:00`), -1)))
  }

  const goToNextDate = () => {
    setSelectedDate(formatLocalDateValue(addDays(new Date(`${selectedDate}T00:00:00`), 1)))
  }

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="rounded-lg bg-primary/10 p-2">
                <CalendarCheck className="size-4 text-primary" />
              </div>
              회원 출석 현황
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              날짜를 바꿔 회원들의 출석 기록을 확인할 수 있습니다.
            </p>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              aria-label="이전 출석 날짜"
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
                    setSelectedDate(formatLocalDateValue(nextDate))
                    setIsDatePickerOpen(false)
                  }}
                />
              </PopoverContent>
            </Popover>
            <Button
              aria-label="다음 출석 날짜"
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
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : !attendance?.length ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            선택한 날짜에 출석 기록이 없습니다
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>회원</TableHead>
                <TableHead>체크인</TableHead>
                <TableHead>체크아웃</TableHead>
                <TableHead>운동 시간</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell className="font-medium">{record.userName}</TableCell>
                  <TableCell>{formatTime(record.checkInAt)}</TableCell>
                  <TableCell>{record.checkOutAt ? formatTime(record.checkOutAt) : "-"}</TableCell>
                  <TableCell>{formatDuration(record.checkInAt, record.checkOutAt)}</TableCell>
                  <TableCell>
                    {record.checkOutAt ? (
                      <Badge variant="secondary">완료</Badge>
                    ) : (
                      <Badge className="bg-primary/10 text-primary">운동 중</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
