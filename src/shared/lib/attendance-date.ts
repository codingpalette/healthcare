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

export function getTodayKstDateString(baseDate = new Date()) {
  return formatKstDate(baseDate)
}

export function getKstDateRange(date: string) {
  return {
    start: new Date(`${date}T00:00:00${KST_OFFSET}`).toISOString(),
    end: new Date(`${date}T23:59:59.999${KST_OFFSET}`).toISOString(),
  }
}

export function getKstMonthRange(baseDate = new Date()) {
  const [year, month] = formatKstDate(baseDate).split("-").map(Number)
  const monthLabel = String(month).padStart(2, "0")
  const lastDay = new Date(year, month, 0).getDate()

  return {
    from: new Date(`${year}-${monthLabel}-01T00:00:00${KST_OFFSET}`).toISOString(),
    to: new Date(`${year}-${monthLabel}-${String(lastDay).padStart(2, "0")}T23:59:59.999${KST_OFFSET}`).toISOString(),
  }
}

export function getAutoCheckoutAt(checkInAt: string) {
  return new Date(`${formatKstDate(new Date(checkInAt))}T23:59:59${KST_OFFSET}`).toISOString()
}
