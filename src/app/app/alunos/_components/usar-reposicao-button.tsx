"use client";

import { useTransition } from "react";
import { usarReposicao } from "../actions";

export function UsarReposicaoButton({ creditoId }: { creditoId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => usarReposicao(creditoId))}
      className="h-9 shrink-0 rounded-full border border-blue px-3 text-xs font-medium text-blue disabled:opacity-60"
    >
      {pending ? "Usando..." : "Usar reposição"}
    </button>
  );
}
