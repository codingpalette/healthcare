"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui"
import type { Profile } from "@/entities/user"
import { EquipmentPage } from "@/views/equipment"
import { ExerciseGuidePage } from "@/views/exercise-guide"

interface GuidePageProps {
  profile: Profile
}

export function GuidePage({ profile }: GuidePageProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const currentTab = searchParams.get("tab") ?? "equipment"

  function handleTabChange(value: string) {
    const params = new URLSearchParams()
    params.set("tab", value)
    router.replace(`?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">가이드</h2>
        <p className="text-muted-foreground">
          기구 사용법과 운동 방법을 확인하세요.
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="equipment">기구 가이드</TabsTrigger>
          <TabsTrigger value="exercise">운동 가이드</TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="mt-6">
          <EquipmentPage profile={profile} />
        </TabsContent>

        <TabsContent value="exercise" className="mt-6">
          <ExerciseGuidePage profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
