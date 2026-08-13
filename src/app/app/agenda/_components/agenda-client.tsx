"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";
import { SegmentedControl } from "@/components/segmented-control";
import { DatePicker } from "@/components/date-picker";
import { formatIsoDatePtBR, spDayKey, spParts } from "@/lib/datetime";
import { DayAgendaList, type SessaoDia } from "./day-agenda-list";
import { AgendamentoSheet, type AgendamentoInicial } from "./agendamento-sheet";

type Visao = "dia" | "semana";

const viewOptions: { value: Visao; label: string }[] = [
  { value: "dia", label: "Dia" },
  { value: "semana", label: "Semana" },
];

function addDaysToIso(iso: string, days: number): string {
  const [year, month, day] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
    date.getUTCDate(),
  ).padStart(2, "0")}`;
}

export function AgendaClient(
  props:
    | {
        view: "dia";
        data: string;
        alunos: { id: string; nome: string }[];
        sessoesDia: SessaoDia[];
        antecedenciaHoras: number | null;
      }
    | {
        view: "semana";
        data: string;
        alunos: { id: string; nome: string }[];
        sessoesSemana: { key: string; sessoes: SessaoDia[] }[];
      },
) {
  const router = useRouter();

  function navigate(view: Visao, data: string) {
    router.push(`/app/agenda?view=${view}&data=${data}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-3 px-4 pb-3 pt-6">
        <h1 className="text-xl font-semibold">Agenda</h1>
        <SegmentedControl
          options={viewOptions}
          value={props.view}
          onChange={(view) => navigate(view, props.data)}
        />
        {props.view === "dia" && (
          <DatePicker
            value={props.data}
            label={formatIsoDatePtBR(props.data)}
            onChange={(value) => navigate("dia", value)}
            onPrev={() => navigate("dia", addDaysToIso(props.data, -1))}
            onNext={() => navigate("dia", addDaysToIso(props.data, 1))}
          />
        )}
      </div>

      {props.view === "dia" ? (
        <DayAgendaList
          sessoes={props.sessoesDia}
          alunos={props.alunos}
          data={props.data}
          emptyLabel="Nenhuma aula neste dia"
          antecedenciaHoras={props.antecedenciaHoras}
        />
      ) : (
        <WeekView data={props.data} alunos={props.alunos} dias={props.sessoesSemana} />
      )}
    </div>
  );
}

const WEEKDAY_ABBREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function WeekView({
  data,
  alunos,
  dias,
}: {
  data: string;
  alunos: { id: string; nome: string }[];
  dias: { key: string; sessoes: SessaoDia[] }[];
}) {
  const [sheet, setSheet] = useState<
    { mode: "closed" } | { mode: "create" } | { mode: "view"; sessao: SessaoDia }
  >({ mode: "closed" });

  const hoje = spDayKey(new Date());

  const initial: AgendamentoInicial | undefined =
    sheet.mode === "view"
      ? {
          id: sheet.sessao.id,
          alunoId: sheet.sessao.alunoId,
          alunoNome: sheet.sessao.alunoNome,
          data: sheet.sessao.dataHora.slice(0, 10),
          hora: horaDe(sheet.sessao.dataHora),
          duracaoMin: sheet.sessao.duracaoMin,
          local: sheet.sessao.local,
          status: sheet.sessao.status,
        }
      : undefined;

  return (
    <div className="flex flex-1 flex-col px-2 pb-4">
      <div className="grid grid-cols-7 gap-1">
        {dias.map((dia) => {
          const [, , dayOfMonth] = dia.key.split("-").map(Number);
          const weekdayIndex = new Date(`${dia.key}T12:00:00Z`).getUTCDay();
          const isToday = dia.key === hoje;

          return (
            <div key={dia.key} className="flex flex-col gap-1">
              <div
                className={`flex flex-col items-center rounded-[6px] py-1 text-[10px] ${
                  isToday ? "bg-primary/15 text-primary" : "text-fg-muted"
                }`}
              >
                <span>{WEEKDAY_ABBREV[weekdayIndex]}</span>
                <span className="font-semibold">{dayOfMonth}</span>
              </div>
              <div className="flex flex-col gap-1">
                {dia.sessoes.map((sessao) => (
                  <button
                    key={sessao.id}
                    type="button"
                    onClick={() => setSheet({ mode: "view", sessao })}
                    className="rounded-[6px] bg-blue/15 px-1 py-1 text-center text-[10px] font-medium text-blue"
                  >
                    {horaDe(sessao.dataHora)}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

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
          key={sheet.mode === "view" ? sheet.sessao.id : "create"}
          onClose={() => setSheet({ mode: "closed" })}
          alunos={alunos}
          initial={initial}
          defaultData={data}
        />
      )}
    </div>
  );
}

function horaDe(dataHora: string): string {
  const { hour, minute } = spParts(new Date(dataHora));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
