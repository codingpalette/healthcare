import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { PendingFeedbackCard } from "./pending-feedback-card"

vi.mock("@/features/diet", () => ({
  useTodayMeals: () => ({
    data: [
      { id: "meal-1" },
      { id: "meal-2" },
    ],
    isLoading: false,
  }),
}))

vi.mock("@/features/workout", () => ({
  useTodayWorkouts: () => ({
    data: [{ id: "workout-1" }],
    isLoading: false,
  }),
}))

describe("PendingFeedbackCard", () => {
  it("오늘 식단과 운동 인증 수를 기준으로 미확인 카운트를 보여준다", () => {
    render(<PendingFeedbackCard />)

    expect(screen.getByText("3건")).toBeInTheDocument()
    expect(screen.getByText("2건 대기중")).toBeInTheDocument()
    expect(screen.getByText("1건 대기중")).toBeInTheDocument()
    expect(screen.getByText("식단과 운동 메뉴에서 회원 인증 내역을 확인할 수 있습니다")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "식단 인증 확인" })).toHaveAttribute("href", "/diet")
    expect(screen.getByRole("link", { name: "운동 인증 확인" })).toHaveAttribute("href", "/workout")
  })
})
