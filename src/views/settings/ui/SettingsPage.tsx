"use client"

import { ProfileEditForm } from "@/features/profile"
import { NotificationSettingsForm } from "@/features/notification"
import { MyDeviceList } from "@/features/device-management"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui"

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <Card>
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm />
        </CardContent>
      </Card>
      <NotificationSettingsForm />
      <MyDeviceList />
    </div>
  )
}
