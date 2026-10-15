"use client";

import { useState, useTransition } from "react";
import { reservarVaga } from "../actions";

export function ReservarVagaButton({ vagaId }: { vagaId: string }) {
  const [erro, setErro] = useState<string | null>(null);
  const [reservado, setReservado] = useState(false);
  const [pending, startTransition] = useTransition();

  function reservar() {
    if (!window.confirm("Reservar esta aula? Isso vai usar um crédito de reposição.")) return;
    setErro(null);
    startTransition(async () => {
      const resultado = await reservarVaga(vagaId);
      if (!resultado.success) {
        setErro(resultado.error ?? "Não foi possível reservar. Tente novamente.");
        return;
      }
      setReservado(true);
    });
  }

  if (reservado) {
    return <span className="text-xs font-medium text-primary">Reservada!</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={reservar}
        className="h-9 shrink-0 rounded-full bg-primary px-3 text-xs font-semibold text-bg disabled:opacity-60"
      >
        {pending ? "Reservando..." : "Reservar"}
      </button>
      {erro && <p className="max-w-[160px] text-right text-[11px] text-red">{erro}</p>}
    </div>
  );
}
