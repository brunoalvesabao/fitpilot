"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startOfSpDay, spDateTimeToUtc, spWeekday } from "@/lib/datetime";
import type { FormState } from "./form-state";
import type { StatusAgendamento } from "@/types/database";

const GERACAO_DIAS = 14;
const DURACAO_PADRAO_MIN = 60;

export async function generateUpcomingAgendamentos(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  const rangeStart = startOfSpDay(now, 0);
  const rangeEnd = startOfSpDay(now, GERACAO_DIAS);

  const { data: alunos } = await supabase
    .from("aluno")
    .select("id")
    .eq("profissional_id", user.id)
    .eq("ativo", true);

  const alunoIds = (alunos ?? []).map((a) => a.id);
  if (alunoIds.length === 0) return;

  const { data: horarios } = await supabase
    .from("horario_fixo")
    .select("aluno_id, dia_semana, hora, local")
    .in("aluno_id", alunoIds);

  if (!horarios || horarios.length === 0) return;

  // Needed regardless of whether anything ends up missing — this is what
  // lets the check below be precise (per student, per slot) instead of a
  // "some row exists somewhere" heuristic that silently stops generating
  // for a student added after an earlier run already covered the window.
  const { data: existentes } = await supabase
    .from("agendamento")
    .select("aluno_id, data_hora")
    .in("aluno_id", alunoIds)
    .gte("data_hora", rangeStart.toISOString())
    .lt("data_hora", rangeEnd.toISOString());

  const existentesSet = new Set(
    (existentes ?? []).map((e) => `${e.aluno_id}|${new Date(e.data_hora).getTime()}`),
  );

  const candidatos: {
    profissional_id: string;
    aluno_id: string;
    data_hora: string;
    duracao_min: number;
    status: "agendado";
    local: string | null;
    dataHoraMs: number;
  }[] = [];

  for (let offset = 0; offset < GERACAO_DIAS; offset++) {
    const dayStart = startOfSpDay(now, offset);
    const weekday = spWeekday(dayStart);

    for (const horario of horarios) {
      if (horario.dia_semana !== weekday) continue;

      const [hh, mm] = horario.hora.split(":").map(Number);
      const { year, month, day } = ymdFromUtcMidnight(dayStart);
      const dataHora = spDateTimeToUtc(year, month, day, hh, mm);
      const key = `${horario.aluno_id}|${dataHora.getTime()}`;

      if (existentesSet.has(key)) continue;

      candidatos.push({
        profissional_id: user.id,
        aluno_id: horario.aluno_id,
        data_hora: dataHora.toISOString(),
        duracao_min: DURACAO_PADRAO_MIN,
        status: "agendado",
        local: horario.local,
        dataHoraMs: dataHora.getTime(),
      });
      existentesSet.add(key);
    }
  }

  if (candidatos.length === 0) return;

  const { data: bloqueios } = await supabase
    .from("bloqueio")
    .select("inicio, fim")
    .eq("profissional_id", user.id)
    .lt("inicio", rangeEnd.toISOString())
    .gt("fim", rangeStart.toISOString());

  const bloqueiosRanges = (bloqueios ?? []).map((b) => ({
    inicio: new Date(b.inicio).getTime(),
    fim: new Date(b.fim).getTime(),
  }));

  const novos = candidatos
    .filter(
      (c) => !bloqueiosRanges.some((b) => c.dataHoraMs >= b.inicio && c.dataHoraMs < b.fim),
    )
    .map((c) => ({
      profissional_id: c.profissional_id,
      aluno_id: c.aluno_id,
      data_hora: c.data_hora,
      duracao_min: c.duracao_min,
      status: c.status,
      local: c.local,
    }));

  if (novos.length > 0) {
    await supabase.from("agendamento").insert(novos);
    revalidatePath("/app/hoje");
    revalidatePath("/app/agenda");
  }
}

