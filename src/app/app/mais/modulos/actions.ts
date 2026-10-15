"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ConfigModulosValores } from "@/lib/config-modulos";

export async function salvarConfigModulos(input: ConfigModulosValores): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existente } = await supabase
    .from("config_modulos")
    .select("id")
    .eq("profissional_id", user.id)
    .maybeSingle();

  if (existente) {
    await supabase
      .from("config_modulos")
      .update(input)
      .eq("profissional_id", user.id);
  } else {
    await supabase.from("config_modulos").insert({
      profissional_id: user.id,
      ...input,
    });
  }

  revalidatePath("/app/mais/modulos");
  revalidatePath("/app/mais");
  revalidatePath("/app/hoje");
  revalidatePath("/app/financeiro");
  revalidatePath("/app/alunos");
}
