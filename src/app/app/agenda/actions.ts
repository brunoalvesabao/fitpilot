"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { startOfSpDay, spDateTimeToUtc, spWeekday, spDayKey } from "@/lib/datetime";
import { enviarPush } from "@/lib/push";
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
    // No revalidatePath here: this function only ever runs inline during
    // HojePage's own render (not as a Server Action triggered by a user
    // action), and the page reads fresh data in the same request right
    // after this insert — revalidating is both unsupported in that
    // context and redundant.
    await supabase.from("agendamento").insert(novos);
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

  // The DB trigger creates the reposição credit (and abre uma vaga de
  // reposição) quando o status vira cancelado_com_aviso — nunca inserimos
  // isso aqui. Mas se estamos saindo DE cancelado_com_aviso (desfazer, ou
  // corrigir pra outro status), o crédito e a vaga que ele gerou deixam de
  // valer, a menos que já tenham sido usados/reservados.
  if (agendamento.status === "cancelado_com_aviso" && novoStatus !== "cancelado_com_aviso") {
    await supabase
      .from("credito_reposicao")
      .delete()
      .eq("agendamento_origem", agendamentoId)
      .eq("usado", false);

    await supabase
      .from("vaga_reposicao")
      .delete()
      .eq("origem_agendamento_id", agendamentoId)
      .eq("status", "aberta");
  }

  // Acabou de virar cancelado_com_aviso agora: a vaga que o gatilho acabou
  // de abrir já existe nesta altura (o UPDATE acima já rodou e commitou o
  // efeito do gatilho). Avisa por push quem tem reposição pendente.
  if (novoStatus === "cancelado_com_aviso" && agendamento.status !== "cancelado_com_aviso") {
    await notificarVagaAberta(user.id);
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

/**
 * Avisa por push os alunos deste profissional que têm crédito de
 * reposição disponível — é esse grupo que pode reivindicar a vaga que
 * acabou de abrir (ver política "vaga_reposicao_aluno_elegivel" no banco).
 * Falhas de envio são apenas logadas: nunca devem quebrar o cancelamento.
 */
async function notificarVagaAberta(profissionalId: string): Promise<void> {
  const supabase = await createClient();

  const { data: alunosDoProfissional } = await supabase
    .from("aluno")
    .select("id")
    .eq("profissional_id", profissionalId);

  const alunoIds = (alunosDoProfissional ?? []).map((a) => a.id);
  if (alunoIds.length === 0) return;

  const hojeKey = spDayKey(new Date());
  const { data: creditos } = await supabase
    .from("credito_reposicao")
    .select("aluno_id, expira_em")
    .in("aluno_id", alunoIds)
    .eq("usado", false);

  const elegiveisIds = [
    ...new Set(
      (creditos ?? [])
        .filter((c) => c.expira_em == null || c.expira_em >= hojeKey)
        .map((c) => c.aluno_id),
    ),
  ];
  if (elegiveisIds.length === 0) return;

  const { data: inscricoes } = await supabase
    .from("inscricao_push")
    .select("endpoint, p256dh, auth_key")
    .in("aluno_id", elegiveisIds);

  if (!inscricoes || inscricoes.length === 0) return;

  const payload = {
    title: "Vaga de reposição liberada",
    body: "Abriu um horário com o seu professor. Toque pra ver e reservar.",
    url: "/aluno/inicio",
  };

  await Promise.all(
    inscricoes.map((i) =>
      enviarPush(
        { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth_key } },
        payload,
      ).catch((err) => console.error("Falha ao enviar push de vaga aberta:", err)),
    ),
  );
}
