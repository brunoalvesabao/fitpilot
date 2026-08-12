"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { DiaSemana, PlanoTipo } from "@/types/database";
import type { FormState } from "./form-state";

type HorarioInput = { dia_semana: DiaSemana; hora_inicio: string };

function addOneHour(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = (h * 60 + m + 60) % (24 * 60);
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

function parseAlunoForm(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim();
  const telefoneRaw = String(formData.get("telefone") ?? "").trim();
  const planoTipoRaw = String(formData.get("plano_tipo") ?? "").trim();
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
        if (!/^\d{2}:\d{2}$/.test(item.hora_inicio)) {
          errors.horarios = "Selecione um horário válido para cada dia ativado.";
          break;
        }
      }
      horarios = parsed;
    }
  } catch {
    errors.horarios = "Selecione um horário válido para cada dia ativado.";
  }

  const planoTipo: PlanoTipo | null =
    planoTipoRaw === "mensal" || planoTipoRaw === "pacote" || planoTipoRaw === "avulso"
      ? planoTipoRaw
      : null;

  return {
    errors,
    nome,
    telefone: telefoneRaw || null,
    plano_tipo: planoTipo,
    valor_mensal: valorMensal,
    aulas_por_mes: aulasPorMes,
    dia_vencimento: diaVencimento,
    observacoes: observacoesRaw || null,
    horarios,
  };
}

async function saveHorarios(
  profissionalId: string,
  alunoId: string,
  horarios: HorarioInput[],
) {
  const supabase = await createClient();

  await supabase
    .from("horario_fixo")
    .delete()
    .eq("profissional_id", profissionalId)
    .eq("aluno_id", alunoId);

  if (horarios.length === 0) return;

  const rows = horarios.map((horario) => ({
    profissional_id: profissionalId,
    aluno_id: alunoId,
    dia_semana: horario.dia_semana,
    hora_inicio: `${horario.hora_inicio}:00`,
    hora_fim: `${addOneHour(horario.hora_inicio)}:00`,
    ativo: true,
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
      plano_tipo: parsed.plano_tipo,
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

  await saveHorarios(user.id, aluno.id, parsed.horarios);

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
      plano_tipo: parsed.plano_tipo,
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

  await saveHorarios(user.id, alunoId, parsed.horarios);

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
