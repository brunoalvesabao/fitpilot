import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Pencil } from "lucide-react";
import { MessageCircle, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/avatar";
import { StatTile } from "@/components/stat-tile";
import { statusBarColor } from "@/components/session-row";
import { formatCurrencyBRL, formatDateBR, whatsappHref, telHref } from "@/lib/format";
import { spParts, startOfSpMonth, formatMesAnoPtBR } from "@/lib/datetime";
import { classificarCobranca, competenciaStr } from "@/lib/financeiro";
import { DesativarAlunoButton } from "../_components/desativar-aluno-button";
import { UsarReposicaoButton } from "../_components/usar-reposicao-button";
import { PagamentosList, type LinhaPagamentoMes } from "../_components/pagamentos-list";
import type { Aluno, StatusAgendamento } from "@/types/database";

const HISTORICO_PAGE_SIZE = 10;

function currentMonthRange() {
  const now = new Date();
  return {
    firstOfMonth: startOfSpMonth(now, 0),
    firstOfNextMonth: startOfSpMonth(now, 1),
  };
}

function formatDataHoraCurta(iso: string): string {
  const { day, month, hour, minute } = spParts(new Date(iso));
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} às ${String(
    hour,
  ).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const HISTORICO_STATUS_LABEL: Record<StatusAgendamento, string> = {
  agendado: "Agendado",
  realizada: "Realizada",
  falta: "Falta",
  cancelado_com_aviso: "Cancelado com aviso",
};

export default async function AlunoFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ historico?: string }>;
}) {
  const { id } = await params;
  const { historico } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível identificar sua sessão. Faça login novamente.
        </p>
      </div>
    );
  }

  const alunoResult = await supabase
    .from("aluno")
    .select("*")
    .eq("id", id)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (alunoResult.error) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível carregar este aluno. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  const aluno = alunoResult.data as Aluno | null;
  if (!aluno) {
    notFound();
  }

  const now = new Date();
  const { firstOfMonth, firstOfNextMonth } = currentMonthRange();

  const historicoPage = Math.max(1, Number(historico) || 1);
  const historicoOffset = (historicoPage - 1) * HISTORICO_PAGE_SIZE;

  const [concluidasResult, faltasResult, reposicoesResult, historicoResult] = await Promise.all([
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .eq("status", "realizada")
      .gte("data_hora", firstOfMonth.toISOString())
      .lt("data_hora", firstOfNextMonth.toISOString()),
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .eq("status", "falta")
      .gte("data_hora", firstOfMonth.toISOString())
      .lt("data_hora", firstOfNextMonth.toISOString()),
    supabase
      .from("credito_reposicao")
      .select("id, agendamento_origem, expira_em, criado_em")
      .eq("aluno_id", id)
      .eq("usado", false)
      .order("expira_em", { ascending: true, nullsFirst: false }),
    supabase
      .from("agendamento")
      .select("id, data_hora, status", { count: "exact" })
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .lt("data_hora", now.toISOString())
      .order("data_hora", { ascending: false })
      .range(historicoOffset, historicoOffset + HISTORICO_PAGE_SIZE - 1),
  ]);

  const concluidas = concluidasResult.count ?? 0;
  const faltas = faltasResult.count ?? 0;
  const reposicoes = reposicoesResult.data ?? [];
  const historicoSessoes = historicoResult.data ?? [];
  const totalHistorico = historicoResult.count ?? 0;
  const totalPaginasHistorico = Math.max(1, Math.ceil(totalHistorico / HISTORICO_PAGE_SIZE));

  const origemIds = reposicoes
    .map((r) => r.agendamento_origem)
    .filter((v): v is string => v != null);

  const aulasLabel =
    aluno.aulas_por_mes != null ? `${concluidas}/${aluno.aulas_por_mes}` : `${concluidas}`;

  const hoje = spParts(now);
  const meses = Array.from({ length: 12 }, (_, i) => {
    let m = hoje.month - i;
    let y = hoje.year;
    while (m < 1) {
      m += 12;
      y -= 1;
    }
    return { year: y, month: m };
  });
  const competencias = meses.map(({ year, month }) => competenciaStr(year, month));

  const [{ data: origens }, { data: pagamentosData }] = await Promise.all([
    origemIds.length > 0
      ? supabase.from("agendamento").select("id, data_hora").in("id", origemIds)
      : Promise.resolve({ data: [] as { id: string; data_hora: string }[] }),
    supabase
      .from("pagamento")
      .select("competencia, valor, data_pagamento")
      .eq("aluno_id", id)
      .eq("profissional_id", user.id)
      .in("competencia", competencias),
  ]);

  const origemPorId = new Map((origens ?? []).map((o) => [o.id, o.data_hora]));
  const pagamentoPorCompetencia = new Map((pagamentosData ?? []).map((p) => [p.competencia, p]));

  const linhasPagamento: LinhaPagamentoMes[] = meses.map(({ year, month }) => {
    const competencia = competenciaStr(year, month);
    const pagamento = pagamentoPorCompetencia.get(competencia);
    const pago = pagamento?.data_pagamento != null;
    const { status } = classificarCobranca({
      hoje,
      diaVencimento: aluno.dia_vencimento,
      ano: year,
      mes: month,
      pago,
    });

    return {
      competencia,
      mesLabel: formatMesAnoPtBR(year, month),
      valor: pago ? (pagamento?.valor ?? null) : aluno.valor_mensal,
      status,
      dataPagamento: pagamento?.data_pagamento ?? null,
    };
  });

  const whatsapp = whatsappHref(aluno.telefone);
  const tel = telHref(aluno.telefone);

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border px-2">
        <Link
          href="/app/alunos"
          aria-label="Voltar"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h1 className="truncate px-2 text-base font-semibold">{aluno.nome}</h1>
        <Link
          href={`/app/alunos/${aluno.id}/editar`}
          aria-label="Editar aluno"
          className="flex size-11 items-center justify-center text-fg-muted"
        >
          <Pencil className="size-5" aria-hidden />
        </Link>
      </header>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <section className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-6 text-center">
          <Avatar nome={aluno.nome} fotoUrl={aluno.foto_url} size="lg" />
          <div>
            <p className="text-lg font-semibold">{aluno.nome}</p>
            {aluno.telefone && <p className="text-sm text-fg-muted">{aluno.telefone}</p>}
          </div>
          <div className="flex gap-2">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-touch items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
              >
                <MessageCircle className="size-4" aria-hidden />
                WhatsApp
              </a>
            )}
            {tel && (
              <a
                href={tel}
                className="flex h-touch items-center gap-2 rounded-full border border-border px-4 text-sm font-medium"
              >
                <Phone className="size-4" aria-hidden />
                Ligar
              </a>
            )}
          </div>
        </section>

        <section className="flex flex-col gap-2 rounded-card border border-border bg-surface p-4">
          <PlanoRow label="Plano" value="Mensal" />
          <PlanoRow label="Valor" value={formatCurrencyBRL(aluno.valor_mensal)} />
          <PlanoRow
            label="Aulas por mês"
            value={aluno.aulas_por_mes != null ? String(aluno.aulas_por_mes) : "-"}
          />
          <PlanoRow
            label="Vencimento"
            value={aluno.dia_vencimento != null ? `Dia ${aluno.dia_vencimento}` : "-"}
          />
          <PlanoRow label="Aluno desde" value={formatDateBR(aluno.criado_em)} />
        </section>

        <div className="flex gap-2">
          <StatTile label="Este mês: aulas" value={aulasLabel} />
          <StatTile label="Faltas no mês" value={String(faltas)} />
          <StatTile label="Reposições" value={String(reposicoes.length)} emphasis="blue" />
        </div>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Pagamentos</h2>
          <PagamentosList
            alunoId={aluno.id}
            alunoNome={aluno.nome}
            valorMensal={aluno.valor_mensal}
            linhas={linhasPagamento}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Reposições</h2>
          {reposicoes.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhuma reposição disponível.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {reposicoes.map((credito) => {
                const origemData = credito.agendamento_origem
                  ? origemPorId.get(credito.agendamento_origem)
                  : null;
                return (
                  <div
                    key={credito.id}
                    className="flex items-center justify-between gap-3 rounded-card border border-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        Origem: {origemData ? formatDataHoraCurta(origemData) : "-"}
                      </p>
                      <p className="truncate text-xs text-fg-muted">
                        Expira em: {credito.expira_em ? formatDateBR(credito.expira_em) : "-"}
                      </p>
                    </div>
                    <UsarReposicaoButton creditoId={credito.id} />
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Histórico de aulas</h2>
          {historicoSessoes.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhuma aula no histórico.</p>
          ) : (
            <>
              <div className="flex flex-col">
                {historicoSessoes.map((sessao) => (
                  <div
                    key={sessao.id}
                    className="flex items-center gap-3 border-b border-border py-2.5 last:border-b-0"
                  >
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${statusBarColor[sessao.status]}`}
                      aria-hidden
                    />
                    <span className="flex-1 text-sm">{formatDataHoraCurta(sessao.data_hora)}</span>
                    <span className="text-xs text-fg-muted">
                      {HISTORICO_STATUS_LABEL[sessao.status]}
                    </span>
                  </div>
                ))}
              </div>
              {totalPaginasHistorico > 1 && (
                <div className="flex items-center justify-between pt-3">
                  <Link
                    href={`/app/alunos/${id}?historico=${historicoPage - 1}`}
                    aria-disabled={historicoPage <= 1}
                    className={`flex h-9 items-center gap-1 text-sm font-medium ${
                      historicoPage <= 1 ? "pointer-events-none text-fg-faint" : "text-primary"
                    }`}
                  >
                    <ChevronLeft className="size-4" aria-hidden />
                    Anterior
                  </Link>
                  <span className="text-xs text-fg-muted">
                    Página {historicoPage} de {totalPaginasHistorico}
                  </span>
                  <Link
                    href={`/app/alunos/${id}?historico=${historicoPage + 1}`}
                    aria-disabled={historicoPage >= totalPaginasHistorico}
                    className={`flex h-9 items-center gap-1 text-sm font-medium ${
                      historicoPage >= totalPaginasHistorico
                        ? "pointer-events-none text-fg-faint"
                        : "text-primary"
                    }`}
                  >
                    Próxima
                    <ChevronRight className="size-4" aria-hidden />
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        <section className="flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
          <h2 className="text-sm font-semibold">Observações</h2>
          <p className="whitespace-pre-wrap text-sm text-fg-muted">
            {aluno.observacoes || "Nenhuma observação."}
          </p>
        </section>

        <div className="flex justify-center pb-4 pt-2">
          <DesativarAlunoButton alunoId={aluno.id} />
        </div>
      </div>
    </div>
  );
}

function PlanoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
