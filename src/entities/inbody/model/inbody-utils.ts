import type { InbodyRecord, InbodyReminderSetting } from "./types"

export function formatLocalDateValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

export function parseDateValue(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export function getMonthRange(baseDate = new Date(), monthsBack = 11) {
  const from = new Date(baseDate.getFullYear(), baseDate.getMonth() - monthsBack, 1)
  const to = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0)

  return {
    from: formatLocalDateValue(from),
    to: formatLocalDateValue(to),
  }
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

export interface InbodyTrendPoint {
  monthKey: string
  label: string
  weight: number | null
  skeletalMuscleMass: number | null
  bodyFatPercentage: number | null
  record: InbodyRecord | null
}

export function buildMonthlyTrendData(
  records: InbodyRecord[],
  baseDate = new Date(),
  months = 6
): InbodyTrendPoint[] {
  const latestByMonth = new Map<string, InbodyRecord>()

  for (const record of records) {
    const monthKey = record.measuredDate.slice(0, 7)
    const current = latestByMonth.get(monthKey)
    if (
      !current ||
      record.measuredDate > current.measuredDate ||
      (record.measuredDate === current.measuredDate && record.createdAt > current.createdAt)
    ) {
      latestByMonth.set(monthKey, record)
    }
  }

  return Array.from({ length: months }, (_, index) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - (months - index - 1), 1)
    const monthKey = getMonthKey(date)
    const record = latestByMonth.get(monthKey) ?? null

    return {
      monthKey,
      label: `${date.getMonth() + 1}월`,
      weight: record?.weight ?? null,
      skeletalMuscleMass: record?.skeletalMuscleMass ?? null,
      bodyFatPercentage: record?.bodyFatPercentage ?? null,
      record,
    }
  })
}

export function getNextReminderDate(setting: InbodyReminderSetting, baseDate = new Date()) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = setting.measurementDay
  const thisMonthDate = new Date(year, month, Math.min(day, 28))

  if (formatLocalDateValue(baseDate) <= formatLocalDateValue(thisMonthDate)) {
    return formatLocalDateValue(thisMonthDate)
  }

  return formatLocalDateValue(new Date(year, month + 1, Math.min(day, 28)))
}

export function formatReminderText(setting: InbodyReminderSetting | null) {
  if (!setting || !setting.enabled) {
    return "측정 알림이 설정되지 않았습니다."
  }

  return `매월 ${setting.measurementDay}일에 인바디 측정을 확인합니다.`
}
