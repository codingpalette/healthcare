import { describe, it, expect, vi, beforeEach } from "vitest"

// supabase 모킹
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockIs = vi.fn()
const mockOrder = vi.fn()
const mockSingle = vi.fn()
const mockUpdate = vi.fn()
const mockFrom = vi.fn()
const mockGetUser = vi.fn()
const mockGetSession = vi.fn()

vi.mock("@/shared/api/supabase", () => ({
  supabase: {
    from: (...args: unknown[]) => {
      mockFrom(...args)
      return {
        select: (...a: unknown[]) => {
          mockSelect(...a)
          return {
            eq: (...b: unknown[]) => {
              mockEq(...b)
              return {
                is: (...c: unknown[]) => {
                  mockIs(...c)
                  return {
                    order: (...d: unknown[]) => {
                      mockOrder(...d)
                      return { data: [], error: null }
                    },
                  }
                },
                single: () => mockSingle(),
              }
            },
            is: (...c: unknown[]) => {
              mockIs(...c)
              return {
                order: (...d: unknown[]) => {
                  mockOrder(...d)
                  return { data: [], error: null }
                },
              }
            },
            single: () => mockSingle(),
          }
        },
        update: (...a: unknown[]) => {
          mockUpdate(...a)
          return {
            eq: (...b: unknown[]) => {
              mockEq(...b)
              return { data: null, error: null }
            },
          }
        },
      }
    },
    auth: {
      getUser: () => mockGetUser(),
      getSession: () => mockGetSession(),
    },
  },
}))

// fetch 모킹
const mockFetch = vi.fn()
vi.stubGlobal("fetch", mockFetch)

import { getMembers, createMember, updateMemberProfile, updateMyProfile, uploadAvatar } from "./profile-api"

beforeEach(() => {
  vi.clearAllMocks()
  mockGetSession.mockResolvedValue({
    data: { session: { access_token: "test-token" } },
  })
})

describe("getMembers", () => {
  it("API를 통해 회원 목록을 조회한다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([
        {
          id: "1",
          role: "member",
          name: "테스트",
          email: "test@health.app",
          phone: null,
          created_at: "2026-01-01",
          updated_at: "2026-01-01",
          deleted_at: null,
        },
      ]),
    })

    const result = await getMembers()
    expect(mockFetch).toHaveBeenCalledWith("/api/profiles/members", {
      headers: {
        Authorization: "Bearer test-token",
      },
    })
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("테스트")
    expect(result[0].email).toBe("test@health.app")
  })

  it("API 에러 시 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "트레이너만 조회할 수 있습니다" }),
    })

    await expect(getMembers()).rejects.toThrow("트레이너만 조회할 수 있습니다")
  })
})

describe("createMember", () => {
  it("올바른 POST 요청을 보낸다", async () => {
    const memberData = {
      id: "123",
      role: "member",
      name: "테스트",
      phone: "010-1234-5678",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      deleted_at: null,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(memberData),
    })

    const result = await createMember({
      email: "test@test.com",
      password: "123456",
      name: "테스트",
      phone: "010-1234-5678",
    })

    expect(mockFetch).toHaveBeenCalledWith("/api/profiles/members", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({
        email: "test@test.com",
        password: "123456",
        name: "테스트",
        phone: "010-1234-5678",
      }),
    })

    expect(result.name).toBe("테스트")
    expect(result.id).toBe("123")
  })

  it("API 에러 시 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "이미 등록된 이메일입니다" }),
    })

    await expect(
      createMember({
        email: "dup@test.com",
        password: "123456",
        name: "중복",
      })
    ).rejects.toThrow("이미 등록된 이메일입니다")
  })
})

describe("updateMyProfile", () => {
  it("올바른 PATCH 요청을 보낸다", async () => {
    const updatedData = {
      id: "me-id",
      role: "member",
      name: "수정됨",
      phone: "010-9999-9999",
      avatar_url: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
      deleted_at: null,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedData),
    })

    const result = await updateMyProfile({ name: "수정됨", phone: "010-9999-9999" })

    expect(mockFetch).toHaveBeenCalledWith("/api/profiles/me", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ name: "수정됨", phone: "010-9999-9999" }),
    })

    expect(result.name).toBe("수정됨")
  })

  it("API 에러 시 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "프로필 수정에 실패했습니다" }),
    })

    await expect(
      updateMyProfile({ name: "에러" })
    ).rejects.toThrow("프로필 수정에 실패했습니다")
  })
})

describe("uploadAvatar", () => {
  it("FormData로 POST 요청을 보낸다", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ avatarUrl: "https://r2.example.com/avatars/123/img.jpg" }),
    })

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" })
    const result = await uploadAvatar(file)

    expect(mockFetch).toHaveBeenCalledWith("/api/profiles/me/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer test-token",
      },
      body: expect.any(FormData),
    })

    expect(result).toBe("https://r2.example.com/avatars/123/img.jpg")
  })

  it("API 에러 시 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "아바타 업로드에 실패했습니다" }),
    })

    const file = new File(["dummy"], "test.jpg", { type: "image/jpeg" })
    await expect(uploadAvatar(file)).rejects.toThrow("아바타 업로드에 실패했습니다")
  })
})

describe("updateMemberProfile", () => {
  it("올바른 PATCH 요청을 보낸다", async () => {
    const updatedData = {
      id: "123",
      role: "member",
      name: "수정됨",
      phone: null,
      created_at: "2026-01-01",
      updated_at: "2026-01-02",
      deleted_at: null,
    }

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(updatedData),
    })

    const result = await updateMemberProfile("123", { name: "수정됨" })

    expect(mockFetch).toHaveBeenCalledWith("/api/profiles/123", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer test-token",
      },
      body: JSON.stringify({ name: "수정됨" }),
    })

    expect(result.name).toBe("수정됨")
  })

  it("API 에러 시 에러를 던진다", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: "회원 수정에 실패했습니다" }),
    })

    await expect(
      updateMemberProfile("123", { name: "에러" })
    ).rejects.toThrow("회원 수정에 실패했습니다")
  })
})
