import webpush from "web-push";

const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT ?? "mailto:contato@fitpilot.app.br";

if (publicKey && privateKey) {
  webpush.setVapidDetails(subject, publicKey, privateKey);
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
  if (!publicKey || !privateKey) return;

  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
