declare module "web-push" {
  interface PushSubscriptionKeys {
    p256dh: string
    auth: string
  }

  interface PushSubscription {
    endpoint: string
    keys: PushSubscriptionKeys
  }

  interface VapidDetails {
    subject: string
    publicKey: string
    privateKey: string
  }

  interface WebPushError extends Error {
    statusCode?: number
  }

  const webpush: {
    setVapidDetails(subject: string, publicKey: string, privateKey: string): void
    sendNotification(subscription: PushSubscription, payload?: string): Promise<void>
  }

  export default webpush
  export type { PushSubscription, VapidDetails, WebPushError }
}
