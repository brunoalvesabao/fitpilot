import webpush from "web-push";

const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:contato@fitpilot.app.br";

// Configuração de push é opcional e nunca deve poder derrubar o build ou a
// aplicação inteira por causa de uma chave ausente/mal colada — só
// desativa o envio de notificações (ver enviarPush abaixo).
let pushConfigurado = false;
try {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    pushConfigurado = true;
  }
} catch (error) {
  console.error(
    "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY inválidas — notificações push desativadas:",
    error,
  );
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

export type PushSubscriptionData = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

/** Silenciosamente vira no-op se as chaves VAPID não estiverem configuradas. */
export async function enviarPush(
  subscription: PushSubscriptionData,
  payload: PushPayload,
): Promise<void> {
  if (!pushConfigurado) return;

  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
