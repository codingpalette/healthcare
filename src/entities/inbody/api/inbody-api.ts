import { supabase } from "@/shared/api/supabase"
import type {
  InbodyInput,
  InbodyMemberOverview,
  InbodyRecord,
  InbodyRecordWithProfile,
  InbodyReminderInput,
  InbodyReminderSetting,
} from "@/entities/inbody/model/types"

function toInbodyRecord(row: Record<string, unknown>): InbodyRecord {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    measuredDate: row.measured_date as string,
    weight: row.weight != null ? Number(row.weight) : null,
    skeletalMuscleMass: row.skeletal_muscle_mass != null ? Number(row.skeletal_muscle_mass) : null,
    bodyFatPercentage: row.body_fat_percentage != null ? Number(row.body_fat_percentage) : null,
    bodyMassIndex: row.body_mass_index != null ? Number(row.body_mass_index) : null,
    bodyFatMass: row.body_fat_mass != null ? Number(row.body_fat_mass) : null,
    memo: (row.memo as string) ?? null,
    photoUrls: (row.photo_urls as string[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toReminderSetting(row: Record<string, unknown>): InbodyReminderSetting {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    trainerId: row.trainer_id as string,
    measurementDay: Number(row.measurement_day),
    enabled: Boolean(row.enabled),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

function toMemberOverview(row: Record<string, unknown>): InbodyMemberOverview {
  return {
    memberId: row.member_id as string,
    memberName: row.member_name as string,
    memberAvatarUrl: (row.member_avatar_url as string) ?? null,
    latestRecord: row.latest_record ? toInbodyRecord(row.latest_record as Record<string, unknown>) : null,
    reminderSetting: row.reminder_setting
      ? toReminderSetting(row.reminder_setting as Record<string, unknown>)
      : null,
  }
}

async function getAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    throw new Error("인증되지 않은 사용자입니다")
  }

  return session.access_token
}

export async function createInbodyRecord(input: InbodyInput, photos?: File[]): Promise<InbodyRecord> {
  const accessToken = await getAccessToken()
  let res: Response

  if (photos?.length) {
    const formData = new FormData()
    for (const file of photos) formData.append("files", file)
    if (input.measuredDate) formData.append("measuredDate", input.measuredDate)
    if (input.weight != null) formData.append("weight", String(input.weight))
    if (input.skeletalMuscleMass != null) {
      formData.append("skeletalMuscleMass", String(input.skeletalMuscleMass))
    }
    if (input.bodyFatPercentage != null) {
      formData.append("bodyFatPercentage", String(input.bodyFatPercentage))
    }
    if (input.bodyMassIndex != null) formData.append("bodyMassIndex", String(input.bodyMassIndex))
    if (input.bodyFatMass != null) formData.append("bodyFatMass", String(input.bodyFatMass))
    if (input.memo) formData.append("memo", input.memo)

    res = await fetch("/api/inbody", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
  } else {
    res = await fetch("/api/inbody", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 기록 생성에 실패했습니다")
  }

  return toInbodyRecord(await res.json())
}

export async function getMyInbodyRecords(params?: { from?: string; to?: string }) {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)
  const query = searchParams.toString()

  const res = await fetch(`/api/inbody/me${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 기록 조회에 실패했습니다")
  }

  return ((await res.json()) as Record<string, unknown>[]).map(toInbodyRecord)
}

export async function getMemberInbodyRecords(
  memberId: string,
  params?: { from?: string; to?: string }
) {
  const accessToken = await getAccessToken()
  const searchParams = new URLSearchParams()
  if (params?.from) searchParams.set("from", params.from)
  if (params?.to) searchParams.set("to", params.to)
  const query = searchParams.toString()

  const res = await fetch(`/api/inbody/members/${memberId}${query ? `?${query}` : ""}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 인바디 기록 조회에 실패했습니다")
  }

  return ((await res.json()) as Record<string, unknown>[]).map(toInbodyRecord)
}

export async function getTrainerInbodyOverview() {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/inbody/latest", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 인바디 현황 조회에 실패했습니다")
  }

  return ((await res.json()) as Record<string, unknown>[]).map(toMemberOverview)
}

export async function updateInbodyRecord(
  id: string,
  input: Partial<InbodyInput>,
  photos?: File[],
  existingPhotoUrls?: string[]
): Promise<InbodyRecord> {
  const accessToken = await getAccessToken()
  const hasFiles = photos && photos.length > 0

  let res: Response

  if (hasFiles || existingPhotoUrls) {
    const formData = new FormData()
    if (photos) {
      for (const file of photos) formData.append("files", file)
    }
    if (existingPhotoUrls) {
      formData.append("existingUrls", JSON.stringify(existingPhotoUrls))
    }
    if (input.measuredDate) formData.append("measuredDate", input.measuredDate)
    if (input.weight !== undefined) formData.append("weight", input.weight === null ? "" : String(input.weight))
    if (input.skeletalMuscleMass !== undefined) {
      formData.append(
        "skeletalMuscleMass",
        input.skeletalMuscleMass === null ? "" : String(input.skeletalMuscleMass)
      )
    }
    if (input.bodyFatPercentage !== undefined) {
      formData.append(
        "bodyFatPercentage",
        input.bodyFatPercentage === null ? "" : String(input.bodyFatPercentage)
      )
    }
    if (input.bodyMassIndex !== undefined) {
      formData.append("bodyMassIndex", input.bodyMassIndex === null ? "" : String(input.bodyMassIndex))
    }
    if (input.bodyFatMass !== undefined) {
      formData.append("bodyFatMass", input.bodyFatMass === null ? "" : String(input.bodyFatMass))
    }
    if (input.memo !== undefined) formData.append("memo", input.memo ?? "")

    res = await fetch(`/api/inbody/${id}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
  } else {
    res = await fetch(`/api/inbody/${id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    })
  }

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 기록 수정에 실패했습니다")
  }

  return toInbodyRecord(await res.json())
}

export async function deleteInbodyRecord(id: string): Promise<void> {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/inbody/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 기록 삭제에 실패했습니다")
  }
}

export async function getMyInbodyReminder() {
  const accessToken = await getAccessToken()
  const res = await fetch("/api/inbody/reminders/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 측정일 설정 조회에 실패했습니다")
  }

  return toReminderSetting(await res.json())
}

export async function getMemberInbodyReminder(memberId: string) {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/inbody/reminders/members/${memberId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (res.status === 404) return null
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "회원 인바디 측정일 설정 조회에 실패했습니다")
  }

  return toReminderSetting(await res.json())
}

export async function updateMemberInbodyReminder(memberId: string, input: InbodyReminderInput) {
  const accessToken = await getAccessToken()
  const res = await fetch(`/api/inbody/reminders/members/${memberId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? "인바디 측정일 설정 저장에 실패했습니다")
  }

  return toReminderSetting(await res.json())
}

export type { InbodyRecordWithProfile }
