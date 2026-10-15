"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { salvarConfigModulos } from "../actions";
import type { ConfigModulosValores } from "@/lib/config-modulos";

export function ModulosConfigForm({
  initial,
  onSalvar,
  aoConcluir,
}: {
  initial: ConfigModulosValores;
  onSalvar?: "onboarding" | "mais";
  aoConcluir?: () => void;
}) {
  const [moduloFinanceiro, setModuloFinanceiro] = useState(initial.modulo_financeiro);
  const [moduloReposicao, setModuloReposicao] = useState(initial.modulo_reposicao);
  const [pending, startTransition] = useTransition();
  const [salvo, setSalvo] = useState(false);

  function salvar() {
    setSalvo(false);
    startTransition(async () => {
      await salvarConfigModulos({
        modulo_financeiro: moduloFinanceiro,
        modulo_reposicao: moduloReposicao,
        modulo_avaliacao: false,
      });
      setSalvo(true);
      aoConcluir?.();
    });
  }

  return (
    <div className="flex flex-1 flex-col">
      {onSalvar !== "onboarding" && (
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2">
          <Link
            href="/app/mais"
            aria-label="Voltar"
            className="flex size-11 items-center justify-center text-fg-muted"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </Link>
          <h1 className="text-base font-semibold">Módulos</h1>
          <div className="size-11" />
        </header>
      )}

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        {onSalvar === "onboarding" && (
          <div className="flex flex-col gap-1 pb-2 pt-4">
            <h1 className="text-xl font-semibold">Vamos configurar seu FitPilot</h1>
            <p className="text-sm text-fg-muted">
              Escolha o que você quer usar. Dá pra mudar isso a qualquer momento em
              Mais → Módulos.
            </p>
          </div>
        )}

        <ModuloRow
          titulo="Financeiro"
          descricao="Controle de mensalidades, pagamentos e cobrança em atraso."
          checked={moduloFinanceiro}
          onChange={setModuloFinanceiro}
        />
        <ModuloRow
          titulo="Reposição de aulas"
          descricao="Crédito automático de reposição quando um aluno cancela com aviso."
          checked={moduloReposicao}
          onChange={setModuloReposicao}
        />
        <ModuloRow
          titulo="Avaliação física"
          descricao="Em breve."
          checked={false}
          onChange={() => {}}
          disabled
        />

        <button
          type="button"
          onClick={salvar}
          disabled={pending}
          className="mt-2 h-touch rounded-card bg-primary font-semibold text-bg disabled:opacity-60"
        >
          {pending
            ? "Salvando..."
            : onSalvar === "onboarding"
              ? "Começar a usar"
              : "Salvar"}
        </button>
        {salvo && !pending && onSalvar !== "onboarding" && (
          <p className="text-center text-sm text-primary">Configuração salva.</p>
        )}
      </div>
    </div>
  );
}

function ModuloRow({
  titulo,
  descricao,
  checked,
  onChange,
  disabled,
}: {
  titulo: string;
  descricao: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <section
      className={`flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 ${
        disabled ? "opacity-50" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{titulo}</p>
        <p className="text-xs text-fg-muted">{descricao}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} label={titulo} disabled={disabled} />
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative flex h-8 w-14 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed ${
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
