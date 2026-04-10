import { describe, expect, it } from "vitest"

import {
  formatKstDate,
  getDueDateForMonth,
  getPreviousDateStrings,
  isThreeDayAbsence,
  shouldCreateInbodyReminder,
} from "./logic"

describe("notification logic", () => {
  it("인바디 측정일이 지났고 이번 달 기록이 없으면 알림을 만든다", () => {
    expect(
      shouldCreateInbodyReminder({
        measurementDay: 12,
        enabled: true,
        hasRecordThisMonth: false,
        today: new Date("2026-03-13T09:00:00+09:00"),
      })
    ).toBe(true)

    expect(
      shouldCreateInbodyReminder({
        measurementDay: 20,
        enabled: true,
        hasRecordThisMonth: false,
        today: new Date("2026-03-13T09:00:00+09:00"),
      })
    ).toBe(false)
  })

  it("최근 3일 출석이 없으면 연속 결석으로 판단한다", () => {
    const today = new Date("2026-03-13T09:00:00+09:00")
    const absentSet = new Set<string>()
    const presentSet = new Set<string>([formatKstDate(new Date("2026-03-11T09:00:00+09:00"))])

    expect(getDueDateForMonth(15, today)).toBe("2026-03-15")
    expect(getPreviousDateStrings(3, today)).toEqual(["2026-03-10", "2026-03-11", "2026-03-12"])
    expect(isThreeDayAbsence(absentSet, today)).toBe(true)
    expect(isThreeDayAbsence(presentSet, today)).toBe(false)
  })

  it("KST 자정 직후에도 최근 3일 날짜를 KST 기준으로 계산한다", () => {
    const justAfterMidnightKst = new Date("2026-04-11T00:24:00+09:00")

    expect(getPreviousDateStrings(3, justAfterMidnightKst)).toEqual([
      "2026-04-08",
      "2026-04-09",
      "2026-04-10",
    ])

    const presentSet = new Set<string>(["2026-04-10"])
    expect(isThreeDayAbsence(presentSet, justAfterMidnightKst)).toBe(false)
  })
})
