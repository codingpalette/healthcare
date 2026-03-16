"use client"

import { Bell, BellOff, SmartphoneNfc } from "lucide-react"
import { toast } from "sonner"
import {
  useNotificationPreferences,
  useRemovePushSubscription,
  useSavePushSubscription,
  useUpdateNotificationPreferences,
} from "@/features/notification"
import {
  getCurrentPushSubscription,
  isPushSupported,
  subscribeBrowserPush,
  unsubscribeBrowserPush,
} from "@/shared/lib/push-notifications"
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui"

const PUBLIC_VAPID_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

export function NotificationSettingsForm() {
  const { data: preferences, isLoading } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()
  const savePushSubscription = useSavePushSubscription()
  const removePushSubscription = useRemovePushSubscription()

  async function togglePreference(
    field: "inbodyEnabled" | "attendanceEnabled" | "chatEnabled" | "feedbackEnabled" | "noticeEnabled"
  ) {
    if (!preferences) return

    try {
      await updatePreferences.mutateAsync({
        inbodyEnabled: field === "inbodyEnabled" ? !preferences.inbodyEnabled : preferences.inbodyEnabled,
        attendanceEnabled:
          field === "attendanceEnabled" ? !preferences.attendanceEnabled : preferences.attendanceEnabled,
        chatEnabled: field === "chatEnabled" ? !preferences.chatEnabled : preferences.chatEnabled,
        feedbackEnabled:
          field === "feedbackEnabled" ? !preferences.feedbackEnabled : preferences.feedbackEnabled,
        pushEnabled: preferences.pushEnabled,
        membershipEnabled: preferences.membershipEnabled,
        noticeEnabled: field === "noticeEnabled" ? !preferences.noticeEnabled : preferences.noticeEnabled,
      })
      toast.success("알림 설정을 저장했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "알림 설정 저장에 실패했습니다")
    }
  }

  async function enablePush() {
    if (!preferences) return
    if (!isPushSupported()) {
      toast.error("이 브라우저는 Web Push를 지원하지 않습니다")
      return
    }
    if (!PUBLIC_VAPID_KEY) {
      toast.error("VAPID 공개키가 설정되지 않아 Web Push를 활성화할 수 없습니다")
      return
    }

    try {
      const subscription = await subscribeBrowserPush(PUBLIC_VAPID_KEY)
      const json = subscription.toJSON()

      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error("푸시 구독 정보가 올바르지 않습니다")
      }

      await savePushSubscription.mutateAsync({
        endpoint: json.endpoint,
        keys: {
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
        },
      })
      await updatePreferences.mutateAsync({
        inbodyEnabled: preferences.inbodyEnabled,
        attendanceEnabled: preferences.attendanceEnabled,
        chatEnabled: preferences.chatEnabled,
        feedbackEnabled: preferences.feedbackEnabled,
        pushEnabled: true,
        membershipEnabled: preferences.membershipEnabled,
        noticeEnabled: preferences.noticeEnabled,
      })
      toast.success("Web Push 알림을 활성화했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Web Push 활성화에 실패했습니다")
    }
  }

  async function disablePush() {
    if (!preferences) return

    try {
      const current = await getCurrentPushSubscription()
      const endpoint = current ? await unsubscribeBrowserPush() : null
      if (endpoint) {
        await removePushSubscription.mutateAsync(endpoint)
      }
      await updatePreferences.mutateAsync({
        inbodyEnabled: preferences.inbodyEnabled,
        attendanceEnabled: preferences.attendanceEnabled,
        chatEnabled: preferences.chatEnabled,
        feedbackEnabled: preferences.feedbackEnabled,
        pushEnabled: false,
        membershipEnabled: preferences.membershipEnabled,
        noticeEnabled: preferences.noticeEnabled,
      })
      toast.success("Web Push 알림을 비활성화했습니다")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Web Push 비활성화에 실패했습니다")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>알림 설정</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading || !preferences ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <>
            <PreferenceRow
              title="인바디 알림"
              description="측정일이 지나고 이번 달 기록이 없을 때 알림을 표시합니다."
              checked={preferences.inbodyEnabled}
              onToggle={() => togglePreference("inbodyEnabled")}
              disabled={updatePreferences.isPending}
            />
            <PreferenceRow
              title="출석 결석 알림"
              description="담당 회원이 3일 연속 결석하면 알림을 표시합니다."
              checked={preferences.attendanceEnabled}
              onToggle={() => togglePreference("attendanceEnabled")}
              disabled={updatePreferences.isPending}
            />
            <PreferenceRow
              title="관리톡 새 메시지 알림"
              description="상대방이 새 관리톡 메시지를 보내면 알림을 표시합니다."
              checked={preferences.chatEnabled}
              onToggle={() => togglePreference("chatEnabled")}
              disabled={updatePreferences.isPending}
            />
            <PreferenceRow
              title="피드백 알림"
              description="식단 또는 운동 피드백이 도착하면 알림을 표시합니다."
              checked={preferences.feedbackEnabled}
              onToggle={() => togglePreference("feedbackEnabled")}
              disabled={updatePreferences.isPending}
            />
            <PreferenceRow
              title="공지사항 알림"
              description="새 공지사항이 등록되면 알림을 표시합니다."
              checked={preferences.noticeEnabled}
              onToggle={() => togglePreference("noticeEnabled")}
              disabled={updatePreferences.isPending}
            />

            <div className="rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <SmartphoneNfc className="size-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">Web Push</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    브라우저 알림 권한을 허용하면 헤더 알림과 함께 브라우저 푸시도 받을 수 있습니다.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {preferences.pushEnabled ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={disablePush}
                        disabled={updatePreferences.isPending || removePushSubscription.isPending}
                      >
                        <BellOff className="size-4" />
                        푸시 끄기
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={enablePush}
                        disabled={updatePreferences.isPending || savePushSubscription.isPending}
                      >
                        <Bell className="size-4" />
                        푸시 켜기
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PreferenceRow({
  title,
  description,
  checked,
  onToggle,
  disabled,
}: {
  title: string
  description: string
  checked: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-2xl border p-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <input
        type="checkbox"
        className="mt-1 size-4 accent-primary"
        checked={checked}
        onChange={onToggle}
        disabled={disabled}
      />
    </label>
  )
}
