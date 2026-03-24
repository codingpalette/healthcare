/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope & WorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

// 기존 푸시 알림 로직 통합
self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()
  const title = data.title || "웨스트짐 알림"
  const options = {
    body: data.body || "",
    icon: "/appIcons/android/mipmap-xxxhdpi/ic_launcher.png",
    badge: "/appIcons/Assets.xcassets/AppIcon.appiconset/100.png",
    data: {
      url: data.url || "/notifications",
    },
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data?.url || "/notifications"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => "focus" in client)

      if (existingClient) {
        existingClient.navigate(url)
        return existingClient.focus()
      }

      return self.clients.openWindow(url)
    }),
  )
})

serwist.addEventListeners()
