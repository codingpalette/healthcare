import { describe, it, expect, beforeEach } from "vitest"
import { generateDeviceFingerprint, getStoredDeviceId, storeDeviceId } from "./device-fingerprint"

describe("device-fingerprint", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe("generateDeviceFingerprint", () => {
    it("동일한 환경에서 동일한 fingerprint를 생성한다", () => {
      const fp1 = generateDeviceFingerprint()
      const fp2 = generateDeviceFingerprint()
      expect(fp1).toBe(fp2)
    })

    it("빈 문자열이 아닌 fingerprint를 반환한다", () => {
      const fp = generateDeviceFingerprint()
      expect(fp).toBeTruthy()
      expect(typeof fp).toBe("string")
    })
  })

  describe("storeDeviceId / getStoredDeviceId", () => {
    it("device ID를 저장하고 조회할 수 있다", () => {
      storeDeviceId("test-device-id")
      expect(getStoredDeviceId()).toBe("test-device-id")
    })

    it("저장된 device ID가 없으면 null을 반환한다", () => {
      expect(getStoredDeviceId()).toBeNull()
    })
  })
})
