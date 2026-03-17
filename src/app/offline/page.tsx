"use client"

import { WifiOff } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4">
      <div className="bg-muted flex size-20 items-center justify-center rounded-full">
        <WifiOff className="text-muted-foreground size-10" />
      </div>
      <div className="text-center">
        <h1 className="text-foreground text-2xl font-bold">오프라인 상태</h1>
        <p className="text-muted-foreground mt-2">
          인터넷 연결을 확인한 후 다시 시도해주세요.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-6 py-3 font-medium transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
