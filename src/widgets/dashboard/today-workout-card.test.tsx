import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"

import { TodayWorkoutCard } from "./today-workout-card"

vi.mock("@/features/workout", () => ({
  useMyWorkouts: () => ({
    data: [
      {
        id: "workout-1",
        caloriesBurned: 320,
        durationMinutes: 55,
        sets: 4,
      },
      {
        id: "workout-2",
        caloriesBurned: 180,
        durationMinutes: 25,
        sets: 3,
      },
    ],
  }),
}))

describe("TodayWorkoutCard", () => {
  it("오늘 운동 기록 합계를 카드에 보여준다", () => {
    render(<TodayWorkoutCard />)

    expect(screen.getByText("500")).toBeInTheDocument()
    expect(screen.getByText("80")).toBeInTheDocument()
    expect(screen.getByText("7")).toBeInTheDocument()
    expect(screen.getByText("2개의 운동 기록이 있습니다")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "운동 기록하기" })).toHaveAttribute("href", "/workout")
  })
})
