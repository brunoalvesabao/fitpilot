"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SessionRow } from "@/components/session-row";
import { PeriodHeader } from "@/components/period-header";
import { spParts } from "@/lib/datetime";
import { AgendamentoSheet, type AgendamentoInicial } from "./agendamento-sheet";
import { FaltaSheet } from "./falta-sheet";
import { setAgendamentoStatus } from "../actions";
import type { StatusAgendamento } from "@/types/database";

export type SessaoDia = {
  id: string;
  dataHora: string;
  status: StatusAgendamento;
  duracaoMin: number;
  local: string | null;
  alunoId: string;
  alunoNome: string;
  planoResumo: string;
};

function periodoDe(dataHora: string): "manha" | "tarde" | "noite" {
  const { hour } = spParts(new Date(dataHora));
  if (hour < 12) return "manha";
  if (hour < 18) return "tarde";
  return "noite";
}

const PERIODO_LABEL = { manha: "Manhã", tarde: "Tarde", noite: "Noite" } as const;

export function DayAgendaList({
  sessoes,
  alunos,
  data,
  emptyLabel = "Nenhuma aula hoje",
  title,
  antecedenciaHoras = null,
}: {
  sessoes: SessaoDia[];
  alunos: { id: string; nome: string }[];
  data: string; // "YYYY-MM-DD", default date for the create sheet
  emptyLabel?: string;
  title?: string;
  antecedenciaHoras?: number | null;
}) {
  const [sheet, setSheet] = useState<
    { mode: "closed" } | { mode: "create" } | { mode: "view"; sessao: SessaoDia }
  >({ mode: "closed" });
  const [faltaSessao, setFaltaSessao] = useState<SessaoDia | null>(null);
  const [, startTransition] = useTransition();
  const [sessoesOtimistas, aplicarStatusOtimista] = useOptimistic(
    sessoes,
    (state, update: { id: string; status: StatusAgendamento }) =>
      state.map((s) => (s.id === update.id ? { ...s, status: update.status } : s)),
  );

  const grupos: { periodo: "manha" | "tarde" | "noite"; sessoes: SessaoDia[] }[] = (
    ["manha", "tarde", "noite"] as const
  )
    .map((periodo) => ({
      periodo,
      sessoes: sessoesOtimistas.filter((s) => periodoDe(s.dataHora) === periodo),
    }))
    .filter((grupo) => grupo.sessoes.length > 0);

  const initial: AgendamentoInicial | undefined =
    sheet.mode === "view"
      ? {
          id: sheet.sessao.id,
          alunoId: sheet.sessao.alunoId,
          alunoNome: sheet.sessao.alunoNome,
          data: sheet.sessao.dataHora.slice(0, 10),
          hora: (() => {
            const { hour, minute } = spParts(new Date(sheet.sessao.dataHora));
            return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
          })(),
          duracaoMin: sheet.sessao.duracaoMin,
          local: sheet.sessao.local,
          status: sheet.sessao.status,
        }
      : undefined;

  function handleCheck(sessao: SessaoDia) {
    const novoStatus = sessao.status === "realizada" ? "agendado" : "realizada";
    startTransition(async () => {
      aplicarStatusOtimista({ id: sessao.id, status: novoStatus });
      await setAgendamentoStatus(sessao.id, novoStatus);
    });
  }

  function handleFaltaClick(sessao: SessaoDia) {
    if (sessao.status === "falta" || sessao.status === "cancelado_com_aviso") {
      startTransition(async () => {
        aplicarStatusOtimista({ id: sessao.id, status: "agendado" });
        await setAgendamentoStatus(sessao.id, "agendado");
      });
    } else {
      setFaltaSessao(sessao);
    }
  }

  return (
    <div className="flex flex-1 flex-col">
      {title && (
        <div className="mt-2 flex items-center justify-between px-4 py-2">
          <h2 className="text-sm font-semibold text-fg-muted">{title}</h2>
          <Link href="/app/agenda" className="text-sm font-medium text-primary">
            Ver agenda
          </Link>
        </div>
      )}

      {sessoesOtimistas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8 py-8 text-center">
          <p className="text-fg-muted">{emptyLabel}</p>
        </div>
      ) : (
        <div>
          {grupos.map((grupo) => (
            <div key={grupo.periodo}>
              <PeriodHeader label={PERIODO_LABEL[grupo.periodo]} />
              {grupo.sessoes.map((sessao) => (
                <SessionRow
                  key={sessao.id}
                  dataHora={sessao.dataHora}
                  status={sessao.status}
                  alunoNome={sessao.alunoNome}
                  planoResumo={sessao.planoResumo}
                  onClick={() => setSheet({ mode: "view", sessao })}
                  onCheck={() => handleCheck(sessao)}
                  onFalta={() => handleFaltaClick(sessao)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setSheet({ mode: "create" })}
        aria-label="Novo agendamento"
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-bg"
        style={{ bottom: "calc(var(--size-touch) + env(safe-area-inset-bottom) + 16px)" }}
      >
        <Plus className="size-6" aria-hidden />
      </button>

      {sheet.mode !== "closed" && (
        <AgendamentoSheet
          key={sheet.mode === "view" ? sheet.sessao.id : "create"}
          onClose={() => setSheet({ mode: "closed" })}
          alunos={alunos}
          initial={initial}
          defaultData={data}
        />
      )}

      {faltaSessao && (
        <FaltaSheet
          sessao={faltaSessao}
          antecedenciaHoras={antecedenciaHoras}
          onClose={() => setFaltaSessao(null)}
          onEscolha={(status) => {
            startTransition(async () => {
              aplicarStatusOtimista({ id: faltaSessao.id, status });
              await setAgendamentoStatus(faltaSessao.id, status);
            });
            setFaltaSessao(null);
          }}
        />
      )}
    </div>
  );
}
