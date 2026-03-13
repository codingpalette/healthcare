export interface InbodyRecord {
  id: string
  userId: string
  measuredDate: string
  weight: number | null
  skeletalMuscleMass: number | null
  bodyFatPercentage: number | null
  bodyMassIndex: number | null
  bodyFatMass: number | null
  memo: string | null
  photoUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface InbodyRecordWithProfile extends InbodyRecord {
  userName: string
}

export interface InbodyInput {
  measuredDate?: string
  weight?: number | null
  skeletalMuscleMass?: number | null
  bodyFatPercentage?: number | null
  bodyMassIndex?: number | null
  bodyFatMass?: number | null
  memo?: string | null
}

export interface InbodyReminderSetting {
  id: string
  userId: string
  trainerId: string
  measurementDay: number
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface InbodyReminderInput {
  measurementDay: number
  enabled: boolean
}

export interface InbodyMemberOverview {
  memberId: string
  memberName: string
  memberAvatarUrl: string | null
  latestRecord: InbodyRecord | null
  reminderSetting: InbodyReminderSetting | null
}
