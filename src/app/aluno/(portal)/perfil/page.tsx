import { createClient } from "@/lib/supabase/server";
import { logoutAluno } from "@/app/aluno/actions";
import { AtivarNotificacoesButton } from "./_components/ativar-notificacoes-button";

export default async function AlunoPerfilPage() {
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
    .select("nome, telefone")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-xl font-semibold">Perfil</h1>

      <section className="mt-6 flex flex-col gap-1 rounded-card border border-border bg-surface p-4">
        <Row label="Nome" value={aluno?.nome ?? "-"} />
        <Row label="Telefone" value={aluno?.telefone ?? "-"} />
        <Row label="Email" value={user.email ?? "-"} />
      </section>

      <div className="mt-6">
        <AtivarNotificacoesButton />
      </div>

      <form action={logoutAluno} className="mt-auto pt-6">
        <button
          type="submit"
          className="h-touch w-full rounded-card border border-border bg-surface font-medium text-red"
        >
          Sair
        </button>
      </form>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
