export function isPushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)

  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

export async function subscribeBrowserPush(publicKey: string) {
  const registration = await navigator.serviceWorker.register("/notification-sw.js")
  const existingSubscription = await registration.pushManager.getSubscription()

  if (existingSubscription) {
    return existingSubscription
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  })
}

export async function unsubscribeBrowserPush() {
  const registration = await navigator.serviceWorker.getRegistration("/notification-sw.js")
  const subscription = await registration?.pushManager.getSubscription()

  if (!subscription) return null

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  return endpoint
}

export async function getCurrentPushSubscription() {
  const registration = await navigator.serviceWorker.getRegistration("/notification-sw.js")
  return registration?.pushManager.getSubscription() ?? null
}
