import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, fireEvent, waitFor, cleanup } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { AddMemberForm } from "./add-member-form"
import { toast } from "sonner"

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const mockMutate = vi.fn()
vi.mock("@/features/member-management/model/use-members", () => ({
  useCreateMember: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}))

function renderForm(props: { onSuccess?: () => void } = {}) {
  cleanup()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={qc}>
      <AddMemberForm {...props} />
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

describe("AddMemberForm", () => {
  it("폼 필드가 렌더링된다", () => {
    const { getInput, container } = renderForm()

    expect(getInput("email")).toBeInTheDocument()
    expect(getInput("password")).toBeInTheDocument()
    expect(getInput("name")).toBeInTheDocument()
    expect(getInput("phone")).toBeInTheDocument()
    expect(container.querySelector('button[type="submit"]')).toBeInTheDocument()
  })

  it("아이디 입력 시 resolveEmail을 통해 이메일로 변환하여 mutate를 호출한다", () => {
    const { getInput, submitForm } = renderForm()

    fireEvent.change(getInput("email"), { target: { value: "member1" } })
    fireEvent.change(getInput("password"), { target: { value: "123456" } })
    fireEvent.change(getInput("name"), { target: { value: "테스트" } })
    submitForm()

    expect(mockMutate).toHaveBeenCalledWith(
      { email: "member1@health.app", password: "123456", name: "테스트", phone: undefined },
      expect.any(Object)
    )
  })

  it("짧은 비밀번호 시 토스트를 표시한다", () => {
    const { getInput, submitForm } = renderForm()

    fireEvent.change(getInput("email"), { target: { value: "test@test.com" } })
    fireEvent.change(getInput("password"), { target: { value: "123" } })
    fireEvent.change(getInput("name"), { target: { value: "테스트" } })
    submitForm()

    expect(toast.error).toHaveBeenCalledWith("비밀번호는 6자 이상이어야 합니다")
  })

  it("유효한 입력 시 mutate를 호출한다", () => {
    const { getInput, submitForm } = renderForm()

    fireEvent.change(getInput("email"), { target: { value: "test@test.com" } })
    fireEvent.change(getInput("password"), { target: { value: "123456" } })
    fireEvent.change(getInput("name"), { target: { value: "테스트" } })
    submitForm()

    expect(mockMutate).toHaveBeenCalledWith(
      { email: "test@test.com", password: "123456", name: "테스트", phone: undefined },
      expect.any(Object)
    )
  })

  it("성공 시 onSuccess 콜백이 호출된다", async () => {
    const onSuccess = vi.fn()
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess()
    })

    const { getInput, submitForm } = renderForm({ onSuccess })

    fireEvent.change(getInput("email"), { target: { value: "test@test.com" } })
    fireEvent.change(getInput("password"), { target: { value: "123456" } })
    fireEvent.change(getInput("name"), { target: { value: "테스트" } })
    submitForm()

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled()
      expect(toast.success).toHaveBeenCalledWith("유저가 추가되었습니다")
    })
  })
})
