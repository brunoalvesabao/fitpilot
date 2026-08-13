"use client";

import { useState } from "react";
import { Pill } from "@/components/status-pill";
import { formatCurrencyBRL } from "@/lib/format";
import { formatDiaMesPtBR } from "@/lib/datetime";
import { MarcarPagamentoSheet } from "@/app/app/financeiro/_components/marcar-pagamento-sheet";
import type { StatusCobranca } from "@/lib/financeiro";

export type LinhaPagamentoMes = {
  competencia: string;
  mesLabel: string;
  valor: number | null;
  status: StatusCobranca;
  dataPagamento: string | null;
};

export function PagamentosList({
  alunoId,
  alunoNome,
  valorMensal,
  linhas,
}: {
  alunoId: string;
  alunoNome: string;
  valorMensal: number | null;
  linhas: LinhaPagamentoMes[];
}) {
  const [sheetCompetencia, setSheetCompetencia] = useState<string | null>(null);

  return (
    <>
      <div className="flex flex-col">
        {linhas.map((linha) => (
          <div
            key={linha.competencia}
            className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{linha.mesLabel}</p>
              <p className="text-xs text-fg-muted">{formatCurrencyBRL(linha.valor)}</p>
            </div>
            {linha.status === "pago" ? (
              <Pill color="green">
                Pago em {linha.dataPagamento ? formatDiaMesPtBR(linha.dataPagamento) : "-"}
              </Pill>
            ) : (
              <button type="button" onClick={() => setSheetCompetencia(linha.competencia)}>
                <Pill color={linha.status === "atrasado" ? "red" : "amber"}>
                  {linha.status === "atrasado" ? "Atrasado" : "Pendente"}
                </Pill>
              </button>
            )}
          </div>
        ))}
      </div>

      {sheetCompetencia && (
        <MarcarPagamentoSheet
          alunoId={alunoId}
          alunoNome={alunoNome}
          valorMensal={valorMensal}
          competenciaInicial={sheetCompetencia}
          onClose={() => setSheetCompetencia(null)}
        />
      )}
    </>
  );
}
