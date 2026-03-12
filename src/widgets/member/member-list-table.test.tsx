import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, fireEvent, cleanup } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { MemberListTable } from "./member-list-table"
import type { Profile } from "@/entities/user"

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

const mockMembers: Profile[] = [
  {
    id: "1",
    role: "member",
    name: "홍길동",
    email: "hong@health.app",
    phone: "010-1111-2222",
    avatarUrl: null,
    trainerId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    deletedAt: null,
  },
  {
    id: "2",
    role: "member",
    name: "김철수",
    email: "kim@example.com",
    phone: "010-3333-4444",
    avatarUrl: null,
    trainerId: null,
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
    deletedAt: null,
  },
  {
    id: "3",
    role: "trainer",
    name: "박트레이너",
    email: "park@health.app",
    phone: "010-5555-6666",
    avatarUrl: null,
    trainerId: null,
    createdAt: "2026-01-03T00:00:00Z",
    updatedAt: "2026-01-03T00:00:00Z",
    deletedAt: null,
  },
]

const mockDeleteMember = vi.fn()

const mockChangeRole = vi.fn()

vi.mock("@/features/member-management", () => ({
  useMembers: () => ({
    data: mockMembers,
    isLoading: false,
  }),
  useMyMembers: () => ({
    data: [],
    isLoading: false,
  }),
  useAssignTrainer: () => ({
    mutate: vi.fn(),
  }),
  useUnassignTrainer: () => ({
    mutate: vi.fn(),
  }),
  useDeleteMember: () => ({
    mutate: mockDeleteMember,
  }),
  useUpdateRole: () => ({
    mutate: mockChangeRole,
  }),
}))

function renderTable(props: { onAdd?: () => void; onEdit?: () => void } = {}) {
  cleanup()
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={qc}>
      <MemberListTable currentUserId="current-user" onAdd={props.onAdd ?? vi.fn()} onEdit={props.onEdit ?? vi.fn()} />
    </QueryClientProvider>
  )
  return result
}

function getCellTexts(container: HTMLElement) {
  const body = container.querySelector('[data-slot="table-body"]')!
  const cells = body.querySelectorAll('[data-slot="table-cell"]')
  return Array.from(cells).map((c) => c.textContent)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("MemberListTable", () => {
  it("회원 목록이 렌더링된다", () => {
    const { container } = renderTable()

    const cellTexts = getCellTexts(container)
    expect(cellTexts).toContain("홍길동")
    expect(cellTexts).toContain("김철수")
    expect(cellTexts).toContain("010-1111-2222")
    expect(cellTexts).toContain("010-3333-4444")
  })

  it("검색 필터가 동작한다", () => {
    const { container } = renderTable()

    const searchInput = container.querySelector<HTMLInputElement>('[data-slot="input"]')!
    fireEvent.change(searchInput, { target: { value: "홍길동" } })

    const cellTexts = getCellTexts(container)
    expect(cellTexts).toContain("홍길동")
    expect(cellTexts).not.toContain("김철수")
  })

  it("회원 추가 버튼 클릭 시 onAdd가 호출된다", () => {
    const onAdd = vi.fn()
    const { container } = renderTable({ onAdd })

    // "회원 추가" 텍스트가 포함된 버튼 찾기
    const buttons = container.querySelectorAll('[data-slot="button"]')
    const addButton = Array.from(buttons).find(
      (btn) => btn.textContent?.includes("유저 추가")
    )!
    fireEvent.click(addButton)
    expect(onAdd).toHaveBeenCalled()
  })

  it("행 클릭 시 onEdit가 호출된다", () => {
    const onEdit = vi.fn()
    const { container } = renderTable({ onEdit })

    const body = container.querySelector('[data-slot="table-body"]')!
    const firstRow = body.querySelector('[data-slot="table-row"]')!
    fireEvent.click(firstRow)
    expect(onEdit).toHaveBeenCalledWith(mockMembers[0])
  })

  it("아이디 컬럼이 렌더링된다 (@health.app 제거)", () => {
    const { container } = renderTable()

    const cellTexts = getCellTexts(container)
    // @health.app 도메인은 제거되어 간편 ID만 표시
    expect(cellTexts).toContain("hong")
    expect(cellTexts).toContain("park")
    // 일반 이메일은 그대로 표시
    expect(cellTexts).toContain("kim@example.com")
  })

  it("권한별 필터가 동작한다 - 회원 필터", () => {
    const { container } = renderTable()

    // "회원" 필터 버튼 클릭
    const buttons = container.querySelectorAll('[data-slot="button"]')
    const memberButton = Array.from(buttons).find(
      (btn) => btn.textContent === "회원"
    )!
    fireEvent.click(memberButton)

    const cellTexts = getCellTexts(container)
    expect(cellTexts).toContain("홍길동")
    expect(cellTexts).toContain("김철수")
    expect(cellTexts).not.toContain("박트레이너")
  })

  it("권한별 필터가 동작한다 - 트레이너 필터", () => {
    const { container } = renderTable()

    const buttons = container.querySelectorAll('[data-slot="button"]')
    const trainerButton = Array.from(buttons).find(
      (btn) => btn.textContent === "트레이너"
    )!
    fireEvent.click(trainerButton)

    const cellTexts = getCellTexts(container)
    expect(cellTexts).toContain("박트레이너")
    expect(cellTexts).not.toContain("홍길동")
    expect(cellTexts).not.toContain("김철수")
  })

  it("아이디로 검색이 가능하다", () => {
    const { container } = renderTable()

    const searchInput = container.querySelector<HTMLInputElement>('[data-slot="input"]')!
    fireEvent.change(searchInput, { target: { value: "hong" } })

    const cellTexts = getCellTexts(container)
    expect(cellTexts).toContain("홍길동")
    expect(cellTexts).not.toContain("김철수")
  })
})
