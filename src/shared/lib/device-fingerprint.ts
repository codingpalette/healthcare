const DEVICE_ID_KEY = "healthcare_device_id"

/**
 * User-Agent + 화면 정보 기반 기기 fingerprint 생성
 * 같은 브라우저/기기에서는 동일한 값을 반환
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    navigator.language,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ]

  return simpleHash(components.join("|"))
}

/** localStorage에 device ID 저장 */
export function storeDeviceId(deviceId: string): void {
  localStorage.setItem(DEVICE_ID_KEY, deviceId)
}

/** localStorage에서 device ID 조회 */
export function getStoredDeviceId(): string | null {
  return localStorage.getItem(DEVICE_ID_KEY)
}

/** localStorage에서 device ID 삭제 */
export function removeStoredDeviceId(): void {
  localStorage.removeItem(DEVICE_ID_KEY)
}

/** 간단한 해시 함수 (djb2) */
function simpleHash(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}
