"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { SegmentedControl } from "@/components/segmented-control";
import { spDayKey } from "@/lib/datetime";
import { registrarPagamento } from "../actions";
import type { MetodoPagamento } from "@/types/database";

const metodoOptions: { value: MetodoPagamento; label: string }[] = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "cartao", label: "Cartão" },
  { value: "transferencia", label: "Transferência" },
];

export function MarcarPagamentoSheet({
  alunoId,
  alunoNome,
  valorMensal,
  competenciaInicial,
  onClose,
}: {
  alunoId: string;
  alunoNome: string;
  valorMensal: number | null;
  competenciaInicial: string;
  onClose: () => void;
}) {
  const [valor, setValor] = useState(valorMensal != null ? String(valorMensal) : "");
  const [competenciaMes, setCompetenciaMes] = useState(competenciaInicial.slice(0, 7));
  const [dataPagamento, setDataPagamento] = useState(spDayKey(new Date()));
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [pending, startTransition] = useTransition();

  const valorNumerico = Number(valor.replace(",", "."));
  const valido =
    valor.trim() !== "" &&
    !Number.isNaN(valorNumerico) &&
    valorNumerico > 0 &&
    /^\d{4}-\d{2}$/.test(competenciaMes) &&
    dataPagamento !== "";

  function confirmar() {
    if (!valido) return;
    startTransition(async () => {
      await registrarPagamento({
        alunoId,
        competencia: `${competenciaMes}-01`,
        valor: valorNumerico,
        dataPagamento,
        metodo,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        className="relative flex max-h-[90vh] flex-col rounded-t-card border-t border-border bg-surface"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="truncate text-base font-semibold">{alunoNome}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-11 items-center justify-center text-fg-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto px-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="valor" className="text-sm text-fg-muted">
              Valor
            </label>
            <input
              id="valor"
              type="text"
              inputMode="decimal"
              value={valor}
              onChange={(event) => setValor(event.target.value)}
              className="h-touch rounded-card border border-border bg-bg px-4 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="competencia" className="text-sm text-fg-muted">
              Competência
            </label>
            <input
              id="competencia"
              type="month"
              value={competenciaMes}
              onChange={(event) => setCompetenciaMes(event.target.value)}
              className="h-touch rounded-card border border-border bg-bg px-4 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="data_pagamento" className="text-sm text-fg-muted">
              Data do pagamento
            </label>
            <input
              id="data_pagamento"
              type="date"
              value={dataPagamento}
              onChange={(event) => setDataPagamento(event.target.value)}
              className="h-touch rounded-card border border-border bg-bg px-4 text-fg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm text-fg-muted">Método</span>
            <SegmentedControl options={metodoOptions} value={metodo} onChange={setMetodo} />
          </div>

          <button
            type="button"
            onClick={confirmar}
            disabled={!valido || pending}
            className="h-touch rounded-card bg-primary font-semibold text-bg disabled:opacity-60"
          >
            {pending ? "Confirmando..." : "Confirmar recebimento"}
          </button>
        </div>
      </div>
    </div>
  );
}
