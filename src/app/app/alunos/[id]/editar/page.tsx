import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlunoForm, type AlunoFormInitial, type HorarioFormInitial } from "../../_components/aluno-form";
import { updateAluno } from "../../actions";

export default async function EditarAlunoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  const [alunoResult, horariosResult] = await Promise.all([
    supabase
      .from("aluno")
      .select("nome, telefone, valor_mensal, aulas_por_mes, dia_vencimento, observacoes")
      .eq("id", id)
      .eq("profissional_id", user.id)
      .maybeSingle(),
    supabase.from("horario_fixo").select("dia_semana, hora, local").eq("aluno_id", id),
  ]);

  if (alunoResult.error) {
    return (
      <div className="px-4 py-6">
        <p className="text-sm text-red">
          Não foi possível carregar o aluno. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  const aluno: AlunoFormInitial | null = alunoResult.data;
  if (!aluno) {
    notFound();
  }

  const horarios: HorarioFormInitial[] = horariosResult.data ?? [];

  return (
    <AlunoForm
      title="Editar aluno"
      action={updateAluno.bind(null, id)}
      initialAluno={aluno}
      initialHorarios={horarios}
    />
  );
}
