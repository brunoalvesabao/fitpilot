import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { generateUpcomingAgendamentos } from "../agenda/actions";
import { DayAgendaList, type SessaoDia } from "../agenda/_components/day-agenda-list";
import { StatTile } from "@/components/stat-tile";
import { Pill } from "@/components/status-pill";
import {
  greeting,
  formatDatePtBRExtenso,
  firstName,
  startOfSpDay,
  startOfSpMonth,
  spParts,
  spDayKey,
} from "@/lib/datetime";
import { formatCurrencyBRL, planoResumo } from "@/lib/format";
import { classificarCobranca, diaVencimentoEfetivo } from "@/lib/financeiro";

export default async function HojePage() {
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

  await generateUpcomingAgendamentos();

  const now = new Date();
  const todayStart = startOfSpDay(now, 0);
  const todayEnd = startOfSpDay(now, 1);
  const monthStart = startOfSpMonth(now, 0);
  const monthEnd = startOfSpMonth(now, 1);
  const today = spParts(now);
  const competenciaAtual = `${today.year}-${String(today.month).padStart(2, "0")}-01`;

  const [
    profissionalResult,
    aulasHojeResult,
    faltasMesResult,
    alunosResult,
    sessoesResult,
    configReposicaoResult,
  ] = await Promise.all([
    supabase.from("profissional").select("nome").eq("id", user.id).maybeSingle(),
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("profissional_id", user.id)
      .gte("data_hora", todayStart.toISOString())
      .lt("data_hora", todayEnd.toISOString()),
    supabase
      .from("agendamento")
      .select("id", { count: "exact", head: true })
      .eq("profissional_id", user.id)
      .eq("status", "falta")
      .gte("data_hora", monthStart.toISOString())
      .lt("data_hora", monthEnd.toISOString()),
    supabase
      .from("aluno")
      .select("id, nome, valor_mensal, dia_vencimento, aulas_por_mes")
      .eq("profissional_id", user.id)
      .eq("ativo", true),
    supabase
      .from("agendamento")
      .select("id, data_hora, status, duracao_min, local, aluno_id")
      .eq("profissional_id", user.id)
      .gte("data_hora", todayStart.toISOString())
      .lt("data_hora", todayEnd.toISOString())
      .order("data_hora", { ascending: true }),
    supabase
      .from("config_reposicao")
      .select("antecedencia_horas")
      .eq("profissional_id", user.id)
      .maybeSingle(),
  ]);

  const nomeProfissional = profissionalResult.data?.nome ?? "";
  const antecedenciaHoras = configReposicaoResult.data?.antecedencia_horas ?? null;
  const alunos = alunosResult.data ?? [];
  const alunosPorId = new Map(alunos.map((a) => [a.id, a]));

  // Candidates whose *effective* due date (clamped to the month's actual
  // length — e.g. dia_vencimento 31 lands on the 28th/30th in short months)
  // has arrived this month (today or earlier) — covers both "vencendo
  // hoje" and "em atraso". Using diaVencimentoEfetivo here (instead of
  // comparing the raw dia_vencimento, which can exceed the number of days
  // in the current month) keeps this consistent with the Financeiro page.
  const candidatosCobranca = alunos
    .filter((a) => a.dia_vencimento != null)
    .map((a) => ({
      aluno: a,
      diaEfetivo: diaVencimentoEfetivo(a.dia_vencimento!, today.year, today.month),
    }))
    .filter(({ diaEfetivo }) => diaEfetivo <= today.day);

  let pagosNaCompetencia = new Set<string>();
  if (candidatosCobranca.length > 0) {
    const { data: pagamentos } = await supabase
      .from("pagamento")
      .select("aluno_id")
      .eq("profissional_id", user.id)
      .eq("competencia", competenciaAtual)
      .not("data_pagamento", "is", null)
      .in(
        "aluno_id",
        candidatosCobranca.map(({ aluno }) => aluno.id),
      );

    pagosNaCompetencia = new Set((pagamentos ?? []).map((p) => p.aluno_id));
  }

  const vencendoHoje: typeof alunos = [];
  const inadimplentes: { aluno: (typeof alunos)[number]; diasAtraso: number }[] = [];

  for (const { aluno } of candidatosCobranca) {
    if (pagosNaCompetencia.has(aluno.id)) continue;
    const { status, diasAtraso } = classificarCobranca({
      hoje: today,
      diaVencimento: aluno.dia_vencimento,
      ano: today.year,
      mes: today.month,
      pago: false,
    });
    if (status === "pendente") vencendoHoje.push(aluno);
    else if (status === "atrasado") inadimplentes.push({ aluno, diasAtraso });
  }

  const aReceberHoje = vencendoHoje.reduce((sum, a) => sum + (a.valor_mensal ?? 0), 0);

  const sessoes: SessaoDia[] = (sessoesResult.data ?? []).map((s) => {
    const aluno = alunosPorId.get(s.aluno_id);
    return {
      id: s.id,
      dataHora: s.data_hora,
      status: s.status,
      duracaoMin: s.duracao_min,
      local: s.local,
      alunoId: s.aluno_id,
      alunoNome: aluno?.nome ?? "Aluno",
      planoResumo: aluno ? planoResumo(aluno) : "-",
    };
  });

  const temAtencao = vencendoHoje.length > 0 || inadimplentes.length > 0;

  return (
    <div className="flex flex-1 flex-col">
      <div className="px-4 pb-2 pt-6">
        <h1 className="text-xl font-semibold">
          {greeting(now)}, {firstName(nomeProfissional || "")}
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">{formatDatePtBRExtenso(now)}</p>
      </div>

      <div className="flex gap-2 px-4 py-3">
        <StatTile label="Aulas hoje" value={String(aulasHojeResult.count ?? 0)} />
        <StatTile label="Faltas no mês" value={String(faltasMesResult.count ?? 0)} />
        <StatTile
          label="A receber hoje"
          value={formatCurrencyBRL(aReceberHoje)}
          emphasis="blue"
        />
      </div>

      {temAtencao && (
        <div className="px-4 py-2">
          <h2 className="mb-2 text-sm font-semibold text-fg-muted">Atenção</h2>
          <div className="flex flex-col overflow-hidden rounded-card border border-border">
            {vencendoHoje.map((aluno) => (
              <Link
                key={aluno.id}
                href={`/app/alunos/${aluno.id}`}
                className="flex min-h-touch items-center gap-3 border-b border-border bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{aluno.nome}</span>
                <Pill color="amber">Vencendo hoje</Pill>
                <ChevronRight className="size-4 shrink-0 text-fg-faint" aria-hidden />
              </Link>
            ))}
            {inadimplentes.map(({ aluno, diasAtraso }) => (
              <Link
                key={aluno.id}
                href={`/app/alunos/${aluno.id}`}
                className="flex min-h-touch items-center gap-3 border-b border-border bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{aluno.nome}</span>
                <Pill color="red">{diasAtraso} dias em atraso</Pill>
                <ChevronRight className="size-4 shrink-0 text-fg-faint" aria-hidden />
              </Link>
            ))}
          </div>
        </div>
      )}

      <DayAgendaList
        sessoes={sessoes}
        alunos={alunos.map((a) => ({ id: a.id, nome: a.nome }))}
        data={spDayKey(now)}
        title="Agenda de hoje"
        antecedenciaHoras={antecedenciaHoras}
      />
    </div>
  );
}
