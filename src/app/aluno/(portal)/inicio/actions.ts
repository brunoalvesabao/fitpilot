"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function reservarVaga(vagaId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Sessão expirada." };

  const { error } = await supabase.rpc("aluno_reservar_vaga", { p_vaga_id: vagaId });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/aluno/inicio");
  return { success: true };
}
