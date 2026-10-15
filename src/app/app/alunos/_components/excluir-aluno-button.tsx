"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { excluirAlunoPermanentemente } from "../actions";

export function ExcluirAlunoButton({
  alunoId,
  alunoNome,
}: {
  alunoId: string;
  alunoNome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [confirmacao, setConfirmacao] = useState("");
  const [pending, startTransition] = useTransition();

  const podeExcluir = confirmacao.trim().toLowerCase() === alunoNome.trim().toLowerCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-touch text-sm font-medium text-red"
      >
        Excluir permanentemente
      </button>

      {aberto && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => setAberto(false)}
            className="absolute inset-0 bg-black/50"
          />
          <div
            className="relative flex max-h-[85vh] flex-col rounded-t-card border-t border-border bg-surface"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
              <h2 className="text-base font-semibold text-red">Excluir permanentemente</h2>
              <button
                type="button"
                onClick={() => setAberto(false)}
                aria-label="Fechar"
                className="flex size-11 items-center justify-center text-fg-muted"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="flex flex-col gap-4 px-4 py-4">
              <p className="text-sm text-fg-muted">
                Isso apaga definitivamente o cadastro de <strong className="text-fg">{alunoNome}</strong>,
                horários fixos, histórico de aulas, pagamentos e créditos de reposição.
                Não pode ser desfeito.
              </p>
              <p className="text-sm text-fg-muted">
                Para confirmar, digite o nome do aluno: <strong className="text-fg">{alunoNome}</strong>
              </p>
              <input
                type="text"
                value={confirmacao}
                onChange={(event) => setConfirmacao(event.target.value)}
                className="h-touch rounded-card border border-border bg-bg px-4 text-fg focus:outline-none focus:ring-2 focus:ring-red"
              />
              <button
                type="button"
                disabled={!podeExcluir || pending}
                onClick={() => {
                  startTransition(() => {
                    excluirAlunoPermanentemente(alunoId);
                  });
                }}
                className="h-touch rounded-card bg-red font-semibold text-white disabled:opacity-40"
              >
                {pending ? "Excluindo..." : "Excluir permanentemente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
