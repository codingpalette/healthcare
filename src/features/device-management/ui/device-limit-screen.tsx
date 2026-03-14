"use client"

import { useState } from "react"
import { Monitor, Smartphone, Tablet, Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import type { Device } from "@/entities/device"
import { removeMyDevice } from "@/entities/device"

function DeviceIcon({ type }: { type: Device["deviceType"] }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="h-8 w-8 text-muted-foreground" />
    case "tablet":
      return <Tablet className="h-8 w-8 text-muted-foreground" />
    default:
      return <Monitor className="h-8 w-8 text-muted-foreground" />
  }
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "방금 전"
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  return `${days}일 전`
}

interface DeviceLimitScreenProps {
  devices: Device[]
  onDeviceRemoved: () => void
}

export function DeviceLimitScreen({ devices, onDeviceRemoved }: DeviceLimitScreenProps) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleRemove = async (deviceId: string) => {
    setRemovingId(deviceId)
    setError(null)
    try {
      await removeMyDevice(deviceId)
      onDeviceRemoved()
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그아웃에 실패했습니다")
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
          </div>
          <CardTitle>기기 등록 한도 초과</CardTitle>
          <CardDescription>
            최대 3대까지 로그인할 수 있습니다.
            아래 기기 중 하나를 로그아웃한 뒤 다시 시도해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
          {devices.map((device) => (
            <div key={device.id} className="flex items-center gap-4 rounded-lg border p-4">
              <DeviceIcon type={device.deviceType} />
              <div className="flex-1 min-w-0">
                <span className="font-medium truncate block">{device.deviceName}</span>
                <p className="text-sm text-muted-foreground">
                  {device.os} · {device.browser}
                </p>
                <p className="text-xs text-muted-foreground">
                  마지막 활동: {formatRelativeTime(device.lastActiveAt)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(device.id)}
                disabled={removingId !== null}
              >
                {removingId === device.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "로그아웃"
                )}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
