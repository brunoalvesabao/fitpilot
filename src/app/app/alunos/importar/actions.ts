"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { extrairAlunosDoTexto, type AlunoExtraido } from "@/lib/importacao-ia";

export async function analisarTextoAlunos(
  texto: string,
): Promise<{ success: boolean; alunos?: AlunoExtraido[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Sessão expirada. Faça login novamente." };
  }

  const textoLimpo = texto.trim();
  if (!textoLimpo) {
    return { success: false, error: "Cole o texto com os dados dos alunos antes de analisar." };
  }

  try {
    const alunos = await extrairAlunosDoTexto(textoLimpo);
    if (alunos.length === 0) {
      return {
        success: false,
        error: "Não encontrei nenhum aluno nesse texto. Tente colar um texto com nomes.",
      };
    }
    return { success: true, alunos };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Não foi possível analisar o texto.",
    };
  }
}

export async function importarAlunosEmLote(
  alunos: AlunoExtraido[],
): Promise<{ success: boolean; total: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const validos = alunos.filter((a) => a.nome.trim().length > 0);
  if (validos.length === 0) {
    return { success: false, total: 0 };
  }

  const rows = validos.map((aluno) => ({
    profissional_id: user.id,
    nome: aluno.nome.trim(),
    telefone: aluno.telefone,
    valor_mensal: aluno.valor_mensal,
    dia_vencimento: aluno.dia_vencimento,
    status: "ativo" as const,
    ativo: true,
  }));

  const { error } = await supabase.from("aluno").insert(rows);

  if (error) {
    return { success: false, total: 0 };
  }

  revalidatePath("/app/alunos");
  return { success: true, total: validos.length };
}
