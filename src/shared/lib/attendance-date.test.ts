import { describe, expect, it } from "vitest"
import {
  formatKstDate,
  getAutoCheckoutAt,
  getKstDateRange,
  getKstMonthRange,
  getTodayKstDateString,
} from "./attendance-date"

describe("attendance-date", () => {
  it("UTC 경계를 넘어도 KST 날짜를 올바르게 계산한다", () => {
    const date = new Date("2026-04-09T15:30:00.000Z")

    expect(formatKstDate(date)).toBe("2026-04-10")
    expect(getTodayKstDateString(date)).toBe("2026-04-10")
  })

  it("KST 하루 범위를 ISO 문자열로 반환한다", () => {
    expect(getKstDateRange("2026-04-10")).toEqual({
      start: "2026-04-09T15:00:00.000Z",
      end: "2026-04-10T14:59:59.999Z",
    })
  })

  it("미체크아웃 기록은 체크인한 날의 23시 59분 59초로 자동 종료한다", () => {
    expect(getAutoCheckoutAt("2026-04-10T08:15:00+09:00")).toBe("2026-04-10T14:59:59.000Z")
  })

  it("월 조회 기본 범위도 KST 기준으로 계산한다", () => {
    expect(getKstMonthRange(new Date("2026-02-28T15:30:00.000Z"))).toEqual({
      from: "2026-02-28T15:00:00.000Z",
      to: "2026-03-31T14:59:59.999Z",
    })
  })
})
