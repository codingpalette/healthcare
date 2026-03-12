import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { MealDailyList } from "./meal-daily-list"

vi.mock("@/widgets/diet/meal-form", () => ({
  MealForm: () => null,
}))

vi.mock("@/features/diet", () => ({
  useMyMeals: () => ({
    data: [],
    isLoading: false,
  }),
  useDeleteMeal: () => ({
    mutate: vi.fn(),
  }),
}))

describe("MealDailyList", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-12T12:00:00+09:00"))
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
})
