export interface DailyAccessEntry {
  date: string
  count: number
}

export interface DailyAccessStats {
  today: number
  yesterday: number
  data: DailyAccessEntry[]
}
