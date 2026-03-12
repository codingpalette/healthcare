"use client"

import { ProfileEditForm } from "@/features/profile"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui"

export function SettingsPage() {
  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-2xl font-bold">설정</h1>
      <Card>
        <CardHeader>
          <CardTitle>프로필 수정</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileEditForm />
        </CardContent>
      </Card>
    </div>
  )
}
