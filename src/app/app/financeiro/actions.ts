"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recalcularStatusAlunos } from "../alunos/actions";
import type { MetodoPagamento } from "@/types/database";

export async function registrarPagamento(input: {
  alunoId: string;
  competencia: string;
  valor: number;
  dataPagamento: string;
  metodo: MetodoPagamento;
}): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("pagamento").upsert(
    {
      profissional_id: user.id,
      aluno_id: input.alunoId,
      competencia: input.competencia,
      valor: input.valor,
      data_pagamento: input.dataPagamento,
      metodo: input.metodo,
    },
    { onConflict: "aluno_id,competencia" },
  );

  if (error) {
    console.error("Failed to register pagamento:", error);
    return { success: false };
  }

  await recalcularStatusAlunos();

  revalidatePath("/app/financeiro");
  revalidatePath(`/app/alunos/${input.alunoId}`);
  return { success: true };
}
