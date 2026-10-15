// Service worker mínimo do FitPilot: só existe pra receber notificações
// push (vaga de reposição liberada). Não faz cache nem funciona offline.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: "FitPilot", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "FitPilot", {
      body: payload.body || "",
      icon: "/icons/apple-touch-icon.png",
      data: { url: payload.url || "/aluno/inicio" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/aluno/inicio";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && "focus" in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
