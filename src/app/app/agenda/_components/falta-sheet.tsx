"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { SessaoDia } from "./day-agenda-list";

export function FaltaSheet({
  sessao,
  antecedenciaHoras,
  onClose,
  onEscolha,
}: {
  sessao: SessaoDia;
  antecedenciaHoras: number | null;
  onClose: () => void;
  onEscolha: (status: "falta" | "cancelado_com_aviso") => void;
}) {
  const [agora] = useState(() => Date.now());
  const horasAteAula = (new Date(sessao.dataHora).getTime() - agora) / 3_600_000;
  const foraDoPrazo = antecedenciaHoras != null && horasAteAula < antecedenciaHoras;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative flex max-h-[85vh] flex-col rounded-t-card border-t border-border bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-base font-semibold">Como foi essa falta?</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 items-center justify-center text-fg-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-3 px-4 py-4">
          <button
            type="button"
            onClick={() => onEscolha("falta")}
            className="h-touch rounded-card border border-red font-medium text-red"
          >
            Faltou sem avisar
          </button>

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={() => onEscolha("cancelado_com_aviso")}
              className="h-touch rounded-card border border-blue font-medium text-blue"
            >
              Cancelou com aviso
            </button>
            {foraDoPrazo && (
              <p className="text-xs text-amber">
                Cancelamento fora do prazo de {antecedenciaHoras}h — o aluno não teria direito a
                reposição
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
