"use client"

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query"
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"
import { useEffect, useRef, useState } from "react"

import { supabase } from "@/shared/api/supabase"

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  })
}

let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (typeof window === "undefined") {
    // 서버: 항상 새 클라이언트 생성
    return makeQueryClient()
  }
  // 브라우저: 싱글톤 패턴
  if (!browserQueryClient) browserQueryClient = makeQueryClient()
  return browserQueryClient
}

function AuthSessionSync() {
  const queryClient = useQueryClient()
  const currentUserIdRef = useRef<string | null | undefined>(undefined)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      currentUserIdRef.current = data.session?.user.id ?? null
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user.id ?? null

      if (
        currentUserIdRef.current !== undefined &&
        currentUserIdRef.current !== nextUserId
      ) {
        queryClient.clear()
      }

      currentUserIdRef.current = nextUserId
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [queryClient])

  return null
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(getQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      <AuthSessionSync />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
