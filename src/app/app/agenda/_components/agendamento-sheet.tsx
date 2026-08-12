"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { X } from "lucide-react";
import { Pill } from "@/components/status-pill";
import { formatIsoDatePtBR } from "@/lib/datetime";
import { emptyFormState, type FormState } from "../form-state";
import { createAgendamento, updateAgendamento, deleteAgendamento } from "../actions";
import type { StatusAgendamento } from "@/types/database";

export type AgendamentoInicial = {
  id: string;
  alunoId: string;
  alunoNome: string;
  data: string; // "YYYY-MM-DD"
  hora: string; // "HH:mm"
  duracaoMin: number;
  local: string | null;
  status: StatusAgendamento;
};

const statusConfig: Record<StatusAgendamento, { label: string; color: "blue" | "green" | "red" | "gray" }> = {
  agendado: { label: "Agendado", color: "blue" },
  realizada: { label: "Realizada", color: "green" },
  falta: { label: "Falta", color: "red" },
  cancelado_com_aviso: { label: "Cancelado", color: "gray" },
};

const inputClasses =
  "h-touch rounded-card border border-border bg-bg px-4 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary";

export function AgendamentoSheet({
  onClose,
  alunos,
  initial,
  defaultData,
}: {
  onClose: () => void;
  alunos: { id: string; nome: string }[];
  initial?: AgendamentoInicial;
  defaultData?: string; // "YYYY-MM-DD", used for create when opened from a specific day
}) {
  const [mode, setMode] = useState<"view" | "form">(initial ? "view" : "form");

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
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
          <h2 className="text-base font-semibold">
            {mode === "view" ? "Agendamento" : initial ? "Editar agendamento" : "Novo agendamento"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 items-center justify-center text-fg-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4">
          {mode === "view" && initial ? (
            <AgendamentoView
              initial={initial}
              onEditar={() => setMode("form")}
              onExcluido={onClose}
            />
          ) : (
            <AgendamentoForm
              alunos={alunos}
              initial={initial}
              defaultData={defaultData}
              onSuccess={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AgendamentoView({
  initial,
  onEditar,
  onExcluido,
}: {
  initial: AgendamentoInicial;
  onEditar: () => void;
  onExcluido: () => void;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-card border border-border bg-bg p-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-semibold">{initial.alunoNome}</span>
          <Pill color={statusConfig[initial.status].color}>
            {statusConfig[initial.status].label}
          </Pill>
        </div>
        <Row label="Data" value={formatIsoDatePtBR(initial.data)} />
        <Row label="Hora" value={initial.hora} />
        <Row label="Duração" value={`${initial.duracaoMin} min`} />
        <Row label="Local" value={initial.local ?? "-"} />
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onEditar}
          className="h-touch flex-1 rounded-card border border-border font-medium"
        >
          Editar
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Tem certeza que deseja excluir este agendamento?")) {
              startTransition(async () => {
                await deleteAgendamento(initial.id);
                onExcluido();
              });
            }
          }}
          className="h-touch flex-1 rounded-card border border-border font-medium text-red disabled:opacity-60"
        >
          {pending ? "Excluindo..." : "Excluir"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function AgendamentoForm({
  alunos,
  initial,
  defaultData,
  onSuccess,
}: {
  alunos: { id: string; nome: string }[];
  initial?: AgendamentoInicial;
  defaultData?: string;
  onSuccess: () => void;
}) {
  const action = initial ? updateAgendamento.bind(null, initial.id) : createAgendamento;
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, emptyFormState);

  const [busca, setBusca] = useState(initial?.alunoNome ?? "");
  const [alunoId, setAlunoId] = useState(initial?.alunoId ?? "");
  const [data, setData] = useState(initial?.data ?? defaultData ?? "");
  const [hora, setHora] = useState(initial?.hora ?? "");
  const [duracaoMin, setDuracaoMin] = useState(String(initial?.duracaoMin ?? 60));
  const [local, setLocal] = useState(initial?.local ?? "");

  useEffect(() => {
    if (state.success) onSuccess();
  }, [state.success, onSuccess]);

  const alunosFiltrados =
    busca.trim().length === 0 || alunoId
      ? []
      : alunos.filter((a) => a.nome.toLowerCase().includes(busca.trim().toLowerCase()));

  const isValid = alunoId !== "" && data !== "" && hora !== "";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.formError && <p className="text-sm text-red">{state.formError}</p>}

      <input type="hidden" name="aluno_id" value={alunoId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="aluno_busca" className="text-sm text-fg-muted">
          Aluno
        </label>
        <input
          id="aluno_busca"
          type="text"
          placeholder="Buscar aluno"
          value={busca}
          onChange={(event) => {
            setBusca(event.target.value);
            setAlunoId("");
          }}
          className={inputClasses}
        />
        {alunosFiltrados.length > 0 && (
          <div className="flex flex-col overflow-hidden rounded-card border border-border">
            {alunosFiltrados.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setAlunoId(a.id);
                  setBusca(a.nome);
                }}
                className="h-touch px-4 text-left text-sm hover:bg-bg"
              >
                {a.nome}
              </button>
            ))}
          </div>
        )}
        {state.errors.aluno_id && <p className="text-sm text-red">{state.errors.aluno_id}</p>}
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="data" className="text-sm text-fg-muted">
            Data
          </label>
          <input
            id="data"
            name="data"
            type="date"
            value={data}
            onChange={(event) => setData(event.target.value)}
            className={inputClasses}
          />
          {state.errors.data && <p className="text-sm text-red">{state.errors.data}</p>}
        </div>

        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="hora" className="text-sm text-fg-muted">
            Hora
          </label>
          <input
            id="hora"
            name="hora"
            type="time"
            value={hora}
            onChange={(event) => setHora(event.target.value)}
            className={inputClasses}
          />
          {state.errors.hora && <p className="text-sm text-red">{state.errors.hora}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="duracao_min" className="text-sm text-fg-muted">
          Duração (min)
        </label>
        <input
          id="duracao_min"
          name="duracao_min"
          type="text"
          inputMode="numeric"
          value={duracaoMin}
          onChange={(event) => setDuracaoMin(event.target.value)}
          className={inputClasses}
        />
        {state.errors.duracao_min && (
          <p className="text-sm text-red">{state.errors.duracao_min}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="local" className="text-sm text-fg-muted">
          Local
        </label>
        <input
          id="local"
          name="local"
          type="text"
          placeholder="Ex: Academia, casa do aluno"
          value={local}
          onChange={(event) => setLocal(event.target.value)}
          className={inputClasses}
        />
      </div>

      <button
        type="submit"
        disabled={!isValid || pending}
        className="h-touch rounded-card bg-primary font-medium text-bg disabled:opacity-60"
      >
        {pending ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
}
