"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DiaSemana } from "@/types/database";
import type { FormState } from "./form-state";

type HorarioInput = { dia_semana: DiaSemana; hora: string; local: string | null };

function parseAlunoForm(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefoneRaw = String(formData.get("telefone") ?? "").trim();
  const valorMensalRaw = String(formData.get("valor_mensal") ?? "").trim();
  const aulasPorMesRaw = String(formData.get("aulas_por_mes") ?? "").trim();
  const diaVencimentoRaw = String(formData.get("dia_vencimento") ?? "").trim();
  const observacoesRaw = String(formData.get("observacoes") ?? "").trim();
  const horariosRaw = String(formData.get("horarios") ?? "[]");

  const errors: Record<string, string> = {};

  if (!nome) {
    errors.nome = "Nome é obrigatório.";
  }

  let valorMensal: number | null = null;
  if (valorMensalRaw) {
    valorMensal = Number(valorMensalRaw.replace(",", "."));
    if (Number.isNaN(valorMensal) || valorMensal < 0) {
      errors.valor_mensal = "Valor mensal inválido.";
      valorMensal = null;
    }
  }

  let aulasPorMes: number | null = null;
  if (aulasPorMesRaw) {
    aulasPorMes = Number(aulasPorMesRaw);
    if (!Number.isInteger(aulasPorMes) || aulasPorMes <= 0) {
      errors.aulas_por_mes = "Número de aulas inválido.";
      aulasPorMes = null;
    }
  }

  let diaVencimento: number | null = null;
  if (diaVencimentoRaw) {
    diaVencimento = Number(diaVencimentoRaw);
    if (!Number.isInteger(diaVencimento) || diaVencimento < 1 || diaVencimento > 31) {
      errors.dia_vencimento = "Dia de vencimento deve ser entre 1 e 31.";
      diaVencimento = null;
    }
  }

  let horarios: HorarioInput[] = [];
  try {
    const parsed = JSON.parse(horariosRaw) as HorarioInput[];
    if (Array.isArray(parsed)) {
      for (const item of parsed) {
        if (!/^\d{2}:\d{2}$/.test(item.hora)) {
          errors.horarios = "Selecione um horário válido para cada dia ativado.";
          break;
        }
      }
      horarios = parsed;
    }
  } catch {
    errors.horarios = "Selecione um horário válido para cada dia ativado.";
  }

  return {
    errors,
    nome,
    telefone: telefoneRaw || null,
    valor_mensal: valorMensal,
    aulas_por_mes: aulasPorMes,
    dia_vencimento: diaVencimento,
    observacoes: observacoesRaw || null,
    horarios,
  };
}

async function saveHorarios(alunoId: string, horarios: HorarioInput[]) {
  const supabase = await createClient();

  await supabase.from("horario_fixo").delete().eq("aluno_id", alunoId);

  if (horarios.length === 0) return;

  const rows = horarios.map((horario) => ({
    aluno_id: alunoId,
    dia_semana: horario.dia_semana,
    hora: `${horario.hora}:00`,
    local: horario.local,
  }));

  await supabase.from("horario_fixo").insert(rows);
}

export async function createAluno(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errors: {}, formError: "Sessão expirada. Faça login novamente." };
  }

  const parsed = parseAlunoForm(formData);
  if (Object.keys(parsed.errors).length > 0) {
    return { errors: parsed.errors, formError: null };
  }

  const { data: aluno, error } = await supabase
    .from("aluno")
    .insert({
      profissional_id: user.id,
      nome: parsed.nome,
      telefone: parsed.telefone,
      status: "ativo",
      valor_mensal: parsed.valor_mensal,
      aulas_por_mes: parsed.aulas_por_mes,
      dia_vencimento: parsed.dia_vencimento,
      observacoes: parsed.observacoes,
      ativo: true,
    })
    .select("id")
    .single();

  if (error || !aluno) {
    return {
      errors: {},
      formError: "Não foi possível salvar o aluno. Tente novamente.",
    };
  }

  await saveHorarios(aluno.id, parsed.horarios);

  revalidatePath("/app/alunos");
  redirect("/app/alunos");
}

export async function updateAluno(
  alunoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errors: {}, formError: "Sessão expirada. Faça login novamente." };
  }

  const parsed = parseAlunoForm(formData);
  if (Object.keys(parsed.errors).length > 0) {
    return { errors: parsed.errors, formError: null };
  }

  const { error } = await supabase
    .from("aluno")
    .update({
      nome: parsed.nome,
      telefone: parsed.telefone,
      valor_mensal: parsed.valor_mensal,
      aulas_por_mes: parsed.aulas_por_mes,
      dia_vencimento: parsed.dia_vencimento,
      observacoes: parsed.observacoes,
    })
    .eq("id", alunoId)
    .eq("profissional_id", user.id);

  if (error) {
    return {
      errors: {},
      formError: "Não foi possível salvar o aluno. Tente novamente.",
    };
  }

  await saveHorarios(alunoId, parsed.horarios);

  revalidatePath("/app/alunos");
  revalidatePath(`/app/alunos/${alunoId}`);
  redirect("/app/alunos");
}

export async function deactivateAluno(alunoId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await supabase
    .from("aluno")
    .update({ ativo: false })
    .eq("id", alunoId)
    .eq("profissional_id", user.id);

  revalidatePath("/app/alunos");
  revalidatePath(`/app/alunos/${alunoId}`);
  redirect("/app/alunos");
}

export async function usarReposicao(creditoId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: credito } = await supabase
    .from("credito_reposicao")
    .select("aluno_id")
    .eq("id", creditoId)
    .maybeSingle();

  if (!credito) return;

  const { data: aluno } = await supabase
    .from("aluno")
    .select("id")
    .eq("id", credito.aluno_id)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (!aluno) return;

  await supabase.from("credito_reposicao").update({ usado: true }).eq("id", creditoId);

  revalidatePath(`/app/alunos/${credito.aluno_id}`);
}
