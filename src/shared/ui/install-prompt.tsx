"use client"

import { useEffect, useState } from "react"
import { Download, Share, X } from "lucide-react"

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "pwa-install-dismissed"
const DISMISS_DAYS = 7

function isDismissed(): boolean {
  if (typeof window === "undefined") return true
  const dismissed = localStorage.getItem(DISMISS_KEY)
  if (!dismissed) return false
  const dismissedAt = new Date(dismissed)
  const now = new Date()
  const diffDays = (now.getTime() - dismissedAt.getTime()) / (1000 * 60 * 60 * 24)
  return diffDays < DISMISS_DAYS
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window)
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone)
  )
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [visible, setVisible] = useState(false)

  /* eslint-disable react-hooks/set-state-in-effect -- 마운트 시 플랫폼 감지 */
  useEffect(() => {
    // 이미 설치된 앱이거나 최근 닫은 경우 표시하지 않음
    if (isStandalone() || isDismissed()) return

    if (isIOS()) {
      setShowIOSGuide(true)
      setVisible(true)
      return
    }

    function handleBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstall)
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function dismiss() {
    setVisible(false)
    localStorage.setItem(DISMISS_KEY, new Date().toISOString())
  }

  async function handleInstall() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setVisible(false)
    }
    setDeferredPrompt(null)
  }

  if (!visible) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 p-4 pt-[calc(1rem+env(safe-area-inset-top))]">
      <div className="bg-card border-border mx-auto flex max-w-md items-center gap-3 rounded-xl border p-4 shadow-lg">
        <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
          <Download className="text-primary size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-foreground text-sm font-semibold">앱으로 설치하기</p>
          {showIOSGuide ? (
            <p className="text-muted-foreground mt-0.5 text-xs">
              <Share className="mr-1 inline size-3" />
              공유 버튼을 눌러 &quot;홈 화면에 추가&quot;를 선택하세요
            </p>
          ) : (
            <p className="text-muted-foreground mt-0.5 text-xs">
              홈 화면에서 빠르게 접속할 수 있어요
            </p>
          )}
        </div>
        {!showIOSGuide && (
          <button
            onClick={handleInstall}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          >
            설치
          </button>
        )}
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
          aria-label="닫기"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
