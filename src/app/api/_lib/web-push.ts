import webpush from "web-push"
import { createAdminSupabase } from "@/app/api/_lib/supabase"

let isConfigured = false

function configureWebPush() {
  if (isConfigured) return

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT

  if (!publicKey || !privateKey || !subject) {
    return
  }

  webpush.setVapidDetails(subject, publicKey, privateKey)
  isConfigured = true
}

export function isWebPushAvailable() {
  return Boolean(
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
      process.env.VAPID_PRIVATE_KEY &&
      process.env.VAPID_SUBJECT
  )
}

export async function sendPushNotifications(
  adminSupabase: ReturnType<typeof createAdminSupabase>,
  userId: string,
  payload: {
    title: string
    body: string
    url?: string | null
  }
) {
  if (!isWebPushAvailable()) return
  configureWebPush()

  const { data: subscriptions, error } = await adminSupabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)

  if (error || !subscriptions?.length) return

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint as string,
            keys: {
              p256dh: subscription.p256dh as string,
              auth: subscription.auth as string,
            },
          },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url ?? "/notifications",
          })
        )
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : null

        if (statusCode === 404 || statusCode === 410) {
          await adminSupabase
            .from("push_subscriptions")
            .delete()
            .eq("id", subscription.id as string)
        }
      }
    })
  )
}
