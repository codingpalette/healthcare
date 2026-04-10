import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import type { Meal, MealWithProfile } from "@/entities/meal"

import { MealMemberTable } from "./meal-member-table"

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const imageProps = {
      ...(props as React.ImgHTMLAttributes<HTMLImageElement>),
      alt: props.alt as string,
    }

    delete (imageProps as { unoptimized?: unknown }).unoptimized

    return createElement("img", imageProps)
  },
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
    fiber: null,
    photoUrls: ["https://example.com/meal-1.jpg"],
    trainerFeedback: "채소 구성이 좋아요.",
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
    fiber: null,
    photoUrls: [],
    trainerFeedback: null,
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
    fiber: null,
    photoUrls: ["https://example.com/meal-1.jpg"],
    trainerFeedback: "채소 구성이 좋아요.",
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
    fiber: null,
    photoUrls: [],
    trainerFeedback: null,
    createdAt: "2026-03-11T18:30:00+09:00",
    updatedAt: "2026-03-11T18:30:00+09:00",
  },
]

const useTodayMealsMock = vi.fn((date?: string) => ({
  data: date === "2026-03-11" ? previousDayMeals : todayMeals,
  isLoading: false,
}))

const ensureChatRoomMock = vi.fn()
const sendChatMessageMock = vi.fn()
const updateMealFeedbackMock = vi.fn()
const markMealReviewedMock = vi.fn()

vi.mock("@/features/diet", () => ({
  useTodayMeals: (date?: string) => useTodayMealsMock(date),
  useMemberMeals: () => ({
    data: memberMeals,
    isLoading: false,
  }),
  useUpdateMealFeedback: () => ({
    mutateAsync: updateMealFeedbackMock,
    isPending: false,
  }),
  useMarkMealReviewed: () => ({
    mutate: markMealReviewedMock,
    isPending: false,
  }),
}))

vi.mock("@/features/chat", () => ({
  useEnsureChatRoom: () => ({
    mutateAsync: ensureChatRoomMock,
    isPending: false,
  }),
  useSendChatMessage: () => ({
    mutateAsync: sendChatMessageMock,
    isPending: false,
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("MealMemberTable", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-12T12:00:00+09:00"))
    useTodayMealsMock.mockClear()
    ensureChatRoomMock.mockReset()
    ensureChatRoomMock.mockResolvedValue({ id: "room-1" })
    sendChatMessageMock.mockReset()
    sendChatMessageMock.mockResolvedValue(undefined)
    updateMealFeedbackMock.mockReset()
    updateMealFeedbackMock.mockResolvedValue(undefined)
    markMealReviewedMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it("회원 식단 행을 누르면 상세 다이얼로그와 최근 기록을 보여준다", () => {
    render(<MealMemberTable />)

    fireEvent.click(screen.getByText("홍길동"))

    expect(markMealReviewedMock).toHaveBeenCalledWith("meal-1")
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
    vi.advanceTimersByTime(100)
    fireEvent.click(screen.getByRole("button", { name: /March 11/ }))

    expect(useTodayMealsMock).toHaveBeenLastCalledWith("2026-03-11")
    expect(screen.getAllByText("김영희").length).toBeGreaterThan(0)
  })

  it("식단 상세에서 관리톡 피드백 전송을 누르면 식단 첨부 피드백 메시지를 보낸다", async () => {
    render(<MealMemberTable />)

    fireEvent.click(screen.getByText("홍길동"))
    fireEvent.change(
      screen.getByPlaceholderText("예: 단백질 구성이 좋아요. 저녁에는 채소를 조금 더 추가해보세요."),
      { target: { value: "단백질 구성이 좋아요. 저녁엔 채소를 더 추가해보세요." } }
    )
    fireEvent.click(screen.getByRole("button", { name: "관리톡으로 피드백 보내기" }))

    await Promise.resolve()
    await Promise.resolve()

    expect(updateMealFeedbackMock).toHaveBeenCalledWith({
      id: "meal-1",
      trainerFeedback: "단백질 구성이 좋아요. 저녁엔 채소를 더 추가해보세요.",
    })
    expect(ensureChatRoomMock).toHaveBeenCalledWith("member-1")
    expect(sendChatMessageMock).toHaveBeenCalledWith({
      roomId: "room-1",
      type: "feedback",
      content: "단백질 구성이 좋아요. 저녁엔 채소를 더 추가해보세요.",
      mealId: "meal-1",
    })
  })
})
