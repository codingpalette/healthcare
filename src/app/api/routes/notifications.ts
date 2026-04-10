import { Hono } from "hono"
import { createAdminSupabase } from "@/app/api/_lib/supabase"
import { createNotificationIfNeeded, getNotificationPreferencesRow } from "@/app/api/_lib/notifications"
import { authMiddleware, type AuthEnv } from "@/shared/api/hono-auth-middleware"
import { getKstDateRange, getTodayKstDateString } from "@/shared/lib/attendance-date"
import {
  formatKstDate,
  getCurrentMonthKey,
  getPreviousDateStrings,
  isThreeDayAbsence,
  shouldCreateInbodyReminder,
} from "@/entities/notification/model/logic"

export const notificationsRoutes = new Hono<AuthEnv>().use(authMiddleware)

async function syncMemberInbodyNotifications(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  userId: string,
  pushEnabled: boolean
) {
  const monthKey = getCurrentMonthKey()
  const monthStart = `${monthKey}-01`
  const monthEnd = `${monthKey}-31`

  const { data: reminder } = await adminSupabase
    .from("inbody_reminder_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  if (!reminder || !reminder.enabled) return

  const { data: records } = await adminSupabase
    .from("inbody_records")
    .select("id")
    .eq("user_id", userId)
    .gte("measured_date", monthStart)
    .lte("measured_date", monthEnd)
    .limit(1)

  const shouldNotify = shouldCreateInbodyReminder({
    measurementDay: Number(reminder.measurement_day),
    enabled: Boolean(reminder.enabled),
    hasRecordThisMonth: Boolean(records?.length),
  })

  if (!shouldNotify) return

  await createNotificationIfNeeded(
    adminSupabase,
    {
      recipientId: userId,
      kind: "inbody_reminder",
      title: "이번 달 인바디 측정일이 지났습니다",
      message: `이번 달 ${reminder.measurement_day}일 측정 알림이 도래했습니다. 인바디를 기록해 주세요.`,
      link: "/inbody",
      metadata: {
        measurementDay: reminder.measurement_day,
        monthKey,
      },
      dedupeKey: `inbody_reminder:member:${userId}:${monthKey}`,
    },
    pushEnabled
  )
}

async function syncTrainerNotifications(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  trainerId: string,
  options: { inbodyEnabled: boolean; attendanceEnabled: boolean; pushEnabled: boolean; isAdmin?: boolean }
) {
  // admin은 모든 회원, trainer는 배정된 회원만
  let query = adminSupabase
    .from("profiles")
    .select("id, name")
    .eq("role", "member")
    .is("deleted_at", null)

  if (!options.isAdmin) {
    query = query.eq("trainer_id", trainerId)
  }

  const { data: members } = await query

  if (!members?.length) return

  // 유효한 회원권이 있는 회원만 필터링 (만료/미등록 회원 제외)
  const today = new Date().toISOString().split("T")[0]
  const { data: activeMemberships } = await adminSupabase
    .from("memberships")
    .select("member_id")
    .in("member_id", members.map((m) => m.id as string))
    .gte("end_date", today)

  const activeMemberIds = new Set((activeMemberships ?? []).map((m) => m.member_id as string))
  const activeMembers = members.filter((m) => activeMemberIds.has(m.id as string))

  if (!activeMembers.length) return

  const memberIds = activeMembers.map((member) => member.id as string)
  const memberNameMap = new Map(activeMembers.map((member) => [member.id as string, member.name as string]))

  if (options.attendanceEnabled) {
    const today = new Date()
    const todayKey = getTodayKstDateString(today)
    const previousDates = getPreviousDateStrings(3, today)
    const { start: attendanceStart } = getKstDateRange(previousDates[0])
    const { end: attendanceEnd } = getKstDateRange(previousDates[previousDates.length - 1])

    const { data: attendanceRows } = await adminSupabase
      .from("attendance")
      .select("user_id, check_in_at")
      .in("user_id", memberIds)
      .gte("check_in_at", attendanceStart)
      .lte("check_in_at", attendanceEnd)

    const attendanceMap = new Map<string, Set<string>>()

    for (const row of attendanceRows ?? []) {
      const userId = row.user_id as string
      const current = attendanceMap.get(userId) ?? new Set<string>()
      current.add(formatKstDate(new Date(row.check_in_at as string)))
      attendanceMap.set(userId, current)
    }

    for (const memberId of memberIds) {
      const dedupeKey = `attendance_absence:${memberId}:${todayKey}`
      const isAbsent = isThreeDayAbsence(attendanceMap.get(memberId) ?? new Set<string>(), today)
      if (!isAbsent) {
        await adminSupabase
          .from("notifications")
          .delete()
          .eq("recipient_id", trainerId)
          .eq("kind", "attendance_absence")
          .eq("dedupe_key", dedupeKey)

        continue
      }

      await createNotificationIfNeeded(
        adminSupabase,
        {
          recipientId: trainerId,
          actorId: memberId,
          kind: "attendance_absence",
          title: `${memberNameMap.get(memberId) ?? "회원"}님이 3일 연속 결석 중입니다`,
          message: "최근 3일 연속 출석 기록이 없습니다. 출석 현황을 확인해 주세요.",
          link: "/attendance",
          metadata: {
            memberId,
            date: todayKey,
          },
          dedupeKey,
        },
        options.pushEnabled
      )
    }
  }

  if (options.inbodyEnabled) {
    const monthKey = getCurrentMonthKey()
    const monthStart = `${monthKey}-01`
    const monthEnd = `${monthKey}-31`

    const { data: reminders } = await adminSupabase
      .from("inbody_reminder_settings")
      .select("*")
      .eq("trainer_id", trainerId)
      .in("user_id", memberIds)
      .eq("enabled", true)

    if (!reminders?.length) return

    const reminderMemberIds = reminders.map((row) => row.user_id as string)
    const { data: monthRecords } = await adminSupabase
      .from("inbody_records")
      .select("user_id, measured_date")
      .in("user_id", reminderMemberIds)
      .gte("measured_date", monthStart)
      .lte("measured_date", monthEnd)

    const recordedMemberIds = new Set((monthRecords ?? []).map((row) => row.user_id as string))

    for (const reminder of reminders) {
      const memberId = reminder.user_id as string
      const shouldNotify = shouldCreateInbodyReminder({
        measurementDay: Number(reminder.measurement_day),
        enabled: Boolean(reminder.enabled),
        hasRecordThisMonth: recordedMemberIds.has(memberId),
      })

      if (!shouldNotify) continue

      await createNotificationIfNeeded(
        adminSupabase,
        {
          recipientId: trainerId,
          actorId: memberId,
          kind: "inbody_reminder",
          title: `${memberNameMap.get(memberId) ?? "회원"}님의 인바디 측정일이 지났습니다`,
          message: `이번 달 ${reminder.measurement_day}일 기준 인바디 기록이 아직 없습니다.`,
          link: "/inbody",
          metadata: {
            memberId,
            measurementDay: reminder.measurement_day,
            monthKey,
          },
          dedupeKey: `inbody_reminder:trainer:${memberId}:${monthKey}`,
        },
        options.pushEnabled
      )
    }
  }
}

async function syncMembershipExpiryNotifications(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  userId: string,
  userRole: string,
  pushEnabled: boolean
) {
  if (userRole === "member") {
    // 회원 자기 회원권 만료 알림
    const { data: membership } = await adminSupabase
      .from("memberships")
      .select("id, member_id, end_date")
      .eq("member_id", userId)
      .maybeSingle()

    if (!membership) return

    const today = new Date()
    const endDate = new Date(membership.end_date as string)
    const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    for (const threshold of [7, 3, 1]) {
      if (diffDays <= threshold && diffDays > 0) {
        await createNotificationIfNeeded(
          adminSupabase,
          {
            recipientId: userId,
            kind: "membership_expiry",
            title: `회원권이 ${diffDays}일 후 만료됩니다`,
            message: `회원권 종료일: ${membership.end_date}. 연장이 필요하면 트레이너에게 문의하세요.`,
            link: "/settings",
            metadata: { endDate: membership.end_date, daysRemaining: diffDays },
            dedupeKey: `membership_expiry:${userId}:${membership.end_date}:${threshold}`,
          },
          pushEnabled
        )
      }
    }
  }

  if (userRole === "trainer" || userRole === "admin") {
    // 트레이너/관리자에게 회원 만료 알림
    let memberQuery = adminSupabase
      .from("profiles")
      .select("id, name")
      .eq("role", "member")
      .is("deleted_at", null)

    if (userRole !== "admin") {
      memberQuery = memberQuery.eq("trainer_id", userId)
    }

    const { data: members } = await memberQuery

    if (!members?.length) return

    const memberIds = members.map((m) => m.id as string)
    const memberNameMap = new Map(members.map((m) => [m.id as string, m.name as string]))

    const { data: memberships } = await adminSupabase
      .from("memberships")
      .select("member_id, end_date")
      .in("member_id", memberIds)

    if (!memberships?.length) return

    const today = new Date()
    for (const ms of memberships) {
      const endDate = new Date(ms.end_date as string)
      const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      const memberId = ms.member_id as string

      for (const threshold of [7, 3, 1]) {
        if (diffDays <= threshold && diffDays > 0) {
          await createNotificationIfNeeded(
            adminSupabase,
            {
              recipientId: userId,
              actorId: memberId,
              kind: "membership_expiry",
              title: `${memberNameMap.get(memberId) ?? "회원"}님의 회원권이 ${diffDays}일 후 만료됩니다`,
              message: `회원권 종료일: ${ms.end_date}. 연장이 필요합니다.`,
              link: "/members",
              metadata: { memberId, endDate: ms.end_date, daysRemaining: diffDays },
              dedupeKey: `membership_expiry:trainer:${memberId}:${ms.end_date}:${threshold}`,
            },
            pushEnabled
          )
        }
      }
    }
  }
}

notificationsRoutes.post("/sync", async (c) => {
  const userId = c.get("userId")
  const userRole = c.get("userRole")
  const adminSupabase = createAdminSupabase()

  try {
    const preferences = await getNotificationPreferencesRow(adminSupabase, userId)

    if (preferences.inbody_enabled) {
      await syncMemberInbodyNotifications(adminSupabase, userId, Boolean(preferences.push_enabled))
    }

    if (userRole === "trainer" || userRole === "admin") {
      await syncTrainerNotifications(adminSupabase, userId, {
        inbodyEnabled: Boolean(preferences.inbody_enabled),
        attendanceEnabled: Boolean(preferences.attendance_enabled),
        pushEnabled: Boolean(preferences.push_enabled),
        isAdmin: userRole === "admin",
      })
    }

    // 회원권 만료 알림
    if (preferences.membership_enabled) {
      await syncMembershipExpiryNotifications(adminSupabase, userId, userRole, Boolean(preferences.push_enabled))
    }

    return c.json({ success: true })
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "알림 동기화에 실패했습니다" },
      400
    )
  }
})

