"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { SessionRow } from "@/components/session-row";
import { PeriodHeader } from "@/components/period-header";
import { spParts } from "@/lib/datetime";
import { calcularSlotsLivres, type SlotLivre } from "@/lib/horarios-livres";
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

type ItemDia =
  | { tipo: "sessao"; inicioMs: number; sessao: SessaoDia }
  | { tipo: "livre"; inicioMs: number; slot: SlotLivre };

function SlotLivreRow({ slot, onClick }: { slot: SlotLivre; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-touch w-full items-center gap-3 border-b border-dashed border-border py-3 pl-4 pr-4 text-left"
    >
      <span className="w-12 shrink-0 font-mono text-sm tabular-nums text-fg-faint">
        {slot.inicioLabel}
      </span>
      <span className="h-10 w-1 shrink-0 rounded-full border border-dashed border-fg-faint" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-fg-muted">
          Livre até {slot.fimLabel} · encaixe um aluno novo ou reposição
        </p>
      </div>
      <Plus className="size-4 shrink-0 text-fg-faint" aria-hidden />
    </button>
  );
}

export function DayAgendaList({
  sessoes,
  alunos,
  data,
  emptyLabel = "Nenhuma aula hoje",
  title,
  antecedenciaHoras = null,
  mostrarSlotsLivres = false,
}: {
  sessoes: SessaoDia[];
  alunos: { id: string; nome: string }[];
  data: string; // "YYYY-MM-DD", default date for the create sheet
  emptyLabel?: string;
  title?: string;
  antecedenciaHoras?: number | null;
  mostrarSlotsLivres?: boolean; // mostra os horários vagos do dia, pra encaixar aluno novo/reposição
}) {
  const [sheet, setSheet] = useState<
    | { mode: "closed" }
    | { mode: "create"; hora?: string }
    | { mode: "view"; sessao: SessaoDia }
  >({ mode: "closed" });
  const [faltaSessao, setFaltaSessao] = useState<SessaoDia | null>(null);
  const [, startTransition] = useTransition();
  const [sessoesOtimistas, aplicarStatusOtimista] = useOptimistic(
    sessoes,
    (state, update: { id: string; status: StatusAgendamento }) =>
      state.map((s) => (s.id === update.id ? { ...s, status: update.status } : s)),
  );

  const slotsLivres = useMemo(
    () =>
      mostrarSlotsLivres
        ? calcularSlotsLivres(
            data,
            sessoesOtimistas.map((s) => ({ dataHora: s.dataHora, duracaoMin: s.duracaoMin })),
          )
        : [],
    [data, sessoesOtimistas, mostrarSlotsLivres],
  );

  const itens: ItemDia[] = [
    ...sessoesOtimistas.map(
      (sessao): ItemDia => ({
        tipo: "sessao",
        inicioMs: new Date(sessao.dataHora).getTime(),
        sessao,
      }),
    ),
    ...slotsLivres.map(
      (slot): ItemDia => ({ tipo: "livre", inicioMs: new Date(slot.inicioISO).getTime(), slot }),
    ),
  ].sort((a, b) => a.inicioMs - b.inicioMs);

  const grupos: { periodo: "manha" | "tarde" | "noite"; itens: ItemDia[] }[] = (
    ["manha", "tarde", "noite"] as const
  )
    .map((periodo) => ({
      periodo,
      itens: itens.filter((item) => {
        const dataHora =
          item.tipo === "sessao" ? item.sessao.dataHora : item.slot.inicioISO;
        return periodoDe(dataHora) === periodo;
      }),
    }))
    .filter((grupo) => grupo.itens.length > 0);

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

      {itens.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8 py-8 text-center">
          <p className="text-fg-muted">{emptyLabel}</p>
        </div>
      ) : (
        <div>
          {grupos.map((grupo) => (
            <div key={grupo.periodo}>
              <PeriodHeader label={PERIODO_LABEL[grupo.periodo]} />
              {grupo.itens.map((item) =>
                item.tipo === "sessao" ? (
                  <SessionRow
                    key={item.sessao.id}
                    dataHora={item.sessao.dataHora}
                    status={item.sessao.status}
                    alunoNome={item.sessao.alunoNome}
                    planoResumo={item.sessao.planoResumo}
                    onClick={() => setSheet({ mode: "view", sessao: item.sessao })}
                    onCheck={() => handleCheck(item.sessao)}
                    onFalta={() => handleFaltaClick(item.sessao)}
                  />
                ) : (
                  <SlotLivreRow
                    key={item.slot.inicioISO}
                    slot={item.slot}
                    onClick={() => setSheet({ mode: "create", hora: item.slot.inicioLabel })}
                  />
                ),
              )}
            </div>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => setSheet({ mode: "create" })}
        aria-label="Novo agendamento"
        className="fixed z-40 flex size-14 items-center justify-center rounded-full bg-primary text-bg"
        style={{ bottom: "calc(env(safe-area-inset-bottom) + 96px)", right: "20px" }}
      >
        <Plus className="size-6" aria-hidden />
      </button>

      {sheet.mode !== "closed" && (
        <AgendamentoSheet
          key={sheet.mode === "view" ? sheet.sessao.id : `create-${sheet.mode === "create" ? sheet.hora : ""}`}
          onClose={() => setSheet({ mode: "closed" })}
          alunos={alunos}
          initial={initial}
          defaultData={data}
          defaultHora={sheet.mode === "create" ? sheet.hora : undefined}
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
