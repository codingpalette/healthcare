import { describe, it, expect } from "vitest"
import { resolveEmail } from "./resolve-email"

describe("resolveEmail", () => {
  it("@가 없으면 기본 도메인을 붙인다", () => {
    expect(resolveEmail("admin")).toBe("admin@health.app")
  })

  it("@가 있으면 그대로 반환한다", () => {
    expect(resolveEmail("admin@co.com")).toBe("admin@co.com")
  })

  it("앞뒤 공백을 제거한다", () => {
    expect(resolveEmail("  admin  ")).toBe("admin@health.app")
  })

  it("빈 문자열에 도메인을 붙인다", () => {
    expect(resolveEmail("")).toBe("@health.app")
  })

  it("@가 포함된 입력의 공백도 제거한다", () => {
    expect(resolveEmail(" user@example.com ")).toBe("user@example.com")
  })
})
