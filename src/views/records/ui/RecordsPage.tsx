"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { UtensilsCrossed, Dumbbell, Scale } from "lucide-react"
import type { Profile } from "@/entities/user"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/ui"
import { DietPage } from "@/views/diet"
import { WorkoutPage } from "@/views/workout"
import { InbodyPage } from "@/views/inbody"

const TABS = [
  { value: "diet", label: "식단", icon: UtensilsCrossed },
  { value: "workout", label: "운동", icon: Dumbbell },
  { value: "inbody", label: "인바디", icon: Scale },
] as const

type TabValue = (typeof TABS)[number]["value"]

interface RecordsPageProps {
  profile: Profile
}

// 내 기록 통합 페이지 - 식단/운동/인바디를 탭으로 전환
export function RecordsPage({ profile }: RecordsPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentTab = (searchParams.get("tab") as TabValue) || "diet"

  function handleTabChange(value: string | number | null) {
    if (value === null) return
    const tab = String(value)
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)
    router.replace(`/records?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="space-y-4">
      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon className="mr-1.5 size-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="diet">
          <DietPage profile={profile} />
        </TabsContent>

        <TabsContent value="workout">
          <WorkoutPage profile={profile} />
        </TabsContent>

        <TabsContent value="inbody">
          <InbodyPage profile={profile} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
