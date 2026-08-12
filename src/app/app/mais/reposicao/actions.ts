"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function saveConfigReposicao(input: {
  permitir: boolean;
  antecedencia_horas: number;
  expira_mes_seguinte: boolean;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("config_reposicao").upsert(
    {
      profissional_id: user.id,
      permitir: input.permitir,
      antecedencia_horas: input.antecedencia_horas,
      expira_mes_seguinte: input.expira_mes_seguinte,
    },
    { onConflict: "profissional_id" },
  );

  revalidatePath("/app/mais/reposicao");
}
