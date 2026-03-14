import { Monitor, Smartphone, Tablet } from "lucide-react"

type DeviceType = "mobile" | "tablet" | "desktop"

/** 기기 타입에 따른 아이콘 */
export function DeviceIcon({ type }: { type: DeviceType }) {
  switch (type) {
    case "mobile":
      return <Smartphone className="h-8 w-8 text-muted-foreground" />
    case "tablet":
      return <Tablet className="h-8 w-8 text-muted-foreground" />
    default:
      return <Monitor className="h-8 w-8 text-muted-foreground" />
  }
}
