"use client"

import { Monitor, Smartphone, Tablet, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Badge } from "@/shared/ui/badge"
import { getStoredDeviceId } from "@/shared/lib/device-fingerprint"
import { useMyDevices, useRemoveMyDevice } from "../model/use-devices"
import type { Device } from "@/entities/device"

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

interface DeviceCardProps {
  device: Device
  isCurrentDevice: boolean
  onRemove: (deviceId: string) => void
  isRemoving: boolean
  forceLogoutMode?: boolean
}

function DeviceCard({ device, isCurrentDevice, onRemove, isRemoving, forceLogoutMode }: DeviceCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <DeviceIcon type={device.deviceType} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{device.deviceName}</span>
          {isCurrentDevice && (
            <Badge variant="secondary">현재 기기</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {device.os} · {device.browser}
        </p>
        <p className="text-xs text-muted-foreground">
          마지막 활동: {formatRelativeTime(device.lastActiveAt)}
        </p>
      </div>
      {!isCurrentDevice && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(device.id)}
          disabled={isRemoving}
        >
          {isRemoving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            forceLogoutMode ? "강제 로그아웃" : "로그아웃"
          )}
        </Button>
      )}
    </div>
  )
}

/** 내 기기 목록 (설정 페이지용) */
export function MyDeviceList() {
  const { data: devices, isLoading } = useMyDevices()
  const removeDevice = useRemoveMyDevice()
  const currentDeviceId = getStoredDeviceId()

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>로그인된 기기</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>로그인된 기기</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {devices?.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            isCurrentDevice={device.id === currentDeviceId}
            onRemove={(id) => removeDevice.mutate(id)}
            isRemoving={removeDevice.isPending}
          />
        ))}
        {(!devices || devices.length === 0) && (
          <p className="text-sm text-muted-foreground text-center py-4">
            등록된 기기가 없습니다
          </p>
        )}
      </CardContent>
    </Card>
  )
}

/** 회원 기기 목록 (트레이너 회원관리용) */
export interface MemberDeviceListProps {
  userId: string
  devices: Device[]
  isLoading: boolean
  onRemove: (deviceId: string) => void
  isRemoving: boolean
}

export function MemberDeviceList({
  devices,
  isLoading,
  onRemove,
  isRemoving,
}: MemberDeviceListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {devices?.map((device) => (
        <DeviceCard
          key={device.id}
          device={device}
          isCurrentDevice={false}
          onRemove={onRemove}
          isRemoving={isRemoving}
          forceLogoutMode
        />
      ))}
      {(!devices || devices.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-4">
          등록된 기기가 없습니다
        </p>
      )}
    </div>
  )
}
