import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { Workout, WorkoutWithProfile } from "@/entities/workout"

import { WorkoutMemberTable } from "./workout-member-table"

vi.mock("next/image", () => ({
  default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) => (
    <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} alt={props.alt as string} />
  ),
}))

const todayWorkouts: WorkoutWithProfile[] = [
  {
    id: "workout-1",
    userId: "member-1",
    userName: "홍길동",
    exerciseName: "스쿼트",
    sets: 4,
    reps: 10,
    weight: 80,
    durationMinutes: 55,
    caloriesBurned: 320,
    notes: "마지막 세트가 힘들었습니다.",
    mediaUrl: "https://example.com/workout-1.jpg",
    mediaType: "image",
    trainerFeedback: "호흡을 더 길게 가져가세요.",
    date: "2026-03-12",
    createdAt: "2026-03-12T20:13:00+09:00",
    updatedAt: "2026-03-12T20:13:00+09:00",
  },
]

const previousDayWorkouts: WorkoutWithProfile[] = [
  {
    id: "workout-2",
    userId: "member-2",
    userName: "김영희",
    exerciseName: "런지",
    sets: 3,
    reps: 12,
    weight: 20,
    durationMinutes: 40,
    caloriesBurned: 210,
    notes: "왼쪽 다리에 집중했습니다.",
    mediaUrl: null,
    mediaType: null,
    trainerFeedback: null,
    date: "2026-03-11",
    createdAt: "2026-03-11T18:10:00+09:00",
    updatedAt: "2026-03-11T18:10:00+09:00",
  },
]

const memberWorkouts: Workout[] = [
  {
    id: "workout-1",
    userId: "member-1",
    exerciseName: "스쿼트",
    sets: 4,
    reps: 10,
    weight: 80,
    durationMinutes: 55,
    caloriesBurned: 320,
    notes: "마지막 세트가 힘들었습니다.",
    mediaUrl: "https://example.com/workout-1.jpg",
    mediaType: "image",
    trainerFeedback: "호흡을 더 길게 가져가세요.",
    date: "2026-03-12",
    createdAt: "2026-03-12T20:13:00+09:00",
    updatedAt: "2026-03-12T20:13:00+09:00",
  },
  {
    id: "workout-3",
    userId: "member-1",
    exerciseName: "데드리프트",
    sets: 3,
    reps: 5,
    weight: 100,
    durationMinutes: 35,
    caloriesBurned: 230,
    notes: "허리 각도 유지가 잘 됐습니다.",
    mediaUrl: null,
    mediaType: null,
    trainerFeedback: null,
    date: "2026-03-10",
    createdAt: "2026-03-10T19:05:00+09:00",
    updatedAt: "2026-03-10T19:05:00+09:00",
  },
]

const useTodayWorkoutsMock = vi.fn((date?: string) => ({
  data: date === "2026-03-11" ? previousDayWorkouts : todayWorkouts,
  isLoading: false,
}))

const mutateAsyncMock = vi.fn()

vi.mock("@/features/workout", () => ({
  useTodayWorkouts: (date?: string) => useTodayWorkoutsMock(date),
  useMemberWorkouts: () => ({
    data: memberWorkouts,
    isLoading: false,
  }),
  useUpdateWorkoutFeedback: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}))

describe("WorkoutMemberTable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-12T12:00:00+09:00"))
    useTodayWorkoutsMock.mockClear()
    mutateAsyncMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it("회원 운동 행을 누르면 상세 다이얼로그와 최근 기록을 보여준다", () => {
    render(<WorkoutMemberTable />)

    fireEvent.click(screen.getByText("홍길동"))

    expect(screen.getByText("홍길동 운동 인증 상세")).toBeInTheDocument()
    expect(screen.getAllByText("마지막 세트가 힘들었습니다.").length).toBeGreaterThan(0)
    expect(screen.getByText("최근 7일 운동 기록")).toBeInTheDocument()
    expect(screen.getByText("데드리프트")).toBeInTheDocument()
  })

  it("이전 날짜로 이동하면 해당 날짜의 운동 인증 기록을 조회한다", () => {
    render(<WorkoutMemberTable />)

    fireEvent.click(screen.getByRole("button", { name: "이전 운동 인증 날짜" }))

    expect(useTodayWorkoutsMock).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getByText("김영희")).toBeInTheDocument()
  })

  it("피드백 저장 버튼을 누르면 트레이너 피드백 저장 mutation을 호출한다", () => {
    render(<WorkoutMemberTable />)

    fireEvent.click(screen.getAllByText("홍길동")[0])
    fireEvent.change(
      screen.getByPlaceholderText(/예: 마지막 세트에서 상체가 살짝 흔들려서/),
      { target: { value: "무릎 정렬이 좋아졌습니다." } }
    )
    fireEvent.click(screen.getByRole("button", { name: "피드백 저장" }))

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      id: "workout-1",
      trainerFeedback: "무릎 정렬이 좋아졌습니다.",
    })
  })
})
