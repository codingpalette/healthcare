import { describe, expect, it } from "vitest"
import type { InbodyRecord, InbodyReminderSetting } from "./types"

import { buildMonthlyTrendData, getNextReminderDate } from "./inbody-utils"

describe("inbody utils", () => {
  it("다음 측정 알림 날짜를 이번 달 또는 다음 달로 계산한다", () => {
    const setting: InbodyReminderSetting = {
      id: "reminder-1",
      userId: "member-1",
      trainerId: "trainer-1",
      measurementDay: 15,
      enabled: true,
      createdAt: "2026-03-01T00:00:00+09:00",
      updatedAt: "2026-03-01T00:00:00+09:00",
    }

    expect(getNextReminderDate(setting, new Date("2026-03-10T09:00:00+09:00"))).toBe("2026-03-15")
    expect(getNextReminderDate(setting, new Date("2026-03-20T09:00:00+09:00"))).toBe("2026-04-15")
  })

  it("월별 차트 데이터는 각 달의 최신 인바디 기록을 사용한다", () => {
    const records: InbodyRecord[] = [
      {
        id: "record-1",
        userId: "member-1",
        measuredDate: "2026-02-03",
        weight: 70,
        skeletalMuscleMass: 30,
        bodyFatPercentage: 18,
        bodyMassIndex: null,
        bodyFatMass: null,
        memo: null,
        photoUrls: [],
        createdAt: "2026-02-03T09:00:00+09:00",
        updatedAt: "2026-02-03T09:00:00+09:00",
      },
      {
        id: "record-2",
        userId: "member-1",
        measuredDate: "2026-02-28",
        weight: 69.2,
        skeletalMuscleMass: 30.4,
        bodyFatPercentage: 17.4,
        bodyMassIndex: null,
        bodyFatMass: null,
        memo: null,
        photoUrls: [],
        createdAt: "2026-02-28T09:00:00+09:00",
        updatedAt: "2026-02-28T09:00:00+09:00",
      },
    ]

    const trend = buildMonthlyTrendData(records, new Date("2026-03-12T09:00:00+09:00"), 2)

    expect(trend[0].monthKey).toBe("2026-02")
    expect(trend[0].weight).toBe(69.2)
    expect(trend[1].monthKey).toBe("2026-03")
    expect(trend[1].weight).toBeNull()
  })
})
