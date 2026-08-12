"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft, Minus, Plus } from "lucide-react";
import { saveConfigReposicao } from "../actions";

type ConfigInput = {
  permitir: boolean;
  antecedencia_horas: number;
  expira_mes_seguinte: boolean;
};

export function ReposicaoConfigForm({ initial }: { initial: ConfigInput }) {
  const [permitir, setPermitir] = useState(initial.permitir);
  const [antecedenciaHoras, setAntecedenciaHoras] = useState(initial.antecedencia_horas);
  const [expiraMesSeguinte, setExpiraMesSeguinte] = useState(initial.expira_mes_seguinte);
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function salvar() {
    setSaved(false);
    startTransition(async () => {
      await saveConfigReposicao({
        permitir,
        antecedencia_horas: antecedenciaHoras,
        expira_mes_seguinte: expiraMesSeguinte,
      });
      setSaved(true);
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2">
        <Link
          href="/app/mais"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="text-base font-semibold">Reposição de aulas</h1>
        <div className="size-11" />
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Permitir reposição</p>
            <p className="text-xs text-fg-muted">
              Cancelamentos com aviso geram crédito de reposição para o aluno.
            </p>
          </div>
          <Toggle checked={permitir} onChange={setPermitir} label="Permitir reposição" />
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <p className="text-sm font-medium">
            Avisar com no mínimo {antecedenciaHoras}h de antecedência
          </p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => setAntecedenciaHoras((h) => Math.max(0, h - 1))}
              aria-label="Diminuir horas de antecedência"
              className="flex size-11 items-center justify-center rounded-full border border-border text-fg"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span className="w-12 text-center text-lg font-semibold tabular-nums">
              {antecedenciaHoras}h
            </span>
            <button
              type="button"
              onClick={() => setAntecedenciaHoras((h) => Math.min(168, h + 1))}
              aria-label="Aumentar horas de antecedência"
              className="flex size-11 items-center justify-center rounded-full border border-border text-fg"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">Reposição expira no mês seguinte</p>
            <p className="text-xs text-fg-muted">
              Se desligado, o crédito não tem data de expiração automática.
            </p>
          </div>
          <Toggle
            checked={expiraMesSeguinte}
            onChange={setExpiraMesSeguinte}
            label="Reposição expira no mês seguinte"
          />
        </section>

        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="h-touch rounded-card bg-primary font-semibold text-bg disabled:opacity-60"
        >
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {saved && !pending && (
          <p className="text-center text-sm text-primary">Configuração salva.</p>
        )}
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative flex h-8 w-14 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-primary" : "bg-white/15"
      }`}
    >
      <span
        className={`absolute size-6 rounded-full bg-white transition-transform ${
          checked ? "translate-x-7" : "translate-x-1"
        }`}
      />
    </button>
  );
}