notificationsRoutes.get("/", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const limit = Number(c.req.query("limit") ?? "20")
  const unreadOnly = c.req.query("unreadOnly") === "true"

  let query = adminSupabase
    .from("notifications")
    .select("*")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (unreadOnly) {
    query = query.is("read_at", null)
  }

  const { data, error } = await query
  if (error) return c.json({ error: error.message }, 400)

  const { count } = await adminSupabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null)

  return c.json({
    notifications: data ?? [],
    unreadCount: count ?? 0,
  })
})

notificationsRoutes.patch("/read-all", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const { error } = await adminSupabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("recipient_id", userId)
    .is("read_at", null)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

notificationsRoutes.patch("/:id/read", async (c) => {
  const userId = c.get("userId")
  const notificationId = c.req.param("id")
  const adminSupabase = createAdminSupabase()
  const { data, error } = await adminSupabase
    .from("notifications")
    .update({
      read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("recipient_id", userId)
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

notificationsRoutes.get("/preferences/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()

  try {
    const preferences = await getNotificationPreferencesRow(adminSupabase, userId)
    return c.json(preferences)
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "알림 설정 조회에 실패했습니다" },
      400
    )
  }
})

notificationsRoutes.put("/preferences/me", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{
    inbodyEnabled?: boolean
    attendanceEnabled?: boolean
    chatEnabled?: boolean
    feedbackEnabled?: boolean
    pushEnabled?: boolean
    membershipEnabled?: boolean
    noticeEnabled?: boolean
  }>()

  const { data, error } = await adminSupabase
    .from("notification_preferences")
    .upsert(
      {
        user_id: userId,
        inbody_enabled: body.inbodyEnabled ?? true,
        attendance_enabled: body.attendanceEnabled ?? true,
        chat_enabled: body.chatEnabled ?? true,
        feedback_enabled: body.feedbackEnabled ?? true,
        push_enabled: body.pushEnabled ?? false,
        membership_enabled: body.membershipEnabled ?? true,
        notice_enabled: body.noticeEnabled ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single()

  if (error) return c.json({ error: error.message }, 400)
  return c.json(data)
})

notificationsRoutes.post("/push-subscriptions", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  }>()

  if (!body.endpoint || !body.keys?.p256dh || !body.keys.auth) {
    return c.json({ error: "푸시 구독 정보가 올바르지 않습니다" }, 400)
  }

  const { error } = await adminSupabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: userId,
        endpoint: body.endpoint,
        p256dh: body.keys.p256dh,
        auth: body.keys.auth,
        user_agent: c.req.header("User-Agent") ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" }
    )

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})

notificationsRoutes.delete("/push-subscriptions", async (c) => {
  const userId = c.get("userId")
  const adminSupabase = createAdminSupabase()
  const body = await c.req.json<{ endpoint?: string }>()

  if (!body.endpoint) {
    return c.json({ error: "삭제할 구독 endpoint가 필요합니다" }, 400)
  }

  const { error } = await adminSupabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", body.endpoint)

  if (error) return c.json({ error: error.message }, 400)
  return c.json({ success: true })
})
