export interface DailyAccessEntry {
  date: string
  count: number
}

export interface DailyAccessStats {
  today: number
  yesterday: number
  data: DailyAccessEntry[]
}

// --- 출석 통계 ---
export interface AttendanceStatsDaily {
  date: string
  count: number
  rate: number
}

export interface AttendanceStatsWeekday {
  weekday: number
  avgCount: number
}

export interface AttendanceStatsMember {
  userId: string
  name: string
  attendanceRate: number
  totalDays: number
}

export interface AttendanceStats {
  today: number
  yesterday: number
  totalMembers: number
  dailyData: AttendanceStatsDaily[]
  weekdayData: AttendanceStatsWeekday[]
  memberRanking: AttendanceStatsMember[]
}

// --- 회원 통계 ---
export interface MemberStatsTrend {
  date: string
  count: number
}

export interface MemberStatsRetention {
  month: string
  rate: number
}

export interface MemberStatsInactive {
  userId: string
  name: string
  lastAttendance: string | null
}

export interface MemberStats {
  totalMembers: number
  activeMembers: number
  inactiveMembers: number
  newThisMonth: number
  newLastMonth: number
  signupTrend: MemberStatsTrend[]
  retentionTrend: MemberStatsRetention[]
  inactiveList: MemberStatsInactive[]
}

// --- 식단 통계 ---
export interface DietStatsDaily {
  date: string
  submitCount: number
  submitRate: number
  avgCalories: number
  avgCarbs: number
  avgProtein: number
  avgFat: number
}

export interface DietStatsMember {
  userId: string
  name: string
  submitRate: number
  avgCalories: number
  lastRecordDate: string | null
}

export interface DietStats {
  todaySubmitRate: number
  yesterdaySubmitRate: number
  avgSubmitRate: number
  totalMembers: number
  dailyData: DietStatsDaily[]
  memberStats: DietStatsMember[]
}

// --- 운동 통계 ---
export interface WorkoutStatsDaily {
  date: string
  recordCount: number
  recordRate: number
}

export interface WorkoutStatsExercise {
  exerciseName: string
  count: number
}

export interface WorkoutStatsMember {
  userId: string
  name: string
  recordRate: number
  totalWorkouts: number
  topExercise: string | null
  lastRecordDate: string | null
}

export interface WorkoutStats {
  todayRecordRate: number
  yesterdayRecordRate: number
  avgRecordRate: number
  totalMembers: number
  dailyData: WorkoutStatsDaily[]
  exerciseDistribution: WorkoutStatsExercise[]
  memberStats: WorkoutStatsMember[]
}

// --- 인바디 통계 ---
export interface InbodyStatsMonthly {
  month: string
  avgWeight: number | null
  avgMuscleMass: number | null
  avgBodyFatPct: number | null
}

export interface InbodyStatsMember {
  userId: string
  name: string
  lastMeasuredDate: string | null
  latestWeight: number | null
  latestMuscleMass: number | null
  latestBodyFatPct: number | null
  measuredThisMonth: boolean
}

export interface InbodyStats {
  totalMembers: number
  measuredThisMonth: number
  unmeasuredThisMonth: number
  monthlyAvgTrend: InbodyStatsMonthly[]
  memberOverview: InbodyStatsMember[]
}
