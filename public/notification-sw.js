self.addEventListener("push", (event) => {
  if (!event.data) return

  const data = event.data.json()
  const title = data.title || "Healthcare 알림"
  const options = {
    body: data.body || "",
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
    })
  )
})
