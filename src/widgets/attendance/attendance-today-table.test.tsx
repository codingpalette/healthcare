import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { AttendanceWithProfile } from "@/entities/attendance/model/types"

import { AttendanceTodayTable } from "./attendance-today-table"

const todayAttendance: AttendanceWithProfile[] = [
  {
    id: "attendance-1",
    userId: "member-1",
    userName: "홍길동",
    checkInAt: "2026-03-12T08:15:00+09:00",
    checkOutAt: "2026-03-12T09:20:00+09:00",
    createdAt: "2026-03-12T08:15:00+09:00",
  },
]

const previousDayAttendance: AttendanceWithProfile[] = [
  {
    id: "attendance-2",
    userId: "member-2",
    userName: "김영희",
    checkInAt: "2026-03-11T07:45:00+09:00",
    checkOutAt: null,
    createdAt: "2026-03-11T07:45:00+09:00",
  },
]

const useTodayAttendanceMock = vi.fn((date?: string) => ({
  data: date === "2026-03-11" ? previousDayAttendance : todayAttendance,
  isLoading: false,
}))

vi.mock("@/features/attendance", () => ({
  useTodayAttendance: (date?: string) => useTodayAttendanceMock(date),
}))

describe("AttendanceTodayTable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-12T12:00:00+09:00"))
    useTodayAttendanceMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("이전 날짜로 이동하면 해당 날짜의 출석 기록을 조회한다", () => {
    render(<AttendanceTodayTable />)

    fireEvent.click(screen.getByRole("button", { name: "이전 출석 날짜" }))

    expect(useTodayAttendanceMock).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getByText("김영희")).toBeInTheDocument()
    expect(screen.getAllByText("운동 중").length).toBeGreaterThan(0)
  })

  it("달력에서 날짜를 선택하면 해당 날짜의 출석 기록으로 이동한다", () => {
    render(<AttendanceTodayTable />)

    fireEvent.click(screen.getByRole("button", { name: /2026년 3월 12일 목/ }))
    fireEvent.click(screen.getByRole("button", { name: /March 11/ }))

    expect(useTodayAttendanceMock).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getAllByText("김영희").length).toBeGreaterThan(0)
  })
})
