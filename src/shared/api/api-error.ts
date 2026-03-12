// API 에러 통일 클래스
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message)
    this.name = "ApiError"
  }
}

// Supabase 에러를 ApiError로 변환
export function handleApiError(error: unknown): ApiError {
  // Supabase 에러 형태
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    "message" in error
  ) {
    const e = error as { message: string; code: string; status?: number }
    return new ApiError(
      e.message,
      e.status ?? 500,
      e.code
    )
  }

  // Response 에러 (Hono 등)
  if (error instanceof Response) {
    return new ApiError(
      error.statusText || "요청 처리 중 오류가 발생했습니다",
      error.status
    )
  }

  // 일반 Error
  if (error instanceof Error) {
    return new ApiError(error.message, 500)
  }

  return new ApiError("알 수 없는 오류가 발생했습니다", 500)
}
