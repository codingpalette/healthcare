"use client"

import { CalendarCheck } from "lucide-react"

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
import { useTodayAttendance } from "@/features/attendance"

// 운동 시간 계산
function formatDuration(start: string, end?: string | null): string {
  if (!end) return "운동 중"
  const diff = Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 1000)
  const hours = Math.floor(diff / 3600)
  const minutes = Math.floor((diff % 3600) / 60)
  if (hours > 0) return `${hours}시간 ${minutes}분`
  return `${minutes}분`
}

// 시간만 표시
function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AttendanceTodayTable() {
  const { data: attendance, isLoading } = useTodayAttendance()

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="rounded-lg bg-primary/10 p-2">
            <CalendarCheck className="size-4 text-primary" />
          </div>
          오늘 출석 현황
        </CardTitle>
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
            오늘 출석 기록이 없습니다
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
                  <TableCell>
                    {record.checkOutAt ? formatTime(record.checkOutAt) : "-"}
                  </TableCell>
                  <TableCell>
                    {formatDuration(record.checkInAt, record.checkOutAt)}
                  </TableCell>
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
