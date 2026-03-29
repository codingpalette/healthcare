import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { EditMemberForm } from "@/widgets/member-management/edit-member-form"
import type { Profile } from "@/entities/user"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockMutate = vi.fn()
const mockChangeRole = vi.fn()
vi.mock("@/features/member-management/model/use-members", () => ({
  useUpdateMember: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useUpdateRole: () => ({
    mutate: mockChangeRole,
    isPending: false,
  }),
}))

const mockMember: Profile = {
  id: "member-1",
  role: "member",
  name: "홍길동",
  email: "hong@health.app",
  phone: "010-1234-5678",
  avatarUrl: null,
  trainerId: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  deletedAt: null,
}

function renderForm(props: { member?: Profile; onSuccess?: () => void } = {}) {
  cleanup()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={qc}>
      <EditMemberForm member={props.member ?? mockMember} currentUserId="current-user" onSuccess={props.onSuccess} />
    </QueryClientProvider>
  )
  const container = result.container
  const getInput = (id: string) => container.querySelector<HTMLInputElement>(`#${id}`)!
  const submitForm = () => fireEvent.submit(container.querySelector("form")!)
  return { ...result, getInput, submitForm }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("EditMemberForm", () => {
  it("기존 값이 pre-fill된다", () => {
    const { getInput } = renderForm()

    expect(getInput("edit-name").value).toBe("홍길동")
    expect(getInput("edit-phone").value).toBe("010-1234-5678")
  })

  it("빈 이름 시 에러 토스트를 표시한다", () => {
    const { getInput, submitForm } = renderForm()

    fireEvent.change(getInput("edit-name"), { target: { value: "  " } })
    submitForm()

    expect(toast.error).toHaveBeenCalledWith("이름을 입력해주세요")
    expect(mockMutate).not.toHaveBeenCalled()
  })

  it("유효한 수정 시 mutate를 호출한다", () => {
    const { getInput, submitForm } = renderForm()

    fireEvent.change(getInput("edit-name"), { target: { value: "김철수" } })
    submitForm()

    expect(mockMutate).toHaveBeenCalledWith(
      {
        memberId: "member-1",
        data: { name: "김철수", phone: "010-1234-5678" },
      },
      expect.any(Object)
    )
  })

  it("성공 시 onSuccess 콜백이 호출된다", async () => {
    const onSuccess = vi.fn()
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess()
    })

    const { getInput, submitForm } = renderForm({ onSuccess })

    fireEvent.change(getInput("edit-name"), { target: { value: "김철수" } })
    submitForm()

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("유저 정보가 수정되었습니다")
    })
  })
})
