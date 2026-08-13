"use client";

import { useEffect } from "react";

export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-12 text-center">
      <p className="text-base font-semibold">Algo deu errado</p>
      <p className="text-sm text-fg-muted">
        Não foi possível carregar esta tela. Tente novamente em instantes.
      </p>
      <button
        type="button"
        onClick={reset}
        className="h-touch rounded-card bg-primary px-5 font-medium text-bg"
      >
        Tentar novamente
      </button>
    </div>
  );
}