export async function setAgendamentoStatus(
  agendamentoId: string,
  novoStatus: StatusAgendamento,
): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: agendamento } = await supabase
    .from("agendamento")
    .select("status, aluno_id")
    .eq("id", agendamentoId)
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (!agendamento) return;

  const { error } = await supabase
    .from("agendamento")
    .update({ status: novoStatus })
    .eq("id", agendamentoId)
    .eq("profissional_id", user.id);

  if (error) return;

  // The DB trigger creates the reposição credit when status becomes
  // cancelado_com_aviso — we never insert it ourselves. But if we're
  // moving AWAY from cancelado_com_aviso (undo, or correcting to another
  // status), the credit it generated is no longer valid unless already used.
  if (agendamento.status === "cancelado_com_aviso" && novoStatus !== "cancelado_com_aviso") {
    await supabase
      .from("credito_reposicao")
      .delete()
      .eq("agendamento_origem", agendamentoId)
      .eq("usado", false);
  }

  revalidatePath("/app/hoje");
  revalidatePath("/app/agenda");
  revalidatePath(`/app/alunos/${agendamento.aluno_id}`);
}

function ymdFromUtcMidnight(dayStart: Date) {
  return {
    year: dayStart.getUTCFullYear(),
    month: dayStart.getUTCMonth() + 1,
    day: dayStart.getUTCDate(),
  };
}

function parseAgendamentoForm(formData: FormData) {
  const alunoId = String(formData.get("aluno_id") ?? "").trim();
  const data = String(formData.get("data") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const duracaoRaw = String(formData.get("duracao_min") ?? "").trim();
  const localRaw = String(formData.get("local") ?? "").trim();

  const errors: Record<string, string> = {};

  if (!alunoId) {
    errors.aluno_id = "Selecione um aluno.";
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    errors.data = "Selecione uma data válida.";
  }
  if (!/^\d{2}:\d{2}$/.test(hora)) {
    errors.hora = "Selecione um horário válido.";
  }

  let duracaoMin = DURACAO_PADRAO_MIN;
  if (duracaoRaw) {
    duracaoMin = Number(duracaoRaw);
    if (!Number.isInteger(duracaoMin) || duracaoMin <= 0) {
      errors.duracao_min = "Duração inválida.";
      duracaoMin = DURACAO_PADRAO_MIN;
    }
  }

  let dataHora: string | null = null;
  if (!errors.data && !errors.hora) {
    const [year, month, day] = data.split("-").map(Number);
    const [hh, mm] = hora.split(":").map(Number);
    dataHora = spDateTimeToUtc(year, month, day, hh, mm).toISOString();
  }

  return {
    errors,
    alunoId,
    dataHora,
    duracaoMin,
    local: localRaw || null,
  };
}

export async function createAgendamento(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errors: {}, formError: "Sessão expirada. Faça login novamente.", success: false };
  }

  const parsed = parseAgendamentoForm(formData);
  if (Object.keys(parsed.errors).length > 0 || !parsed.dataHora) {
    return { errors: parsed.errors, formError: null, success: false };
  }

  const { error } = await supabase.from("agendamento").insert({
    profissional_id: user.id,
    aluno_id: parsed.alunoId,
    data_hora: parsed.dataHora,
    duracao_min: parsed.duracaoMin,
    status: "agendado",
    local: parsed.local,
  });

  if (error) {
    return {
      errors: {},
      formError: "Não foi possível salvar o agendamento. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/app/hoje");
  revalidatePath("/app/agenda");
  return { errors: {}, formError: null, success: true };
}

export async function updateAgendamento(
  agendamentoId: string,
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { errors: {}, formError: "Sessão expirada. Faça login novamente.", success: false };
  }

  const parsed = parseAgendamentoForm(formData);
  if (Object.keys(parsed.errors).length > 0 || !parsed.dataHora) {
    return { errors: parsed.errors, formError: null, success: false };
  }

  const { error } = await supabase
    .from("agendamento")
    .update({
      aluno_id: parsed.alunoId,
      data_hora: parsed.dataHora,
      duracao_min: parsed.duracaoMin,
      local: parsed.local,
    })
    .eq("id", agendamentoId)
    .eq("profissional_id", user.id);

  if (error) {
    return {
      errors: {},
      formError: "Não foi possível salvar o agendamento. Tente novamente.",
      success: false,
    };
  }

  revalidatePath("/app/hoje");
  revalidatePath("/app/agenda");
  return { errors: {}, formError: null, success: true };
}

export async function deleteAgendamento(agendamentoId: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("agendamento")
    .delete()
    .eq("id", agendamentoId)
    .eq("profissional_id", user.id);

  revalidatePath("/app/hoje");
  revalidatePath("/app/agenda");
}
