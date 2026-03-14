import { supabase } from "@/shared/api/supabase"
import type { Device, RegisterDeviceRequest } from "../model/types"

function toDevice(row: Record<string, unknown>): Device {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    deviceFingerprint: row.device_fingerprint as string,
    deviceName: row.device_name as string,
    deviceType: row.device_type as Device["deviceType"],
    browser: row.browser as string,
    os: row.os as string,
    lastActiveAt: row.last_active_at as string,
    createdAt: row.created_at as string,
  }
}

export class DeviceLimitError extends Error {
  devices: Device[]
  constructor(devices: Device[]) {
    super("기기 등록 한도 초과")
    this.name = "DeviceLimitError"
    this.devices = devices
  }
}

/** 내 기기 목록 조회 */
export async function getMyDevices(): Promise<Device[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch("/api/devices", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "기기 목록 조회 실패")
  }

  const rows = await res.json()
  return rows.map(toDevice)
}

/** 기기 등록 */
export async function registerDevice(input: RegisterDeviceRequest): Promise<Device> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch("/api/devices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      ...input,
      sessionId: session.user?.app_metadata?.session_id ?? null,
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    if (err.code === "DEVICE_LIMIT_EXCEEDED") {
      throw new DeviceLimitError(err.devices ?? [])
    }
    throw new Error(err.error ?? "기기 등록 실패")
  }

  const row = await res.json()
  return toDevice(row)
}

/** 내 기기 원격 로그아웃 */
export async function removeMyDevice(deviceId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch(`/api/devices/${deviceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "기기 로그아웃 실패")
  }
}

/** 회원 기기 목록 조회 (트레이너) */
export async function getMemberDevices(userId: string): Promise<Device[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch(`/api/devices/members/${userId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 기기 조회 실패")
  }

  const rows = await res.json()
  return rows.map(toDevice)
}

/** 회원 기기 강제 로그아웃 (트레이너) */
export async function removeMemberDevice(userId: string, deviceId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error("인증이 필요합니다")

  const res = await fetch(`/api/devices/members/${userId}/${deviceId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 기기 강제 로그아웃 실패")
  }
}
