import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { MealForm } from "./meal-form"

const mockCreateMeal = vi.fn()
const mockUpdateMeal = vi.fn()

vi.mock("@/features/diet", () => ({
  useCreateMeal: () => ({
    mutateAsync: mockCreateMeal,
    isPending: false,
  }),
  useUpdateMeal: () => ({
    mutateAsync: mockUpdateMeal,
    isPending: false,
  }),
}))

describe("MealForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("날짜 버튼 클릭 시 달력이 열린다", () => {
    render(<MealForm open onOpenChange={vi.fn()} defaultDate="2026-03-12" />)

    fireEvent.click(screen.getByRole("button", { name: "날짜" }))

    expect(screen.getByText("2026년 3월")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "12" })).toBeInTheDocument()
  })
})
