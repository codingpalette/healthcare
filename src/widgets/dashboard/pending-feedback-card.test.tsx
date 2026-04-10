import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { PendingFeedbackCard } from "./pending-feedback-card"

vi.mock("@/features/diet", () => ({
  useTodayMeals: () => ({
    data: [
      { id: "meal-1", reviewedAt: null },
      { id: "meal-2", reviewedAt: "2026-03-12T10:00:00+09:00" },
    ],
    isLoading: false,
  }),
}))

vi.mock("@/features/workout", () => ({
  useTodayWorkouts: () => ({
    data: [{ id: "workout-1", reviewedAt: null }],
    isLoading: false,
  }),
}))

describe("PendingFeedbackCard", () => {
  it("미확인 상태의 오늘 식단과 운동 인증 수를 기준으로 카운트를 보여준다", () => {
    render(<PendingFeedbackCard />)

    expect(screen.getByText("2건")).toBeInTheDocument()
    expect(screen.getAllByText("1건 대기중")).toHaveLength(2)
    expect(screen.getByText("식단과 운동 메뉴에서 회원 인증 내역을 확인할 수 있습니다")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "식단 인증 확인" })).toHaveAttribute("href", "/diet")
    expect(screen.getByRole("link", { name: "운동 인증 확인" })).toHaveAttribute("href", "/workout")
  })
})
