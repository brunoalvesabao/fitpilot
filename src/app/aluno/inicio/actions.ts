"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logoutAluno() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/aluno/login");
}

export async function salvarInscricaoPush(subscription: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { data: aluno } = await supabase
    .from("aluno")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (!aluno) return { success: false };

  const { error } = await supabase.from("inscricao_push").upsert(
    {
      aluno_id: aluno.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth_key: subscription.keys.auth,
    },
    { onConflict: "aluno_id,endpoint" },
  );

  return { success: !error };
}

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
