export type DeviceType = "mobile" | "tablet" | "desktop"

export interface Device {
  id: string
  userId: string
  deviceFingerprint: string
  deviceName: string
  deviceType: DeviceType
  browser: string
  os: string
  lastActiveAt: string
  createdAt: string
}

export interface RegisterDeviceRequest {
  deviceFingerprint: string
  deviceName: string
  deviceType: DeviceType
  browser: string
  os: string
}
