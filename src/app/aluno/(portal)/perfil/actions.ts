"use server";

import { createClient } from "@/lib/supabase/server";

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

export async function removerInscricaoPush(endpoint: string): Promise<{ success: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false };

  const { error } = await supabase.from("inscricao_push").delete().eq("endpoint", endpoint);

  return { success: !error };
}
