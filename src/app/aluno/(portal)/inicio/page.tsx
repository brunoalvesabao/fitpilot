import { createClient } from "@/lib/supabase/server";
import { spParts, spDayKey, formatIsoDatePtBR } from "@/lib/datetime";
import { StatTile } from "@/components/stat-tile";
import { Pill } from "@/components/status-pill";
import { ReservarVagaButton } from "./_components/reservar-vaga-button";
import { logoutAluno } from "@/app/aluno/actions";

function formatDataHoraCurta(iso: string): string {
  const { day, month, hour, minute } = spParts(new Date(iso));
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")} às ${String(
    hour,
  ).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export default async function AlunoInicioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">Não foi possível identificar sua sessão.</p>
      </div>
    );
  }

  const { data: aluno } = await supabase
    .from("aluno")
    .select("id, nome, profissional_id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (!aluno) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-fg-muted">
          Não encontramos um cadastro de aluno vinculado a esta conta. Fale com seu professor.
        </p>
        <form action={logoutAluno} className="mt-4">
          <button type="submit" className="text-sm font-medium text-red">
            Sair
          </button>
        </form>
      </div>
    );
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const hojeKey = spDayKey(now);

  const [
    { data: profissional },
    { data: proximasAulas },
    { data: ultimasAulas },
    { data: vagas },
    { data: creditos },
  ] = await Promise.all([
    supabase.from("profissional").select("nome").eq("id", aluno.profissional_id).maybeSingle(),
    supabase
      .from("agendamento")
      .select("id, data_hora, status, local")
      .eq("aluno_id", aluno.id)
      .in("status", ["agendado"])
      .gte("data_hora", nowIso)
      .order("data_hora", { ascending: true })
      .limit(10),
    supabase
      .from("agendamento")
      .select("id, data_hora, status, local")
      .eq("aluno_id", aluno.id)
      .in("status", ["realizada", "falta", "cancelado_com_aviso"])
      .lt("data_hora", nowIso)
      .order("data_hora", { ascending: false })
      .limit(5),
    supabase
      .from("vaga_reposicao")
      .select("id, data_hora, duracao_min, local")
      .eq("status", "aberta")
      .gte("data_hora", nowIso)
      .order("data_hora", { ascending: true }),
    supabase
      .from("credito_reposicao")
      .select("id, usado, expira_em")
      .eq("aluno_id", aluno.id)
      .order("expira_em", { ascending: true, nullsFirst: false }),
  ]);

  const creditosDisponiveis = (creditos ?? []).filter(
    (c) => !c.usado && (c.expira_em == null || c.expira_em >= hojeKey),
  );
  const proximaExpiracao = creditosDisponiveis.find((c) => c.expira_em != null)?.expira_em;

  const HISTORICO_STATUS_LABEL: Record<string, { label: string; color: "green" | "red" | "blue" }> = {
    realizada: { label: "Realizada", color: "green" },
    falta: { label: "Falta", color: "red" },
    cancelado_com_aviso: { label: "Cancelado com aviso", color: "blue" },
  };

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-xl font-semibold">Olá, {aluno.nome.split(" ")[0]}</h1>
      <p className="mt-0.5 text-sm text-fg-muted">
        Professor{profissional?.nome ? ` ${profissional.nome}` : ""}
      </p>

      <div className="mt-4 flex gap-2">
        <StatTile label="Próximas aulas" value={String(proximasAulas?.length ?? 0)} />
        <StatTile
          label="Reposições disponíveis"
          value={String(creditosDisponiveis.length)}
          emphasis="blue"
        />
      </div>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Suas próximas aulas</h2>
        {proximasAulas && proximasAulas.length > 0 ? (
          <div className="flex flex-col overflow-hidden rounded-card border border-border">
            {proximasAulas.map((aula) => (
              <div
                key={aula.id}
                className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="text-sm font-medium">{formatDataHoraCurta(aula.data_hora)}</span>
                {aula.local && <span className="text-xs text-fg-muted">{aula.local}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Nenhuma aula marcada no momento.</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Vagas de reposição disponíveis</h2>
        {vagas && vagas.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vagas.map((vaga) => (
              <div
                key={vaga.id}
                className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">{formatDataHoraCurta(vaga.data_hora)}</p>
                  {vaga.local && <p className="text-xs text-fg-muted">{vaga.local}</p>}
                </div>
                <ReservarVagaButton vagaId={vaga.id} />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">
            Nenhuma vaga aberta agora. Você recebe um aviso assim que uma liberar.
          </p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Minhas reposições</h2>
        <div className="rounded-card border border-border bg-surface p-4">
          {creditosDisponiveis.length === 0 ? (
            <p className="text-sm text-fg-muted">Nenhum crédito de reposição disponível agora.</p>
          ) : (
            <>
              <p className="text-sm">
                Você tem{" "}
                <span className="font-semibold text-blue">
                  {creditosDisponiveis.length} crédito{creditosDisponiveis.length > 1 ? "s" : ""}
                </span>{" "}
                de reposição disponível{creditosDisponiveis.length > 1 ? "is" : ""}.
              </p>
              {proximaExpiracao && (
                <p className="mt-1 text-xs text-fg-muted">
                  O mais próximo expira em {formatIsoDatePtBR(proximaExpiracao)}.
                </p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-semibold text-fg-muted">Histórico recente</h2>
        {ultimasAulas && ultimasAulas.length > 0 ? (
          <div className="flex flex-col overflow-hidden rounded-card border border-border">
            {ultimasAulas.map((aula) => (
              <div
                key={aula.id}
                className="flex items-center justify-between gap-3 border-b border-border bg-surface px-4 py-3 last:border-b-0"
              >
                <span className="text-sm">{formatDataHoraCurta(aula.data_hora)}</span>
                <Pill color={HISTORICO_STATUS_LABEL[aula.status]?.color ?? "gray"}>
                  {HISTORICO_STATUS_LABEL[aula.status]?.label ?? aula.status}
                </Pill>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-fg-muted">Nenhum histórico ainda.</p>
        )}
      </section>
    </div>
  );
}
