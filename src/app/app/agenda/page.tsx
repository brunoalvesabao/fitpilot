import { createClient } from "@/lib/supabase/server";
import { AgendaClient } from "./_components/agenda-client";
import { spDayKey, spWeekday, startOfSpDay } from "@/lib/datetime";
import { planoResumo } from "@/lib/format";
import type { Aluno } from "@/types/database";
import type { SessaoDia } from "./_components/day-agenda-list";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; data?: string }>;
}) {
  const params = await searchParams;
  const view = params.view === "semana" ? "semana" : "dia";
  const dataParam =
    params.data && /^\d{4}-\d{2}-\d{2}$/.test(params.data) ? params.data : spDayKey(new Date());

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

  const [year, month, day] = dataParam.split("-").map(Number);
  const anchor = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  const { data: alunosData } = await supabase
    .from("aluno")
    .select("*")
    .eq("profissional_id", user.id)
    .eq("ativo", true);
  const alunos = (alunosData ?? []) as Aluno[];
  const alunosPorId = new Map(alunos.map((a) => [a.id, a]));
  const alunosParaSheet = alunos.map((a) => ({ id: a.id, nome: a.nome }));

  function toSessao(s: {
    id: string;
    data_hora: string;
    status: SessaoDia["status"];
    duracao_min: number;
    local: string | null;
    aluno_id: string;
  }): SessaoDia {
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
  }

  if (view === "dia") {
    const dayStart = startOfSpDay(anchor, 0);
    const dayEnd = startOfSpDay(anchor, 1);
    const [{ data: sessoesData }, { data: configReposicao }] = await Promise.all([
      supabase
        .from("agendamento")
        .select("*")
        .eq("profissional_id", user.id)
        .gte("data_hora", dayStart.toISOString())
        .lt("data_hora", dayEnd.toISOString())
        .order("data_hora", { ascending: true }),
      supabase
        .from("config_reposicao")
        .select("antecedencia_horas")
        .eq("profissional_id", user.id)
        .maybeSingle(),
    ]);

    const sessoes = (sessoesData ?? []).map(toSessao);

    return (
      <AgendaClient
        view="dia"
        data={dataParam}
        alunos={alunosParaSheet}
        sessoesDia={sessoes}
        antecedenciaHoras={configReposicao?.antecedencia_horas ?? null}
      />
    );
  }

  const weekday = spWeekday(anchor);
  const weekStart = startOfSpDay(anchor, -weekday);
  const weekEnd = startOfSpDay(anchor, -weekday + 7);

  const { data: sessoesData } = await supabase
    .from("agendamento")
    .select("*")
    .eq("profissional_id", user.id)
    .gte("data_hora", weekStart.toISOString())
    .lt("data_hora", weekEnd.toISOString())
    .order("data_hora", { ascending: true });

  const dias = Array.from({ length: 7 }, (_, i) => {
    const dayStart = startOfSpDay(anchor, -weekday + i);
    return { key: spDayKey(dayStart), sessoes: [] as SessaoDia[] };
  });

  for (const s of sessoesData ?? []) {
    const key = spDayKey(new Date(s.data_hora));
    const bucket = dias.find((d) => d.key === key);
    if (bucket) bucket.sessoes.push(toSessao(s));
  }

  return (
    <AgendaClient view="semana" data={dataParam} alunos={alunosParaSheet} sessoesSemana={dias} />
  );
}
