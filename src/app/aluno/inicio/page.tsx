import { createClient } from "@/lib/supabase/server";
import { spParts } from "@/lib/datetime";
import { ReservarVagaButton } from "./_components/reservar-vaga-button";
import { AtivarNotificacoesButton } from "./_components/ativar-notificacoes-button";
import { logoutAluno } from "./actions";

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

  const now = new Date().toISOString();

  const [{ data: profissional }, { data: proximasAulas }, { data: vagas }] = await Promise.all([
    supabase.from("profissional").select("nome").eq("id", aluno.profissional_id).maybeSingle(),
    supabase
      .from("agendamento")
      .select("id, data_hora, status, local")
      .eq("aluno_id", aluno.id)
      .in("status", ["agendado"])
      .gte("data_hora", now)
      .order("data_hora", { ascending: true })
      .limit(10),
    supabase
      .from("vaga_reposicao")
      .select("id, data_hora, duracao_min, local")
      .eq("status", "aberta")
      .gte("data_hora", now)
      .order("data_hora", { ascending: true }),
  ]);

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">Olá, {aluno.nome.split(" ")[0]}</h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            Professor{profissional?.nome ? ` ${profissional.nome}` : ""}
          </p>
        </div>
        <form action={logoutAluno}>
          <button type="submit" className="text-sm font-medium text-fg-muted">
            Sair
          </button>
        </form>
      </div>

      <div className="mt-6">
        <AtivarNotificacoesButton />
      </div>

      <section>
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
    </div>
  );
}
