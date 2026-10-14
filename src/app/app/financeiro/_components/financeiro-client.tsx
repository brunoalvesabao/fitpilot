"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Avatar } from "@/components/avatar";
import { SegmentedControl } from "@/components/segmented-control";
import { MonthPicker } from "@/components/month-picker";
import { formatCurrencyBRL } from "@/lib/format";
import { formatMesAnoPtBR, formatIsoDatePtBR } from "@/lib/datetime";
import { MarcarPagamentoSheet } from "./marcar-pagamento-sheet";
import type { StatusCobranca } from "@/lib/financeiro";

export type LinhaFinanceiro = {
  id: string;
  nome: string;
  fotoUrl: string | null;
  valorMensal: number | null;
  diaVencimentoEfetivo: number | null;
  status: StatusCobranca;
  diasAtraso: number;
  dataPagamento: string | null;
  valorPago: number | null;
};

type Filtro = "todos" | "pagos" | "pendentes" | "atrasados";

const filtroOptions: { value: Filtro; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pagos", label: "Pagos" },
  { value: "pendentes", label: "Pendentes" },
  { value: "atrasados", label: "Atrasados" },
];

const borderColor: Record<StatusCobranca, string> = {
  pago: "border-l-primary",
  pendente: "border-l-amber",
  atrasado: "border-l-red",
};

export function FinanceiroClient({
  ano,
  mes,
  competencia,
  recebido,
  aReceber,
  atrasado,
  esperado,
  totalPopulacao,
  pagaramCount,
  linhas,
}: {
  ano: number;
  mes: number;
  competencia: string;
  recebido: number;
  aReceber: number;
  atrasado: number;
  esperado: number;
  totalPopulacao: number;
  pagaramCount: number;
  linhas: LinhaFinanceiro[];
}) {
  const router = useRouter();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [sheetAluno, setSheetAluno] = useState<LinhaFinanceiro | null>(null);

  function navigate(deltaMeses: number) {
    let novoAno = ano;
    let novoMes = mes + deltaMeses;
    while (novoMes < 1) {
      novoMes += 12;
      novoAno -= 1;
    }
    while (novoMes > 12) {
      novoMes -= 12;
      novoAno += 1;
    }
    router.push(`/app/financeiro?mes=${novoAno}-${String(novoMes).padStart(2, "0")}`);
  }

  const linhasFiltradas = useMemo(() => {
    if (filtro === "todos") return linhas;
    if (filtro === "pagos") return linhas.filter((l) => l.status === "pago");
    if (filtro === "pendentes") return linhas.filter((l) => l.status === "pendente");
    return linhas.filter((l) => l.status === "atrasado");
  }, [linhas, filtro]);

  const esperadoSeguro = esperado > 0 ? esperado : 0;
  const pctVerde = esperadoSeguro > 0 ? Math.min(100, (recebido / esperadoSeguro) * 100) : 0;
  const pctAmbar =
    esperadoSeguro > 0
      ? Math.max(0, Math.min(100 - pctVerde, (aReceber / esperadoSeguro) * 100))
      : 0;
  const pctVermelho =
    esperadoSeguro > 0
      ? Math.max(0, Math.min(100 - pctVerde - pctAmbar, (atrasado / esperadoSeguro) * 100))
      : 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-4 px-4 pb-4 pt-6">
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <MonthPicker label={formatMesAnoPtBR(ano, mes)} onPrev={() => navigate(-1)} onNext={() => navigate(1)} />

        <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
          <div>
            <p className="text-sm text-fg-muted">Recebido este mês</p>
            <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-primary">
              {formatCurrencyBRL(recebido)}
            </p>
          </div>
          <div className="flex divide-x divide-border border-t border-border pt-4">
            <div className="flex-1 pr-4">
              <p className="text-xs text-fg-muted">A receber</p>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-amber">
                {formatCurrencyBRL(aReceber)}
              </p>
            </div>
            <div className="flex-1 pl-4">
              <p className="text-xs text-fg-muted">Atrasado</p>
              <p className="mt-0.5 font-mono text-lg font-semibold tabular-nums text-red">
                {formatCurrencyBRL(atrasado)}
              </p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/10">
            <div className="bg-primary" style={{ width: `${pctVerde}%` }} />
            <div className="bg-amber" style={{ width: `${pctAmbar}%` }} />
            <div className="bg-red" style={{ width: `${pctVermelho}%` }} />
          </div>
          <p className="mt-2 text-xs text-fg-muted">
            {pagaramCount} de {totalPopulacao} alunos pagaram
          </p>
        </div>

        <SegmentedControl options={filtroOptions} value={filtro} onChange={setFiltro} />
      </div>

      {linhasFiltradas.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-8 text-center">
          <p className="text-fg-muted">Nenhum aluno neste filtro.</p>
        </div>
      ) : (
        <div>
          {linhasFiltradas.map((linha) => (
            <LinhaAluno key={linha.id} linha={linha} onMarcarPago={() => setSheetAluno(linha)} />
          ))}
        </div>
      )}

      {sheetAluno && (
        <MarcarPagamentoSheet
          alunoId={sheetAluno.id}
          alunoNome={sheetAluno.nome}
          valorMensal={sheetAluno.valorMensal}
          competenciaInicial={competencia}
          onClose={() => setSheetAluno(null)}
        />
      )}
    </div>
  );
}

function LinhaAluno({
  linha,
  onMarcarPago,
}: {
  linha: LinhaFinanceiro;
  onMarcarPago: () => void;
}) {
  const valor = linha.status === "pago" && linha.valorPago != null ? linha.valorPago : linha.valorMensal;

  let secundaria: string;
  if (linha.status === "pago") {
    secundaria = linha.dataPagamento ? `Pago em ${formatIsoDatePtBR(linha.dataPagamento)}` : "Pago";
  } else if (linha.status === "atrasado") {
    secundaria = `${linha.diasAtraso} ${linha.diasAtraso === 1 ? "dia" : "dias"} em atraso`;
  } else {
    secundaria = linha.diaVencimentoEfetivo != null ? `Vence dia ${linha.diaVencimentoEfetivo}` : "Sem vencimento";
  }

  return (
    <div
      className={`flex min-h-touch items-center gap-3 border-b border-l-4 border-border py-3 pl-3 pr-4 ${borderColor[linha.status]}`}
    >
      <Link href={`/app/alunos/${linha.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar nome={linha.nome} fotoUrl={linha.fotoUrl} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{linha.nome}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatCurrencyBRL(valor)}
          </span>
          <span className="text-xs text-fg-muted">{secundaria}</span>
        </div>
      </Link>
      {linha.status !== "pago" && (
        <button
          type="button"
          onClick={onMarcarPago}
          className="h-9 shrink-0 rounded-full border border-primary px-3 text-xs font-medium text-primary"
        >
          Marcar pago
        </button>
      )}
    </div>
  );
}
