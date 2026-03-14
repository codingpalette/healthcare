import { getStoredDeviceId } from "@/shared/lib/device-fingerprint"

/**
 * X-Device-Id 헤더를 자동 포함하는 fetch wrapper
 */
export function fetchWithDevice(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const deviceId = getStoredDeviceId()
  const headers = new Headers(init?.headers)

  if (deviceId) {
    headers.set("X-Device-Id", deviceId)
  }

  return fetch(input, { ...init, headers })
}
