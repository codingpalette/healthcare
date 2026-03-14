import { createElement } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"

import { WorkoutForm } from "./workout-form"

const { mockCreateWorkout, mockUpdateWorkout, mockCompressImageToWebP, mockToastError } = vi.hoisted(
  () => ({
    mockCreateWorkout: vi.fn(),
    mockUpdateWorkout: vi.fn(),
    mockCompressImageToWebP: vi.fn(),
    mockToastError: vi.fn(),
  })
)

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

vi.mock("@/features/workout", () => ({
  useCreateWorkout: () => ({
    mutateAsync: mockCreateWorkout,
    isPending: false,
  }),
  useUpdateWorkout: () => ({
    mutateAsync: mockUpdateWorkout,
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

describe("WorkoutForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(URL, "createObjectURL", {
      writable: true,
      value: vi.fn(() => "blob:workout-preview"),
    })
    Object.defineProperty(URL, "revokeObjectURL", {
      writable: true,
      value: vi.fn(),
    })
  })

  afterEach(() => {
    cleanup()
  })

  it("수정 모드에서 미디어를 삭제하면 제거 상태로 저장한다", async () => {
    render(
      <WorkoutForm
        open
        onOpenChange={vi.fn()}
        editWorkout={{
          id: "workout-1",
          userId: "user-1",
          exerciseName: "바벨 스쿼트",
          sets: 4,
          reps: 10,
          weight: 80,
          durationMinutes: 20,
          caloriesBurned: 350,
          notes: "무척이나 힘듦",
          mediaUrls: ["https://example.com/workout.jpg"],
          trainerFeedback: null,
          date: "2026-03-12",
          createdAt: "2026-03-12T08:00:00+09:00",
          updatedAt: "2026-03-12T08:00:00+09:00",
        }}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "사진 1 삭제" }))

    expect(screen.queryByAltText("운동 인증 사진 1")).not.toBeInTheDocument()
    expect(screen.getByText("운동 사진을 업로드하세요")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "운동 수정" }))

    await waitFor(() => {
      expect(mockUpdateWorkout).toHaveBeenCalledWith({
        id: "workout-1",
        input: {
          exerciseName: "바벨 스쿼트",
          sets: 4,
          reps: 10,
          weight: 80,
          durationMinutes: 20,
          caloriesBurned: 350,
          notes: "무척이나 힘듦",
          date: "2026-03-12",
        },
        photos: undefined,
        existingMediaUrls: [],
      })
    })
  })

  it("운동 동영상 파일은 업로드하지 않는다", async () => {
    render(<WorkoutForm open onOpenChange={vi.fn()} defaultDate="2026-03-12" />)

    const fileInput = document.body.querySelector('input[type="file"]')

    expect(fileInput).not.toBeNull()

    fireEvent.change(fileInput as HTMLInputElement, {
      target: {
        files: [new File(["video"], "workout.mp4", { type: "video/mp4" })],
      },
    })

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("운동 인증은 사진만 업로드할 수 있습니다")
    })

    expect(mockCompressImageToWebP).not.toHaveBeenCalled()
    expect(screen.queryByAltText("운동 인증 미리보기")).not.toBeInTheDocument()
  })
})
