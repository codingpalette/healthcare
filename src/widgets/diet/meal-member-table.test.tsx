import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import type { Meal, MealWithProfile } from "@/entities/meal"

import { MealMemberTable } from "./meal-member-table"

vi.mock("next/image", () => ({
  default: ({ unoptimized: _unoptimized, ...props }: Record<string, unknown>) => (
    <img {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} alt={props.alt as string} />
  ),
}))

const todayMeals: MealWithProfile[] = [
  {
    id: "meal-1",
    userId: "member-1",
    userName: "홍길동",
    date: "2026-03-12",
    mealType: "lunch",
    description: "닭가슴살 샐러드",
    calories: 420,
    carbs: 18,
    protein: 38,
    fat: 12,
    photoUrl: "https://example.com/meal-1.jpg",
    createdAt: "2026-03-12T12:10:00+09:00",
    updatedAt: "2026-03-12T12:10:00+09:00",
  },
]

const previousDayMeals: MealWithProfile[] = [
  {
    id: "meal-3",
    userId: "member-2",
    userName: "김영희",
    date: "2026-03-11",
    mealType: "dinner",
    description: "연어 샐러드",
    calories: 510,
    carbs: 22,
    protein: 35,
    fat: 28,
    photoUrl: null,
    createdAt: "2026-03-11T18:10:00+09:00",
    updatedAt: "2026-03-11T18:10:00+09:00",
  },
]

const memberMeals: Meal[] = [
  {
    id: "meal-1",
    userId: "member-1",
    date: "2026-03-12",
    mealType: "lunch",
    description: "닭가슴살 샐러드",
    calories: 420,
    carbs: 18,
    protein: 38,
    fat: 12,
    photoUrl: "https://example.com/meal-1.jpg",
    createdAt: "2026-03-12T12:10:00+09:00",
    updatedAt: "2026-03-12T12:10:00+09:00",
  },
  {
    id: "meal-2",
    userId: "member-1",
    date: "2026-03-11",
    mealType: "dinner",
    description: "현미밥과 연어",
    calories: 560,
    carbs: 52,
    protein: 34,
    fat: 20,
    photoUrl: null,
    createdAt: "2026-03-11T18:30:00+09:00",
    updatedAt: "2026-03-11T18:30:00+09:00",
  },
]

const useTodayMealsMock = vi.fn((date?: string) => ({
  data: date === "2026-03-11" ? previousDayMeals : todayMeals,
  isLoading: false,
}))

vi.mock("@/features/diet", () => ({
  useTodayMeals: (date?: string) => useTodayMealsMock(date),
  useMemberMeals: () => ({
    data: memberMeals,
    isLoading: false,
  }),
}))

describe("MealMemberTable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-12T12:00:00+09:00"))
    useTodayMealsMock.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("회원 식단 행을 누르면 상세 다이얼로그와 최근 기록을 보여준다", () => {
    render(<MealMemberTable />)

    fireEvent.click(screen.getByText("홍길동"))

    expect(screen.getByText("홍길동 식단 인증 상세")).toBeInTheDocument()
    expect(screen.getAllByText("닭가슴살 샐러드").length).toBeGreaterThan(0)
    expect(screen.getByText("최근 7일 식단 기록")).toBeInTheDocument()
    expect(screen.getByText("현미밥과 연어")).toBeInTheDocument()
  })

  it("이전 날짜로 이동하면 해당 날짜의 식단 기록을 조회한다", () => {
    render(<MealMemberTable />)

    fireEvent.click(screen.getByRole("button", { name: "이전 식단 날짜" }))

    expect(useTodayMealsMock).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getByText("김영희")).toBeInTheDocument()
  })

  it("달력에서 날짜를 선택하면 해당 날짜의 식단 기록으로 이동한다", () => {
    render(<MealMemberTable />)

    fireEvent.click(screen.getByRole("button", { name: /2026년 3월 12일 목/ }))
    fireEvent.click(screen.getByRole("button", { name: "11" }))

    expect(useTodayMealsMock).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getAllByText("김영희").length).toBeGreaterThan(0)
  })
})
