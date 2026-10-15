"use client";

import { useEffect, useState, useTransition } from "react";
import { salvarInscricaoPush } from "../actions";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function AtivarNotificacoesButton() {
  const [estado, setEstado] = useState({ suportado: false, ativo: false });
  const [erro, setErro] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { suportado, ativo } = estado;

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => setEstado({ suportado: true, ativo: !!subscription }))
      .catch(() => setEstado((atual) => ({ ...atual, suportado: true })));
  }, []);

  function ativar() {
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setErro("Notificações não configuradas neste app ainda.");
      return;
    }

    setErro(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;

        const permissao = await Notification.requestPermission();
        if (permissao !== "granted") {
          setErro("Permissão de notificação negada.");
          return;
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
        });

        const json = subscription.toJSON();
        if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
          setErro("Não foi possível ativar as notificações.");
          return;
        }

        const resultado = await salvarInscricaoPush({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        });

        if (!resultado.success) {
          setErro("Não foi possível salvar. Tente novamente.");
          return;
        }

        setEstado((atual) => ({ ...atual, ativo: true }));
      } catch {
        setErro("Não foi possível ativar as notificações neste dispositivo.");
      }
    });
  }

  if (!suportado || ativo) return null;

  return (
    <div className="mb-4 flex flex-col items-start gap-1 rounded-card border border-border bg-surface p-3">
      <p className="text-sm text-fg-muted">
        Ative as notificações pra saber na hora quando uma vaga de reposição abrir.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={ativar}
        className="text-sm font-semibold text-primary disabled:opacity-60"
      >
        {pending ? "Ativando..." : "Ativar notificações"}
      </button>
      {erro && <p className="text-xs text-red">{erro}</p>}
    </div>
  );
}
