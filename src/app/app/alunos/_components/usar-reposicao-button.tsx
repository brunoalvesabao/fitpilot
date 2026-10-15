"use client";

import { useState, useTransition } from "react";
import { AgendamentoSheet } from "../../agenda/_components/agendamento-sheet";
import { usarReposicao } from "../actions";
import { spDayKey } from "@/lib/datetime";

export function UsarReposicaoButton({
  creditoId,
  alunoId,
  alunoNome,
}: {
  creditoId: string;
  alunoId: string;
  alunoNome: string;
}) {
  const [aberto, setAberto] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="h-9 shrink-0 rounded-full border border-blue px-3 text-xs font-medium text-blue"
      >
        Agendar reposição
      </button>

      {aberto && (
        <AgendamentoSheet
          onClose={() => setAberto(false)}
          alunos={[{ id: alunoId, nome: alunoNome }]}
          defaultAlunoId={alunoId}
          defaultData={spDayKey(new Date())}
          onCreated={() => {
            startTransition(() => usarReposicao(creditoId));
          }}
        />
      )}
    </>
  );
}
