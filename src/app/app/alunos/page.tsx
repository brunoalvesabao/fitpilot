import { createClient } from "@/lib/supabase/server";
import { AlunosListClient } from "./_components/alunos-list-client";
import type { Aluno } from "@/types/database";

export default async function AlunosPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-semibold">Alunos</h1>
        <p className="mt-4 text-sm text-red">
          Não foi possível identificar sua sessão. Faça login novamente.
        </p>
      </div>
    );
  }

  const [alunosResult, creditosResult] = await Promise.all([
    supabase
      .from("aluno")
      .select("*")
      .eq("profissional_id", user.id)
      .order("nome", { ascending: true }),
    supabase
      .from("credito_reposicao")
      .select("aluno_id")
      .eq("profissional_id", user.id)
      .eq("utilizado", false),
  ]);

  if (alunosResult.error) {
    return (
      <div className="px-4 py-6">
        <h1 className="text-xl font-semibold">Alunos</h1>
        <p className="mt-4 text-sm text-red">
          Não foi possível carregar os alunos. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  const alunos = (alunosResult.data ?? []) as Aluno[];

  const reposicoesPorAluno: Record<string, number> = {};
  for (const row of creditosResult.data ?? []) {
    reposicoesPorAluno[row.aluno_id] = (reposicoesPorAluno[row.aluno_id] ?? 0) + 1;
  }

  return <AlunosListClient alunos={alunos} reposicoesPorAluno={reposicoesPorAluno} />;
}
