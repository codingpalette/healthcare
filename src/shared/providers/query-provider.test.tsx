import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { QueryClient, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { QueryProvider } from "./query-provider"

type AuthListener = (event: string, session: { user: { id: string } } | null) => void

const { authListenerRef, getSessionMock, queryClientRef, unsubscribeMock } = vi.hoisted(() => ({
  authListenerRef: { current: null as AuthListener | null },
  getSessionMock: vi.fn(),
  queryClientRef: { current: null as QueryClient | null },
  unsubscribeMock: vi.fn(),
}))

vi.mock("@/shared/api/supabase", () => ({
  supabase: {
    auth: {
      getSession: getSessionMock,
      onAuthStateChange: vi.fn((callback: AuthListener) => {
        authListenerRef.current = callback

        return {
          data: {
            subscription: {
              unsubscribe: unsubscribeMock,
            },
          },
        }
      }),
    },
  },
}))

function QueryClientCapture() {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClientRef.current = queryClient
  }, [queryClient])

  return null
}

describe("QueryProvider", () => {
  beforeEach(() => {
    authListenerRef.current = null
    queryClientRef.current = null
    getSessionMock.mockResolvedValue({
      data: {
        session: {
          user: { id: "user-1" },
        },
      },
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    queryClientRef.current?.clear()
  })

  it("사용자가 바뀌면 기존 쿼리 캐시를 비운다", async () => {
    render(
      <QueryProvider>
        <QueryClientCapture />
      </QueryProvider>
    )

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      queryClientRef.current?.setQueryData(["profile", "me"], { id: "user-1" })
    })

    expect(queryClientRef.current?.getQueryData(["profile", "me"])).toEqual({
      id: "user-1",
    })

    act(() => {
      authListenerRef.current?.("SIGNED_IN", { user: { id: "user-2" } })
    })

    expect(queryClientRef.current?.getQueryData(["profile", "me"])).toBeUndefined()
  })

  it("같은 사용자의 세션 갱신에서는 캐시를 유지한다", async () => {
    render(
      <QueryProvider>
        <QueryClientCapture />
      </QueryProvider>
    )

    await act(async () => {
      await Promise.resolve()
    })

    act(() => {
      queryClientRef.current?.setQueryData(["profile", "me"], { id: "user-1" })
    })

    act(() => {
      authListenerRef.current?.("TOKEN_REFRESHED", { user: { id: "user-1" } })
    })

    expect(queryClientRef.current?.getQueryData(["profile", "me"])).toEqual({
      id: "user-1",
    })
  })
})
