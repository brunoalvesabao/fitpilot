"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { maskPhoneBR } from "@/lib/format";
import { emptyFormState, type FormState } from "../form-state";
import type { Aluno, DiaSemana, HorarioFixo } from "@/types/database";

const DIAS: { dia: DiaSemana; letra: string; nomeCompleto: string }[] = [
  { dia: 1, letra: "S", nomeCompleto: "Segunda-feira" },
  { dia: 2, letra: "T", nomeCompleto: "Terça-feira" },
  { dia: 3, letra: "Q", nomeCompleto: "Quarta-feira" },
  { dia: 4, letra: "Q", nomeCompleto: "Quinta-feira" },
  { dia: 5, letra: "S", nomeCompleto: "Sexta-feira" },
  { dia: 6, letra: "S", nomeCompleto: "Sábado" },
  { dia: 0, letra: "D", nomeCompleto: "Domingo" },
];

const inputClasses =
  "h-touch rounded-card border border-border bg-surface px-4 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary";

type FormAction = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function AlunoForm({
  title,
  action,
  initialAluno,
  initialHorarios = [],
}: {
  title: string;
  action: FormAction;
  initialAluno?: Aluno | null;
  initialHorarios?: HorarioFixo[];
}) {
  const [state, formAction, pending] = useActionState(action, emptyFormState);

  const [nome, setNome] = useState(initialAluno?.nome ?? "");
  const [telefone, setTelefone] = useState(
    initialAluno?.telefone ? maskPhoneBR(initialAluno.telefone) : "",
  );
  const [valorMensal, setValorMensal] = useState(
    initialAluno?.valor_mensal != null ? String(initialAluno.valor_mensal) : "",
  );
  const [aulasPorMes, setAulasPorMes] = useState(
    initialAluno?.aulas_por_mes != null ? String(initialAluno.aulas_por_mes) : "",
  );
  const [diaVencimento, setDiaVencimento] = useState(
    initialAluno?.dia_vencimento != null ? String(initialAluno.dia_vencimento) : "",
  );
  const [observacoes, setObservacoes] = useState(initialAluno?.observacoes ?? "");

  type HorarioDia = { hora: string; local: string };

  const [horarios, setHorarios] = useState<Partial<Record<DiaSemana, HorarioDia>>>(() => {
    const initial: Partial<Record<DiaSemana, HorarioDia>> = {};
    for (const horario of initialHorarios) {
      initial[horario.dia_semana] = {
        hora: horario.hora.slice(0, 5),
        local: horario.local ?? "",
      };
    }
    return initial;
  });

  function toggleDia(dia: DiaSemana) {
    setHorarios((prev) => {
      const next = { ...prev };
      if (next[dia] != null) {
        delete next[dia];
      } else {
        next[dia] = { hora: "06:00", local: "" };
      }
      return next;
    });
  }

  function setHoraForDia(dia: DiaSemana, hora: string) {
    setHorarios((prev) => ({ ...prev, [dia]: { ...prev[dia]!, hora } }));
  }

  function setLocalForDia(dia: DiaSemana, local: string) {
    setHorarios((prev) => ({ ...prev, [dia]: { ...prev[dia]!, local } }));
  }

  const horariosPayload = useMemo(
    () =>
      DIAS.filter(({ dia }) => horarios[dia] != null).map(({ dia }) => ({
        dia_semana: dia,
        hora: horarios[dia]!.hora,
        local: horarios[dia]!.local.trim() || null,
      })),
    [horarios],
  );

  const valorMensalValido =
    valorMensal === "" ||
    (!Number.isNaN(Number(valorMensal.replace(",", "."))) &&
      Number(valorMensal.replace(",", ".")) >= 0);
  const aulasPorMesValido =
    aulasPorMes === "" || (Number.isInteger(Number(aulasPorMes)) && Number(aulasPorMes) > 0);
  const diaVencimentoValido =
    diaVencimento === "" ||
    (Number.isInteger(Number(diaVencimento)) &&
      Number(diaVencimento) >= 1 &&
      Number(diaVencimento) <= 31);

  const isValid =
    nome.trim().length > 0 &&
    valorMensalValido &&
    aulasPorMesValido &&
    diaVencimentoValido;

  return (
    <form action={formAction} className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2">
        <Link
          href="/app/alunos"
          aria-label="Fechar"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <X className="size-5" aria-hidden />
        </Link>
        <h1 className="text-base font-semibold">{title}</h1>
        <button
          type="submit"
          disabled={!isValid || pending}
          className="h-11 px-3 text-base font-semibold text-primary disabled:text-fg-faint"
        >
          Salvar
        </button>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {state.formError && (
          <p className="text-sm text-red">{state.formError}</p>
        )}

        <input type="hidden" name="horarios" value={JSON.stringify(horariosPayload)} />

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="nome" className="text-sm text-fg-muted">
              Nome completo
            </label>
            <input
              id="nome"
              name="nome"
              type="text"
              required
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              className={inputClasses}
            />
            {state.errors.nome && (
              <p className="text-sm text-red">{state.errors.nome}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="telefone" className="text-sm text-fg-muted">
              Telefone
            </label>
            <input
              id="telefone"
              name="telefone"
              type="tel"
              inputMode="numeric"
              placeholder="(11) 91234-5678"
              value={telefone}
              onChange={(event) => setTelefone(maskPhoneBR(event.target.value))}
              className={inputClasses}
            />
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Plano</span>
            <p className="h-touch flex items-center rounded-card border border-border bg-bg px-4 text-fg">
              Mensal
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="valor_mensal" className="text-sm text-fg-muted">
              Valor mensal (R$)
            </label>
            <input
              id="valor_mensal"
              name="valor_mensal"
              type="text"
              inputMode="decimal"
              placeholder="450"
              value={valorMensal}
              onChange={(event) => setValorMensal(event.target.value)}
              className={inputClasses}
            />
            {(state.errors.valor_mensal || !valorMensalValido) && (
              <p className="text-sm text-red">
                {state.errors.valor_mensal ?? "Valor mensal inválido."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="aulas_por_mes" className="text-sm text-fg-muted">
              Aulas por mês
            </label>
            <input
              id="aulas_por_mes"
              name="aulas_por_mes"
              type="text"
              inputMode="numeric"
              placeholder="8"
              value={aulasPorMes}
              onChange={(event) => setAulasPorMes(event.target.value)}
              className={inputClasses}
            />
            {(state.errors.aulas_por_mes || !aulasPorMesValido) && (
              <p className="text-sm text-red">
                {state.errors.aulas_por_mes ?? "Número de aulas inválido."}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="dia_vencimento" className="text-sm text-fg-muted">
              Dia de vencimento
            </label>
            <input
              id="dia_vencimento"
              name="dia_vencimento"
              type="text"
              inputMode="numeric"
              placeholder="10"
              value={diaVencimento}
              onChange={(event) => setDiaVencimento(event.target.value)}
              className={inputClasses}
            />
            {(state.errors.dia_vencimento || !diaVencimentoValido) && (
              <p className="text-sm text-red">
                {state.errors.dia_vencimento ?? "Dia de vencimento deve ser entre 1 e 31."}
              </p>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <span className="text-sm text-fg-muted">Horários fixos</span>
          <div className="flex justify-between gap-1">
            {DIAS.map(({ dia, letra, nomeCompleto }) => {
              const ativo = horarios[dia] != null;
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => toggleDia(dia)}
                  aria-pressed={ativo}
                  aria-label={nomeCompleto}
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    ativo ? "bg-primary text-bg" : "bg-bg text-fg-muted"
                  }`}
                >
                  {letra}
                </button>
              );
            })}
          </div>

          {horariosPayload.length > 0 && (
            <div className="flex flex-col gap-3 pt-1">
              {DIAS.filter(({ dia }) => horarios[dia] != null).map(({ dia, nomeCompleto }) => (
                <div key={dia} className="flex flex-col gap-1.5 rounded-card border border-border bg-bg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{nomeCompleto}</span>
                    <input
                      type="time"
                      value={horarios[dia]!.hora}
                      onChange={(event) => setHoraForDia(dia, event.target.value)}
                      className="h-touch rounded-card border border-border bg-surface px-3 text-fg"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Academia, condomínio, online..."
                    value={horarios[dia]!.local}
                    onChange={(event) => setLocalForDia(dia, event.target.value)}
                    className="h-touch rounded-card border border-border bg-surface px-3 text-sm text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          )}
          {state.errors.horarios && (
            <p className="text-sm text-red">{state.errors.horarios}</p>
          )}
        </section>

        <section className="flex flex-col gap-1.5 rounded-card border border-border bg-surface p-4">
          <label htmlFor="observacoes" className="text-sm text-fg-muted">
            Observações
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={4}
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            className="resize-none rounded-card border border-border bg-bg px-4 py-3 text-fg placeholder:text-fg-faint focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </section>
      </div>
    </form>
  );
}
