import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { Meal } from "@/entities/meal"

import { MealDailyList } from "./meal-daily-list"

const mutateMock = vi.fn()
let mockMeals: Meal[] = []

vi.mock("@/widgets/diet/meal-form", () => ({
  MealForm: () => null,
}))

vi.mock("@/features/diet", () => ({
  useMyMeals: () => ({
    data: mockMeals,
    isLoading: false,
  }),
  useDeleteMeal: () => ({
    mutate: mutateMock,
    isPending: false,
  }),
}))

describe("MealDailyList", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-12T12:00:00+09:00"))
    mockMeals = []
    mutateMock.mockReset()
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it("이전 날짜로 이동한 뒤 다시 오늘까지 앞으로 이동할 수 있다", () => {
    render(<MealDailyList />)

    const previousButton = screen.getByRole("button", { name: "이전 날짜" })
    const nextButton = screen.getByRole("button", { name: "다음 날짜" })

    expect(screen.getByText("2026년 3월 12일 목")).toBeInTheDocument()
    expect(nextButton).toBeDisabled()

    fireEvent.click(previousButton)

    expect(screen.getByText("2026년 3월 11일 수")).toBeInTheDocument()
    expect(nextButton).not.toBeDisabled()

    fireEvent.click(nextButton)

    expect(screen.getByText("2026년 3월 12일 목")).toBeInTheDocument()
    expect(nextButton).toBeDisabled()
  })

  it("삭제 버튼을 누르면 확인 다이얼로그를 거쳐 식단을 삭제한다", () => {
    mockMeals = [
      {
        id: "meal-1",
        userId: "user-1",
        date: "2026-03-12",
        mealType: "lunch",
        description: "닭가슴살 샐러드",
        calories: 420,
        carbs: 18,
        protein: 38,
        fat: 12,
        photoUrl: null,
        createdAt: "2026-03-12T12:00:00+09:00",
        updatedAt: "2026-03-12T12:00:00+09:00",
      },
    ]

    render(<MealDailyList />)

    fireEvent.click(screen.getByRole("button", { name: "식단 삭제" }))

    expect(screen.getByText("식단을 삭제하시겠습니까?")).toBeInTheDocument()
    expect(screen.getByText("삭제한 식단 기록은 복구할 수 없습니다.")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "삭제" }))

    expect(mutateMock).toHaveBeenCalledWith("meal-1")
  })
})
