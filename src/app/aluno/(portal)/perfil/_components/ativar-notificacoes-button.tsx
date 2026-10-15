"use client";

import { useEffect, useState, useTransition } from "react";
import { salvarInscricaoPush, removerInscricaoPush } from "../actions";

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

    // Precisa registrar aqui, não só checar — se o service worker nunca
    // tiver sido registrado antes (primeira visita), "serviceWorker.ready"
    // nunca resolve sozinho, e o botão ficaria escondido pra sempre mesmo
    // em um dispositivo que suporta notificação. O registro é idempotente:
    // se já existir, só devolve o registro existente.
    navigator.serviceWorker
      .register("/sw.js")
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

  function desativar() {
    setErro(null);
    startTransition(async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await removerInscricaoPush(subscription.endpoint);
          await subscription.unsubscribe();
        }
        setEstado((atual) => ({ ...atual, ativo: false }));
      } catch {
        setErro("Não foi possível desativar neste dispositivo.");
      }
    });
  }

  if (!suportado) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">Notificações de vaga</p>
        <p className="mt-0.5 text-xs text-fg-muted">
          Avisa na hora quando uma vaga de reposição abrir.
        </p>
        {erro && <p className="mt-1 text-xs text-red">{erro}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={ativo}
        aria-label="Notificações de vaga"
        disabled={pending}
        onClick={ativo ? desativar : ativar}
        className={`relative flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
          ativo ? "bg-primary" : "bg-white/15"
        }`}
      >
        <span
          className={`absolute size-6 rounded-full bg-white transition-transform ${
            ativo ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
