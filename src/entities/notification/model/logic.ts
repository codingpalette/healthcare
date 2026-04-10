const KST_OFFSET = "+09:00"

export function formatKstDate(date: Date) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(date)
}

function getKstAnchorDate(baseDate = new Date()) {
  return new Date(`${formatKstDate(baseDate)}T12:00:00${KST_OFFSET}`)
}

export function getPreviousDateStrings(days: number, baseDate = new Date()) {
  const anchorDate = getKstAnchorDate(baseDate)

  return Array.from({ length: days }, (_, index) => {
    const next = new Date(anchorDate)
    next.setDate(anchorDate.getDate() - (days - index))
    return formatKstDate(next)
  })
}

export function getCurrentMonthKey(baseDate = new Date()) {
  return formatKstDate(baseDate).slice(0, 7)
}

export function getDueDateForMonth(day: number, baseDate = new Date()) {
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  return formatKstDate(new Date(year, month, Math.min(Math.max(day, 1), 28)))
}

export function shouldCreateInbodyReminder(params: {
  measurementDay: number
  enabled: boolean
  hasRecordThisMonth: boolean
  today?: Date
}) {
  if (!params.enabled || params.hasRecordThisMonth) return false

  const dueDate = getDueDateForMonth(params.measurementDay, params.today)
  const today = formatKstDate(params.today ?? new Date())

  return today >= dueDate
}

export function isThreeDayAbsence(attendanceDateSet: Set<string>, today = new Date()) {
  const lastThreeDays = getPreviousDateStrings(3, today)
  return lastThreeDays.every((date) => !attendanceDateSet.has(date))
}
