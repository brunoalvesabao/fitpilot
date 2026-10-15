"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { spDayKey, spParts } from "@/lib/datetime";
import { competenciaStr, derivarStatusAluno } from "@/lib/financeiro";
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

export async function exportarDadosAluno(
  alunoId: string,
): Promise<{ success: boolean; dados?: unknown }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: aluno } = await supabase
    .from("aluno")
    .select("*")
    .eq("id", alunoId)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (!aluno) return { success: false };

  const [horarios, agendamentos, pagamentos, reposicoes] = await Promise.all([
    supabase.from("horario_fixo").select("*").eq("aluno_id", alunoId),
    supabase.from("agendamento").select("*").eq("aluno_id", alunoId),
    supabase.from("pagamento").select("*").eq("aluno_id", alunoId),
    supabase.from("credito_reposicao").select("*").eq("aluno_id", alunoId),
  ]);

  return {
    success: true,
    dados: {
      exportado_em: new Date().toISOString(),
      aluno,
      horarios_fixos: horarios.data ?? [],
      agendamentos: agendamentos.data ?? [],
      pagamentos: pagamentos.data ?? [],
      creditos_reposicao: reposicoes.data ?? [],
    },
  };
}

export async function excluirAlunoPermanentemente(alunoId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: aluno } = await supabase
    .from("aluno")
    .select("id")
    .eq("id", alunoId)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (!aluno) {
    redirect("/app/alunos");
  }

  // Apaga as tabelas dependentes primeiro — não há garantia de ON DELETE
  // CASCADE configurado no banco, então a ordem importa aqui.
  await supabase.from("credito_reposicao").delete().eq("aluno_id", alunoId);
  await supabase.from("pagamento").delete().eq("aluno_id", alunoId);
  await supabase.from("agendamento").delete().eq("aluno_id", alunoId);
  await supabase.from("horario_fixo").delete().eq("aluno_id", alunoId);
  await supabase.from("aluno").delete().eq("id", alunoId).eq("profissional_id", user.id);

  revalidatePath("/app/alunos");
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
    .select("aluno_id, expira_em, usado")
    .eq("id", creditoId)
    .maybeSingle();

  if (!credito || credito.usado) return;

  // Defense in depth: the UI already hides/disables this for expired
  // credits, but never trust the client for a business rule like this.
  if (credito.expira_em != null && credito.expira_em < spDayKey(new Date())) return;

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

export async function recalcularStatusAlunos(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: alunosData } = await supabase
    .from("aluno")
    .select("id, dia_vencimento, criado_em")
    .eq("profissional_id", user.id)
    .eq("ativo", true)
    .not("status", "in", "(pausa,ex_aluno,lead)");

  const alunos = alunosData ?? [];
  if (alunos.length === 0) return;

  const hoje = spParts(new Date());
  const mesAnterior = hoje.month === 1 ? { year: hoje.year - 1, month: 12 } : { year: hoje.year, month: hoje.month - 1 };
  const competenciaAtual = competenciaStr(hoje.year, hoje.month);
  const competenciaAnterior = competenciaStr(mesAnterior.year, mesAnterior.month);
  const alunoIds = alunos.map((a) => a.id);

  const [{ data: pagosAnterior }, { data: pagosAtual }] = await Promise.all([
    supabase
      .from("pagamento")
      .select("aluno_id")
      .eq("profissional_id", user.id)
      .eq("competencia", competenciaAnterior)
      .not("data_pagamento", "is", null)
      .in("aluno_id", alunoIds),
    supabase
      .from("pagamento")
      .select("aluno_id")
      .eq("profissional_id", user.id)
      .eq("competencia", competenciaAtual)
      .not("data_pagamento", "is", null)
      .in("aluno_id", alunoIds),
  ]);

  const pagouAnteriorSet = new Set((pagosAnterior ?? []).map((p) => p.aluno_id));
  const pagouAtualSet = new Set((pagosAtual ?? []).map((p) => p.aluno_id));

  const idsInadimplente: string[] = [];
  const idsVencendo: string[] = [];
  const idsAtivo: string[] = [];

  for (const aluno of alunos) {
    const status = derivarStatusAluno({
      hoje,
      diaVencimento: aluno.dia_vencimento,
      pagouMesAnterior: pagouAnteriorSet.has(aluno.id),
      pagouMesAtual: pagouAtualSet.has(aluno.id),
      matriculadoAntesDoMesAnterior: aluno.criado_em < competenciaAnterior,
    });

    if (status === "inadimplente") idsInadimplente.push(aluno.id);
    else if (status === "vencendo") idsVencendo.push(aluno.id);
    else idsAtivo.push(aluno.id);
  }

  await Promise.all([
    idsInadimplente.length > 0
      ? supabase.from("aluno").update({ status: "inadimplente" }).in("id", idsInadimplente)
      : Promise.resolve(),
    idsVencendo.length > 0
      ? supabase.from("aluno").update({ status: "vencendo" }).in("id", idsVencendo)
      : Promise.resolve(),
    idsAtivo.length > 0
      ? supabase.from("aluno").update({ status: "ativo" }).in("id", idsAtivo)
      : Promise.resolve(),
  ]);

  revalidatePath("/app/alunos");
  revalidatePath("/app/financeiro");
  revalidatePath("/app/hoje");
}

export async function gerarConviteAluno(
  alunoId: string,
): Promise<{ success: boolean; token?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: aluno } = await supabase
    .from("aluno")
    .select("id, auth_user_id")
    .eq("id", alunoId)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (!aluno) return { success: false };
  if (aluno.auth_user_id) return { success: false };

  const token = crypto.randomUUID();

  const { error } = await supabase
    .from("aluno")
    .update({ convite_token: token })
    .eq("id", alunoId);

  if (error) return { success: false };

  return { success: true, token };
}
