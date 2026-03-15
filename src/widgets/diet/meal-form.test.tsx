import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { MealForm } from "./meal-form"

const { mockCreateMeal, mockUpdateMeal, mockCompressImageToWebP, mockToastError } = vi.hoisted(() => ({
  mockCreateMeal: vi.fn(),
  mockUpdateMeal: vi.fn(),
  mockCompressImageToWebP: vi.fn(),
  mockToastError: vi.fn(),
}))

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

vi.mock("@/shared/lib/media", () => ({
  compressImageToWebP: mockCompressImageToWebP,
}))

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
  },
}))

describe("MealForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:meal-preview"),
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("날짜 버튼 클릭 시 달력이 열린다", () => {
    render(<MealForm open onOpenChange={vi.fn()} defaultDate="2026-03-12" />)

    fireEvent.click(screen.getByRole("button", { name: "날짜" }))

    expect(screen.getByText(/March 2026/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /March 12/ })).toBeInTheDocument()
  })

  it("식단 사진을 업로드 전에 WebP로 압축한다", async () => {
    const compressedFile = new File(["compressed"], "meal.webp", { type: "image/webp" })
    const originalFile = new File(["raw"], "meal.jpg", { type: "image/jpeg" })
    mockCompressImageToWebP.mockResolvedValue(compressedFile)

    render(<MealForm open onOpenChange={vi.fn()} defaultDate="2026-03-12" />)
    const fileInput = document.body.querySelector('input[type="file"]')

    expect(fileInput).not.toBeNull()

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [originalFile],
      },
    })

    await waitFor(() => {
      expect(mockCompressImageToWebP).toHaveBeenCalledWith(originalFile)
    })

    fireEvent.click(screen.getByRole("button", { name: "기록" }))

    await waitFor(() => {
      expect(mockCreateMeal).toHaveBeenCalledWith({
        input: {
          mealType: "lunch",
          description: undefined,
          calories: undefined,
          carbs: undefined,
          protein: undefined,
          fat: undefined,
          date: "2026-03-12",
        },
        photos: [compressedFile],
      })
    })
  })
})
