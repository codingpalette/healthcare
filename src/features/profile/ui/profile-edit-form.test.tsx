import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

// hooks 모킹
const mockMutate = vi.fn()
const mockUploadMutate = vi.fn()

vi.mock("@/features/profile/model/use-profile", () => ({
  useMyProfile: () => ({
    data: {
      id: "user-1",
      role: "member" as const,
      name: "테스트유저",
      email: "test@test.com",
      phone: "010-1234-5678",
      avatarUrl: null,
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
      deletedAt: null,
    },
    isLoading: false,
  }),
  useUpdateMyProfile: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useUploadAvatar: () => ({
    mutate: mockUploadMutate,
    isPending: false,
  }),
}))

import { ProfileEditForm } from "./profile-edit-form"

function renderForm() {
  cleanup()
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <ProfileEditForm />
    </QueryClientProvider>
  )
  const getInput = (id: string) =>
    result.container.querySelector<HTMLInputElement>(`#${id}`)!
  return { ...result, getInput }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("ProfileEditForm", () => {
  it("프로필 정보가 pre-fill 된다", () => {
    const { getInput } = renderForm()

    expect(getInput("profile-name").value).toBe("테스트유저")
    expect(getInput("profile-phone").value).toBe("010-1234-5678")
    expect(getInput("profile-email").value).toBe("test@test.com")
    expect(getInput("profile-role").value).toBe("회원")
  })

  it("이름 빈값 시 저장하면 mutate가 호출되지 않는다", async () => {
    const user = userEvent.setup()
    const { getInput, container } = renderForm()

    const nameInput = getInput("profile-name")
    await user.clear(nameInput)

    const form = container.querySelector("form")!
    await user.click(form.querySelector('button[type="submit"]')!)

    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("저장 시 mutation이 호출된다", async () => {
    const user = userEvent.setup()
    const { getInput, container } = renderForm()

    const nameInput = getInput("profile-name")
    await user.clear(nameInput)
    await user.type(nameInput, "새이름")

    const form = container.querySelector("form")!
    await user.click(form.querySelector('button[type="submit"]')!)

    expect(mockMutate).toHaveBeenCalledWith(
      { name: "새이름", phone: "010-1234-5678" },
      expect.any(Object)
    )
  })

  it("아바타 업로드 영역이 존재한다", () => {
    const { container } = renderForm()

    expect(container.querySelector('input[type="file"]')).toBeInTheDocument()
    expect(container.querySelector('input[accept="image/*"]')).toBeInTheDocument()
  })

  it("이메일과 권한 필드가 비활성화 상태이다", () => {
    const { getInput } = renderForm()

    expect(getInput("profile-email")).toBeDisabled()
    expect(getInput("profile-role")).toBeDisabled()
  })
})
