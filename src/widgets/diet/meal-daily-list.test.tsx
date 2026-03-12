import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { Meal } from "@/entities/meal"

import { MealDailyList } from "./meal-daily-list"

const mutateMock = vi.fn()
let mockMeals: Meal[] = []

vi.mock("@/widgets/diet/meal-form", () => ({
  MealForm: () => null,
}))

vi.mock("@/features/profile", () => ({
  useMyProfile: () => ({
    data: { trainerId: "trainer-1" },
  }),
}))

vi.mock("@/features/chat", () => ({
  useEnsureChatRoom: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useSendChatMessage: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
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
        trainerFeedback: null,
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

  it("트레이너 피드백이 있으면 식단 카드에 표시한다", () => {
    mockMeals = [
      {
        id: "meal-2",
        userId: "user-1",
        date: "2026-03-12",
        mealType: "dinner",
        description: "파스타",
        calories: 520,
        carbs: 62,
        protein: 22,
        fat: 18,
        photoUrl: null,
        trainerFeedback: "저녁에는 단백질을 조금 더 챙겨보세요.",
        createdAt: "2026-03-12T19:00:00+09:00",
        updatedAt: "2026-03-12T19:00:00+09:00",
      },
    ]

    render(<MealDailyList />)

    expect(screen.getByText("트레이너 피드백")).toBeInTheDocument()
    expect(screen.getByText("저녁에는 단백질을 조금 더 챙겨보세요.")).toBeInTheDocument()
  })
})
