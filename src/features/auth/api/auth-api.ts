// ua-parser-js는 export= 방식의 CJS 모듈이므로 UAParser 함수를 직접 참조
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { UAParser } = require("ua-parser-js") as { UAParser: typeof import("ua-parser-js").UAParser }
import { supabase } from "@/shared/api/supabase"
import type { UserRole } from "@/entities/user"
import type { RegisterDeviceRequest } from "@/entities/device"

interface SignUpParams {
  email: string
  password: string
  name: string
  role: UserRole
}

interface SignInParams {
  email: string
  password: string
}

export async function signUp({ email, password, name, role }: SignUpParams) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, role },
    },
  })

  if (error) throw error
  return data
}

export async function signIn({ email, password }: SignInParams) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/** User-Agent에서 기기 정보 파싱 */
export function parseDeviceInfo(): Omit<RegisterDeviceRequest, "deviceFingerprint"> {
  const parser = new UAParser()
  const result = parser.getResult()

  const os = result.os.name ?? "Unknown OS"
  const browser = result.browser.name ?? "Unknown Browser"
  const deviceType = result.device.type === "mobile"
    ? "mobile" as const
    : result.device.type === "tablet"
      ? "tablet" as const
      : "desktop" as const

  const deviceName = result.device.model
    ? `${result.device.vendor ?? ""} ${result.device.model}`.trim()
    : `${os} ${browser}`

  return { deviceName, deviceType, browser, os }
}
