self.addEventListener("push", (event) => {
  if (!event.data) return;
  const payload = event.data.json();

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.ico",
      data: { url: payload.url || "/dashboard/alerts" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/dashboard/alerts";
  event.waitUntil(self.clients.openWindow(url));
});
